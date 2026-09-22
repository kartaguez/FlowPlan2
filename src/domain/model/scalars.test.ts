import { describe, expect, it } from "vitest";
import {
  capacityFromSerialized,
  createCapacity,
  createDailyCap,
  createRemainingWorkload,
  createReservationRatio,
  quantityToDecimalString,
  serializeQuantity,
  type DomainResult,
} from "../index";
import { createRational, rationalFromInteger } from "./rational";
import { capacityFromRational, capacityRatioFromRational } from "./scalars";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("opaque rational domain quantities", () => {
  it("rejects invalid capacities created from internal rationals", () => {
    expect(capacityFromRational(rationalFromInteger(-1n))).toMatchObject({
      ok: false,
      errors: [{ code: "NEGATIVE_CAPACITY", path: "capacity" }],
    });
  });

  it("rejects invalid capacity ratios created from internal rationals", () => {
    const negativeHalf = must(createRational(-1n, 2n));
    expect(capacityRatioFromRational(negativeHalf)).toMatchObject({
      ok: false,
      errors: [{ code: "NEGATIVE_RATIO", path: "ratio" }],
    });
  });

  it.each([
    ["0", "0/1"],
    ["3.2", "16/5"],
    ["0.20", "1/5"],
    ["12.75", "51/4"],
    ["0.125", "1/8"],
  ])("creates capacity %s exactly as %s", (input, expected) => {
    expect(serializeQuantity(must(createCapacity(input)))).toBe(expected);
  });

  it("preserves non-negative business invariants and accepts zero", () => {
    expect(createCapacity("-1").ok).toBe(false);
    expect(createRemainingWorkload("-0.1").ok).toBe(false);
    expect(serializeQuantity(must(createRemainingWorkload("0")))).toBe("0/1");
    expect(serializeQuantity(must(createDailyCap("0")))).toBe("0/1");
  });

  it("rejects unsupported decimal input at the public factory boundary", () => {
    for (const invalid of ["1e-3", "+1.2", "NaN", "Infinity", "0x10"]) {
      expect(createCapacity(invalid)).toMatchObject({
        ok: false,
        errors: [{ code: "INVALID_DECIMAL_STRING" }],
      });
    }
  });

  it("keeps individual reservation ratios in the exact zero-to-one range", () => {
    expect(createReservationRatio("0").ok).toBe(true);
    expect(createReservationRatio("1").ok).toBe(true);
    expect(createReservationRatio("-0.0000000000000000001").ok).toBe(false);
    expect(createReservationRatio("1.0000000000000000001").ok).toBe(false);
  });

  it("serializes exactly and renders periodic values only with explicit precision", () => {
    const third = must(capacityFromSerialized("1/3"));
    expect(serializeQuantity(third)).toBe("1/3");
    expect(quantityToDecimalString(third)).toMatchObject({
      ok: false,
      errors: [{ code: "DECIMAL_PRECISION_REQUIRED" }],
    });
    expect(must(quantityToDecimalString(third, 8))).toBe("0.33333333");
    expect(Object.isFrozen(third)).toBe(true);
  });
});
