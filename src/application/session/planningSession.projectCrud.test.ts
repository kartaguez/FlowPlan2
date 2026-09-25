import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlanningSession, type CreateProjectCommand } from "./planningSession.js";
import { createProjectIdGenerator } from "./projectIdGenerator.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  createCivilDate, createPortfolio, createProjectId, createProgramId, createPriorityFamilyId,
  remainingWorkloadFromSerialized, serializeQuantity, type DomainResult,
} from "../../domain/index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function command(): CreateProjectCommand {
  const portfolio = createDemoPlanningScenario().portfolio;
  return {
    kind: "create-project", name: "  New Project  ",
    programId: portfolio.programs[0]!.id,
    priorityFamilyId: portfolio.priorityFamilies[0]!.id,
    teamRequirements: [{ teamId: portfolio.teams[0]!.id,
      remainingWorkload: must(remainingWorkloadFromSerialized("1/3")) }],
  };
}

describe("PlanningSession Project lifecycle", () => {
  it("creates at the last global priority with exact RAF and both optional associations", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const result = session.dispatch(command());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const created = result.state.portfolio.projects.at(-1)!;
    assert.equal(created.name, "New Project");
    assert.equal(created.programId, initial.portfolio.programs[0]!.id);
    assert.equal(created.priorityFamilyId, initial.portfolio.priorityFamilies[0]!.id);
    assert.equal(serializeQuantity(created.requirements[0]!.remainingWorkload), "1/3");
    assert.equal(created.requirements[0]!.dailyCap, undefined);
    assert.deepEqual(result.state.portfolio.priorityOrder,
      [...initial.portfolio.priorityOrder, created.id]);
    assert.equal(result.state.portfolio.projects.length, initial.portfolio.projects.length + 1);
    const moved = session.dispatch({ kind: "reorder-project", projectId: created.id, targetPosition: 1 });
    assert.equal(moved.ok, true);
    if (!moved.ok) return;
    const removed = session.dispatch({ kind: "remove-project", projectId: initial.portfolio.priorityOrder[1]! });
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.deepEqual(removed.state.portfolio.priorityOrder,
      [created.id, initial.portfolio.priorityOrder[0], ...initial.portfolio.priorityOrder.slice(2)]);
    assert.equal(removed.state.portfolio.projects.some((project) =>
      project.id === initial.portfolio.priorityOrder[1]), false);
  });

  it("rejects invalid creation and unknown deletion without changing the state", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const valid = command();
    const unknownTeam = must(createProjectId("unknown")) as unknown as typeof valid.teamRequirements[number]["teamId"];
    const variants: readonly CreateProjectCommand[] = [
      { ...valid, name: " " },
      { ...valid, teamRequirements: [] },
      { ...valid, teamRequirements: [valid.teamRequirements[0]!, valid.teamRequirements[0]!] },
      { ...valid, teamRequirements: [{ ...valid.teamRequirements[0]!, teamId: unknownTeam }] },
      { ...valid, programId: must(createProgramId("absent")) },
      { ...valid, priorityFamilyId: must(createPriorityFamilyId("absent")) },
    ];
    for (const variant of variants) {
      const before = session.getState();
      assert.equal(session.dispatch(variant).ok, false);
      assert.strictEqual(session.getState(), before);
    }
    const before = session.getState();
    assert.equal(session.dispatch({ kind: "remove-project", projectId: must(createProjectId("absent")) }).ok, false);
    assert.strictEqual(session.getState(), before);
  });

  it("skips occupied IDs and creates in an initially empty Project portfolio", () => {
    const initial = createDemoPlanningScenario();
    const occupied = must(createProjectId("project-session-1"));
    const generator = createProjectIdGenerator(() => [occupied]);
    assert.equal(generator.next(), "project-session-2");
    const emptyPortfolio = must(createPortfolio({ ...initial.portfolio,
      projects: [], priorityOrder: [] }));
    const session = createPlanningSession({ ...initial, portfolio: emptyPortfolio });
    const result = session.dispatch(command());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.state.portfolio.projects.length, 1);
    assert.deepEqual(result.state.portfolio.priorityOrder,
      [result.state.portfolio.projects[0]!.id]);
  });

  it("reprojects once per accepted mutation and never on refusal", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    let builds = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session,
      geometryViewport: { width: 1000, teamLaneHeight: 100, timeAxisHeight: 56 },
      buildProjection: (input) => { builds += 1; return buildPlanningSessionProjection(input); } });
    const original = dispatcher.getProjection();
    assert.equal(dispatcher.dispatch({ ...command(), teamRequirements: [] }).ok, false);
    assert.strictEqual(dispatcher.getProjection(), original);
    assert.equal(builds, 1);
    const created = dispatcher.dispatch({ ...command(), objectiveEndDate: must(createCivilDate("2025-02-14")) });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(builds, 2);
    const id = created.projection.portfolio.priorityOrder.at(-1)!;
    assert.equal(created.projection.viewModel.projects.at(-1)?.id, id);
    assert.ok(created.projection.geometry.teams.some((team) =>
      team.markers.some((marker) => marker.projectId === id && marker.kind === "objective-end")));
    assert.ok(created.projection.geometry.teams.some((team) =>
      team.days.some((day) => day.allocations.some((allocation) => allocation.projectId === id))));
    const createdMetrics = calculateCursorMetrics({ portfolio: created.projection.portfolio,
      planningResult: created.projection.planningResult, horizon: created.projection.horizon,
      selectedDate: created.projection.horizon.end });
    assert.ok(createdMetrics.projects.some((project) => project.projectId === id));
    assert.ok(createdMetrics.programs.some((program) => program.programId === command().programId));
    assert.ok(createdMetrics.priorityFamilies.some((family) => family.priorityFamilyId === command().priorityFamilyId));
    const blocked = dispatcher.dispatch({ kind: "remove-project", projectId: must(createProjectId("absent")) });
    assert.equal(blocked.ok, false);
    assert.strictEqual(dispatcher.getProjection(), created.projection);
    assert.equal(builds, 2);
    const removed = dispatcher.dispatch({ kind: "remove-project", projectId: id });
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    assert.equal(builds, 3);
    assert.equal(removed.projection.viewModel.projects.some((project) => project.id === id), false);
    assert.equal(removed.projection.viewModel.diagnostics.some((item) => item.projectId === id), false);
    assert.equal(removed.projection.geometry.teams.some((team) =>
      team.markers.some((marker) => marker.projectId === id)), false);
    assert.equal(removed.projection.geometry.teams.some((team) =>
      team.days.some((day) => day.allocations.some((allocation) => allocation.projectId === id))), false);
    const removedMetrics = calculateCursorMetrics({ portfolio: removed.projection.portfolio,
      planningResult: removed.projection.planningResult, horizon: removed.projection.horizon,
      selectedDate: removed.projection.horizon.end });
    assert.equal(removedMetrics.projects.some((project) => project.projectId === id), false);
  });
});
