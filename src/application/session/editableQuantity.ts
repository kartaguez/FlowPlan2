import {
  quantityToDecimalString,
  type Capacity,
  type DailyCap,
  type RemainingWorkload,
  type ReservationRatio,
  type UnavailabilityRatio,
} from "../../domain/index.js";

type EditableQuantity =
  | Capacity
  | DailyCap
  | RemainingWorkload
  | ReservationRatio
  | UnavailabilityRatio;

export const EDITING_DECIMAL_PRECISION = 3;

export function formatQuantityForEditing(value: EditableQuantity): string {
  const result = quantityToDecimalString(value, EDITING_DECIMAL_PRECISION);
  if (!result.ok) {
    throw new TypeError("Validated quantity could not be formatted for editing.");
  }
  return result.value;
}

export function formatPercentageForEditing(serializedRatio: string): string {
  const [rawNumerator, rawDenominator] = serializedRatio.split("/");
  if (rawNumerator === undefined || rawDenominator === undefined) {
    throw new TypeError("Canonical ratio serialization is invalid.");
  }
  const numerator = BigInt(rawNumerator) * 100n;
  const denominator = BigInt(rawDenominator);
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const integerPart = magnitude / denominator;
  let remainder = magnitude % denominator;
  const digits: string[] = [];
  while (remainder !== 0n && digits.length < EDITING_DECIMAL_PRECISION) {
    remainder *= 10n;
    digits.push(String(remainder / denominator));
    remainder %= denominator;
  }
  const fractional = digits.join("").replace(/0+$/, "");
  const sign = negative && (integerPart !== 0n || fractional.length > 0) ? "-" : "";
  return fractional.length === 0
    ? `${sign}${integerPart}`
    : `${sign}${integerPart}.${fractional}`;
}
