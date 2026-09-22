import { error, failure, success, type DomainResult } from "./result.js";

export interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SERIALIZED_PATTERN = /^(-?(?:0|[1-9]\d*))\/([1-9]\d*)$/;

export function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function createRational(
  numerator: bigint,
  denominator: bigint,
  path = "value",
): DomainResult<Rational> {
  return normalizeRational(numerator, denominator, path);
}

export function normalizeRational(
  numerator: bigint,
  denominator: bigint,
  path = "value",
): DomainResult<Rational> {
  if (denominator === 0n) {
    return failure([
      error(
        "ZERO_RATIONAL_DENOMINATOR",
        path,
        "Rational denominator must not be zero.",
      ),
    ]);
  }
  return success(reduceRational(numerator, denominator));
}

function reduceRational(numerator: bigint, denominator: bigint): Rational {
  if (numerator === 0n) {
    return Object.freeze({ numerator: 0n, denominator: 1n });
  }

  const sign = denominator < 0n ? -1n : 1n;
  const signedNumerator = numerator * sign;
  const positiveDenominator = denominator * sign;
  const divisor = gcd(signedNumerator, positiveDenominator);
  return Object.freeze({
    numerator: signedNumerator / divisor,
    denominator: positiveDenominator / divisor,
  });
}

export function rationalFromInteger(value: bigint): Rational {
  return Object.freeze({ numerator: value, denominator: 1n });
}

export function parseDecimalRational(
  value: string,
  path = "value",
): DomainResult<Rational> {
  if (!DECIMAL_PATTERN.test(value)) {
    return failure([
      error(
        "INVALID_DECIMAL_STRING",
        path,
        "Value must be a base-10 decimal without sign plus, exponent, separators, or leading zeroes.",
      ),
    ]);
  }

  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart = "0", fractionalPart = ""] = unsigned.split(".");
  const denominator = 10n ** BigInt(fractionalPart.length);
  const magnitude = BigInt(`${integerPart}${fractionalPart}`);
  return success(
    reduceRational(negative ? -magnitude : magnitude, denominator),
  );
}

export function parseSerializedRational(
  value: string,
  path = "value",
): DomainResult<Rational> {
  const match = SERIALIZED_PATTERN.exec(value);
  if (!match) {
    return failure([
      error(
        "INVALID_SERIALIZED_RATIONAL",
        path,
        "Serialized rational must use the form signed-integer/positive-integer.",
      ),
    ]);
  }
  return createRational(BigInt(match[1] ?? "0"), BigInt(match[2] ?? "0"), path);
}

export function addRationals(left: Rational, right: Rational): Rational {
  return reduceRational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function subtractRationals(left: Rational, right: Rational): Rational {
  return reduceRational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyRationals(left: Rational, right: Rational): Rational {
  return reduceRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

export function divideRationals(
  dividend: Rational,
  divisor: Rational,
  path = "divisor",
): DomainResult<Rational> {
  if (isZero(divisor)) {
    return failure([
      error("DIVISION_BY_ZERO", path, "Cannot divide a rational by zero."),
    ]);
  }
  return success(
    reduceRational(
      dividend.numerator * divisor.denominator,
      dividend.denominator * divisor.numerator,
    ),
  );
}

export function compareRationals(left: Rational, right: Rational): -1 | 0 | 1 {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function minRational(left: Rational, right: Rational): Rational {
  return compareRationals(left, right) <= 0 ? left : right;
}

export function maxRational(left: Rational, right: Rational): Rational {
  return compareRationals(left, right) >= 0 ? left : right;
}

export function isZero(value: Rational): boolean {
  return value.numerator === 0n;
}

export function isNegative(value: Rational): boolean {
  return value.numerator < 0n;
}

export function rationalToCanonicalString(value: Rational): string {
  return `${value.numerator}/${value.denominator}`;
}

function hasFiniteDecimal(value: Rational): boolean {
  let denominator = value.denominator;
  while (denominator % 2n === 0n) denominator /= 2n;
  while (denominator % 5n === 0n) denominator /= 5n;
  return denominator === 1n;
}

function renderDecimal(value: Rational, precision?: number): string {
  const negative = value.numerator < 0n;
  const magnitude = negative ? -value.numerator : value.numerator;
  const integerPart = magnitude / value.denominator;
  let remainder = magnitude % value.denominator;
  const digits: string[] = [];

  while (
    remainder !== 0n &&
    (precision === undefined || digits.length < precision)
  ) {
    remainder *= 10n;
    digits.push(String(remainder / value.denominator));
    remainder %= value.denominator;
  }

  const fractional = digits.join("").replace(/0+$/, "");
  const sign =
    negative && (integerPart !== 0n || fractional.length > 0) ? "-" : "";
  return fractional.length > 0
    ? `${sign}${integerPart}.${fractional}`
    : `${sign}${integerPart}`;
}

export function rationalToDecimalString(
  value: Rational,
  precision?: number,
  path = "precision",
): DomainResult<string> {
  if (
    precision !== undefined &&
    (!Number.isSafeInteger(precision) || precision < 0)
  ) {
    return failure([
      error(
        "INVALID_DECIMAL_PRECISION",
        path,
        "Decimal presentation precision must be a non-negative safe integer.",
      ),
    ]);
  }
  if (precision === undefined && !hasFiniteDecimal(value)) {
    return failure([
      error(
        "DECIMAL_PRECISION_REQUIRED",
        path,
        "A precision is required to render a non-terminating decimal.",
      ),
    ]);
  }
  return success(renderDecimal(value, precision));
}
