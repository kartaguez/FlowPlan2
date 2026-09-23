export function percentageToSerializedRatio(value: string): string | undefined {
  const trimmed = value.trim();
  const fraction = /^([+-]?\d+)\/([1-9]\d*)$/.exec(trimmed);
  if (fraction) return `${fraction[1]}/${BigInt(fraction[2]!) * 100n}`;
  const decimal = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!decimal) return undefined;
  const fractionDigits = decimal[3] ?? "";
  const numerator = BigInt(`${decimal[2]}${fractionDigits}`);
  const signedNumerator = decimal[1] === "-" ? -numerator : numerator;
  return `${signedNumerator}/${10n ** BigInt(fractionDigits.length) * 100n}`;
}

export function serializedRatioToPercentage(serializedRatio: string): string {
  const [numerator, denominator] = serializedRatio.split("/");
  if (numerator === undefined || denominator === undefined) {
    throw new TypeError("Canonical ratio serialization is invalid.");
  }
  const percentNumerator = BigInt(numerator) * 100n;
  const percentDenominator = BigInt(denominator);
  const divisor = greatestCommonDivisor(percentNumerator, percentDenominator);
  const reducedNumerator = percentNumerator / divisor;
  const reducedDenominator = percentDenominator / divisor;
  return reducedDenominator === 1n
    ? String(reducedNumerator)
    : `${reducedNumerator}/${reducedDenominator}`;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}
