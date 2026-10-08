import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { decodePlanningInputs, encodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV7 } from "../../application/backup/flowplanBackupV1.js";
import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import { buildProjectHistoryViewModel } from "../../application/history/buildProjectHistoryViewModel.js";
import { calculateCursorMetrics } from "../../adapters/metrics/cursorMetrics.js";
import { actualOccupationFromReconstruction, createCivilDate, createReservationId, projectActualsKnowledgeFromPortfolio, serializeQuantity, snapshotId } from "../../domain/index.js";
import { projectActualsRange } from "../../domain/portfolioSnapshots/historicalDailyProfile.js";
import type { HistoricalProjectForecastV2 } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";

const viewport = { width: 1440, teamLaneHeight: 100, timeAxisHeight: 76 };
const instant = "2026-10-08T10:00:00.000Z";
// Candidate DTOs pass the existing strict V5 contracts, including immutable history.
function fixture(mode: "v5" | "zero" | "raf-only" | "none" | "legacy" = "v5", change: (dto: any) => void = () => {}) {
  const dto: any = encodePlanningInputs(createDemoPlanningScenario());
  dto.planning.startDate = "2025-09-01"; dto.planning.endDate = "2025-10-31";
  dto.planning.workingWeekdays = [1,2,3,4,5,6,7]; dto.planning.maxParallelProjects = 1;
  dto.portfolio.reservations = [];
  for (const t of dto.portfolio.teams) t.capacitySchedule = { periods: [{ start:"2025-01-01",end:"2025-12-31",dailyCapacity:"2/1",unavailabilityRatio:"0/1" }], exceptions:[] };
  const p = dto.portfolio.projects[0]; delete p.earliestStartDate; delete p.mandatoryDeadline;
  p.requirements.forEach((r: any, i: number) => { r.remainingWorkload = i ? "2/3" : "1/3"; });
  if (["v5","zero","raf-only"].includes(mode)) {
    p.migrationStatus="native";
    p.snapshots=[{snapshotId:snapshotId("project",p.id,1),version:1,knowledgeDate:"2025-10-08",participation:p.requirements.map((r:any)=>r.teamId),retiredZeroTeams:[],raf:p.requirements.map((r:any)=>({teamId:r.teamId,amount:r.remainingWorkload})),
      ...(mode==="raf-only"?{}:{coverage:{actualsFrom:"2025-08-01",actualsThrough:"2025-09-30",periods:[
        {periodId:"august",from:"2025-08-01",through:"2025-08-31",consumed:p.requirements.map((r:any,i:number)=>({teamId:r.teamId,amount:mode==="zero"||i?"0/1":"1/3"}))},
        {periodId:"zero-tail",from:"2025-09-01",through:"2025-09-30",consumed:p.requirements.map((r:any)=>({teamId:r.teamId,amount:"0/1"}))}
      ]}})}];
  }
  if(mode==="legacy") {
    p.migrationStatus="legacy-pending";
    p.legacyV4Actuals={actualsFromDate:"2025-08-01",records:[{actualsThroughDate:"2025-08-31",teams:[{teamId:p.requirements[0].teamId,cumulativeConsumed:"1/3",remainingWorkload:p.requirements[0].remainingWorkload}]},{actualsThroughDate:"2025-09-30",teams:[{teamId:p.requirements[0].teamId,cumulativeConsumed:"1/3",remainingWorkload:p.requirements[0].remainingWorkload}]}],rafAuthorityByTeam:p.requirements.map((r:any)=>({teamId:r.teamId,authority:"current-configuration"}))};
  }
  change(dto); return decodePlanningInputs(dto,5,undefined,true);
}
function check(state: ReturnType<typeof fixture>) {
  const before=encodePlanningInputs(state);
  const knowledge=projectActualsKnowledgeFromPortfolio(state.portfolio);
  assert.ok(Object.isFrozen(knowledge));assert.ok(knowledge.every(Object.isFrozen));
  assert.deepEqual(knowledge,projectActualsKnowledgeFromPortfolio(state.portfolio));
  assert.deepEqual(knowledge.map(r=>r.projectId),state.portfolio.projects.map(p=>p.id));
  for(const row of knowledge) assert.equal(row.actualsThrough,projectActualsRange(state.portfolio.projects.find(p=>p.id===row.projectId)!)?.through??null);
  const run=buildPlanningSessionProjection({state,geometryViewport:viewport});
  for(const team of run.planningResult.teamPlans) {
    for(const p of team.projectPlans) for(const a of p.allocations) {
      const t=knowledge.find(r=>r.projectId===p.projectId)!.actualsThrough;
      assert.ok(t===null||a.date>t,`${p.projectId}/${team.teamId}/${a.date} <= ${t}`);
    }
    for(const admission of team.dayAdmissions) for(const id of admission.admittedProjectIds) {
      const t=knowledge.find(r=>r.projectId===id)!.actualsThrough;assert.ok(t===null||admission.date>t);
    }
  }
  const snap=capturePortfolioSnapshot(state,run.planningResult,run.actualsReconstruction,"11c-new",instant);
  assert.equal(snap.forecast.engineVersion,"planning-engine-v1/actuals-aware/2");
  for(const row of snap.forecast.projects as readonly HistoricalProjectForecastV2[]) for(const day of row.dailyProfile.days) {
    if(day.forecastWorkload!=="0/1") assert.ok(row.dailyProfile.actualsRange===null||day.date>row.dailyProfile.actualsRange.through);
  }
  assert.deepEqual(encodePlanningInputs(state),before);
  return {run,snap,row:snap.forecast.projects[0]! as HistoricalProjectForecastV2};
}

