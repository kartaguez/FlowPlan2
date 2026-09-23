import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReservationId, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildReservationEditViewModel } from "./teamReservationsEditViewModel.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(); return result.value; }

describe("ReservationEditViewModel", () => {
  it("projects one global reservation and every team in portfolio order", () => {
    const state = createDemoPlanningScenario(); const reservation = state.portfolio.reservations[0]!;
    const model = buildReservationEditViewModel(state, reservation.id)!;
    assert.equal(model.name, reservation.name);
    assert.equal(model.startDate, reservation.startDate);
    assert.deepEqual(model.teamAllocations.map((row) => row.teamId), state.portfolio.teams.map((team) => team.id));
    assert.equal(model.teamAllocations.filter((row) => row.enabled).length, reservation.teamAllocations.length);
    assert.equal(model.teamAllocations[0]!.value, "20");
    assert.equal(model.teamAllocations[1]!.value, "1");
  });
  it("returns undefined for an unknown reservation", () => {
    assert.equal(buildReservationEditViewModel(createDemoPlanningScenario(), must(createReservationId("unknown"))), undefined);
  });
});
