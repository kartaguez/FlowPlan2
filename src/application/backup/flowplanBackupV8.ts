import type { PlanningBackupDataset } from "./planningBackupDataset.js";
import { decodeFlowplanBackup as decodeLegacy } from "./flowplanBackupV7.js";
import { decodeCurrentPlanningInputs, encodeCurrentPlanningInputs, InvalidFlowplanBackup } from "./planningInputCodec.js";
import { assertCanonicalTimestamp } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";

export function decodeFlowplanBackup(text: string): PlanningBackupDataset {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  if (raw?.version !== 8) return decodeLegacy(text);
  try {
    if (!raw || Object.keys(raw).sort().join() !== "data,exportedAt,format,version" || raw.format !== "flowplan") throw new TypeError("Invalid V8 envelope.");
    assertCanonicalTimestamp(raw.exportedAt);
    const data = raw.data;
    if (!data || Object.keys(data).sort().join() !== "planning,portfolio,portfolioSnapshots,rafModelVersion" || data.rafModelVersion !== 2 || !Array.isArray(data.portfolioSnapshots)) throw new TypeError("Invalid V8 data.");
    const current = decodeCurrentPlanningInputs({ planning: data.planning, portfolio: data.portfolio, rafModelVersion: data.rafModelVersion });
    const seen = new Set<string>();
    const portfolioSnapshots = data.portfolioSnapshots.map((item: unknown, index: number) => {
      try {
        const snapshot = validateHistoricalSnapshot(item, current);
        if (seen.has(snapshot.snapshotId)) throw new TypeError("Duplicate snapshotId.");
        seen.add(snapshot.snapshotId); return snapshot;
      } catch (cause) { throw new TypeError(`portfolioSnapshots[${index}]: ${cause instanceof Error ? cause.message : cause}`); }
    });
    return Object.freeze({ ...current, portfolioSnapshots: Object.freeze(portfolioSnapshots) });
  } catch (cause) { throw new InvalidFlowplanBackup(cause instanceof Error ? cause.message : "Invalid V8."); }
}
export function encodeFlowplanBackupV8(state: PlanningBackupDataset, exportedAt = new Date().toISOString()): string {
  const text = JSON.stringify({ format: "flowplan", version: 8, exportedAt, data: { ...encodeCurrentPlanningInputs(state), portfolioSnapshots: state.portfolioSnapshots ?? [] } });
  decodeFlowplanBackup(text); return text;
}
