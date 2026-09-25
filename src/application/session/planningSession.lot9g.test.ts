import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capacityFromSerialized, createCapacityException, createCivilDate, createPortfolio,
  createReservationId, createTeamCapacitySchedule, reservationRatioFromSerialized,
  serializeQuantity, unavailabilityRatioFromSerialized, type DomainResult,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
import { createPlanningSession, type UpdateTeamCapacityPeriod } from "./planningSession.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const date = (value: string) => must(createCivilDate(value));
const period = (start: string, end: string, capacity = "1/3"): UpdateTeamCapacityPeriod => ({
  startDate: date(start), endDate: date(end), capacity: must(capacityFromSerialized(capacity)),
  unavailability: must(unavailabilityRatioFromSerialized("0/1")),
});

describe("Lot 9G application lifecycle", () => {
  it("reprojects once per accepted lifecycle or period Apply and never on refusal", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let builds = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session,
      geometryViewport: { width: 1000, teamLaneHeight: 100, teamHeaderHeight: 112,
        timeAxisHeight: 56 },
      buildProjection: (input) => { builds += 1; return buildPlanningSessionProjection(input); } });
    const original = dispatcher.getProjection();
    const command = { kind: "create-reservation" as const, name: "New",
      startDate: initial.planning.startDate, endDate: initial.planning.endDate,
      teamAllocations: [] };
    assert.equal(dispatcher.dispatch({ ...command, name: "" }).ok, false);
    assert.equal(builds, 1);
    assert.equal(dispatcher.getProjection(), original);
    const created = dispatcher.dispatch(command);
    assert.equal(created.ok, true);
    assert.equal(builds, 2);
    const id = session.getState().portfolio.reservations.at(-1)!.id;
    assert.equal(dispatcher.dispatch({ kind: "remove-reservation",
      reservationId: must(createReservationId("absent")) }).ok, false);
    assert.equal(builds, 2);
    assert.equal(dispatcher.dispatch({ kind: "remove-reservation", reservationId: id }).ok, true);
    assert.equal(builds, 3);
    const teamId = initial.portfolio.teams[0]!.id;
    assert.equal(dispatcher.dispatch({ kind: "update-team-capacity-periods", teamId,
      capacityPeriods: [] }).ok, true);
    assert.equal(builds, 4);
    assert.equal(dispatcher.dispatch({ kind: "update-team-capacity-periods", teamId,
      capacityPeriods: [period("2025-01-01", "2025-01-10"),
        period("2025-01-10", "2025-01-20")] }).ok, false);
    assert.equal(builds, 4);
  });

  it("creates a Reservation without Team allocations, including in an empty Portfolio", () => {
    const initial = createDemoPlanningScenario();
    const empty = must(createPortfolio({ teams: [], projects: [], programs: [], priorityFamilies: [],
      priorityOrder: [], reservations: [] }));
    const session = createPlanningSession({ ...initial, portfolio: empty });
    const command = { kind: "create-reservation" as const, name: "  Untied  ",
      startDate: initial.planning.startDate, endDate: initial.planning.endDate, teamAllocations: [] };
    const created = session.dispatch(command);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.state.portfolio.reservations[0]?.name, "Untied");
    assert.deepEqual(created.state.portfolio.reservations[0]?.teamAllocations, []);
    assert.equal(created.state.portfolio.reservations[0]?.startDate, initial.planning.startDate);
    assert.equal(created.state.portfolio.reservations[0]?.endDate, initial.planning.endDate);
    const removed = session.dispatch({ kind: "remove-reservation",
      reservationId: created.state.portfolio.reservations[0]!.id });
    assert.equal(removed.ok, true);
    if (removed.ok) assert.equal(removed.state.portfolio.reservations.length, 0);
  });

  it("skips occupied IDs and rejects invalid names and Team references atomically", () => {
    const initial = createDemoPlanningScenario();
    const occupied = must(createReservationId("reservation-session-1"));
    const seeded = must(createPortfolio({ ...initial.portfolio, reservations: [
      ...initial.portfolio.reservations,
      { ...initial.portfolio.reservations[0]!, id: occupied },
    ] }));
    const session = createPlanningSession({ ...initial, portfolio: seeded });
    const before = session.getState();
    const base = { kind: "create-reservation" as const, name: "New",
      startDate: initial.planning.startDate, endDate: initial.planning.endDate, teamAllocations: [] };
    assert.equal(session.dispatch({ ...base, name: " " }).ok, false);
    assert.equal(session.dispatch({ ...base, teamAllocations: [{ teamId: initial.portfolio.teams[0]!.id,
      kind: "ratio" as const, ratio: must(reservationRatioFromSerialized("1/2")) },
      { teamId: initial.portfolio.teams[0]!.id, kind: "ratio" as const,
        ratio: must(reservationRatioFromSerialized("1/2")) }] }).ok, false);
    assert.equal(session.getState(), before);
    const created = session.dispatch(base);
    assert.equal(created.ok, true);
    if (created.ok) assert.equal(created.state.portfolio.reservations.at(-1)!.id, "reservation-session-2");
    const after = session.getState();
    assert.equal(session.dispatch({ kind: "remove-reservation", reservationId: must(createReservationId("missing")) }).ok, false);
    assert.equal(session.getState(), after);
  });

  it("replaces periods structurally, sorts them and retains exact quantities and exceptions", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const exception = must(createCapacityException({ date: date("2025-01-06"),
      capacity: must(capacityFromSerialized("7/3")) }));
    const schedule = must(createTeamCapacitySchedule({ periods: team.capacitySchedule.periods,
      exceptions: [exception] }));
    const portfolio = must(createPortfolio({ ...initial.portfolio, teams: [
      { ...team, capacitySchedule: schedule }, ...initial.portfolio.teams.slice(1),
    ] }));
    const session = createPlanningSession({ ...initial, portfolio });
    const unsorted = [period("2025-04-01", "2025-04-10", "2/3"),
      period("2025-01-01", "2025-01-10", "1/3")];
    const applied = session.dispatch({ kind: "update-team-capacity-periods", teamId: team.id,
      capacityPeriods: unsorted });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    const edited = applied.state.portfolio.teams[0]!.capacitySchedule;
    assert.deepEqual(edited.periods.map((item) => item.start), ["2025-01-01", "2025-04-01"]);
    assert.equal(serializeQuantity(edited.periods[0]!.dailyCapacity), "1/3");
    assert.equal(edited.exceptions[0], exception);
    const before = session.getState();
    assert.equal(session.dispatch({ kind: "update-team-capacity-periods", teamId: team.id,
      capacityPeriods: [period("2025-01-01", "2025-01-10"),
        period("2025-01-10", "2025-01-20")] }).ok, false);
    assert.equal(session.getState(), before);
    const emptied = session.dispatch({ kind: "update-team-capacity-periods", teamId: team.id,
      capacityPeriods: [] });
    assert.equal(emptied.ok, true);
    if (emptied.ok) {
      assert.equal(emptied.state.portfolio.teams[0]!.capacitySchedule.periods.length, 0);
      assert.equal(emptied.state.portfolio.teams[0]!.capacitySchedule.exceptions[0], exception);
    }
  });
});
