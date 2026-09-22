import { describe, expect, it } from "vitest";
import {
  addDays,
  civilDatesInclusive,
  compareCivilDates,
  createCivilDate,
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
