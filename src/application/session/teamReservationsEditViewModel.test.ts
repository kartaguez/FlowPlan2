import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTeamId, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildTeamReservationsEditViewModel } from "./teamReservationsEditViewModel.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("TeamReservationsEditViewModel", () => {
  it("filters by team and displays decimal percentages with exact backing values", () => {
    const state = createDemoPlanningScenario();
    const team = state.portfolio.teams[2]!;
    const model = buildTeamReservationsEditViewModel(state, team.id)!;
    assert.equal(model.teamLabel, team.name);
    assert.ok(model.reservations.length >= 2);
    assert.ok(
      model.reservations.every((item) =>
        state.portfolio.reservations.some(
          (reservation) =>
            reservation.id === item.reservationId && reservation.teamId === team.id,
        ),
      ),
    );
    assert.ok(Object.isFrozen(model.reservations));
    assert.ok(model.reservations.every((item) => !item.ratioPercent.includes("/")));
    assert.ok(model.reservations.every((item) => item.ratioExact.includes("/")));
  });

  it("returns undefined for an unknown team", () => {
    assert.equal(
      buildTeamReservationsEditViewModel(
        createDemoPlanningScenario(),
        must(createTeamId("unknown")),
      ),
      undefined,
    );
  });
});
