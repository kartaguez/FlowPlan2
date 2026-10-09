// G1 laboratory only: no production entry point, persistence, UI or default inputs.
import {
  actualOccupationFromReconstruction, projectActualsKnowledgeFromPortfolio,
  reconstructActuals, createPlanningHorizon, serializeQuantity,
  requestedReservationCapacity, type PlanningInput, type PlanningResult,
  type ActualsReconstruction,
} from "../../domain/index.js";
import type { PlanningSessionState } from "../../application/session/planningSession.js";
import { recomputePlanning } from "../../application/planning/recomputePlanning.js";
import { hydrateHistoricalInputs } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { projectExactTotals } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { projectEstimatedStartDate, projectEstimatedEndDate } from "../../domain/planning/projectEstimatedDates.js";
import { encodeCurrentPlanningInputs } from "../../application/backup/planningInputCodec.js";

export function resolve(snapshot: Pick<PortfolioSnapshot, "inputs" | "actualsSources" | "inputsSchemaVersion">, current: PlanningSessionState) {
  return hydrateHistoricalInputs(snapshot.inputs, snapshot.actualsSources, current, snapshot.inputsSchemaVersion);
}
export function planningInput(state: PlanningSessionState, actuals: ActualsReconstruction): PlanningInput {
  const horizon = createPlanningHorizon({ start: state.planning.startDate, end: state.planning.endDate });
  if (!horizon.ok) throw new TypeError(horizon.errors.map(e => e.message).join());
  return { portfolio: state.portfolio, horizon: horizon.value, workingPattern: state.planning.workingPattern,
    maxParallelProjects: state.planning.maxParallelProjects,
    actualOccupation: actualOccupationFromReconstruction(actuals),
    projectActualsKnowledge: projectActualsKnowledgeFromPortfolio(state.portfolio) };
}
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
// Sorting set-valued result rows preserves multiplicity; arrays with business order are explicit below.
const sorted = <T>(rows: readonly T[], key: (row: T) => string) => [...rows].sort((a,b) => lexical(key(a), key(b)));
const q = serializeQuantity;
export function canonical(state: PlanningSessionState, actuals: ActualsReconstruction, result: PlanningResult) {
  const teamPlans = sorted(result.teamPlans, t => t.teamId).map(t => ({ teamId: t.teamId,
    dayCapacities: sorted(t.dayCapacities, d => d.date).map(d => ({ date: d.date,
      effectiveCapacity:q(d.effectiveCapacity), reservedCapacity:q(d.reservedCapacity), projectCapacity:q(d.projectCapacity),
      overReserved:d.overReserved, projectActualCapacity:q(d.projectActualCapacity), reservationActualCapacity:q(d.reservationActualCapacity),
      actualOverCapacity:q(d.actualOverCapacity), reservationOverCapacity:q(d.reservationOverCapacity) })),
    dayAdmissions: sorted(t.dayAdmissions, d => d.date).map(d => ({date:d.date, admittedProjectIds:[...d.admittedProjectIds]})),
    projectPlans: sorted(t.projectPlans, p => p.projectId).map(p => ({ projectId:p.projectId, teamId:p.teamId,
      allocations:sorted(p.allocations, a => a.date).map(a => ({date:a.date, workload:q(a.workload)})),
      plannedWorkload:q(p.plannedWorkload), remainingUnplannedWorkload:q(p.remainingUnplannedWorkload), complete:p.complete,
      projectedEndDate:p.projectedEndDate ?? null, deadlineStatus:p.deadlineStatus ?? null,
      deadlineStatuses:p.deadlineStatuses === undefined ? null : sorted(p.deadlineStatuses, d => d.date).map(d => ({...d})) })) }));
  const contributions = sorted(actuals.contributions.map(c => ({...c, amount:q(c.amount), recordIndex:c.recordIndex ?? null,
    snapshotId:c.snapshotId ?? null, periodId:c.periodId ?? null})), c => JSON.stringify([c.sourceKind,c.sourceId,c.teamId,c.date,c.recordIndex,c.snapshotId,c.periodId]));
  const totals = sorted(actuals.teamDayTotals.map(t => ({...t,amount:q(t.amount)})), t => `${t.teamId}\0${t.date}`);
  const input = planningInput(state, actuals);
  const occupation = sorted(input.actualOccupation.map(d => ({...d,projectActual:q(d.projectActual),reservationActual:q(d.reservationActual)})), d => `${d.teamId}\0${d.date}`);
  const projects = sorted(state.portfolio.projects, p => p.id).map(p => {
    const plans = result.teamPlans.flatMap(t => t.projectPlans.filter(r => r.projectId === p.id));
    return {projectId:p.id,name:p.name,priorityPosition:state.portfolio.priorityOrder.indexOf(p.id)+1,
      ...projectExactTotals(p),start:projectEstimatedStartDate(p.id,actuals.contributions,plans.flatMap(t=>t.allocations)),
      end:projectEstimatedEndDate(p.isActive,plans)};
  });
  const reservations = sorted(state.portfolio.reservations, r=>r.id).flatMap(r=>sorted(state.portfolio.teams,t=>t.id).flatMap(t=>
    result.teamPlans.find(p=>p.teamId===t.id)!.dayCapacities.map(d=>({reservationId:r.id,teamId:t.id,date:d.date,
      requested:q(requestedReservationCapacity(r,t,d.date,state.planning.workingPattern))}))));
  return {contract:"lot11d2-business/1",teamPlans,diagnostics:sorted(result.diagnostics,d=>JSON.stringify([d.code,d.teamId??null,d.projectId??null,d.date??null])).map(d=>({code:d.code,teamId:d.teamId??null,projectId:d.projectId??null,date:d.date??null})),
    contributions,totals,occupation,knowledge:sorted(input.projectActualsKnowledge,p=>p.projectId),projects,reservations};
}
export function run(state: PlanningSessionState) {
  const actuals = reconstructActuals(state.portfolio,state.planning.workingPattern);
  const input = planningInput(state,actuals);
  const result = recomputePlanning(input).planningResult;
  return {actuals,input,result,canonical:canonical(state,actuals,result)};
}
/** Exact resolved input identity, including full prefixes and provenance. No opaque Domain JSON. */
export const resolvedInputs = (state: PlanningSessionState) => encodeCurrentPlanningInputs(state);
