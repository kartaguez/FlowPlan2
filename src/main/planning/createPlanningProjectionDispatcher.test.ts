import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createPlanningSession,
  type PlanningSessionState,
  type UpdateProjectCommand,
  type UpdateTeamCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  createCapacity,
  createDailyCap,
  createRemainingWorkload,
  createReservationId,
  createReservationRatio,
  createUnavailabilityRatio,
  createWorkingPattern,
  serializeQuantity,
  type DomainResult,
  type ProjectId,
  type TeamId,
  projectCapacity,
  reservedCapacity,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const geometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function teamCommandFor(
  state: PlanningSessionState,
  teamId: TeamId,
  overrides: Partial<UpdateTeamCommand> = {},
): UpdateTeamCommand {
  const team = state.portfolio.teams.find((candidate) => candidate.id === teamId)!;
  return {
    kind: "update-team",
    teamId,
    name: team.name,
    maxParallelProjects: team.maxParallelProjects,
    workingPattern: team.capacitySchedule.workingPattern,
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
    priorityPosition: state.portfolio.priorityOrder.indexOf(projectId) + 1,
    ...(project.earliestStartDate ? { earliestStartDate: project.earliestStartDate } : {}),
    ...(project.objectiveEndDate ? { objectiveEndDate: project.objectiveEndDate } : {}),
    ...(project.mandatoryDeadline ? { mandatoryDeadline: project.mandatoryDeadline } : {}),
    teamRequirements: project.requirements,
    ...overrides,
  };
}

describe("PlanningProjectionDispatcher", () => {
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
      commandFor(initial, projectId, { priorityPosition: 0 }),
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
      teamCommandFor(initial, team.id, { name: "Alpha Renamed" }),
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
    assert.equal(
      dispatcher.dispatch(
        teamCommandFor(initial, team.id, { maxParallelProjects: 0 }),
      ).ok,
      false,
    );
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), projection);
    assert.equal(
      dispatcher.dispatch(
        teamCommandFor(initial, team.id, { maxParallelProjects: 1 }),
      ).ok,
      true,
    );
    assert.equal(buildCount, 2);
  });

  it("lets max parallel change the existing planner admission", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const team = initial.portfolio.teams[0]!;
    const date = must(createCivilDate("2025-01-01"));
    const before = dispatcher
      .getProjection()
      .viewModel.teams[0]!.allocations.filter((allocation) => allocation.date === date);
    assert.equal(before.length, 2);
    assert.equal(
      dispatcher.dispatch(
        teamCommandFor(initial, team.id, { maxParallelProjects: 1 }),
      ).ok,
      true,
    );
    const after = dispatcher
      .getProjection()
      .viewModel.teams[0]!.allocations.filter((allocation) => allocation.date === date);
    assert.equal(after.length, 1);
  });

  it("removes capacity and allocations when a weekday is disabled", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport });
    const team = initial.portfolio.teams[0]!;
    const wednesday = must(createCivilDate("2025-01-08"));
    assert.ok(
      dispatcher.getProjection().viewModel.teams[0]!.allocations.some(
        (allocation) => allocation.date === wednesday,
      ),
    );
    const result = dispatcher.dispatch(
      teamCommandFor(initial, team.id, {
        workingPattern: must(
          createWorkingPattern({ workingWeekdays: [1, 2, 4, 5] }),
        ),
      }),
    );
    assert.equal(result.ok, true);
    const after = dispatcher.getProjection().viewModel.teams[0]!;
    assert.equal(
      serializeQuantity(
        after.capacities.find((capacity) => capacity.date === wednesday)!
          .effectiveCapacity,
      ),
      "0/1",
    );
    assert.equal(
      after.allocations.some((allocation) => allocation.date === wednesday),
      false,
    );
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
    const otherTeam = initial.portfolio.teams[1]!;
    const date = must(createCivilDate("2025-01-02"));
    const otherBefore = dispatcher
      .getProjection()
      .viewModel.teams.find((item) => item.id === otherTeam.id)!
      .capacities.find((item) => item.date === date)!;
    const result = dispatcher.dispatch({
      kind: "replace-team-reservations",
      teamId: team.id,
      reservations: ["0.75", "0.5"].map((ratio, index) => ({
        reservationId: must(createReservationId(`overlap-${index}`)),
        startDate: must(createCivilDate("2025-01-01")),
        endDate: must(createCivilDate("2025-01-31")),
        ratio: must(createReservationRatio(ratio)),
      })),
    });
    assert.equal(result.ok, true);
    assert.equal(buildCount, 2);
    const state = session.getState();
    assert.equal(
      serializeQuantity(reservedCapacity(team, date, state.portfolio.reservations)),
      "15/4",
    );
    assert.equal(
      serializeQuantity(projectCapacity(team, date, state.portfolio.reservations)),
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
      kind: "replace-team-reservations",
      teamId: initial.portfolio.teams[0]!.id,
      reservations: [
        {
          reservationId: must(createReservationId("invalid-range")),
          startDate: must(createCivilDate("2025-02-01")),
          endDate: must(createCivilDate("2025-01-01")),
          ratio: must(createReservationRatio("0.5")),
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), projection);
  });
});