describe("11C source to projection, capture and History",()=>{
  for(const mode of ["v5","zero","raf-only","none","legacy"] as const) it(`projects ${mode} across both Teams with immutable RAF and zero-tail knowledge`,()=>{
    const state=fixture(mode);const {run,row}=check(state);const p=state.portfolio.projects[0]!;
    const plans=run.planningResult.teamPlans.flatMap(t=>t.projectPlans.filter(r=>r.projectId===p.id));assert.equal(plans.length,2);
    const covered=["v5","zero","legacy"].includes(mode);
    assert.ok(plans.every(r=>r.allocations[0]!.date===(covered?"2025-10-01":"2025-09-01")));
    assert.ok(!actualOccupationFromReconstruction(run.actualsReconstruction).some(r=>r.date>="2025-09-01"&&r.date<="2025-09-30"));
    assert.equal(row.raf,"1/1");assert.equal(row.estimatedEndDate,"2025-10-01" === plans[0]!.allocations.at(-1)!.date ? "2025-10-01" : "2025-09-01");
    if(mode==="v5"||mode==="legacy") assert.equal(row.estimatedStartDate,"2025-08-01");
    if(mode==="zero") {assert.equal(row.estimatedStartDate,"2025-10-01");assert.equal(run.actualsReconstruction.contributions.every(c=>serializeQuantity(c.amount)==="0/1"),true);}
    const selectedDate=createCivilDate("2025-09-30");assert.ok(selectedDate.ok);
    const metrics=calculateCursorMetrics({portfolio:state.portfolio,planningResult:run.planningResult,horizon:run.horizon,selectedDate:selectedDate.value,workingPattern:run.workingPattern});
    const pm=metrics.projects.find(r=>r.projectId===p.id)!;assert.equal(pm.baselineRAF.numerator,1n);assert.equal(pm.baselineRAF.denominator,1n);
    if(covered) assert.equal(pm.allocatedWorkload.numerator,0n);
    assert.ok(run.planningResult.teamPlans.every(t=>t.dayAdmissions[0]!.admittedProjectIds[0]!==p.id)||!covered);
    const restored=decodeFlowplanBackup(encodeFlowplanBackupV7({...state,portfolioSnapshots:[capturePortfolioSnapshot(state,run.planningResult,run.actualsReconstruction,"11c-roundtrip",instant)]},instant));
    assert.deepEqual(encodePlanningInputs(restored),encodePlanningInputs(state));
    const again=check(restored);assert.deepEqual(again.run.planningResult,run.planningResult);
  });
  for(const through of ["2025-08-31","2025-09-15","2025-10-08",null]) it(`current rectification/erosion/extension ${through} replaces older knowledge`,()=>{
    const state=fixture("zero",dto=>{
      const p=dto.portfolio.projects[0],old=p.snapshots[0];const next=structuredClone(old);next.version=2;next.snapshotId=snapshotId("project",p.id,2);
      if(through===null) delete next.coverage;
      else {next.coverage.actualsThrough=through;next.coverage.periods=[{periodId:through==="2025-08-31"?"august":"replaced",from:next.coverage.actualsFrom,through,consumed:p.requirements.map((r:any)=>({teamId:r.teamId,amount:"0/1"}))}];}
      p.snapshots.push(next);
    });
    const {run}=check(state);assert.equal(projectActualsKnowledgeFromPortfolio(state.portfolio)[0]!.actualsThrough,through);
    const plans=run.planningResult.teamPlans.flatMap(t=>t.projectPlans.filter(p=>p.projectId===state.portfolio.projects[0]!.id));
    assert.ok(plans.every(p=>p.allocations[0]!.date===(through===null||through<"2025-09-01"?"2025-09-01":through==="2025-09-15"?"2025-09-16":"2025-10-09")));
  });
  it("V5 RAF-only supersedes retained future legacy evidence",()=>{
    const state=fixture("legacy",dto=>{const p=dto.portfolio.projects[0];p.migrationStatus="reconciled";p.snapshots=[{snapshotId:snapshotId("project",p.id,1),version:1,knowledgeDate:"2025-10-08",participation:p.requirements.map((r:any)=>r.teamId),retiredZeroTeams:[],raf:p.requirements.map((r:any)=>({teamId:r.teamId,amount:r.remainingWorkload}))}];p.legacyV4Actuals.records[1].actualsThroughDate="2027-01-01";});
    const {run}=check(state);assert.equal(projectActualsKnowledgeFromPortfolio(state.portfolio)[0]!.actualsThrough,null);assert.equal(run.actualsReconstruction.contributions.length,0);
  });
  it("retains accepted future V4 through without clock clipping",()=>{
    const state=fixture("legacy",dto=>{dto.portfolio.projects[0].legacyV4Actuals.records[1].actualsThroughDate="2027-01-01";});
    const {row}=check(state);assert.equal(row.dailyProfile.actualsRange!.through,"2027-01-01");assert.equal(row.dailyProfile.days.some(d=>d.forecastWorkload!=="0/1"),false);assert.equal(row.endAbsenceReason,"incomplete-within-horizon");
  });
  for(const active of [false,true]) it(`activation ${active} uses current bound and preserves Actuals`,()=>{
    const state=fixture("v5",dto=>{dto.portfolio.projects[0].isActive=active;});const {run}=check(state);
    assert.ok(run.actualsReconstruction.contributions.some(c=>serializeQuantity(c.amount)!=="0/1"));
    assert.equal(run.planningResult.teamPlans.flatMap(t=>t.projectPlans).filter(p=>p.projectId===state.portfolio.projects[0]!.id).length,active?2:0);
  });
  it("removed and reintroduced zero Team keeps one global current boundary",()=>{
    const state=fixture("zero",dto=>{
      const p=dto.portfolio.projects[0],team=p.requirements[1].teamId,old=p.snapshots[0],removed=structuredClone(old);removed.version=2;removed.snapshotId=snapshotId("project",p.id,2);removed.participation=removed.participation.filter((id:string)=>id!==team);removed.retiredZeroTeams=[team];removed.raf=removed.raf.filter((r:any)=>r.teamId!==team);removed.coverage.periods.forEach((r:any)=>{r.periodId+="-removed";r.consumed=r.consumed.filter((c:any)=>c.teamId!==team);});
      const reintroduced=structuredClone(old);reintroduced.version=3;reintroduced.snapshotId=snapshotId("project",p.id,3);reintroduced.coverage.periods.forEach((r:any)=>r.periodId+="-reintroduced");p.snapshots.push(removed,reintroduced);
    });const {run}=check(state);assert.equal(run.planningResult.teamPlans.flatMap(t=>t.projectPlans).filter(p=>p.projectId===state.portfolio.projects[0]!.id).length,2);
  });
  for (const condition of ["zero-raf", "partial", "no-capacity", "daily-cap", "new-team", "removed-team"] as const) it(`preserves planning and source contracts for ${condition}`,()=>{
    const state=fixture("zero",dto=>{
      const p=dto.portfolio.projects[0],current=p.snapshots[0];
      if(condition==="zero-raf"||condition==="partial") {p.requirements.forEach((r:any)=>r.remainingWorkload=condition==="zero-raf"?"0/1":"1000/1");current.raf=p.requirements.map((r:any)=>({teamId:r.teamId,amount:r.remainingWorkload}));}
      if(condition==="no-capacity") dto.portfolio.teams.forEach((t:any)=>t.capacitySchedule.periods=[]);
      if(condition==="daily-cap") p.requirements.forEach((r:any)=>r.dailyCap="1/3");
      if(condition==="new-team") {
        const teamId=dto.portfolio.teams[2].id;p.requirements.push({teamId,remainingWorkload:"1/3"});
        const next=structuredClone(current);next.version=2;next.snapshotId=snapshotId("project",p.id,2);next.participation.push(teamId);next.raf.push({teamId,amount:"1/3"});next.coverage.periods.forEach((r:any)=>{r.periodId+="-added";r.consumed.push({teamId,amount:"0/1"});});p.snapshots.push(next);
      }
      if(condition==="removed-team") {
        const teamId=p.requirements.pop().teamId,next=structuredClone(current);next.version=2;next.snapshotId=snapshotId("project",p.id,2);next.participation=next.participation.filter((id:string)=>id!==teamId);next.retiredZeroTeams=[teamId];next.raf=next.raf.filter((r:any)=>r.teamId!==teamId);next.coverage.periods.forEach((r:any)=>{r.periodId+="-removed";r.consumed=r.consumed.filter((c:any)=>c.teamId!==teamId);});p.snapshots.push(next);
      }
    });const {row,run}=check(state);const plans=run.planningResult.teamPlans.flatMap(t=>t.projectPlans.filter(p=>p.projectId===row.projectId));
    assert.equal(plans.length,state.portfolio.projects[0]!.requirements.length);
    if(condition==="partial"||condition==="no-capacity") assert.equal(row.endAbsenceReason,"incomplete-within-horizon");
    if(condition==="zero-raf") {assert.equal(row.estimatedStartDate,null);assert.equal(row.endAbsenceReason,"no-allocation");assert.ok(plans.every(p=>p.complete));}
  });
  for(const kind of ["ratio","fixed-daily"] as const) it(`Reservation ${kind} Actuals and Forecast remain additive on covered days`,()=>{
    const state=fixture("zero",dto=>{
      const reservationId=createReservationId("11c-reservation");assert.ok(reservationId.ok);const teamId=dto.portfolio.teams[0].id;dto.portfolio.reservations=[{id:"11c-reservation",name:"Independent demand",isActive:true,ownColor:"#336699",startDate:"2025-09-01",endDate:"2025-10-31",teamAllocations:[{teamId,amount:kind==="ratio"?{kind,ratio:"1/2"}:{kind,dailyCapacity:"1/1"}}],migrationStatus:"native",snapshots:[{snapshotId:snapshotId("reservation",reservationId.value,1),version:1,knowledgeDate:"2025-10-08",participation:[teamId],retiredZeroTeams:[],coverage:{actualsFrom:"2025-09-01",actualsThrough:"2025-09-01",periods:[{periodId:"reservation-period",from:"2025-09-01",through:"2025-09-01",consumed:[{teamId,amount:"3/1"}]}]}}]}];
    });const {run}=check(state);const day=run.planningResult.teamPlans[0]!.dayCapacities[0]!;
    assert.equal(serializeQuantity(day.reservedCapacity),"1/1");assert.equal(serializeQuantity(day.reservationActualCapacity),"3/1");
    assert.equal(serializeQuantity(day.actualOverCapacity),"1/1");assert.equal(serializeQuantity(day.reservationOverCapacity),"1/1");assert.equal(serializeQuantity(day.projectCapacity),"0/1");
  });
  it("old overlapping /1 and new separated /2 profiles survive mixed V7 and History exactly",()=>{
    const raw=JSON.parse(readFileSync("src/main/planning/fixtures/lot11c-baseline-overlap.json","utf8"));
    // Captured inputs select V5 IDs; restore the known baseline source explicitly.
    const baselineDto:any=encodePlanningInputs(createDemoPlanningScenario());const p=baselineDto.portfolio.projects[0];p.requirements.forEach((r:any)=>r.remainingWorkload="2/3");p.migrationStatus="native";
    p.snapshots=[{snapshotId:snapshotId("project",p.id,1),version:1,knowledgeDate:"2026-01-01",participation:p.requirements.map((r:any)=>r.teamId),retiredZeroTeams:[],raf:p.requirements.map((r:any)=>({teamId:r.teamId,amount:r.remainingWorkload})),coverage:{actualsFrom:"2025-01-01",actualsThrough:"2025-01-01",periods:[{periodId:"a",from:"2025-01-01",through:"2025-01-01",consumed:p.requirements.map((r:any)=>({teamId:r.teamId,amount:"1/3"}))}]}}];
    const baselineState=decodePlanningInputs(baselineDto,5,undefined,true);const old=validateHistoricalSnapshot(raw,baselineState);
    assert.ok((old.forecast.projects[0] as HistoricalProjectForecastV2).dailyProfile.days.some(d=>d.actualsWorkload!=="0/1"&&d.forecastWorkload!=="0/1"));
    const {snap:newer}=check(baselineState);const collection=[old,newer];
    const loaded=decodeFlowplanBackup(encodeFlowplanBackupV7({...baselineState,portfolioSnapshots:collection},instant));assert.deepEqual(loaded.portfolioSnapshots,collection);
    const vm=buildProjectHistoryViewModel(loaded.portfolioSnapshots!);assert.equal(vm.snapshots.length,2);
    assert.deepEqual(loaded.portfolioSnapshots![0],raw);assert.equal(newer.forecast.engineVersion,"planning-engine-v1/actuals-aware/2");

  });
});

