import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReservationId, type DomainResult } from "../../domain/index.js";
import { createReservationIdGenerator } from "./reservationIdGenerator.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("ReservationIdGenerator", () => {
  it("generates deterministic session IDs and skips existing collisions", () => {
    const existing = [must(createReservationId("reservation-session-1"))];
    const generator = createReservationIdGenerator(() => existing);
    assert.equal(generator.next(), "reservation-session-2");
    assert.equal(generator.next(), "reservation-session-3");
  });
});
