import { rationalOf, rationalToCanonicalString, type ConsumedWorkload,
  type RemainingWorkload, type Rational } from "../../domain/index.js";

// Extract prime powers in logarithmically many divisions, rather than one
// division per decimal place. Operands are validated reduced Domain rationals.
function removeFactor(value: bigint, factor: bigint): { rest: bigint; exponent: number } {
  const powers: { value: bigint; exponent: number }[] = [];
  let power = factor;
  let exponent = 1;
  while (value % power === 0n) {
    powers.push({ value: power, exponent });
    power *= power;
    exponent *= 2;
  }
  let count = 0;
  for (const row of powers.reverse()) {
    if (value % row.value === 0n) {
      value /= row.value;
      count += row.exponent;
    }
  }
  return { rest: value, exponent: count };
}

/** Complete finite decimal (French comma), otherwise a reduced exact fraction.
 * Number counters describe string lengths only; business arithmetic stays BigInt.
 * No precision budget, decimal loop, rounding or truncation is involved.
 */
export function formatActualsRational(value: Rational): string {
  const twos = removeFactor(value.denominator, 2n);
  const fives = removeFactor(twos.rest, 5n);
  if (fives.rest !== 1n) return rationalToCanonicalString(value);
  const scale = Math.max(twos.exponent, fives.exponent);
  const negative = value.numerator < 0n;
  const magnitude = negative ? -value.numerator : value.numerator;
  const scaled = magnitude * 2n ** BigInt(scale - twos.exponent) * 5n ** BigInt(scale - fives.exponent);
  const digits = String(scaled).padStart(scale + 1, "0");
  const sign = negative ? "-" : "";
  return scale === 0 ? sign + digits : sign + digits.slice(0, -scale) + "," + digits.slice(-scale);
}

const formattedQuantities = new WeakMap<ConsumedWorkload | RemainingWorkload, string>();

export function formatActualsQuantity(value: ConsumedWorkload | RemainingWorkload): string {
  const previous = formattedQuantities.get(value);
  if (previous !== undefined) return previous;
  const rendered = formatActualsRational(rationalOf(value));
  formattedQuantities.set(value, rendered);
  return rendered;
}