it("11C accepted erosion/RAF-only commands derive bounds once, failures stay atomic, Save/Delete reuse projection", async()=>{
  const {createPlanningSession}=await import("../../application/session/planningSession.js");
  const {createPlanningProjectionDispatcher}=await import("./synchronousPlanningDispatcher.fixture.js");
  const state=fixture("zero"),p=state.portfolio.projects[0]!,current=p.snapshots![0]!;
  const today=createCivilDate("2025-10-08");assert.ok(today.ok);
  const session=createPlanningSession(state,{today:()=>today.value});let builds=0,writes=0,failWrite=false,failProjection=false,stored="prior";
  const dispatcher=createPlanningProjectionDispatcher({session,geometryViewport:viewport,hasUnappliedChanges:()=>false,now:()=>instant,snapshotId:()=>"transaction11c",
    buildProjection:input=>{builds++;if(failProjection)throw Error("projection");return buildPlanningSessionProjection(input);},backupStore:{read:()=>stored,write:text=>{if(failWrite)throw Error("quota");writes++;stored=text;}}});
  const command={kind:"replace-project-actuals" as const,projectId:p.id,baseVersion:1,intent:{kind:"erosion" as const},teamRequirements:p.requirements.map(r=>({teamId:r.teamId})),
    current:{participation:current.participation,retiredZeroTeams:current.retiredZeroTeams,raf:current.raf,coverage:{...current.coverage!,actualsThrough:current.coverage!.periods[0]!.through,periods:[current.coverage!.periods[0]!]}},evidence:{consumedCells:[],rafTeams:current.participation}};
  const previousState=session.getState(),previousProjection=dispatcher.getProjection();
  for(const failure of ["projection","write"]) {
    failProjection=failure==="projection";failWrite=failure==="write";assert.equal(dispatcher.dispatch(command).ok,false);
    assert.equal(session.getState(),previousState);assert.equal(dispatcher.getProjection(),previousProjection);assert.equal(stored,"prior");
  }
  failProjection=false;failWrite=false;const before=builds;assert.equal(dispatcher.dispatch(command).ok,true);assert.equal(builds,before+1);assert.equal(writes,1);
  assert.equal(projectActualsKnowledgeFromPortfolio(session.getState().portfolio)[0]!.actualsThrough,"2025-08-31");
  assert.ok(dispatcher.getProjection().planningResult.teamPlans.flatMap(t=>t.projectPlans.filter(r=>r.projectId===p.id)).every(r=>r.allocations[0]!.date==="2025-09-01"));
  const next=session.getState().portfolio.projects[0]!.snapshots!.at(-1)!;
  const rafOnly={...command,baseVersion:2,intent:{kind:"raf-only" as const},current:{participation:next.participation,retiredZeroTeams:next.retiredZeroTeams,coverage:next.coverage!,raf:next.raf},evidence:{consumedCells:[],rafTeams:next.participation}};
  const stable=session.getState();const count=builds;assert.equal(dispatcher.dispatch(rafOnly).ok,true);assert.equal(session.getState(),stable);assert.equal(builds,count);
  assert.equal(dispatcher.dispatch({...command,baseVersion:1}).ok,false);assert.equal(builds,count);
  const projection=dispatcher.getProjection();assert.equal(dispatcher.savePortfolioSnapshot().ok,true);assert.equal(builds,count);assert.equal(dispatcher.getProjection(),projection);
  const captured=dispatcher.getPortfolioSnapshots()[0]!;assert.equal(captured.forecast.engineVersion,"planning-engine-v1/actuals-aware/2");assert.deepEqual(decodeFlowplanBackup(stored).portfolioSnapshots,[captured]);
  assert.equal(dispatcher.deletePortfolioSnapshot(captured.snapshotId).ok,true);assert.equal(builds,count);assert.equal(dispatcher.getProjection(),projection);
});
