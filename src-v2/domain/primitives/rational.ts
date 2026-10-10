import { invalid, success, type DomainResult } from './result.js';
import { dataRecord, field, hasKeys } from './data.js';
declare const rationalBrand: unique symbol;
export interface Rational { readonly numerator: bigint; readonly denominator: bigint; readonly [rationalBrand]: true }
function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left, b = right < 0n ? -right : right;
  while (b !== 0n) { const remainder = a % b; a = b; b = remainder; }
  return a;
}
function reduce(numerator: bigint, denominator: bigint): Rational {
  if (numerator === 0n) return Object.freeze({ numerator: 0n, denominator: 1n }) as Rational;
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return Object.freeze({ numerator: numerator * sign / divisor, denominator: denominator * sign / divisor }) as Rational;
}
export function createRational(numerator: unknown, denominator: unknown, path = 'value'): DomainResult<Rational> {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') return invalid('INVALID_RATIONAL_PAIR', path);
  if (denominator === 0n) return invalid('ZERO_RATIONAL_DENOMINATOR', path);
  return success(reduce(numerator, denominator));
}
export function validateRational(input: unknown, path = 'value'): DomainResult<Rational> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  const n = field(record.value, 'numerator'), d = field(record.value, 'denominator');
  if (!hasKeys(record.value, ['numerator', 'denominator']) || typeof n !== 'bigint' || typeof d !== 'bigint' ||
      d <= 0n || gcd(n, d) !== 1n) return invalid('INVALID_CANONICAL_RATIONAL', path);
  return success(reduce(n, d));
}
/** ASCII integer, decimal or fraction. Leading zeroes are accepted and normalized. */
export function parseRational(input: unknown, path = 'value'): DomainResult<Rational> {
  if (typeof input !== 'string') return invalid('INVALID_RATIONAL_TEXT', path);
  if (/^-?[0-9]+\/[0-9]+$/.test(input)) {
    const [n, d] = input.split('/');
    return createRational(BigInt(n!), BigInt(d!), path);
  }
  if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(input)) return invalid('INVALID_RATIONAL_TEXT', path);
  const negative = input.startsWith('-');
  const [integer, fractional = ''] = (negative ? input.slice(1) : input).split('.');
  const magnitude = BigInt(`${integer}${fractional}`);
  return success(reduce(negative ? -magnitude : magnitude, 10n ** BigInt(fractional.length)));
}
type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
/** Shared-denominator cancellation from the independently validated legacy algorithm. */
function combine(a: Rational, b: Rational, sign: 1n | -1n): Rational {
  const shared = gcd(a.denominator, b.denominator);
  const leftDenominator = a.denominator / shared;
  const rightDenominator = b.denominator / shared;
  const numerator = a.numerator * rightDenominator + sign * b.numerator * leftDenominator;
  const cancellation = gcd(numerator, shared);
  return reduce(numerator / cancellation, leftDenominator * (b.denominator / cancellation));
}
function calculate(left: unknown, right: unknown, operation: Operation, path: string): DomainResult<Rational> {
  const l = validateRational(left, `${path}.left`); if (!l.ok) return l;
  const r = validateRational(right, `${path}.right`); if (!r.ok) return r;
  const a = l.value, b = r.value;
  switch (operation) {
    case 'add': return success(combine(a, b, 1n));
    case 'subtract': return success(combine(a, b, -1n));
    case 'multiply': {
      const x = gcd(a.numerator, b.denominator), y = gcd(b.numerator, a.denominator);
      return success(reduce((a.numerator / x) * (b.numerator / y), (a.denominator / y) * (b.denominator / x)));
    }
    case 'divide': {
      if (b.numerator === 0n) return invalid('DIVISION_BY_ZERO', `${path}.right`);
      const x = gcd(a.numerator, b.numerator), y = gcd(b.denominator, a.denominator);
      return success(reduce((a.numerator / x) * (b.denominator / y), (a.denominator / y) * (b.numerator / x)));
    }
  }
}
export const addRationals = (left: unknown, right: unknown, path = 'value'): DomainResult<Rational> => calculate(left, right, 'add', path);
export const subtractRationals = (left: unknown, right: unknown, path = 'value'): DomainResult<Rational> => calculate(left, right, 'subtract', path);
export const multiplyRationals = (left: unknown, right: unknown, path = 'value'): DomainResult<Rational> => calculate(left, right, 'multiply', path);
export const divideRationals = (left: unknown, right: unknown, path = 'value'): DomainResult<Rational> => calculate(left, right, 'divide', path);
export function compareRationals(left: unknown, right: unknown, path = 'value'): DomainResult<-1 | 0 | 1> {
  const l = validateRational(left, `${path}.left`); if (!l.ok) return l;
  const r = validateRational(right, `${path}.right`); if (!r.ok) return r;
  const difference = l.value.numerator * r.value.denominator - r.value.numerator * l.value.denominator;
  return success(difference < 0n ? -1 : difference > 0n ? 1 : 0);
}
export function equalRationals(left: unknown, right: unknown, path = 'value'): DomainResult<boolean> {
  const comparison = compareRationals(left, right, path);
  return comparison.ok ? success(comparison.value === 0) : comparison;
}
export function rationalToCanonicalString(input: unknown, path = 'value'): DomainResult<string> {
  const value = validateRational(input, path);
  return value.ok ? success(`${value.value.numerator}/${value.value.denominator}`) : value;
}
