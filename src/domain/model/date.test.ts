import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  civilDatesInclusive,
  compareCivilDates,
  createCivilDate,
  type DomainResult,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("CivilDate", () => {
  it("validates leap years and impossible dates", () => {
    assert.equal(createCivilDate("2024-02-29").ok, true);
    const impossible = createCivilDate("2023-02-29");
    assert.equal(impossible.ok, false);
    if (!impossible.ok) {
      assert.deepEqual(
        impossible.errors.map(({ code, path }) => ({ code, path })),
        [{ code: "INVALID_CIVIL_DATE", path: "date" }],
      );
    }
    assert.equal(createCivilDate("2024-2-09").ok, false);
  });

  it("adds days across month and year boundaries without timezone state", () => {
    assert.equal(
      must(addDays(must(createCivilDate("2024-02-28")), 2)),
      "2024-03-01",
    );
    assert.equal(
      must(addDays(must(createCivilDate("2024-12-31")), 1)),
      "2025-01-01",
    );
    assert.equal(
      must(addDays(must(createCivilDate("2025-01-01")), -1)),
      "2024-12-31",
    );
  });

  it("compares and traverses inclusive intervals", () => {
    const start = must(createCivilDate("2025-01-30"));
    const end = must(createCivilDate("2025-02-02"));
    assert.equal(compareCivilDates(start, end), -1);
    assert.deepEqual(civilDatesInclusive(start, end), [
      "2025-01-30",
      "2025-01-31",
      "2025-02-01",
      "2025-02-02",
    ]);
    assert.deepEqual(civilDatesInclusive(end, start), []);
  });
});
