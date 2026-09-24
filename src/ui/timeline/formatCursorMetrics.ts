import type { Rational } from "../../domain/index.js";

function decimal(value: Rational, scale: bigint): string {
  const negative = value.numerator < 0n;
  const magnitude = negative ? -value.numerator : value.numerator;
  const rounded = (magnitude * scale * 2n + value.denominator) / (value.denominator * 2n);
  const whole = rounded / 100n;
  const fraction = String(rounded % 100n).padStart(2, "0").replace(/0+$/, "");
  return `${negative && rounded !== 0n ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function formatCursorMd(value: Rational): string {
  return `${decimal(value, 100n)} MD`;
}

export function formatCursorPercent(value: Rational | undefined): string {
  return value === undefined ? "N/A" : `${decimal(value, 10_000n)}%`;
}
