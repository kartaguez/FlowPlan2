// Isolated G1 fixture. Based on the 11A rich case; never imported by production.
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { decodePlanningInputs, encodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import { snapshotId } from "../../domain/index.js";
import type { PlanningSessionState } from "../../application/session/planningSession.js";
export function rich(mode: "none" | "raf-only" | "zero" | "v5" | "legacy" | "reconciled" = "none"): PlanningSessionState {
  const data: any = encodePlanningInputs(createDemoPlanningScenario());
  data.planning.workingWeekdays = [1, 2, 4, 5]; data.planning.maxParallelProjects = 3;
  data.portfolio.teams[0].capacitySchedule.exceptions = [{ date: "2024-12-01", capacity: "1/3" }, { date: "2025-01-01", capacity: "7/3" }];
  data.portfolio.teams[0].capacitySchedule.periods[0].unavailabilityRatio = "1/3";
  data.portfolio.teams[0].capacitySchedule.periods[1].dailyCapacity = "8/3";
  const p = data.portfolio.projects[0]; const ids = p.requirements.map((r: any) => r.teamId);
  p.requirements[0].dailyCap = "1/3"; p.requirements[0].remainingWorkload = "7/3";
  p.requirements[1].remainingWorkload = "2/3";
  p.earliestStartDate = "2025-01-10"; p.objectiveEndDate = "2025-02-01"; p.mandatoryDeadline = "2025-02-01";
  data.portfolio.projects[1].isActive = false;
  data.portfolio.reservations[0].isActive = false;
  data.portfolio.reservations[1].teamAllocations[0].amount = { kind: "fixed-daily", dailyCapacity: "2/3" };
  if (mode === "legacy" || mode === "reconciled") {
    p.legacyV4Actuals = { actualsFromDate: "2024-12-01", records: [
      { actualsThroughDate: "2024-12-01", teams: [{ teamId: ids[0], cumulativeConsumed: "1/3", remainingWorkload: "5/3" },
        { teamId: data.portfolio.teams[2].id, cumulativeConsumed: "2/3", remainingWorkload: "1/1" }] },
      { actualsThroughDate: "2024-12-02", teams: [{ teamId: ids[1], cumulativeConsumed: "2/3", remainingWorkload: "2/3" }] },
      { actualsThroughDate: "2024-12-03", teams: [{ teamId: ids[0], cumulativeConsumed: "4/3", remainingWorkload: "7/3" }] },
    ], rafAuthorityByTeam: ids.map((teamId: string) => ({ teamId, authority: "current-configuration" })) };
    p.migrationStatus = "legacy-pending";
    const r = data.portfolio.reservations[0];
    r.legacyV4Actuals = { actualsFromDate: "2024-12-01", records: [{ actualsThroughDate: "2024-12-02", teams: [
      { teamId: data.portfolio.teams[2].id, cumulativeConsumed: "1/3" }] }] }; r.migrationStatus = "legacy-pending";
  }
  if (["raf-only", "zero", "v5", "reconciled"].includes(mode)) {
    p.snapshots = [{ snapshotId: snapshotId("project", p.id, 1), version: 1, knowledgeDate: "2025-01-06", participation: ids, retiredZeroTeams: mode === "reconciled" ? [data.portfolio.teams[2].id] : [],
      raf: p.requirements.map((r: any) => ({ teamId: r.teamId, amount: r.remainingWorkload })),
      ...(mode === "raf-only" ? {} : { coverage: { actualsFrom: "2024-12-01", actualsThrough: "2024-12-02", periods: [
        { periodId: "p1", from: "2024-12-01", through: "2024-12-02", consumed: ids.map((teamId: string) => ({ teamId, amount: mode === "zero" ? "0/1" : "1/3" })) }] } }) }];
    p.migrationStatus = mode === "reconciled" ? "reconciled" : "native";
    const r = data.portfolio.reservations[1]; const teams = r.teamAllocations.map((a: any) => a.teamId);
    r.migrationStatus = "native";
    r.snapshots = [{ snapshotId: snapshotId("reservation", r.id, 1), version: 1, knowledgeDate: "2025-01-06", participation: teams, retiredZeroTeams: [],
      coverage: { actualsFrom: "2025-01-01", actualsThrough: "2025-01-01", periods: [{ periodId: "rp1", from: "2025-01-01", through: "2025-01-01", consumed: teams.map((teamId: string) => ({ teamId, amount: "0/1" })) }] } }];
  }
  return decodePlanningInputs(data, 5, undefined, true);
}

/** Lossless factories remain the authority; edits never relax a validator. */
export function edit(state: PlanningSessionState, mutate: (dto: any) => void) {
  const dto = encodePlanningInputs(state, 8); mutate(dto);
  return decodePlanningInputs(dto, 8, undefined, true);
}
export function versions() {
  return edit(rich("v5"), dto => {
    const p = dto.portfolio.projects[0], first = p.snapshots[0];
    first.coverage.actualsThrough = "2025-01-02";
    first.coverage.periods = [
      {periodId:"positive",from:"2024-12-01",through:"2024-12-31",consumed:first.participation.map((teamId:string)=>({teamId,amount:"17/97"}))},
      {periodId:"zero-tail",from:"2025-01-01",through:"2025-01-02",consumed:first.participation.map((teamId:string)=>({teamId,amount:"0/1"}))},
    ];
    const next = structuredClone(first); next.version=2; next.snapshotId=snapshotId("project",p.id,2); next.knowledgeDate="2025-01-07";
    // Erosion and correction are a new immutable knowledge version, not cumulative observations.
    next.coverage.actualsThrough="2024-12-31"; next.coverage.periods.pop();
    next.coverage.periods[0].periodId="corrected";
    next.coverage.periods[0].consumed.forEach((c:any)=>c.amount="19/101");
    p.snapshots.push(next);
  });
}
export function membership() {
  return edit(rich("zero"), dto=>{
    const p=dto.portfolio.projects[0], old=p.snapshots[0], removed=structuredClone(old), team=p.requirements[1].teamId;
    removed.version=2; removed.snapshotId=snapshotId("project",p.id,2);
    removed.participation.pop(); removed.retiredZeroTeams=[team]; removed.raf.pop();
    removed.coverage.periods[0].periodId="retired"; removed.coverage.periods[0].consumed.pop();
    const back=structuredClone(old); back.version=3; back.snapshotId=snapshotId("project",p.id,3);
    back.coverage.periods[0].periodId="reintroduced"; p.snapshots.push(removed,back);
  });
}
export const cases = () => [
  ...(["none","raf-only","zero","v5","legacy","reconciled"] as const).map(mode=>({name:mode,state:rich(mode)})),
  {name:"versions-erosion-correction",state:versions()},
  {name:"retired-reintroduced",state:membership()},
  {name:"independent-raf",state:edit(rich("v5"),d=>d.portfolio.projects[0].requirements[0].remainingWorkload="23/103")},
  {name:"zero-capacity-impossible",state:edit(rich(),d=>{d.portfolio.teams.forEach((t:any)=>t.capacitySchedule={periods:[],exceptions:[]});})},
  {name:"future-v4",state:edit(rich("legacy"),d=>d.portfolio.projects[0].legacyV4Actuals.records.at(-1).actualsThroughDate="2027-01-01")},
  {name:"complex-rationals-overload",state:edit(rich("v5"),d=>{
    const p=d.portfolio.projects[0],s=p.snapshots[0];
    p.requirements[0].remainingWorkload="9876543210987654321/100000000000000000003";
    d.portfolio.reservations.forEach((r:any)=>{r.isActive=true;r.startDate="2025-01-01";r.endDate="2025-01-31";r.teamAllocations.forEach((a:any)=>a.amount={kind:"fixed-daily",dailyCapacity:"2/3"});});
    s.coverage={actualsFrom:"2025-01-02",actualsThrough:"2025-01-02",periods:[{periodId:"large-exact",from:"2025-01-02",through:"2025-01-02",consumed:s.participation.map((teamId:string)=>({teamId,amount:"12345678901234567890123/100000000000000000003"}))}]};
  })},
  {name:"daily-cap-zero",state:edit(rich(),d=>d.portfolio.projects[0].requirements[0].dailyCap="0/1")},
  {name:"inactive-actuals",state:edit(rich("v5"),d=>d.portfolio.projects[0].isActive=false)},
];
