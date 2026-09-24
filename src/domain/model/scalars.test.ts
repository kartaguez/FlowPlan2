import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capacityFromSerialized,
  createCapacity,
  createDailyCap,
  createProgramId,
  createPriorityFamilyId,
  createRemainingWorkload,
  createReservationRatio,
  createUnavailabilityRatio,
  quantityToDecimalString,
  serializeQuantity,
  type DomainResult,
} from "../index.js";
import { createRational, rationalFromInteger } from "./rational.js";
import {
  capacityFromRational,
  capacityRatioFromRational,
  remainingWorkloadFromRational,
} from "./scalars.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("opaque rational domain quantities", () => {
  it("creates distinct Program and PriorityFamily IDs and rejects blank values", () => {
    assert.equal(must(createProgramId("program-phoenix")), "program-phoenix");
    assert.equal(must(createPriorityFamilyId("pas-strategic")), "pas-strategic");
    for (const factory of [createProgramId, createPriorityFamilyId]) {
      assert.equal(factory(" ").ok, false);
      assert.equal(factory("").ok, false);
    }
  });
  it("rejects invalid capacities created from internal rationals", () => {
    const result = capacityFromRational(rationalFromInteger(-1n));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code, path }) => ({ code, path })),
        [{ code: "NEGATIVE_CAPACITY", path: "capacity" }],
      );
    }
  });

  it("rejects invalid capacity ratios created from internal rationals", () => {
    const negativeHalf = must(createRational(-1n, 2n));
    const result = capacityRatioFromRational(negativeHalf);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code, path }) => ({ code, path })),
        [{ code: "NEGATIVE_RATIO", path: "ratio" }],
      );
    }
  });

  it("rejects invalid remaining workloads created from internal rationals", () => {
    const result = remainingWorkloadFromRational(rationalFromInteger(-1n));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code, path }) => ({ code, path })),
        [
          {
            code: "NEGATIVE_REMAINING_WORKLOAD",
            path: "remainingWorkload",
          },
        ],
      );
    }
  });

  for (const [input, expected] of [
    ["0", "0/1"],
    ["3.2", "16/5"],
    ["0.20", "1/5"],
    ["12.75", "51/4"],
    ["0.125", "1/8"],
  ] as const) {
    it(`creates capacity ${input} exactly as ${expected}`, () => {
      assert.equal(serializeQuantity(must(createCapacity(input))), expected);
    });
  }

  it("preserves non-negative business invariants and accepts zero", () => {
    assert.equal(createCapacity("-1").ok, false);
    assert.equal(createRemainingWorkload("-0.1").ok, false);
    assert.equal(
      serializeQuantity(must(createRemainingWorkload("0"))),
      "0/1",
    );
    assert.equal(serializeQuantity(must(createDailyCap("0"))), "0/1");
  });

  it("rejects unsupported decimal input at the public factory boundary", () => {
    for (const invalid of ["1e-3", "+1.2", "NaN", "Infinity", "0x10"]) {
      const result = createCapacity(invalid);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errors[0]?.code, "INVALID_DECIMAL_STRING");
      }
    }
  });

  it("keeps individual reservation ratios in the exact zero-to-one range", () => {
    assert.equal(createReservationRatio("0").ok, true);
    assert.equal(createReservationRatio("1").ok, true);
    assert.equal(createReservationRatio("-0.0000000000000000001").ok, false);
    assert.equal(createReservationRatio("1.0000000000000000001").ok, false);
  });

  it("keeps period unavailability in its own exact zero-to-one type", () => {
    assert.equal(
      serializeQuantity(must(createUnavailabilityRatio("0"))),
      "0/1",
    );
    assert.equal(
      serializeQuantity(must(createUnavailabilityRatio("1"))),
      "1/1",
    );
    assert.equal(
      serializeQuantity(must(createUnavailabilityRatio("0.25"))),
      "1/4",
    );
    assert.equal(createUnavailabilityRatio("-0.1").ok, false);
    assert.equal(createUnavailabilityRatio("1.1").ok, false);
  });

  it("serializes exactly and renders periodic values only with explicit precision", () => {
    const third = must(capacityFromSerialized("1/3"));
    assert.equal(serializeQuantity(third), "1/3");
    const withoutPrecision = quantityToDecimalString(third);
    assert.equal(withoutPrecision.ok, false);
    if (!withoutPrecision.ok) {
      assert.equal(
        withoutPrecision.errors[0]?.code,
        "DECIMAL_PRECISION_REQUIRED",
      );
    }
    assert.equal(must(quantityToDecimalString(third, 8)), "0.33333333");
    assert.equal(Object.isFrozen(third), true);
  });
});
