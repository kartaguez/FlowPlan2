import { describe, expect, it } from "vitest";
import {
  addDays,
  addDecimals,
  civilDatesInclusive,
  compareCivilDates,
  compareDecimals,
  createCapacity,
  createCivilDate,
  createRemainingWorkload,
  multiplyDecimals,
  normalizeDecimal,
  type DomainResult,
} from "../index";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("CivilDate", () => {
  it("validates leap years and impossible dates", () => {
    expect(createCivilDate("2024-02-29").ok).toBe(true);
    expect(createCivilDate("2023-02-29")).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_CIVIL_DATE", path: "date" }],
    });
    expect(createCivilDate("2024-2-09").ok).toBe(false);
  });

  it("adds days across month and year boundaries without timezone state", () => {
    expect(must(addDays(must(createCivilDate("2024-02-28")), 2))).toBe(
      "2024-03-01",
    );
    expect(must(addDays(must(createCivilDate("2024-12-31")), 1))).toBe(
      "2025-01-01",
    );
    expect(must(addDays(must(createCivilDate("2025-01-01")), -1))).toBe(
      "2024-12-31",
    );
  });

  it("compares and traverses inclusive intervals", () => {
    const start = must(createCivilDate("2025-01-30"));
    const end = must(createCivilDate("2025-02-02"));
    expect(compareCivilDates(start, end)).toBe(-1);
    expect(civilDatesInclusive(start, end)).toEqual([
      "2025-01-30",
      "2025-01-31",
      "2025-02-01",
      "2025-02-02",
    ]);
    expect(civilDatesInclusive(end, start)).toEqual([]);
  });
});

describe("deterministic decimals", () => {
  it("normalizes addition and multiplication results", () => {
    const left = must(normalizeDecimal(0.1));
    const right = must(normalizeDecimal(0.2));
    expect(addDecimals(left, right)).toBe(0.3);
    expect(multiplyDecimals(must(normalizeDecimal(3.2)), right)).toBe(0.64);
  });

  it("rounds ties away from zero and removes negative zero", () => {
    expect(must(normalizeDecimal(0.0000000015))).toBe(0.000000002);
    expect(must(normalizeDecimal(-0.0000000015))).toBe(-0.000000002);
    const zero = must(normalizeDecimal(-0));
    expect(zero).toBe(0);
    expect(Object.is(zero, -0)).toBe(false);
  });

  it("rejects non-finite and unsafe scaled values", () => {
    expect(normalizeDecimal(Number.NaN).ok).toBe(false);
    expect(normalizeDecimal(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(
      normalizeDecimal(Number.MAX_SAFE_INTEGER / 1_000_000_000 + 1).ok,
    ).toBe(false);
  });

  it("applies non-negative invariants after normalization", () => {
    expect(createCapacity(-1).ok).toBe(false);
    expect(createRemainingWorkload(Number.NaN).ok).toBe(false);
    expect(must(createCapacity(0))).toBe(0);
    expect(must(createRemainingWorkload(0.5))).toBe(0.5);
    expect(must(createRemainingWorkload(0.000000001))).toBe(0.000000001);
  });

  it("keeps repeated normalized additions stable and compares normalized values", () => {
    let sum = must(normalizeDecimal(0));
    const tenth = must(normalizeDecimal(0.1));
    for (let index = 0; index < 10; index += 1) sum = addDecimals(sum, tenth);
    expect(sum).toBe(1);
    expect(compareDecimals(sum, must(normalizeDecimal(1)))).toBe(0);
  });
});
