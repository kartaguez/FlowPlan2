// Run after npm test; compare before/after on the same runtime and machine.
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
const root = process.env.LOT11C_MODULE_ROOT ? new URL(process.env.LOT11C_MODULE_ROOT) : new URL('../.test-dist/', import.meta.url);
const domain = await import(new URL('domain/index.js', root));
const { encodePlanningInputs, decodePlanningInputs } = await import(new URL('application/backup/planningInputCodec.js', root));
const { decodeFlowplanBackup } = await import(new URL('application/backup/flowplanBackupV1.js', root));
const { createDemoPlanningScenario } = await import(new URL('main/demo/createDemoPlanningScenario.js', root));
const { buildPlanningSessionProjection } = await import(new URL('main/planning/buildPlanningSessionProjection.js', root));
const must = r => { if (!r.ok) throw Error(JSON.stringify(r.errors)); return r.value; };
const viewport = { width: 1440, teamLaneHeight: 100, timeAxisHeight: 76 };
const median = task => { task(); task(); const samples = Array.from({length:5}, () => { const t=performance.now(); task(); return performance.now()-t; }).sort((a,b)=>a-b); return { medianMs:samples[2], samplesMs:samples }; };
const dto = encodePlanningInputs(createDemoPlanningScenario());
dto.planning.startDate='2025-01-01'; dto.planning.endDate='2026-12-31';
const prototype=dto.portfolio.projects[0];
dto.portfolio.projects=Array.from({length:100}, (_,i)=>({...prototype,id:`bench-${i}`,name:`Bench ${i}`,requirements:dto.portfolio.teams.slice(0,2).map(t=>({teamId:t.id,remainingWorkload:'1000/1'}))}));
for(const t of dto.portfolio.teams) t.capacitySchedule={periods:[{start:'2025-01-01',end:'2026-12-31',dailyCapacity:'2/1',unavailabilityRatio:'0/1'}],exceptions:[]};
dto.portfolio.priorityOrder=dto.portfolio.projects.map(p=>p.id); dto.portfolio.reservations=[];
dto.portfolio.programs=dto.portfolio.programs.filter(p=>p.id===prototype.programId);
dto.portfolio.priorityFamilies=dto.portfolio.priorityFamilies.filter(p=>p.id===prototype.priorityFamilyId);
const synthetic=decodePlanningInputs(dto,5,undefined,true);
const real=decodeFlowplanBackup(readFileSync('src/main/planning/fixtures/FP2-DTO-2026.10.01.json','utf8'));
const mandatory={...real,portfolio:{...real.portfolio,projects:real.portfolio.projects.map(p=>p.name==='12178 - SDD'?{...p,mandatoryDeadline:p.objectiveEndDate}:p)}};
const realCoveredDto=encodePlanningInputs(real), rp=realCoveredDto.portfolio.projects[0];
const realThrough=must(domain.addDays(real.planning.startDate,30));rp.migrationStatus='native';rp.snapshots=[{snapshotId:domain.snapshotId('project',rp.id,1),version:1,knowledgeDate:realThrough,participation:rp.requirements.map(r=>r.teamId),retiredZeroTeams:[],raf:rp.requirements.map(r=>({teamId:r.teamId,amount:r.remainingWorkload})),coverage:{actualsFrom:real.planning.startDate,actualsThrough:realThrough,periods:[{periodId:'real-covered-zero',from:real.planning.startDate,through:realThrough,consumed:rp.requirements.map(r=>({teamId:r.teamId,amount:'0/1'}))}]}}];
const realCovered=decodePlanningInputs(realCoveredDto,5,undefined,true);
const coveredDto=structuredClone(dto);
for(const p of coveredDto.portfolio.projects) { p.migrationStatus='native';p.snapshots=[{snapshotId:domain.snapshotId('project',p.id,1),version:1,knowledgeDate:'2026-12-31',participation:p.requirements.map(r=>r.teamId),retiredZeroTeams:[],raf:p.requirements.map(r=>({teamId:r.teamId,amount:r.remainingWorkload})),coverage:{actualsFrom:'2025-01-01',actualsThrough:'2026-12-31',periods:[{periodId:'covered-zero',from:'2025-01-01',through:'2026-12-31',consumed:p.requirements.map(r=>({teamId:r.teamId,amount:'0/1'}))}]}}]; }
const covered=decodePlanningInputs(coveredDto,5,undefined,true);
const deadlinesDto=structuredClone(dto);deadlinesDto.planning.endDate='2025-01-14';deadlinesDto.portfolio.projects=deadlinesDto.portfolio.projects.slice(0,3);deadlinesDto.portfolio.priorityOrder=deadlinesDto.portfolio.projects.map(p=>p.id);
for(const p of deadlinesDto.portfolio.projects) {p.mandatoryDeadline='2025-03-01';p.requirements.forEach(r=>{r.remainingWorkload='10000000000000000000000000000000000000001/30000000000000000000000000000000000000007';r.dailyCap='1/3';});}
const deadlines=decodePlanningInputs(deadlinesDto,5,undefined,true);
const scenarios=[['real-no-actuals',real,null],['real-one-project-covered',realCovered,undefined],['real-mandatory-lookahead',mandatory,null],['100x2x730-no-actuals',synthetic,null],['100x2x730-covered-zero',covered,undefined],['multiple-mandatory-fractions-beyond-horizon',deadlines,null],['100x2x730-all-blocked',synthetic,'9999-12-31']];
const report={node:process.version, platform:process.platform, scenarios:{}};
for(const [name,state,bound] of scenarios) {
 const derive=()=>domain.projectActualsKnowledgeFromPortfolio ? domain.projectActualsKnowledgeFromPortfolio(state.portfolio) : state.portfolio.projects.map(p=>({projectId:p.id,actualsThrough:null}));
 const input={portfolio:state.portfolio,horizon:must(domain.createPlanningHorizon({start:state.planning.startDate,end:state.planning.endDate})),workingPattern:state.planning.workingPattern,maxParallelProjects:state.planning.maxParallelProjects,actualOccupation:[],projectActualsKnowledge:derive().map(row=>({...row,actualsThrough:bound===undefined?row.actualsThrough:bound}))};
 report.scenarios[name]={derivation:median(derive),engine:median(()=>domain.planPortfolio(input)),fullProjection:bound === '9999-12-31' ? null : median(()=>buildPlanningSessionProjection({state,geometryViewport:viewport})), requestedBound:bound};
}
console.log(JSON.stringify(report,null,2));
