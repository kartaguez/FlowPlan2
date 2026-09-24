import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import { createCivilDate, createReservationId, createTeamId, type DomainResult } from "../../domain/index.js";
import { buildTimelineSelectionGeometry, reconcileTimelineHit } from "./timelineSelectionGeometry.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("Reservation selection geometry", () => {
  it("preserves an identifiable segment and clears a vanished one on rerender", () => {
    const teamId = must(createTeamId("alpha"));
    const reservationId = must(createReservationId("run"));
    const date = must(createCivilDate("2025-01-01"));
    const segment = { reservationId, teamId, date, x: 10, y: 20, width: 30, height: 5 };
    const geometry = { teams: [{ teamId, days: [{ reservationSegments: [segment] }], markers: [] }] } as unknown as TimelineGeometry;
    const hit = { kind: "reservation" as const, reservationId, teamId, date };
    assert.deepEqual(buildTimelineSelectionGeometry(geometry, hit),
      { kind: "reservation", x: 10, y: 20, width: 30, height: 5 });
    assert.deepEqual(reconcileTimelineHit(geometry, hit), hit);
    const without = { teams: [{ teamId, days: [{ reservationSegments: [] }], markers: [] }] } as unknown as TimelineGeometry;
    assert.equal(reconcileTimelineHit(without, hit), undefined);
  });
});
