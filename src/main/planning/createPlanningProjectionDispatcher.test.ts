import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPlanningSession,
  type PlanningSessionState,
  type UpdateProjectCommand,
  type UpdateTeamCapacityPeriodsCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  createCapacity,
  createDailyCap,
  createPriorityFamilyId,
  createRemainingWorkload,
  createUnavailabilityRatio,
  createWorkingPattern,
  rationalToCanonicalString,
  serializeQuantity,
  type DomainResult,
  type ProjectId,
  type TeamId,
  projectCapacity,
  reservedCapacity,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const geometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

describe("PlanningProjectionDispatcher reorder", () => {
  it("rebuilds once for a move and never for same-position or rejected commands", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let builds = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport,
      buildProjection: (input) => { builds += 1; return buildPlanningSessionProjection(input); } });
    const ids = initial.portfolio.priorityOrder;
    const first = dispatcher.getProjection();
    const same = dispatcher.dispatch({ kind: "reorder-project", projectId: ids[1]!, targetPosition: 2 });
    assert.equal(same.ok, true);
    if (same.ok) assert.strictEqual(same.projection, first);
    assert.equal(builds, 1);
    const invalid = dispatcher.dispatch({ kind: "reorder-project", projectId: ids[1]!, targetPosition: 0 });
    assert.equal(invalid.ok, false);
    assert.equal(builds, 1);
    const changed = dispatcher.dispatch({ kind: "reorder-project", projectId: ids[3]!, targetPosition: 1 });
    assert.equal(changed.ok, true);
    if (!changed.ok) return;
    assert.equal(builds, 2);
    assert.deepEqual(changed.projection.viewModel.projects.map((project) => project.id), [ids[3], ids[0], ids[1], ids[2]]);
    assert.deepEqual(changed.projection.portfolio.priorityOrder, [ids[3], ids[0], ids[1], ids[2]]);
  });
});

describe("PlanningProjectionDispatcher Team lifecycle", () => {
  it("projects each accepted structural change once and never projects a refusal", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let builds = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport,
      buildProjection: (input) => { builds += 1; return buildPlanningSessionProjection(input); } });
    const invalid = dispatcher.dispatch({ kind: "create-team", name: "No schedule", capacityPeriods: [] });
    assert.equal(invalid.ok, false);
    assert.equal(builds, 1);
    const created = dispatcher.dispatch({ kind: "create-team", name: "New Team", capacityPeriods: [{
      startDate: must(createCivilDate("2025-01-01")), endDate: must(createCivilDate("2025-01-31")),
      capacity: must(createCapacity("1")), unavailability: must(createUnavailabilityRatio("0")),
    }] });
    assert.equal(created.ok, true);
    assert.equal(builds, 2);
    if (!created.ok) return;
    const teamId = created.projection.portfolio.teams.at(-1)!.id;
    assert.ok(created.projection.viewModel.teams.some((team) => team.id === teamId));
    assert.ok(created.projection.geometry.teams.some((team) => team.teamId === teamId));
    const beforeRefusal = dispatcher.getProjection();
    const blocked = dispatcher.dispatch({ kind: "remove-team", teamId: initial.portfolio.teams[0]!.id });
    assert.equal(blocked.ok, false);
    assert.equal(builds, 2);
    assert.equal(dispatcher.getProjection(), beforeRefusal);
    const removed = dispatcher.dispatch({ kind: "remove-team", teamId });
    assert.equal(removed.ok, true);
    assert.equal(builds, 3);
    if (!removed.ok) return;
    assert.equal(removed.projection.viewModel.teams.some((team) => team.id === teamId), false);
    assert.equal(removed.projection.geometry.teams.some((team) => team.teamId === teamId), false);
    assert.deepEqual(removed.projection.portfolio.priorityOrder, initial.portfolio.priorityOrder);
  });
});

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function teamCommandFor(
  state: PlanningSessionState,
  teamId: TeamId,
  overrides: Partial<UpdateTeamCapacityPeriodsCommand> = {},
): UpdateTeamCapacityPeriodsCommand {
  const team = state.portfolio.teams.find((candidate) => candidate.id === teamId)!;
  return {
    kind: "update-team-capacity-periods",
    teamId,
    capacityPeriods: team.capacitySchedule.periods.map((period) => ({
      startDate: period.start,
      endDate: period.end,
      capacity: period.dailyCapacity,
      unavailability:
        period.unavailabilityRatio ?? must(createUnavailabilityRatio("0")),
    })),
    ...overrides,
  };
}

