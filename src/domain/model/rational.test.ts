import { describe, expect, it } from "vitest";
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
} from "./rational";
import type { DomainResult } from "./result";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const decimal = (value: string) => must(parseDecimalRational(value));
const serialized = (value: Rational) => rationalToCanonicalString(value);

describe("exact rational representation", () => {
  it.each([
    ["0", "0/1"],
    ["3.2", "16/5"],
    ["0.20", "1/5"],
    ["12.75", "51/4"],
    ["0.125", "1/8"],
    ["-1.25", "-5/4"],
  ])("parses decimal %s exactly as %s", (input, expected) => {
    expect(serialized(decimal(input))).toBe(expected);
  });

  it.each(["", ".5", "1.", "+1.2", "01", "1e-3", "NaN", "Infinity", "0x10"])(
    "rejects unsupported decimal syntax %s",
    (input) => {
      expect(parseDecimalRational(input)).toMatchObject({
        ok: false,
        errors: [{ code: "INVALID_DECIMAL_STRING" }],
      });
    },
  );

  it("canonicalizes signs, common factors, and zero", () => {
    expect(serialized(must(createRational(2n, 4n)))).toBe("1/2");
    expect(serialized(must(createRational(-2n, 4n)))).toBe("-1/2");
    expect(serialized(must(createRational(2n, -4n)))).toBe("-1/2");
    expect(serialized(must(createRational(-2n, -4n)))).toBe("1/2");
    expect(serialized(must(createRational(0n, -999n)))).toBe("0/1");
    expect(serialized(must(normalizeRational(6n, -9n)))).toBe("-2/3");
    expect(Object.isFrozen(must(createRational(1n, 2n)))).toBe(true);
    expect(gcd(-18n, 24n)).toBe(6n);
  });

  it("rejects a zero denominator and division by zero explicitly", () => {
    expect(createRational(1n, 0n)).toMatchObject({
      ok: false,
      errors: [{ code: "ZERO_RATIONAL_DENOMINATOR" }],
    });
    expect(divideRationals(decimal("1"), decimal("0"))).toMatchObject({
      ok: false,
      errors: [{ code: "DIVISION_BY_ZERO" }],
    });
  });

  it("performs exact arithmetic without numeric tolerances", () => {
    expect(serialized(addRationals(decimal("0.1"), decimal("0.2")))).toBe(
      "3/10",
    );
    expect(serialized(multiplyRationals(decimal("3.2"), decimal("0.2")))).toBe(
      "16/25",
    );

    const third = must(createRational(1n, 3n));
    expect(serialized(addRationals(addRationals(third, third), third))).toBe(
      "1/1",
    );
    expect(serialized(multiplyRationals(third, decimal("3")))).toBe("1/1");
    expect(serialized(subtractRationals(decimal("1"), decimal("0.25")))).toBe(
      "3/4",
    );
    expect(serialized(must(divideRationals(decimal("1"), decimal("8"))))).toBe(
      "1/8",
    );
  });

  it("compares, bounds, and classifies rational values", () => {
    const negative = decimal("-1");
    const zero = decimal("0");
    const positive = decimal("2");
    expect(compareRationals(negative, positive)).toBe(-1);
    expect(serialized(minRational(negative, positive))).toBe("-1/1");
    expect(serialized(maxRational(negative, positive))).toBe("2/1");
    expect(isNegative(negative)).toBe(true);
    expect(isZero(zero)).toBe(true);
  });

  it("renders finite decimals exactly and periodic decimals only with precision", () => {
    expect(must(rationalToDecimalString(must(createRational(16n, 5n))))).toBe(
      "3.2",
    );
    expect(must(rationalToDecimalString(must(createRational(16n, 25n))))).toBe(
      "0.64",
    );
    expect(must(rationalToDecimalString(must(createRational(1n, 8n))))).toBe(
      "0.125",
    );
    const third = must(createRational(1n, 3n));
    expect(rationalToDecimalString(third)).toMatchObject({
      ok: false,
      errors: [{ code: "DECIMAL_PRECISION_REQUIRED" }],
    });
    expect(must(rationalToDecimalString(third, 6))).toBe("0.333333");
  });

  it("round-trips the canonical exact serialization", () => {
    const restored = must(parseSerializedRational("16/25"));
    expect(serialized(restored)).toBe("16/25");
    expect(serialized(must(parseSerializedRational("2/4")))).toBe("1/2");
  });
});
