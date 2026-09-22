import { error, failure, success, type DomainResult } from "./result";

declare const normalizedDecimalBrand: unique symbol;
export type NormalizedDecimal = number & {
  readonly [normalizedDecimalBrand]: "NormalizedDecimal";
};

export const DECIMAL_SCALE = 1_000_000_000;

const INVALID_DECIMAL_MESSAGE =
  "Value must be finite and safely representable at nine decimal places.";

export function normalizeDecimal(
  value: number,
  path = "value",
): DomainResult<NormalizedDecimal> {
  const scaled = Math.abs(value) * DECIMAL_SCALE;
  if (!Number.isFinite(value) || scaled > Number.MAX_SAFE_INTEGER) {
    return failure([error("INVALID_DECIMAL", path, INVALID_DECIMAL_MESSAGE)]);
  }

  const roundedMagnitude = Math.round(scaled);
  const normalized =
    (value < 0 ? -roundedMagnitude : roundedMagnitude) / DECIMAL_SCALE;
  return success(
    (Object.is(normalized, -0) ? 0 : normalized) as NormalizedDecimal,
  );
}

function normalizeOperation(
  value: number,
  operation: string,
): NormalizedDecimal {
  const result = normalizeDecimal(value, operation);
  if (!result.ok) {
    throw new RangeError(result.errors[0]?.message ?? INVALID_DECIMAL_MESSAGE);
  }
  return result.value;
}

/** Operands are combined first, then the result is normalized to nine decimals. */
export function addDecimals(
  left: NormalizedDecimal,
  right: NormalizedDecimal,
): NormalizedDecimal {
  return normalizeOperation(left + right, "addition");
}

/** The right operand is subtracted first, then the result is normalized. */
export function subtractDecimals(
  left: NormalizedDecimal,
  right: NormalizedDecimal,
): NormalizedDecimal {
  return normalizeOperation(left - right, "subtraction");
}

/** Operands are multiplied first, then the result is normalized. */
export function multiplyDecimals(
  left: NormalizedDecimal,
  right: NormalizedDecimal,
): NormalizedDecimal {
  return normalizeOperation(left * right, "multiplication");
}

/** Operands are divided first, then the result is normalized. */
export function divideDecimals(
  dividend: NormalizedDecimal,
  divisor: NormalizedDecimal,
): NormalizedDecimal {
  if (divisor === 0) {
    throw new RangeError("Cannot divide a domain decimal by zero.");
  }
  return normalizeOperation(dividend / divisor, "division");
}

export function compareDecimals(
  left: NormalizedDecimal,
  right: NormalizedDecimal,
): -1 | 0 | 1 {
  return left < right ? -1 : left > right ? 1 : 0;
}
