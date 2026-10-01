import assert from "node:assert/strict";
import { it } from "node:test";
import {
  actualOccupationFromReconstruction,
  capacityFromSerialized,
  consumedWorkloadFromRational,
  createCivilDate,
  createProjectId,
  createReservationId,
  createTeamId,
  rationalOf,
  serializeQuantity,
  type ActualsReconstruction,
  type DomainResult,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

it("aggregates concurrent exact source contributions without passing chronology to planning", () => {
  const teamId = must(createTeamId("concurrent-team"));
  const date = must(createCivilDate("2025-01-06"));
  const amount = (value: string) => must(consumedWorkloadFromRational(rationalOf(must(capacityFromSerialized(value)))));
  const reconstruction: ActualsReconstruction = {
    contributions: [
      { sourceKind: "project", sourceId: must(createProjectId("one")), recordIndex: 0, teamId, date, amount: amount("1/3") },
      { sourceKind: "project", sourceId: must(createProjectId("two")), recordIndex: 1, teamId, date, amount: amount("2/3") },
      { sourceKind: "reservation", sourceId: must(createReservationId("three")), recordIndex: 0, teamId, date, amount: amount("3/2") },
    ],
    teamDayTotals: [{ teamId, date, amount: amount("5/2") }],
  };
  const rows = actualOccupationFromReconstruction(reconstruction);
  assert.equal(rows.length, 1);
  assert.equal(serializeQuantity(rows[0]!.projectActual), "1/1");
  assert.equal(serializeQuantity(rows[0]!.reservationActual), "3/2");
  assert.equal(Object.hasOwn(rows[0]!, "recordIndex"), false);
  assert.equal(Object.hasOwn(rows[0]!, "sourceId"), false);
  assert.throws(() => actualOccupationFromReconstruction({ ...reconstruction,
    teamDayTotals: [{ teamId, date, amount: amount("2/1") }] }), /totals do not match/);
});
