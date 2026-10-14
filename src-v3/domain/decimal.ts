export interface Decimal {
  readonly units: bigint;
  readonly scale: number;
}

export const ZERO: Decimal = Object.freeze({ units: 0n, scale: 0 });

export function parseDecimal(value: string): Decimal | null {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [integer = "", fraction = ""] = value.split(".");
  return normalize(BigInt(integer + fraction), fraction.length);
}

function normalize(units: bigint, scale: number): Decimal {
  if (units === 0n) return ZERO;
  while (scale > 0 && units % 10n === 0n) {
    units /= 10n;
    scale--;
  }
  return Object.freeze({ units, scale });
}

function align(a: Decimal, b: Decimal): [bigint, bigint, number] {
  const scale = Math.max(a.scale, b.scale);
  return [a.units * 10n ** BigInt(scale - a.scale), b.units * 10n ** BigInt(scale - b.scale), scale];
}

export function compareDecimal(a: Decimal, b: Decimal): number {
  const [left, right] = align(a, b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function addDecimal(a: Decimal, b: Decimal): Decimal {
  const [left, right, scale] = align(a, b);
  return normalize(left + right, scale);
}

export function subtractDecimal(a: Decimal, b: Decimal): Decimal {
  const [left, right, scale] = align(a, b);
  if (left < right) throw new RangeError("Decimal subtraction would be negative");
  return normalize(left - right, scale);
}

export function minDecimal(a: Decimal, b: Decimal): Decimal {
  return compareDecimal(a, b) <= 0 ? a : b;
}

export function decimalToString(value: Decimal): string {
  if (value.scale === 0) return value.units.toString();
  const digits = value.units.toString().padStart(value.scale + 1, "0");
  const cut = digits.length - value.scale;
  return `${digits.slice(0, cut)}.${digits.slice(cut)}`;
}
