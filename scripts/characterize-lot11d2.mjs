// Compile first: node node_modules/typescript/bin/tsc -p tsconfig.test.json
// Run: node --expose-gc scripts/characterize-lot11d2.mjs [--output=path] [--case=small]
import { performance } from 'node:perf_hooks';
import { cpus, platform, release, totalmem } from 'node:os';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../.test-dist/',import.meta.url);
const domain=await import(new URL('domain/index.js',root));
const codec=await import(new URL('application/backup/planningInputCodec.js',root));
const {capturePortfolioSnapshot}=await import(new URL('application/portfolioSnapshots/capturePortfolioSnapshot.js',root));
const {recomputePlanning}=await import(new URL('application/planning/recomputePlanning.js',root));
const lab=await import(new URL('proof/lot11d2/replay.fixture.js',root));
const {rich,versions}=await import(new URL('proof/lot11d2/inputs.fixture.js',root));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
if(process.argv.includes('--proof')) {
  const state=versions(),r=lab.run(state),s=capturePortfolioSnapshot(state,r.result,r.actuals,'proof','2026-10-09T10:00:00.000Z');
  console.log(digest(lab.run(lab.resolve(s,state)).canonical));process.exit(0);
}
const specs=[
 {name:'small',S:5,P:20,D:365,T:3,R:8,K:2,partitions:2,versions:2,actualDays:31,complex:false},
 {name:'target',S:25,P:100,D:730,T:5,R:30,K:3,partitions:8,versions:3,actualDays:120,complex:true},
 {name:'stress',S:100,P:200,D:1095,T:8,R:80,K:4,partitions:12,versions:4,actualDays:180,complex:true},
 {name:'adverse',S:1,P:100,D:365,T:8,R:30,K:8,partitions:24,versions:6,actualDays:730,complex:true},
];
specs.push({...specs[1],name:'target-singleCapture',S:1}, {...specs[1],name:'target-simpleRationals',complex:false}, {...specs[1],name:'target-manyPartitions',partitions:32});
const must=r=>{if(!r.ok)throw Error(JSON.stringify(r.errors));return r.value;};
const date=s=>must(domain.createCivilDate(s));
const plus=(s,n)=>must(domain.addDays(date(s),n));
function fixture(spec) {
 const dto=codec.encodeCurrentPlanningInputs(rich());
 const start='2025-01-01',end=plus(start,spec.D-1),actualStart=plus(start,-spec.actualDays);
 dto.planning={startDate:start,endDate:end,workingWeekdays:[1,2,3,4,5],maxParallelProjects:3};
 const protoTeam=dto.portfolio.teams[0],protoProject=dto.portfolio.projects[0],protoReservation=dto.portfolio.reservations[1];
 delete protoProject.mandatoryDeadline;
 dto.portfolio.teams=Array.from({length:spec.T},(_,i)=>({...protoTeam,id:`lab-team-${i}`,name:`Team ${i}`,capacitySchedule:{periods:[
  {start:actualStart,end:plus(start,Math.floor(spec.D/2)-1),dailyCapacity:'7/3',unavailabilityRatio:'1/7'},
  {start:plus(start,Math.floor(spec.D/2)),end,dailyCapacity:'11/5'}],exceptions:[{date:start,capacity:'0/1'},{date:plus(start,5),capacity:'17/97'}]}}));
 const amount=spec.complex?'123456789012345678901/100000000000000000003':'1/3';
 dto.portfolio.projects=Array.from({length:spec.P},(_,i)=>{
  const id=`lab-project-${i}`,requirements=Array.from({length:spec.K},(_,k)=>({teamId:dto.portfolio.teams[(i+k)%spec.T].id,remainingWorkload:'1000/3',...(i%5===0?{dailyCap:'1/3'}:{})}));
  const snapshots=Array.from({length:spec.versions},(_,v)=>({snapshotId:domain.snapshotId('project',id,v+1),version:v+1,knowledgeDate:plus(start,v),participation:requirements.map(r=>r.teamId),retiredZeroTeams:[],raf:requirements.map(r=>({teamId:r.teamId,amount:'777/1'})),coverage:{actualsFrom:actualStart,actualsThrough:plus(start,-1),periods:Array.from({length:spec.partitions},(_,p)=>({periodId:`period-${p}`,from:plus(actualStart,Math.floor(p*spec.actualDays/spec.partitions)),through:plus(actualStart,Math.floor((p+1)*spec.actualDays/spec.partitions)-1),consumed:requirements.map(r=>({teamId:r.teamId,amount:p%4===0?'0/1':amount}))}))}}));
  return {...protoProject,id,name:id,isActive:i%10!==0,requirements,migrationStatus:'native',snapshots,earliestStartDate:start,objectiveEndDate:end,...(i%20===0?{mandatoryDeadline:plus(start,Math.min(spec.D-1,30))}:{} )};
 });
 dto.portfolio.priorityOrder=dto.portfolio.projects.map(p=>p.id);
 dto.portfolio.reservations=Array.from({length:spec.R},(_,i)=>({...protoReservation,id:`lab-reservation-${i}`,name:`Reservation ${i}`,isActive:i%7!==0,startDate:start,endDate:end,migrationStatus:'none',teamAllocations:[{teamId:dto.portfolio.teams[i%spec.T].id,amount:i%2?{kind:'ratio',ratio:'1/97'}:{kind:'fixed-daily',dailyCapacity:'1/101'}}]}));
 dto.portfolio.programs=dto.portfolio.programs.filter(p=>p.id===protoProject.programId||p.id===protoReservation.programId);
 dto.portfolio.priorityFamilies=dto.portfolio.priorityFamilies.filter(p=>p.id===protoProject.priorityFamilyId||p.id===protoReservation.priorityFamilyId);
 return codec.decodePlanningInputs(dto,8,undefined,true);
}
const memory=()=>process.memoryUsage();
const summarize=values=>{const s=[...values].sort((a,b)=>a-b);return {median:s.length%2?s[Math.floor(s.length/2)]:(s[s.length/2-1]+s[s.length/2])/2,p95:s[Math.ceil(.95*s.length)-1],max:s.at(-1),samples:values};};
const output={protocol:'lot11d2-characterization/1',baseline:'633dfc9459c7398f800abfb47439e1251e7bd7aa',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chain:'baseline codecs/reconstruction/engine/projectors; lot11d2-business/1',environment:{node:process.version,os:platform(),release:release(),cpu:cpus()[0].model,logicalCpu:cpus().length,totalMemory:totalmem(),gc:!!global.gc,timezone:process.env.TZ??'system'},runs:[]};
const selected=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
if(selected&&!specs.some(s=>s.name===selected))throw Error(`Unknown case ${selected}`);
for(const spec of specs.filter(s=>!selected||s.name===selected)) {
 console.error(`Characterizing ${spec.name}`);
 // Build/capture once outside timed region; true engine output, never synthetic forecast.
 let current=fixture(spec),initial=lab.run(current);
 let snapshot=capturePortfolioSnapshot(current,initial.result,initial.actuals,`lab-${spec.name}`,'2026-10-09T10:00:00.000Z');
 const expected=digest(initial.canonical), inputText=JSON.stringify(snapshot),currentText=JSON.stringify(codec.encodeCurrentPlanningInputs(current));
 const directory=mkdtempSync(join(tmpdir(),'lot11d2-'));
 const snapshotPath=join(directory,'snapshots.json'),currentPath=join(directory,'current.json');
 const collectionText=JSON.stringify(Array.from({length:spec.S},(_,i)=>({...JSON.parse(inputText),snapshotId:`lab-${spec.name}-${i}`})));
 writeFileSync(snapshotPath,collectionText);writeFileSync(currentPath,currentText);
 const counts={contributions:initial.actuals.contributions.length,allocations:initial.result.teamPlans.reduce((s,t)=>s+t.projectPlans.reduce((s,p)=>s+p.allocations.length,0),0),diagnostics:initial.result.diagnostics.length};
 initial=null;current=null;snapshot=null;global.gc?.();
 const samples=[];
 function measureIteration(iteration,before) {
  const stages={},boundaries=[];
  const stage=(name,fn)=>{const cpu=process.cpuUsage(),wall=performance.now();const value=fn();const used=process.cpuUsage(cpu);stages[name]={wallMs:performance.now()-wall,cpuMs:(used.user+used.system)/1000};boundaries.push({stage:name,...memory()});return value;};
  let decoded=stage('readDecode',()=>({snapshots:JSON.parse(readFileSync(snapshotPath,'utf8')),current:codec.decodePlanningInputs(JSON.parse(readFileSync(currentPath,'utf8')),8,undefined,true)}));
  let state=stage('resolveValidateCopy',()=>lab.resolve(decoded.snapshots[0],decoded.current));
  // Resolution includes strict historical decode. Capture forecast integrity was checked at setup; no replay uses it.
  let actuals=stage('reconstructActuals',()=>domain.reconstructActuals(state.portfolio,state.planning.workingPattern));
  let input=stage('constructPlanningInput',()=>lab.planningInput(state,actuals));
  let result=stage('engine',()=>recomputePlanning(input).planningResult);
  let canonical=stage('canonicalExtract',()=>lab.canonical(state,actuals,result));
  assert.equal(digest(canonical),expected);
  const resultBytes=Buffer.byteLength(JSON.stringify(canonical));
  const live=memory();decoded=null;state=null;actuals=null;input=null;result=null;canonical=null;
  return {iteration,stages,before,boundaries,live,resultBytes,observedHeapGrowth:Math.max(live.heapUsed,...boundaries.map(m=>m.heapUsed))-before.heapUsed};
 }
 for(let iteration=-2;iteration<10;iteration++) {
  global.gc?.();const before=memory();
  // Return from the measuring frame before GC: no JSON.stringify temporary can remain stack-rooted.
  const sample=measureIteration(iteration,before);global.gc?.();
  sample.after=memory();sample.retainedHeapDelta=sample.after.heapUsed-before.heapUsed;
  if(iteration>=0)samples.push(sample);
 }
 const stageSummary=Object.fromEntries(Object.keys(samples[0].stages).map(k=>[k,{wallMs:summarize(samples.map(s=>s.stages[k].wallMs)),cpuMs:summarize(samples.map(s=>s.stages[k].cpuMs))}]));
 output.runs.push({spec,counts,digest:expected,inputBytes:Buffer.byteLength(inputText),collectionBytes:Buffer.byteLength(collectionText),currentBytes:Buffer.byteLength(currentText),resultBytes:samples[0].resultBytes,stageSummary,observedHeapGrowth:summarize(samples.map(s=>s.observedHeapGrowth)),retainedHeapDelta:summarize(samples.map(s=>s.retainedHeapDelta)),samples});
 rmSync(directory,{recursive:true});
}
// Fresh processes, two timezones: same exact resolved result digest.
output.freshProcessProof=['UTC','Pacific/Honolulu'].map(TZ=>({TZ,digest:execFileSync(process.execPath,[new URL(import.meta.url).pathname,'--proof'],{env:{...process.env,TZ},encoding:'utf8'}).trim()}));
assert.equal(output.freshProcessProof[0].digest,output.freshProcessProof[1].digest);
const file=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(file)writeFileSync(file,JSON.stringify(output,null,2)+'\n');else console.log(JSON.stringify(output,null,2));
