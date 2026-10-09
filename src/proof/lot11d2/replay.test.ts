import assert from "node:assert/strict";
import { it } from "node:test";
import { cases, rich, edit, versions } from "./inputs.fixture.js";
import { run, canonical, resolve, resolvedInputs } from "./replay.fixture.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import { captureLegacyInputs } from "../../application/portfolioSnapshots/legacyCapture.fixture.js";
import { snapshotId, serializeQuantity, rationalOf, addRationals, rationalFromInteger, rationalToCanonicalString } from "../../domain/index.js";
import { readFileSync } from "node:fs";
const viewport={width:1000,teamLaneHeight:100,timeAxisHeight:76};
const instant="2026-10-09T10:00:00.000Z";
const capture=(state:ReturnType<typeof rich>,legacy=false)=>{
  const current=buildPlanningSessionProjection({state,geometryViewport:viewport});
  const snapshot=(legacy?captureLegacyInputs:capturePortfolioSnapshot)(state,current.planningResult,current.actualsReconstruction,"proof",instant);
  return {current,snapshot};
};
for(const {name,state} of cases()) for(const schema of (["independent-raf","complex-rationals-overload"].includes(name)?[2]:[1,2])) it(`11D.2 parity ${name} inputs${schema}`,()=>{
  const {current,snapshot}=capture(state,schema===1), bytes=JSON.stringify(snapshot);
  const historical=resolve(snapshot,state), replay=run(historical);
  assert.deepEqual(resolvedInputs(historical),resolvedInputs(state));
  assert.deepEqual(replay.canonical,canonical(state,current.actualsReconstruction,current.planningResult));
  assert.equal(JSON.stringify(snapshot),bytes);
  // Source quantities are conserved by each exact distribution, including out-of-horizon rows.
  for(const p of historical.portfolio.projects) {
    const contributions=replay.actuals.contributions.filter(c=>c.sourceKind==="project"&&c.sourceId===p.id);
    const sum=contributions.reduce((s,c)=>addRationals(s,rationalOf(c.amount)),rationalFromInteger(0n));
    assert.equal(rationalToCanonicalString(sum),replay.canonical.projects.find(r=>r.projectId===p.id)!.actuals);
    const through=replay.input.projectActualsKnowledge.find(k=>k.projectId===p.id)!.actualsThrough;
    for(const plan of replay.result.teamPlans.flatMap(t=>t.projectPlans).filter(r=>r.projectId===p.id)) {
      assert.ok(plan.allocations.every(a=>through===null||a.date>through));
      const requirement=p.requirements.find(r=>r.teamId===plan.teamId)!;
      assert.equal(rationalToCanonicalString(addRationals(rationalOf(plan.plannedWorkload),rationalOf(plan.remainingUnplannedWorkload))),serializeQuantity(requirement.remainingWorkload));
    }
    const row=replay.canonical.projects.find(r=>r.projectId===p.id)!;
    const actual = sum, raf=p.requirements.reduce((s,r)=>addRationals(s,rationalOf(r.remainingWorkload)),rationalFromInteger(0n));
    assert.equal(row.eac,rationalToCanonicalString(addRationals(actual,raf)));
  }
  for(const c of replay.actuals.contributions.filter(c=>c.snapshotId)) assert.ok(c.periodId);
});
it("11D.2 exact small oracle: one day 1/3 Actuals + 2/3 RAF = 1 EAC",()=>{
  const state=edit(rich("v5"),d=>{
    const p=d.portfolio.projects[0],t=d.portfolio.teams[0];
    d.portfolio.projects=[p]; d.portfolio.priorityOrder=[p.id]; d.portfolio.reservations=[];
    p.requirements=[{teamId:t.id,remainingWorkload:"2/3"}]; delete p.earliestStartDate;delete p.mandatoryDeadline;
    const s=p.snapshots[0];s.participation=[t.id];s.raf=[{teamId:t.id,amount:"99/1"}];s.coverage={actualsFrom:"2025-01-01",actualsThrough:"2025-01-01",periods:[{periodId:"oracle",from:"2025-01-01",through:"2025-01-01",consumed:[{teamId:t.id,amount:"1/3"}]}]};
    d.planning.startDate="2025-01-01";d.planning.endDate="2025-01-02";d.planning.workingWeekdays=[1,2,3,4,5,6,7];
    d.portfolio.programs=d.portfolio.programs.filter((x:any)=>x.id===p.programId);d.portfolio.priorityFamilies=d.portfolio.priorityFamilies.filter((x:any)=>x.id===p.priorityFamilyId);
    t.capacitySchedule={periods:[{start:"2025-01-01",end:"2025-01-02",dailyCapacity:"1/1"}],exceptions:[]};
  });
  const {snapshot}=capture(state);const replay=run(resolve(snapshot,state));
  assert.equal(replay.canonical.projects[0]!.eac,"1/1");
  const plan=replay.canonical.teamPlans.flatMap(t=>t.projectPlans)[0]!;
  assert.deepEqual(plan.allocations,[{date:"2025-01-02",workload:"2/3"}]);
  assert.equal(replay.canonical.projects[0]!.actuals,"1/3");assert.equal(replay.canonical.projects[0]!.end.date,"2025-01-02");
});
it("11D.2 H remains exact after all Current mutations and V5 append",()=>{
  const state=versions(),{snapshot}=capture(state),h=resolve(snapshot,state),before=run(h).canonical;
  const current=edit(state,d=>{
    d.planning.workingWeekdays=[6,7];d.planning.maxParallelProjects=1;d.planning.endDate="2025-03-01";
    d.portfolio.teams[0].capacitySchedule.periods[0].dailyCapacity="99/1";
    d.portfolio.teams[0].capacitySchedule.exceptions=[{date:"2025-01-01",capacity:"0/1"}];
    d.portfolio.priorityOrder.reverse();const p=d.portfolio.projects[0];p.requirements[0].remainingWorkload="333/1";p.isActive=false;
    const last=structuredClone(p.snapshots.at(-1));last.version=3;last.snapshotId=snapshotId("project",p.id,3);last.knowledgeDate="2025-01-08";
    last.coverage.periods[0].periodId="later";last.coverage.periods[0].consumed.forEach((c:any)=>c.amount="999/1");p.snapshots.push(last);
    const r=d.portfolio.reservations[1];r.isActive=false;r.teamAllocations[0].amount={kind:"ratio",ratio:"1/7"};r.startDate="2025-02-01";r.endDate="2025-02-28";
    d.portfolio.projects[1].isActive=true;d.portfolio.reservations[0].isActive=true;
    p.name="Later Project";p.earliestStartDate="2025-02-01";p.objectiveEndDate="2025-02-28";p.mandatoryDeadline="2025-02-28";
    p.requirements[0].dailyCap="0/1";d.portfolio.programs[0].name="Later program";d.portfolio.programs[0].color="#FF0000";
    d.portfolio.priorityFamilies[0].name="Later PAS";
  });
  const after=resolve(snapshot,current);assert.deepEqual(resolvedInputs(after),resolvedInputs(h));assert.deepEqual(run(after).canonical,before);
  assert.equal(after.portfolio.projects[0]!.snapshots!.length,2);assert.equal(current.portfolio.projects[0]!.snapshots!.length,3);
  assert.notDeepEqual(run(current).canonical,before);
});
it("11D.2 repeat x10 and valid unordered permutations preserve full canonical result",()=>{
  const state=versions(),expected=run(state).canonical;
  for(let n=0;n<10;n++) assert.deepEqual(run(state).canonical,expected);
  const permuted=edit(state,d=>{
    d.portfolio.teams.reverse();d.portfolio.projects.reverse();d.portfolio.reservations.reverse();
    d.portfolio.projects.forEach((p:any)=>p.snapshots?.forEach((s:any)=>{s.raf.reverse();s.coverage?.periods.forEach((r:any)=>r.consumed.reverse());}));
  });assert.deepEqual(run(permuted).canonical,expected);
});
it("11D.2 coupled membership permutation valid; priority order remains semantic",()=>{
  const state=rich("v5"),expected=run(state).canonical;
  const permuted=edit(state,d=>{const p=d.portfolio.projects[0];p.requirements.reverse();p.snapshots.forEach((s:any)=>s.participation.reverse());});
  assert.deepEqual(run(permuted).canonical,expected);
  assert.notDeepEqual(run(edit(state,d=>d.portfolio.priorityOrder.reverse())).canonical,expected);
});
it("11D.2 historical business result does not access forecast or UI/clock",()=>{
  const state=rich("v5"),{snapshot}=capture(state),expected=run(resolve(snapshot,state)).canonical;
  const poisoned={...snapshot};Object.defineProperty(poisoned,"forecast",{get(){throw Error("forbidden forecast");}});
  const original=Date.now;Date.now=()=>{throw Error("forbidden clock");};
  try{assert.deepEqual(run(resolve(poisoned,state)).canonical,expected);}finally{Date.now=original;}
  for(const width of [390,1440]) {const p=buildPlanningSessionProjection({state,geometryViewport:{...viewport,width}});assert.deepEqual(canonical(state,p.actualsReconstruction,p.planningResult),expected);}
});
it("11D.2 old engine overlapping artifact remains intact, current replay separates Actuals",()=>{
  const raw=JSON.parse(readFileSync("src/main/planning/fixtures/lot11c-baseline-overlap.json","utf8"));
  const state=edit(rich(),d=>{const p=d.portfolio.projects[0];p.requirements.forEach((r:any)=>r.remainingWorkload="2/3");p.migrationStatus="native";p.snapshots=[{snapshotId:snapshotId("project",p.id,1),version:1,knowledgeDate:"2026-01-01",participation:p.requirements.map((r:any)=>r.teamId),retiredZeroTeams:[],raf:p.requirements.map((r:any)=>({teamId:r.teamId,amount:r.remainingWorkload})),coverage:{actualsFrom:"2025-01-01",actualsThrough:"2025-01-01",periods:[{periodId:"a",from:"2025-01-01",through:"2025-01-01",consumed:p.requirements.map((r:any)=>({teamId:r.teamId,amount:"1/3"}))}]}}];});
  const old=validateHistoricalSnapshot(raw,state),bytes=JSON.stringify(old),replay=run(resolve(old,state));
  assert.ok(old.forecast.projects[0] && "dailyProfile" in old.forecast.projects[0] && old.forecast.projects[0].dailyProfile.days.some(d=>d.actualsWorkload!=="0/1"&&d.forecastWorkload!=="0/1"));
  assert.ok(replay.canonical.teamPlans.flatMap(t=>t.projectPlans).filter(p=>p.projectId===raw.inputs.portfolio.projects[0].id).every(p=>p.allocations.every(a=>a.date>"2025-01-01")));
  assert.equal(JSON.stringify(old),bytes);
});
for(const [name,mutate,pattern] of [
  ["missing source",(s:any)=>s.actualsSources.pop(),/Missing historical source/],
  ["unknown snapshot ID",(s:any)=>s.actualsSources[0].snapshotId="missing",/Broken Actuals reference/],
  ["incompatible inputs",(s:any)=>s.inputs.planning.maxParallelProjects=0,/parallel|Parallel|positive/i],
  ["legacy RAF mismatch",(s:any)=>{s.inputsSchemaVersion=1;delete s.inputs.rafModelVersion;s.inputs.portfolio.projects[0].requirements[0].remainingWorkload="99/1";},/ACTUALS_RAF_MISMATCH/],
] as const) it(`11D.2 refusal ${name} without repair or fallback`,()=>{
  const state=rich("v5"),{snapshot}=capture(state),bad=structuredClone(snapshot);mutate(bad);const bytes=JSON.stringify(bad);
  assert.throws(()=>resolve(bad,state),pattern);assert.equal(JSON.stringify(bad),bytes);
});
it("11D.2 refuses corrupted selected prefix and missing owner",()=>{
  const state=versions(),{snapshot}=capture(state);
  const corrupt={...state,portfolio:{...state.portfolio,projects:state.portfolio.projects.map((p,i)=>i? p:{...p,snapshots:p.snapshots!.slice(1)})}};
  assert.throws(()=>resolve(snapshot,corrupt),/version|Version|first|consecutive/i);
  const missing={...state,portfolio:{...state.portfolio,projects:state.portfolio.projects.slice(1)}};
  assert.throws(()=>resolve(snapshot,missing),/Broken Actuals reference/);
});
it("11D.2 unsorted exceptions and uncoupled participation are strict refusals",()=>{
  assert.throws(()=>edit(rich(),d=>d.portfolio.teams[0].capacitySchedule.exceptions.reverse()),/losslessly canonical/);
  assert.throws(()=>edit(rich("v5"),d=>d.portfolio.projects[0].requirements.reverse()),/participation|membership|order/i);
});
it("11D.2 selected closure preserves every ID, zero, period and metadata",()=>{
  const state=versions(),{snapshot}=capture(state),h=resolve(snapshot,state);
  assert.deepEqual(resolvedInputs(h),resolvedInputs(state));
  const p=h.portfolio.projects[0]!;assert.equal(p.snapshots!.length,2);
  assert.equal(p.snapshots![0]!.coverage!.periods[1]!.periodId,"zero-tail");
  assert.ok(p.snapshots![0]!.coverage!.periods[1]!.consumed.every(c=>serializeQuantity(c.amount)==="0/1"));
  assert.equal(p.snapshots![1]!.coverage!.periods[0]!.periodId,"corrected");
  const replay=run(h);
  // Conservation by period AND Team, including Reservations and zeros; provenance retained.
  for(const kind of ["project","reservation"] as const) for(const owner of kind==="project"?h.portfolio.projects:h.portfolio.reservations) {
    const s=owner.snapshots?.at(-1);if(!s?.coverage)continue;
    for(const period of s.coverage.periods)for(const cell of period.consumed) {
      const rows: typeof replay.actuals.contributions = replay.actuals.contributions.filter(c=>c.sourceKind===kind&&c.sourceId===owner.id&&c.snapshotId===s.snapshotId&&c.periodId===period.periodId&&c.teamId===cell.teamId);
      assert.ok(rows.length>0);const sum=rows.reduce((s,c)=>addRationals(s,rationalOf(c.amount)),rationalFromInteger(0n));
      assert.equal(rationalToCanonicalString(sum),serializeQuantity(cell.amount));
    }
  }
});
it("11D.2 date boundary 9999 and Mandatory beyond short horizon are simulable",()=>{
  for(const boundary of [false,true]) {
    const state=edit(rich(),d=>{
      d.planning.startDate=boundary?"9999-12-31":"2025-01-01";d.planning.endDate=d.planning.startDate;
      d.portfolio.projects.forEach((p:any)=>{delete p.earliestStartDate;p.mandatoryDeadline=boundary?"9999-12-31":"2025-02-01";p.objectiveEndDate=p.mandatoryDeadline;});
    });const {snapshot,current}=capture(state);const h=resolve(snapshot,state);
    assert.deepEqual(run(h).canonical,canonical(state,current.actualsReconstruction,current.planningResult));
  }
});
it("11D.2 legacy inline and explicit none never resolve to reconciled Current V5",()=>{
  for(const mode of ["legacy","none"] as const) {
    const state=rich(mode),{snapshot}=capture(state),before=resolve(snapshot,state);
    const after=resolve(snapshot,rich("reconciled"));
    assert.deepEqual(resolvedInputs(after),resolvedInputs(before));assert.deepEqual(run(after).canonical,run(before).canonical);
    assert.equal(after.portfolio.projects[0]!.snapshots,undefined);
  }
});
it("11D.2 prefix v1 remains selected after erosion/correction v2",()=>{
  const state=versions(),old=edit(state,d=>d.portfolio.projects[0].snapshots.pop()),{snapshot}=capture(old);
  const restored=resolve(snapshot,state);assert.equal(restored.portfolio.projects[0]!.snapshots!.length,1);
  assert.deepEqual(resolvedInputs(restored),resolvedInputs(old));assert.deepEqual(run(restored).canonical,run(old).canonical);
  assert.notDeepEqual(run(restored).canonical,run(state).canonical);
});
it("11D.2 valid extreme legacy state is diagnosed before unsafe reconstruction", async()=>{
  const {resourceRisk}=await import("./resourceRisk.fixture.js");const r=resourceRisk();
  assert.equal(r.diagnostic.kind,"RESOURCE_RISK_NOT_EXECUTED");assert.ok(r.diagnostic.contributionRows>2_000_000);
  assert.equal(r.historical.portfolio.projects[0]!.legacyV4Actuals!.records.at(-1)!.actualsThroughDate,"9999-12-31");
  assert.equal(r.valid.forecast.forecastSchemaVersion,1);
});
it("11D.2 unknown inputs schema and duplicate sources are artifact refusals",()=>{
  const state=rich("v5"),{snapshot}=capture(state),bad:any=structuredClone(snapshot);
  bad.inputsSchemaVersion=99;assert.throws(()=>validateHistoricalSnapshot(bad,state),/Unknown inputs schema/);
  bad.inputsSchemaVersion=2;bad.actualsSources.push(bad.actualsSources[0]);assert.throws(()=>validateHistoricalSnapshot(bad,state),/Missing Actuals source/);
});
it("11D.2 reconstruction calendar and all-date fallback preserve thirds exactly",()=>{
  for(const weekdays of [[1],[7]]) {
    const state=edit(rich("v5"),d=>{
      d.planning.workingWeekdays=weekdays;d.portfolio.teams.forEach((t:any)=>t.capacitySchedule={periods:[],exceptions:[]});
      const s=d.portfolio.projects[0].snapshots[0];s.coverage={actualsFrom:"2024-12-02",actualsThrough:"2024-12-03",periods:[{periodId:"fallback",from:"2024-12-02",through:"2024-12-03",consumed:s.participation.map((teamId:string)=>({teamId,amount:"1/3"}))}]};
    });const {snapshot}=capture(state),replay=run(resolve(snapshot,state));
    const rows=replay.actuals.contributions.filter(c=>c.periodId==="fallback"&&c.teamId===state.portfolio.teams[0]!.id);
    assert.deepEqual(rows.map(c=>serializeQuantity(c.amount)),weekdays[0]===1?["1/3","0/1"]:["1/6","1/6"]);
  }
});
it("11D.2 exact Actuals overload and marginal Reservation overload are separate",()=>{
  const state=cases().find(c=>c.name==="complex-rationals-overload")!.state,replay=run(state);
  assert.ok(replay.result.diagnostics.some(d=>d.code==="TEAM_ACTUALS_OVER_CAPACITY"));
  assert.ok(replay.result.diagnostics.some(d=>d.code==="TEAM_OVER_RESERVED"));
  assert.ok(replay.canonical.teamPlans.some(t=>t.dayCapacities.some(d=>d.date==="2025-01-02"&&d.actualOverCapacity!=="0/1"&&d.reservationOverCapacity!=="0/1")));
});
it("11D.2 repository protects owned prefixes, owner and legacy evidence including RAF authority", async()=>{
  const {createMemoryPlanningRepository}=await import("../../infrastructure/persistence/memoryRepositoryStorage.js");
  for(const mode of ["v5","legacy"] as const) {
    const state=rich(mode),repo=createMemoryPlanningRepository(),stage=await repo.stageImport(state,"seed");
    const initial=await repo.activateImport(stage,null,"init",{fingerprint:"absent",document:null});
    const {snapshot}=capture(state);const token=await repo.createSnapshot(snapshot,initial.currentRevision,initial,"save");
    const expected=run(resolve(snapshot,state)).canonical;
    const edits=mode==="v5"?[
      (d:any)=>d.portfolio.projects[0].snapshots[0].knowledgeDate="2025-01-07",
      (d:any)=>{delete d.portfolio.projects[0].snapshots;d.portfolio.projects[0].migrationStatus="none";},
    ]:[
      (d:any)=>d.portfolio.projects[0].legacyV4Actuals.records.at(-1).teams[0].cumulativeConsumed="5/3",
      (d:any)=>d.portfolio.projects[0].legacyV4Actuals.rafAuthorityByTeam[0].authority="latest-actuals",
    ];
    edits.push((d:any)=>{const p=d.portfolio.projects.shift();d.portfolio.priorityOrder=d.portfolio.priorityOrder.filter((id:string)=>id!==p.id);
      const owners=[...d.portfolio.projects,...d.portfolio.reservations];d.portfolio.programs=d.portfolio.programs.filter((p:any)=>owners.some(o=>o.programId===p.id));d.portfolio.priorityFamilies=d.portfolio.priorityFamilies.filter((p:any)=>owners.some(o=>o.priorityFamilyId===p.id));});
    for(let i=0;i<edits.length;i++) {
      const candidate=edit(state,edits[i]!);await assert.rejects(repo.writeCurrent(resolvedInputs(candidate),token,`refuse-${i}`),/immutable|Legacy Actuals evidence|owned Actuals history/);
      const current=await repo.readCurrent();assert.deepEqual(current.token,token);assert.deepEqual(run(resolve(await repo.readSnapshot("proof",token),current.state)).canonical,expected);
    }
    repo.close();
  }
});
it("11D.2 repository append retains selected prefix and exact historical run", async()=>{
  const {createMemoryPlanningRepository}=await import("../../infrastructure/persistence/memoryRepositoryStorage.js");
  const state=rich("v5"),repo=createMemoryPlanningRepository(),stage=await repo.stageImport(state,"seed");
  const initial=await repo.activateImport(stage,null,"init",{fingerprint:"absent",document:null}),{snapshot}=capture(state);
  const saved=await repo.createSnapshot(snapshot,initial.currentRevision,initial,"save");
  const next=edit(state,d=>{const p=d.portfolio.projects[0],s=structuredClone(p.snapshots[0]);s.version=2;s.snapshotId=snapshotId("project",p.id,2);s.knowledgeDate="2025-01-07";s.coverage.periods[0].periodId="append";s.coverage.periods[0].consumed.forEach((r:any)=>r.amount="9/1");p.snapshots.push(s);});
  const token=await repo.writeCurrent(resolvedInputs(next),saved,"append"),historical=await repo.readSnapshot("proof",token),current=await repo.readCurrent();
  assert.deepEqual(historical,snapshot);assert.deepEqual(run(resolve(historical,current.state)).canonical,run(state).canonical);
  repo.close();
});
it("11D.2 all inputs1/2 × forecast1/2 combinations replay identically",()=>{
  const state=rich("v5");for(const legacy of [false,true]) {
    const {snapshot,current}=capture(state,legacy),raw:any=structuredClone(snapshot);raw.forecast.forecastSchemaVersion=1;for(const p of raw.forecast.projects)delete p.dailyProfile;
    const schema1=validateHistoricalSnapshot(raw,state);
    for(const s of [snapshot,schema1])assert.deepEqual(run(resolve(s,state)).canonical,canonical(state,current.actualsReconstruction,current.planningResult));
  }
});
