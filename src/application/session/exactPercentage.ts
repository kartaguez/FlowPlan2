export function percentageToSerializedRatio(value: string): string | undefined {
  const trimmed = value.trim();
  const decimal = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!decimal) return undefined;
  const fractionDigits = decimal[3] ?? "";
  const numerator = BigInt(`${decimal[2]}${fractionDigits}`);
  const signedNumerator = decimal[1] === "-" ? -numerator : numerator;
  return `${signedNumerator}/${10n ** BigInt(fractionDigits.length) * 100n}`;
}