function commandFor(
  state: PlanningSessionState,
  projectId: ProjectId,
  overrides: Partial<UpdateProjectCommand> = {},
): UpdateProjectCommand {
  const project = state.portfolio.projects.find((candidate) => candidate.id === projectId)!;
  return {
    kind: "update-project",
    projectId,
    name: project.name,
    ...(project.programId === undefined ? {} : { programId: project.programId }),
    ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyId: project.priorityFamilyId }),
    ...(project.earliestStartDate ? { earliestStartDate: project.earliestStartDate } : {}),
    ...(project.objectiveEndDate ? { objectiveEndDate: project.objectiveEndDate } : {}),
    ...(project.mandatoryDeadline ? { mandatoryDeadline: project.mandatoryDeadline } : {}),
    teamRequirements: project.requirements,
    ...overrides,
  };
}

describe("PlanningProjectionDispatcher", () => {
  it("reuses one run for cursor dates without dispatch and replaces all run references after an edit", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const before = dispatcher.getProjection();
    const atStart = calculateCursorMetrics({
      portfolio: before.portfolio,
      horizon: before.horizon,
      planningResult: before.planningResult,
      selectedDate: before.horizon.start,
    });
    const atEnd = calculateCursorMetrics({
      portfolio: before.portfolio,
      horizon: before.horizon,
      planningResult: before.planningResult,
      selectedDate: before.horizon.end,
    });
    assert.equal(atStart.selectedDate, before.horizon.start);
    assert.equal(atEnd.selectedDate, before.horizon.end);
    assert.equal(buildCount, 1);
    assert.strictEqual(dispatcher.getProjection(), before);

    const changed = dispatcher.dispatch(commandFor(initial, initial.portfolio.projects[0]!.id, {
      teamRequirements: initial.portfolio.projects[0]!.requirements.map((requirement) => ({
        ...requirement, remainingWorkload: must(createRemainingWorkload("7")),
      })),
    }));
    assert.equal(changed.ok, true);
    assert.equal(buildCount, 2);
    const after = dispatcher.getProjection();
    assert.notStrictEqual(after, before);
    assert.strictEqual(after.portfolio, session.getState().portfolio);
    assert.notStrictEqual(after.portfolio, before.portfolio);
    assert.notStrictEqual(after.planningResult, before.planningResult);
    const updatedMetrics = calculateCursorMetrics({
      portfolio: after.portfolio,
      horizon: after.horizon,
      planningResult: after.planningResult,
      selectedDate: after.horizon.start,
    });
    assert.equal(updatedMetrics.selectedDate, after.horizon.start);
    assert.notEqual(
      rationalToCanonicalString(updatedMetrics.projects[0]!.baselineRAF),
      rationalToCanonicalString(atStart.projects[0]!.baselineRAF),
    );
    assert.equal(buildCount, 2);
  });

  it("recomputes once for a grouping edit and never for an unknown catalog reference", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const projectId = initial.portfolio.projects[1]!.id;
    const before = dispatcher.getProjection();
    const valid = dispatcher.dispatch(commandFor(initial, projectId, {
      priorityFamilyId: initial.portfolio.priorityFamilies[0]!.id,
    }));
    assert.equal(valid.ok, true);
    assert.equal(buildCount, 2);
    assert.notEqual(dispatcher.getProjection(), before);
    const current = dispatcher.getProjection();
    const rejected = dispatcher.dispatch(commandFor(session.getState(), projectId, {
      priorityFamilyId: must(createPriorityFamilyId("unknown-family")),
    }));
    assert.equal(rejected.ok, false);
    assert.equal(buildCount, 2);
    assert.equal(dispatcher.getProjection(), current);
  });
  it("rebuilds exactly once after success and never after invalid commands", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const initialProjection = dispatcher.getProjection();
    const projectId = initial.portfolio.projects[0]!.id;

    const invalid = dispatcher.dispatch(
      { kind: "reorder-project", projectId, targetPosition: 0 },
    );
    assert.equal(invalid.ok, false);
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), initialProjection);

    const valid = dispatcher.dispatch(
      commandFor(initial, projectId, { name: "Atlas Reprojected" }),
    );
    assert.equal(valid.ok, true);
    assert.equal(buildCount, 2);
    assert.notEqual(dispatcher.getProjection(), initialProjection);
    assert.deepEqual(
      dispatcher.getProjection().planningResult,
      initialProjection.planningResult,
    );
    assert.equal(
      dispatcher.getProjection().viewModel.projects[0]?.label,
      "Atlas Reprojected",
    );
  });

  it("keeps objective date descriptive while moving only its marker", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
    });
    const before = dispatcher.getProjection();
    const project = initial.portfolio.projects[0]!;
    const dateResult = createCivilDate("2025-03-20");
    if (!dateResult.ok) throw new Error(JSON.stringify(dateResult.errors));

    const result = dispatcher.dispatch(
      commandFor(initial, project.id, {
        objectiveEndDate: dateResult.value,
      }),
    );
    assert.equal(result.ok, true);
    const after = dispatcher.getProjection();
    assert.deepEqual(after.planningResult, before.planningResult);
    assert.equal(
      after.viewModel.projects.find((candidate) => candidate.id === project.id)
        ?.objectiveEndDate,
      "2025-03-20",
    );
    assert.notDeepEqual(after.geometry.teams, before.geometry.teams);
  });

  it("does not let a mandatory deadline change global priority", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const project = initial.portfolio.projects[3]!;
    const deadline = createCivilDate("2025-01-10");
    if (!deadline.ok) throw new Error(JSON.stringify(deadline.errors));
    const result = dispatcher.dispatch(
      commandFor(initial, project.id, { mandatoryDeadline: deadline.value }),
    );
    assert.equal(result.ok, true);
    assert.deepEqual(
      session.getState().portfolio.priorityOrder,
      initial.portfolio.priorityOrder,
    );
  });

  it("removes only the targeted team allocations when its RAF becomes zero", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
    });
    const project = initial.portfolio.projects[0]!;
    const alphaRequirement = project.requirements[0]!;
    const before = dispatcher
      .getProjection()
      .viewModel.teams.find((team) => team.id === alphaRequirement.teamId)!;
    assert.ok(
      before.allocations.some(
        (allocation) => allocation.projectId === project.id,
      ),
    );

    const result = dispatcher.dispatch(
      commandFor(initial, project.id, {
        teamRequirements: project.requirements.map((requirement) =>
          requirement.teamId === alphaRequirement.teamId
            ? {
                teamId: requirement.teamId,
                remainingWorkload: must(createRemainingWorkload("0")),
                ...(requirement.dailyCap === undefined
                  ? {}
                  : { dailyCap: requirement.dailyCap }),
              }
            : requirement,
        ),
      }),
    );

    assert.equal(result.ok, true);
    const after = dispatcher
      .getProjection()
      .viewModel.teams.find((team) => team.id === alphaRequirement.teamId)!;
    assert.equal(
      after.allocations.some(
        (allocation) => allocation.projectId === project.id,
      ),
      false,
    );
  });

  it("applies an exact per-team daily cap to the recomputed allocations", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
    });
    const project = initial.portfolio.projects[0]!;
    const alphaRequirement = project.requirements[0]!;
    const dailyCap = must(createDailyCap("0.5"));

    const result = dispatcher.dispatch(
      commandFor(initial, project.id, {
        teamRequirements: project.requirements.map((requirement) =>
          requirement.teamId === alphaRequirement.teamId
            ? { ...requirement, dailyCap }
            : requirement,
        ),
      }),
    );

    assert.equal(result.ok, true);
    const allocations = dispatcher
      .getProjection()
      .viewModel.teams.find((team) => team.id === alphaRequirement.teamId)!
      .allocations.filter((allocation) => allocation.projectId === project.id);
    assert.ok(allocations.length > 0);
    assert.ok(
      allocations.every(
        (allocation) => serializeQuantity(allocation.workload) === "1/2",
      ),
    );
  });

  it("applies one global earliest start to every team requirement", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
    });
    const project = initial.portfolio.projects[0]!;
    const earliestStartDate = must(createCivilDate("2025-02-03"));

    const result = dispatcher.dispatch(
      commandFor(initial, project.id, { earliestStartDate }),
    );

    assert.equal(result.ok, true);
    const projectAllocations = dispatcher
      .getProjection()
      .viewModel.teams.flatMap((team) => team.allocations)
      .filter((allocation) => allocation.projectId === project.id);
    assert.ok(projectAllocations.length > 0);
    assert.ok(
      projectAllocations.every(
        (allocation) => allocation.date >= earliestStartDate,
      ),
    );
  });

  it("accepts an impossible global deadline as planning input and reports it", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
    });
    const project = initial.portfolio.projects[0]!;
    const priorityBefore = initial.portfolio.priorityOrder;

    const result = dispatcher.dispatch(
      commandFor(initial, project.id, {
        mandatoryDeadline: must(createCivilDate("2025-01-01")),
      }),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(session.getState().portfolio.priorityOrder, priorityBefore);
    assert.ok(
      dispatcher.getProjection().viewModel.diagnostics.some(
        (diagnostic) =>
          diagnostic.projectId === project.id &&
          (diagnostic.code === "DEADLINE_UNFEASIBLE" ||
            diagnostic.code === "DEADLINE_MISSED"),
      ),
    );
  });

  it("keeps planning semantics identical for a team name-only update", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const before = dispatcher.getProjection();
    const team = initial.portfolio.teams[0]!;
    const result = dispatcher.dispatch(
      { kind: "update-team-name", teamId: team.id, name: "Alpha Renamed" },
    );
    assert.equal(result.ok, true);
    assert.deepEqual(dispatcher.getProjection().planningResult, before.planningResult);
    assert.equal(dispatcher.getProjection().viewModel.teams[0]?.label, "Alpha Renamed");
  });

  it("rebuilds once for valid team edits and never for invalid ones", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const team = initial.portfolio.teams[0]!;
    const projection = dispatcher.getProjection();
    const unchanged = teamCommandFor(initial, team.id);
    assert.equal(
      dispatcher.dispatch(
        { ...unchanged, capacityPeriods: [...unchanged.capacityPeriods, unchanged.capacityPeriods[0]!] },
      ).ok,
      false,
    );
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), projection);
    assert.equal(
      dispatcher.dispatch(
        teamCommandFor(initial, team.id),
      ).ok,
      true,
    );
    assert.equal(buildCount, 2);
  });

  it("lets max parallel change the existing planner admission", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const date = must(createCivilDate("2025-01-01"));
    const before = dispatcher
      .getProjection()
      .viewModel.teams[0]!.allocations.filter((allocation) => allocation.date === date);
    assert.equal(before.length, 2);
    assert.equal(
      dispatcher.dispatch(
        {
          kind: "update-planning-settings",
          startDate: initial.planning.startDate,
          endDate: initial.planning.endDate,
          workingPattern: initial.planning.workingPattern,
          maxParallelProjects: 1,
        },
      ).ok,
      true,
    );
    assert.equal(buildCount, 2, "initial projection plus exactly one Apply rebuild");
    const after = dispatcher
      .getProjection()
      .viewModel.teams[0]!.allocations.filter((allocation) => allocation.date === date);
    assert.equal(after.length, 1);
  });

  it("removes capacity and allocations when a weekday is disabled", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const wednesday = must(createCivilDate("2025-01-08"));
    assert.ok(
      dispatcher.getProjection().viewModel.teams[0]!.allocations.some(
        (allocation) => allocation.date === wednesday,
      ),
    );
    const result = dispatcher.dispatch({
      kind: "update-planning-settings",
      startDate: initial.planning.startDate,
      endDate: initial.planning.endDate,
      workingPattern: must(
        createWorkingPattern({ workingWeekdays: [1, 2, 4, 5] }),
      ),
      maxParallelProjects: initial.planning.maxParallelProjects,
    });
    assert.equal(result.ok, true);
    for (const team of dispatcher.getProjection().viewModel.teams) {
      assert.equal(
        serializeQuantity(
          team.capacities.find((capacity) => capacity.date === wednesday)!
            .effectiveCapacity,
        ),
        "0/1",
      );
      assert.equal(
        team.allocations.some((allocation) => allocation.date === wednesday),
        false,
      );
    }
  });

  it("recomputes exact effective capacity from capacity and unavailability", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const team = initial.portfolio.teams[0]!;
    const base = teamCommandFor(initial, team.id);
    const result = dispatcher.dispatch({
      ...base,
      capacityPeriods: base.capacityPeriods.map((period, index) =>
        index === 0
          ? {
              ...period,
              capacity: must(createCapacity("4")),
              unavailability: must(createUnavailabilityRatio("0.5")),
            }
          : period,
      ),
    });
    assert.equal(result.ok, true);
    const day = dispatcher
      .getProjection()
      .viewModel.teams[0]!.capacities.find(
        (capacity) => capacity.date === "2025-01-02",
      )!;
    assert.equal(serializeQuantity(day.effectiveCapacity), "2/1");
  });

  it("accepts overlapping over-reservations and rebuilds their diagnostics once", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const team = initial.portfolio.teams[0]!;
    const otherTeam = initial.portfolio.teams[2]!;
    const date = must(createCivilDate("2025-01-02"));
    const otherBefore = dispatcher
      .getProjection()
      .viewModel.teams.find((item) => item.id === otherTeam.id)!
      .capacities.find((item) => item.date === date)!;
    const result = dispatcher.dispatch({
      kind: "update-reservation",
      reservationId: initial.portfolio.reservations[0]!.id,
      name: "Over reserved",
      startDate: must(createCivilDate("2025-01-01")),
      endDate: must(createCivilDate("2025-01-31")),
      teamAllocations: [
        { teamId: team.id, kind: "fixed-daily", dailyCapacity: must(createCapacity("4")) },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(buildCount, 2);
    const state = session.getState();
    assert.equal(
      serializeQuantity(reservedCapacity(team, date, state.portfolio.reservations, state.planning.workingPattern)),
      "4/1",
    );
    assert.equal(
      serializeQuantity(projectCapacity(team, date, state.portfolio.reservations, state.planning.workingPattern)),
      "0/1",
    );
    assert.ok(
      dispatcher.getProjection().viewModel.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "TEAM_OVER_RESERVED" && diagnostic.teamId === team.id,
      ),
    );
    const otherAfter = dispatcher
      .getProjection()
      .viewModel.teams.find((item) => item.id === otherTeam.id)!
      .capacities.find((item) => item.date === date)!;
    assert.deepEqual(otherAfter, otherBefore);
  });

  it("does not rebuild for an invalid reservation replacement", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const projection = dispatcher.getProjection();
    const result = dispatcher.dispatch({
      kind: "update-reservation",
      reservationId: initial.portfolio.reservations[0]!.id,
      name: "Invalid range",
      startDate: must(createCivilDate("2025-02-01")),
      endDate: must(createCivilDate("2025-01-01")),
      teamAllocations: [],
    });
    assert.equal(result.ok, false);
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), projection);
  });
});
