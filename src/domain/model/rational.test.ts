import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRationals,
  compareRationals,
  createRational,
  divideRationals,
  gcd,
  isNegative,
  isZero,
  maxRational,
  minRational,
  multiplyRationals,
  normalizeRational,
  parseDecimalRational,
  parseSerializedRational,
  rationalToCanonicalString,
  rationalToDecimalString,
  subtractRationals,
  type Rational,
} from "./rational.js";
import type { DomainResult } from "./result.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const decimal = (value: string) => must(parseDecimalRational(value));
const serialized = (value: Rational) => rationalToCanonicalString(value);

describe("exact rational representation", () => {
  for (const [input, expected] of [
    ["0", "0/1"],
    ["3.2", "16/5"],
    ["0.20", "1/5"],
    ["12.75", "51/4"],
    ["0.125", "1/8"],
    ["-1.25", "-5/4"],
  ] as const) {
    it(`parses decimal ${input} exactly as ${expected}`, () => {
      assert.equal(serialized(decimal(input)), expected);
    });
  }

  for (const input of [
    "",
    ".5",
    "1.",
    "+1.2",
    "01",
    "1e-3",
    "NaN",
    "Infinity",
    "0x10",
  ]) {
    it(`rejects unsupported decimal syntax ${input}`, () => {
      const result = parseDecimalRational(input);
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errors[0]?.code, "INVALID_DECIMAL_STRING");
      }
    });
  }

  it("canonicalizes signs, common factors, and zero", () => {
    assert.equal(serialized(must(createRational(2n, 4n))), "1/2");
    assert.equal(serialized(must(createRational(-2n, 4n))), "-1/2");
    assert.equal(serialized(must(createRational(2n, -4n))), "-1/2");
    assert.equal(serialized(must(createRational(-2n, -4n))), "1/2");
    assert.equal(serialized(must(createRational(0n, -999n))), "0/1");
    assert.equal(serialized(must(normalizeRational(6n, -9n))), "-2/3");
    assert.equal(Object.isFrozen(must(createRational(1n, 2n))), true);
    assert.equal(gcd(-18n, 24n), 6n);
  });

  it("rejects a zero denominator and division by zero explicitly", () => {
    const invalidRational = createRational(1n, 0n);
    assert.equal(invalidRational.ok, false);
    if (!invalidRational.ok) {
      assert.equal(
        invalidRational.errors[0]?.code,
        "ZERO_RATIONAL_DENOMINATOR",
      );
    }
    const invalidDivision = divideRationals(decimal("1"), decimal("0"));
    assert.equal(invalidDivision.ok, false);
    if (!invalidDivision.ok) {
      assert.equal(invalidDivision.errors[0]?.code, "DIVISION_BY_ZERO");
    }
  });

  it("performs exact arithmetic without numeric tolerances", () => {
    assert.equal(
      serialized(addRationals(decimal("0.1"), decimal("0.2"))),
      "3/10",
    );
    assert.equal(
      serialized(multiplyRationals(decimal("3.2"), decimal("0.2"))),
      "16/25",
    );

    const third = must(createRational(1n, 3n));
    assert.equal(
      serialized(addRationals(addRationals(third, third), third)),
      "1/1",
    );
    assert.equal(serialized(multiplyRationals(third, decimal("3"))), "1/1");
    assert.equal(
      serialized(subtractRationals(decimal("1"), decimal("0.25"))),
      "3/4",
    );
    assert.equal(
      serialized(must(divideRationals(decimal("1"), decimal("8")))),
      "1/8",
    );
  });

  it("compares, bounds, and classifies rational values", () => {
    const negative = decimal("-1");
    const zero = decimal("0");
    const positive = decimal("2");
    assert.equal(compareRationals(negative, positive), -1);
    assert.equal(serialized(minRational(negative, positive)), "-1/1");
    assert.equal(serialized(maxRational(negative, positive)), "2/1");
    assert.equal(isNegative(negative), true);
    assert.equal(isZero(zero), true);
  });

  it("renders finite decimals exactly and periodic decimals only with precision", () => {
    assert.equal(
      must(rationalToDecimalString(must(createRational(16n, 5n)))),
      "3.2",
    );
    assert.equal(
      must(rationalToDecimalString(must(createRational(16n, 25n)))),
      "0.64",
    );
    assert.equal(
      must(rationalToDecimalString(must(createRational(1n, 8n)))),
      "0.125",
    );
    const third = must(createRational(1n, 3n));
    const withoutPrecision = rationalToDecimalString(third);
    assert.equal(withoutPrecision.ok, false);
    if (!withoutPrecision.ok) {
      assert.equal(
        withoutPrecision.errors[0]?.code,
        "DECIMAL_PRECISION_REQUIRED",
      );
    }
    assert.equal(must(rationalToDecimalString(third, 6)), "0.333333");
  });

  it("round-trips the canonical exact serialization", () => {
    const restored = must(parseSerializedRational("16/25"));
    assert.equal(serialized(restored), "16/25");
    assert.equal(serialized(must(parseSerializedRational("2/4"))), "1/2");
  });
});
