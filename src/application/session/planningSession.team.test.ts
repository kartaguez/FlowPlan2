import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  capacityFromSerialized,
  createCivilDate,
  unavailabilityRatioFromSerialized,
  createWorkingPattern,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import { createPlanningSession } from "./planningSession.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("PlanningSession planning and team editing", () => {
  it("stores working weekdays and max parallel projects only on Planning", () => {
    const state = createDemoPlanningScenario();
    assert.deepEqual(state.planning.workingPattern.workingWeekdays, [1, 2, 3, 4, 5]);
    assert.equal(state.planning.maxParallelProjects, 2);
    for (const team of state.portfolio.teams) {
      assert.equal(Object.hasOwn(team, "maxParallelProjects"), false);
      assert.equal(Object.hasOwn(team.capacitySchedule, "workingPattern"), false);
    }
  });

  it("atomically updates the global planning settings", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const result = session.dispatch({
      kind: "update-planning-settings",
      startDate: must(createCivilDate("2025-01-06")),
      endDate: must(createCivilDate("2025-04-04")),
      workingPattern: must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4] })),
      maxParallelProjects: 3,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.notEqual(result.state, initial);
    assert.equal(result.state.planning.startDate, "2025-01-06");
    assert.equal(result.state.planning.endDate, "2025-04-04");
    assert.deepEqual(result.state.planning.workingPattern.workingWeekdays, [1, 2, 3, 4]);
    assert.equal(result.state.planning.maxParallelProjects, 3);
    assert.equal(result.state.portfolio, initial.portfolio);
  });

  it("rejects an invalid horizon, empty week, or invalid parallel limit without mutation", () => {
    const initial = createDemoPlanningScenario();
    for (const command of [
      {
        kind: "update-planning-settings" as const,
        startDate: must(createCivilDate("2025-02-01")),
        endDate: must(createCivilDate("2025-01-01")),
        workingPattern: initial.planning.workingPattern,
        maxParallelProjects: 2,
      },
      {
        kind: "update-planning-settings" as const,
        startDate: initial.planning.startDate,
        endDate: initial.planning.endDate,
        workingPattern: must(createWorkingPattern({ workingWeekdays: [] })),
        maxParallelProjects: 2,
      },
      {
        kind: "update-planning-settings" as const,
        startDate: initial.planning.startDate,
        endDate: initial.planning.endDate,
        workingPattern: initial.planning.workingPattern,
        maxParallelProjects: 0,
      },
    ]) {
      const session = createPlanningSession(initial);
      const previous = session.getState();
      assert.equal(session.dispatch(command).ok, false);
      assert.equal(session.getState(), previous);
    }
  });

  it("renames a team without changing its ID, periods, reservations, or project references", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const session = createPlanningSession(initial);
    const result = session.dispatch({
      kind: "update-team-name",
      teamId: team.id,
      name: "Renamed Alpha",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const updated = result.state.portfolio.teams[0]!;
    assert.equal(updated.id, team.id);
    assert.equal(updated.name, "Renamed Alpha");
    assert.equal(updated.capacitySchedule, team.capacitySchedule);
    assert.deepEqual(result.state.portfolio.reservations, initial.portfolio.reservations);
    assert.ok(result.state.portfolio.projects.some((project) =>
      project.requirements.some((requirement) => requirement.teamId === team.id),
    ));
  });

  it("updates only one team's capacity periods", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const other = initial.portfolio.teams[1]!;
    const session = createPlanningSession(initial);
    const result = session.dispatch({
      kind: "update-team-capacity-periods",
      teamId: team.id,
      capacityPeriods: team.capacitySchedule.periods.map((period) => ({
        startDate: period.start,
        endDate: period.end,
        capacity: must(capacityFromSerialized("15/2")),
        unavailability: must(unavailabilityRatioFromSerialized("1/3")),
      })),
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.state.portfolio.teams[1], other);
    assert.equal(
      serializeQuantity(result.state.portfolio.teams[0]!.capacitySchedule.periods[0]!.dailyCapacity),
      "15/2",
    );
    assert.equal(
      serializeQuantity(result.state.portfolio.teams[0]!.capacitySchedule.periods[0]!.unavailabilityRatio!),
      "1/3",
    );
  });
});
