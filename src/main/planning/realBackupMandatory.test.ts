import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { it } from "node:test";
import { buildTimelineGeometry, buildTimelineViewModel } from "../../adapters/index.js";
import { decodeFlowplanBackup } from "../../application/backup/flowplanBackupV1.js";
import { recomputePlanning } from "../../application/planning/recomputePlanning.js";
import { createPlanningSession, type UpdateProjectCommand } from "../../application/session/planningSession.js";
import { createPlanningHorizon, serializeQuantity, type PlanningResult } from "../../domain/index.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";

const fixture = join(process.cwd(), "src/main/planning/fixtures/FP2-DTO-2026.10.01.json");
const viewport = Object.freeze({ width: 2160, teamLaneHeight: 100, teamHeaderHeight: 112,
  teamProjectionBandHeight: 22, timeAxisHeight: 76, timeAxisLabelHeight: 20,
  globalMetricsHeight: 100, teamCollectionActionsHeight: 42 });
// Exact planning output from 0c03ec51daeb1073d75ab6eb79da92b9c4465566 before this performance fix.
const baselineDigest = "c9afb5be36622d23b9a0b2b95c0594bc388fc121fd2d4fe60af8ab715ec7ca90";

function planningDigest(plan: PlanningResult): string {
  const summary = {
    teamPlans: plan.teamPlans.map((team) => ({
      teamId: team.teamId,
      dayCapacities: team.dayCapacities.map((day) => [day.date, serializeQuantity(day.effectiveCapacity),
        serializeQuantity(day.reservedCapacity), serializeQuantity(day.projectCapacity), day.overReserved]),
      dayAdmissions: team.dayAdmissions,
      projectPlans: team.projectPlans.map((project) => ({
        projectId: project.projectId, teamId: project.teamId,
        allocations: project.allocations.map((allocation) => [allocation.date, serializeQuantity(allocation.workload)]),
        plannedWorkload: serializeQuantity(project.plannedWorkload),
        remainingUnplannedWorkload: serializeQuantity(project.remainingUnplannedWorkload),
        complete: project.complete, projectedEndDate: project.projectedEndDate,
        deadlineStatus: project.deadlineStatus, deadlineStatuses: project.deadlineStatuses,
      })),
    })),
    diagnostics: plan.diagnostics,
  };
  return createHash("sha256").update(JSON.stringify(summary)).digest("hex");
}

it("rebuilds the real 12178 - SDD projection when its objective becomes Mandatory", () => {
  const restored = decodeFlowplanBackup(readFileSync(fixture, "utf8"));
  const target = restored.portfolio.projects.find((project) => project.name === "12178 - SDD");
  assert.ok(target);
  assert.equal(target.objectiveEndDate, "2027-02-28");
  assert.equal(target.mandatoryDeadline, undefined);
  const command: UpdateProjectCommand = {
    kind: "update-project", projectId: target.id, name: target.name,
    ...(target.programId ? { programId: target.programId } : {}),
    ...(target.priorityFamilyId ? { priorityFamilyId: target.priorityFamilyId } : {}),
    ...(target.earliestStartDate ? { earliestStartDate: target.earliestStartDate } : {}),
    objectiveEndDate: target.objectiveEndDate,
    mandatoryDeadline: target.objectiveEndDate,
    teamRequirements: target.requirements.map((requirement) => ({
      teamId: requirement.teamId, remainingWorkload: requirement.remainingWorkload,
      ...(requirement.dailyCap ? { dailyCap: requirement.dailyCap } : {}),
    })),
  };
  const session = createPlanningSession(restored);
  let projected: ReturnType<typeof buildPlanningSessionProjection> | undefined;
  const started = performance.now();
  const applied = session.dispatch(command, (candidate) => {
    projected = buildPlanningSessionProjection({ state: candidate, geometryViewport: viewport });
  });
  const completeProjectionMs = performance.now() - started;
  assert.equal(applied.ok, true);
  assert.ok(projected);
  assert.equal(session.getState().portfolio.projects.find((project) => project.id === target.id)?.mandatoryDeadline,
    target.objectiveEndDate);
  assert.equal(projected.planningResult.teamPlans.reduce((sum, team) => sum + team.dayCapacities.length, 0), 546);
  assert.equal(projected.geometry.teams.length, 2);
  assert.equal(planningDigest(projected.planningResult), baselineDigest);

  const current = session.getState();
  const horizon = createPlanningHorizon({ start: current.planning.startDate, end: current.planning.endDate });
  assert.equal(horizon.ok, true);
  if (!horizon.ok) return;
  const measure = <T>(task: () => T): [T, number] => {
    const before = performance.now(); const value = task(); return [value, performance.now() - before];
  };
  const [planningResult, planningMs] = measure(() => recomputePlanning({ portfolio: current.portfolio,
    horizon: horizon.value, workingPattern: current.planning.workingPattern,
    maxParallelProjects: current.planning.maxParallelProjects, projectActualsKnowledge: current.portfolio.projects.map(project => ({ projectId: project.id, actualsThrough: null })), actualOccupation: [] }).planningResult);
  const [viewModel, viewModelMs] = measure(() => buildTimelineViewModel({ portfolio: current.portfolio,
    horizon: horizon.value, planningResult, workingPattern: current.planning.workingPattern }));
  const [geometry, geometryMs] = measure(() => buildTimelineGeometry({ viewModel, viewport }));
  assert.equal(planningDigest(planningResult), planningDigest(projected.planningResult));
  assert.equal(geometry.teams.length, projected.geometry.teams.length);
  assert.ok(completeProjectionMs < 5000, `Full projection took ${completeProjectionMs.toFixed(0)} ms`);
  console.log(`Real backup Mandatory phases: planning=${planningMs.toFixed(1)}ms, viewModel=${viewModelMs.toFixed(1)}ms, geometry=${geometryMs.toFixed(1)}ms, full=${completeProjectionMs.toFixed(1)}ms`);
});
