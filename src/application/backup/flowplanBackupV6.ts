import type { PlanningBackupDataset } from "./planningBackupDataset.js";
import { decodeFlowplanBackup as decodeLegacy, decodePlanningInputs, encodePlanningInputs, InvalidFlowplanBackup } from "./planningInputCodec.js";
import { assertCanonicalTimestamp } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";

export function decodeFlowplanBackup(text: string): PlanningBackupDataset {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  if (raw?.version !== 6) return decodeLegacy(text);
  try {
    if (!raw || Object.keys(raw).sort().join() !== "data,exportedAt,format,version" || raw.format !== "flowplan") throw new TypeError("Invalid V6 envelope.");
    assertCanonicalTimestamp(raw.exportedAt);
    const data = raw.data;
    if (!data || Object.keys(data).sort().join() !== "planning,portfolio,portfolioSnapshots" || !Array.isArray(data.portfolioSnapshots)) throw new TypeError("Invalid V6 data.");
    // V6 has no technical-clock bound on business knowledge dates.
    const current = decodePlanningInputs({ planning: data.planning, portfolio: data.portfolio }, 5, undefined, true);
    const seen = new Set<string>();
    const portfolioSnapshots = data.portfolioSnapshots.map((item: unknown, index: number) => {
      try {
        if ((item as { forecast?: { forecastSchemaVersion?: unknown } })?.forecast?.forecastSchemaVersion !== 1) throw new TypeError("V6 requires forecast schema 1.");
        const snapshot = validateHistoricalSnapshot(item, current);
        if (snapshot.inputsSchemaVersion !== 1) throw new TypeError("Legacy envelope requires inputs schema 1.");
        if (seen.has(snapshot.snapshotId)) throw new TypeError("Duplicate snapshotId.");
        seen.add(snapshot.snapshotId);
        return snapshot;
      } catch (cause) { throw new TypeError(`portfolioSnapshots[${index}]: ${cause instanceof Error ? cause.message : cause}`); }
    });
    return Object.freeze({ ...current, portfolioSnapshots: Object.freeze(portfolioSnapshots) });
  } catch (cause) { throw new InvalidFlowplanBackup(cause instanceof Error ? cause.message : "Invalid V6."); }
}
export function encodeFlowplanBackupV6(state: PlanningBackupDataset, exportedAt = new Date().toISOString()): string {
  const text = JSON.stringify({ format: "flowplan", version: 6, exportedAt, data: { ...encodePlanningInputs(state), portfolioSnapshots: state.portfolioSnapshots ?? [] } }, null, 2);
  decodeFlowplanBackup(text);
  return text;
}
