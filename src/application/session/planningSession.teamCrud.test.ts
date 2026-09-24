import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  capacityFromSerialized, createCivilDate, createPortfolio, createTeamId,
  serializeQuantity, unavailabilityRatioFromSerialized, type DomainResult,
} from "../../domain/index.js";
import { createPlanningSession, type PlanningSessionState, type UpdateTeamCapacityPeriod } from "./planningSession.js";
import { createTeamIdGenerator } from "./teamIdGenerator.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
function period(start: string, end: string, capacity = "1/3", unavailability = "1/4"):
  UpdateTeamCapacityPeriod {
  return { startDate: must(createCivilDate(start)), endDate: must(createCivilDate(end)),
    capacity: must(capacityFromSerialized(capacity)),
    unavailability: must(unavailabilityRatioFromSerialized(unavailability)) };
}
const first = period("2025-02-01", "2025-02-28");
function withCreatedTeam(): PlanningSessionState {
  const session = createPlanningSession(createDemoPlanningScenario());
  const result = session.dispatch({ kind: "create-team", name: "New Team", capacityPeriods: [first] });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}
function withReferences(projectReference: boolean, reservationReference: boolean): PlanningSessionState {
  const state = withCreatedTeam();
  const teamId = state.portfolio.teams.at(-1)!.id;
  const projects = projectReference ? state.portfolio.projects.map((project, index) => index === 0
    ? { ...project, requirements: [...project.requirements,
      { teamId, remainingWorkload: project.requirements[0]!.remainingWorkload }] } : project)
    : state.portfolio.projects;
  const reservations = reservationReference ? state.portfolio.reservations.map((reservation, index) => index === 0
    ? { ...reservation, teamAllocations: [...reservation.teamAllocations,
      { teamId, amount: reservation.teamAllocations[0]!.amount }] } : reservation)
    : state.portfolio.reservations;
  return { ...state, portfolio: must(createPortfolio({ ...state.portfolio, projects, reservations })) };
}

describe("Team structural commands", () => {
  it("creates one or several exact capacity periods as a sorted atomic schedule", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const previous = session.getState();
    const result = session.dispatch({ kind: "create-team", name: "  New Team  ",
      capacityPeriods: [first, period("2025-01-01", "2025-01-31", "2/3", "0/1")] });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const team = result.state.portfolio.teams.at(-1)!;
    assert.equal(team.name, "New Team");
    assert.equal(team.id, "team-session-1");
    assert.deepEqual(team.capacitySchedule.periods.map((item) => item.start), ["2025-01-01", "2025-02-01"]);
    assert.equal(serializeQuantity(team.capacitySchedule.periods[1]!.dailyCapacity), "1/3");
    assert.equal(serializeQuantity(team.capacitySchedule.periods[1]!.unavailabilityRatio!), "1/4");
    assert.deepEqual(team.capacitySchedule.exceptions, []);
    assert.equal(result.state.portfolio.projects[0], previous.portfolio.projects[0]);
    assert.deepEqual(result.state.portfolio.priorityOrder, previous.portfolio.priorityOrder);
  });

  it("rejects zero, overlapping and reversed periods without mutation or ID consumption", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const previous = session.getState();
    for (const capacityPeriods of [[], [first, period("2025-02-20", "2025-03-01")],
      [period("2025-03-01", "2025-02-01")]]) {
      const result = session.dispatch({ kind: "create-team", name: "Invalid", capacityPeriods });
      assert.equal(result.ok, false);
      assert.equal(session.getState(), previous);
    }
    const created = session.dispatch({ kind: "create-team", name: "Valid", capacityPeriods: [first] });
    assert.equal(created.ok, true);
    if (created.ok) assert.equal(created.state.portfolio.teams.at(-1)!.id, "team-session-1");
  });

  it("skips IDs already present and never asks the user for an ID", () => {
    const existing = [must(createTeamId("team-session-1"))];
    const generator = createTeamIdGenerator(() => existing);
    assert.equal(generator.next(), "team-session-2");
    existing.push(must(createTeamId("team-session-3")));
    assert.equal(generator.next(), "team-session-4");
    const initial = createDemoPlanningScenario();
    const collision = { ...initial.portfolio.teams[0]!, id: must(createTeamId("team-session-1")) };
    const portfolio = must(createPortfolio({ ...initial.portfolio,
      teams: [...initial.portfolio.teams, collision] }));
    const session = createPlanningSession({ ...initial, portfolio });
    const created = session.dispatch({ kind: "create-team", name: "After collision", capacityPeriods: [first] });
    assert.equal(created.ok, true);
    if (created.ok) assert.equal(created.state.portfolio.teams.at(-1)!.id, "team-session-2");
  });

  it("removes an unreferenced Team without changing other Portfolio data", () => {
    const initial = withCreatedTeam();
    const target = initial.portfolio.teams.at(-1)!;
    const session = createPlanningSession(initial);
    const result = session.dispatch({ kind: "remove-team", teamId: target.id });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.state.portfolio.teams, initial.portfolio.teams.slice(0, -1));
    assert.deepEqual(result.state.portfolio.priorityOrder, initial.portfolio.priorityOrder);
    assert.equal(result.state.portfolio.projects[0], initial.portfolio.projects[0]);
    assert.equal(result.state.portfolio.reservations[0], initial.portfolio.reservations[0]);
  });

  it("rejects unknown and all persisted reference combinations atomically", () => {
    const unknownSession = createPlanningSession(withCreatedTeam());
    const unknownState = unknownSession.getState();
    const unknown = unknownSession.dispatch({ kind: "remove-team", teamId: must(createTeamId("absent")) });
    assert.equal(unknown.ok, false);
    assert.equal(unknownSession.getState(), unknownState);
    for (const [projectReference, reservationReference, expected] of [
      [true, false, ["TEAM_REFERENCED_BY_PROJECT"]],
      [false, true, ["TEAM_REFERENCED_BY_RESERVATION"]],
      [true, true, ["TEAM_REFERENCED_BY_PROJECT", "TEAM_REFERENCED_BY_RESERVATION"]],
    ] as const) {
      const state = withReferences(projectReference, reservationReference);
      const session = createPlanningSession(state);
      const previous = session.getState();
      const result = session.dispatch({ kind: "remove-team", teamId: state.portfolio.teams.at(-1)!.id });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.deepEqual(result.errors.map((error) => error.code), expected);
        assert.ok(result.errors.every((error) =>
          error.path.includes("teamId") && /Project|Reservation/.test(error.message)));
      }
      assert.equal(session.getState(), previous);
    }
  });
});
