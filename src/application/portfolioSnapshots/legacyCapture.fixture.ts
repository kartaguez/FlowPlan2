import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "./capturePortfolioSnapshot.js";
/** Historical inputs1 fixture producer. Never used by production Save. */
export function captureLegacyInputs(...args: Parameters<typeof capturePortfolioSnapshot>) {
  const value = structuredClone(capturePortfolioSnapshot(...args));
  const inputs = value.inputs as { rafModelVersion?: number };
  delete inputs.rafModelVersion;
  return validateHistoricalSnapshot({ ...value, inputsSchemaVersion: 1 }, args[0]);
}
