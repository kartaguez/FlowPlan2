import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCivilDate, createReservationId,
  createTeamId, serializeQuantity, reservationRatioFromSerialized, capacityFromSerialized, type DomainResult,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningSession, type UpdateReservationCommand } from "./planningSession.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }

describe("PlanningSession global reservation editing", () => {
  const command = (): UpdateReservationCommand => {
    const state = createDemoPlanningScenario();
    const reservation = state.portfolio.reservations[0]!;
    return Object.freeze({
      kind: "update-reservation",
      reservationId: reservation.id,
      name: "Updated Run",
      startDate: must(createCivilDate("2025-01-02")),
      endDate: must(createCivilDate("2025-02-20")),
      teamAllocations: Object.freeze([
        Object.freeze({ teamId: state.portfolio.teams[0]!.id, kind: "ratio" as const, ratio: must(reservationRatioFromSerialized("1/3")) }),
        Object.freeze({ teamId: state.portfolio.teams[1]!.id, kind: "fixed-daily" as const, dailyCapacity: must(capacityFromSerialized("3/2")) }),
      ]),
    });
  };

  it("atomically replaces one reservation and preserves all other state", () => {
    const initial = createDemoPlanningScenario(); const session = createPlanningSession(initial); const before = session.getState();
    const result = session.dispatch(command());
    assert.equal(result.ok, true); if (!result.ok) return;
    assert.notEqual(result.state, before);
    const updated = result.state.portfolio.reservations[0]!;
    assert.equal(updated.name, "Updated Run");
    assert.equal(updated.startDate, "2025-01-02");
    assert.equal(updated.teamAllocations[0]!.amount.kind, "ratio");
    assert.equal(updated.teamAllocations[1]!.amount.kind, "fixed-daily");
    if (updated.teamAllocations[0]!.amount.kind === "ratio") assert.equal(serializeQuantity(updated.teamAllocations[0]!.amount.ratio), "1/3");
    if (updated.teamAllocations[1]!.amount.kind === "fixed-daily") assert.equal(serializeQuantity(updated.teamAllocations[1]!.amount.dailyCapacity), "3/2");
    assert.equal(result.state.portfolio.reservations[1], initial.portfolio.reservations[1]);
    assert.equal(result.state.portfolio.projects[0], initial.portfolio.projects[0]);
    assert.equal(result.state.portfolio.teams[0], initial.portfolio.teams[0]);
    assert.equal(result.state.planning, initial.planning);
  });

  it("rejects duplicate/unknown teams, unknown reservations, and reversed dates without changing state", () => {
    const initial = createDemoPlanningScenario(); const valid = command();
    const cases: UpdateReservationCommand[] = [
      { ...valid, teamAllocations: [valid.teamAllocations[0]!, valid.teamAllocations[0]!] },
      { ...valid, teamAllocations: [{ teamId: must(createTeamId("unknown")), kind: "ratio", ratio: must(reservationRatioFromSerialized("1/2")) }] },
      { ...valid, reservationId: must(createReservationId("unknown")) },
      { ...valid, startDate: must(createCivilDate("2025-03-01")), endDate: must(createCivilDate("2025-01-01")) },
    ];
    for (const invalid of cases) {
      const session = createPlanningSession(initial); const before = session.getState();
      assert.equal(session.dispatch(invalid).ok, false); assert.equal(session.getState(), before);
    }
  });
});
