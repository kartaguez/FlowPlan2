import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createReservationId, createTeamId, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { parseReservationEditCommand, type ReservationEditFormValues } from "./parseReservationEditCommand.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(); return result.value; }
const reservationId = must(createReservationId("reservation"));
const alpha = must(createTeamId("alpha"));
const base = (value: string, kind: "ratio" | "fixed-daily" = "ratio"): ReservationEditFormValues => ({
  reservationId, name: "Run", startDate: "2025-01-01", endDate: "2025-02-01",
  teamAllocations: [{ teamId: alpha, enabled: true, kind, value, dirty: true }],
});

describe("parseReservationEditCommand", () => {
  it("parses exact percentage and fixed daily fractions", () => {
    const ratio = parseReservationEditCommand(base("100/3"));
    assert.equal(ratio.ok, true);
    if (ratio.ok && ratio.command.teamAllocations[0]!.kind === "ratio") assert.equal(serializeQuantity(ratio.command.teamAllocations[0]!.ratio), "1/3");
    const fixed = parseReservationEditCommand(base("1/3", "fixed-daily"));
    assert.equal(fixed.ok, true);
    if (fixed.ok && fixed.command.teamAllocations[0]!.kind === "fixed-daily") assert.equal(serializeQuantity(fixed.command.teamAllocations[0]!.dailyCapacity), "1/3");
  });

  it("preserves untouched exact values but treats explicit decimals exactly", () => {
    const untouched = parseReservationEditCommand({ ...base("0.333", "fixed-daily"), teamAllocations: [{ teamId: alpha, enabled: true, kind: "fixed-daily", value: "0.333", originalKind: "fixed-daily", originalDisplay: "0.333", originalExact: "1/3", dirty: false }] });
    assert.equal(untouched.ok, true);
    if (untouched.ok && untouched.command.teamAllocations[0]!.kind === "fixed-daily") assert.equal(serializeQuantity(untouched.command.teamAllocations[0]!.dailyCapacity), "1/3");
    const edited = parseReservationEditCommand(base("0.333", "fixed-daily"));
    assert.equal(edited.ok, true);
    if (edited.ok && edited.command.teamAllocations[0]!.kind === "fixed-daily") assert.equal(serializeQuantity(edited.command.teamAllocations[0]!.dailyCapacity), "333/1000");
  });

  it("keeps absent teams distinct and rejects invalid values or intervals atomically", () => {
    const absent = parseReservationEditCommand({ ...base("25"), teamAllocations: [{ teamId: alpha, enabled: false, kind: "ratio", value: "", dirty: false }] });
    assert.equal(absent.ok, true); if (absent.ok) assert.equal(absent.command.teamAllocations.length, 0);
    assert.equal(parseReservationEditCommand(base("101")).ok, false);
    const reversed = parseReservationEditCommand({ ...base("25"), startDate: "2025-03-01", endDate: "2025-01-01" });
    assert.equal(reversed.ok, false);
    if (!reversed.ok) {
      assert.deepEqual(reversed.errors, [{
        code: "INVALID_RESERVATION_INTERVAL",
        path: "reservation.endDate",
        message: "Reservation end date must be on or after its start date.",
      }]);
    }
  });
});
