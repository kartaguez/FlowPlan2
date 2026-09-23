import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createReservationId,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import { parseReservationEditCommand } from "./parseReservationEditCommand.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const teamId = must(createTeamId("team-alpha"));
const reservationId = must(createReservationId("reservation-a"));

function parse(ratioPercent: string, startDate = "2025-01-01", endDate = "2025-01-31") {
  return parseReservationEditCommand({
    teamId,
    reservations: [{
      reservationId,
      startDate,
      endDate,
      ratioPercent,
      ratioOriginalDisplay: "25",
      ratioDirty: true,
    }],
  });
}

describe("parseReservationEditCommand", () => {
  it("parses finite decimal percentages and CivilDate values", () => {
    const result = parse("33.33");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(serializeQuantity(result.command.reservations[0]!.ratio), "3333/10000");
    assert.equal(result.command.reservations[0]!.startDate, "2025-01-01");
  });

  it("accepts zero and one hundred percent but rejects individual overflow", () => {
    for (const [value, expected] of [
      ["0", "0/1"],
      ["100", "1/1"],
    ] as const) {
      const result = parse(value);
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(serializeQuantity(result.command.reservations[0]!.ratio), expected);
      }
    }
    assert.equal(parse("100.01").ok, false);
    assert.equal(parse("-1").ok, false);
  });

  it("rejects invalid dates and aggregates multiple row errors", () => {
    const result = parseReservationEditCommand({
      teamId,
      reservations: [
        {
          reservationId,
          startDate: "2025-02-30",
          endDate: "bad",
          ratioPercent: "invalid",
          ratioOriginalDisplay: "25",
          ratioDirty: true,
        },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.length >= 3);
  });

  it("uses no JavaScript Date or lossy floating-point parsing", async () => {
    const production = await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL(
          "src/ui/reservation-edit/parseReservationEditCommand.ts",
          `file://${process.cwd()}/`,
        ),
        "utf8",
      ),
    );
    assert.doesNotMatch(production, /new Date|Date\.parse|Date\.now|parseFloat/);
  });

  it("preserves an untouched exact third and replaces an edited decimal exactly", () => {
    const untouched = parseReservationEditCommand({
      teamId,
      reservations: [{
        reservationId,
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        ratioPercent: "33.333",
        ratioOriginalDisplay: "33.333",
        ratioExact: "1/3",
        ratioDirty: false,
      }],
    });
    assert.equal(untouched.ok, true);
    if (untouched.ok) {
      assert.equal(serializeQuantity(untouched.command.reservations[0]!.ratio), "1/3");
    }
    const edited = parse("25");
    assert.equal(edited.ok, true);
    if (edited.ok) {
      assert.equal(serializeQuantity(edited.command.reservations[0]!.ratio), "1/4");
    }
  });
});
