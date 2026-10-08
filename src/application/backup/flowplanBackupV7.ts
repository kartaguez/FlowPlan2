import { decodeFlowplanBackup as decodeLegacy } from "./flowplanBackupV6.js";
import type { PlanningSessionState } from "../session/planningSession.js";
import { decodePlanningInputs, encodePlanningInputs, InvalidFlowplanBackup } from "./planningInputCodec.js";
import { assertCanonicalTimestamp } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";

export function decodeFlowplanBackup(text: string): PlanningSessionState {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  if (raw?.version !== 7) return decodeLegacy(text);
  try {
    if (!raw || Object.keys(raw).sort().join() !== "data,exportedAt,format,version" || raw.format !== "flowplan") throw new TypeError("Invalid V7 envelope.");
    assertCanonicalTimestamp(raw.exportedAt);
    const data = raw.data;
    if (!data || Object.keys(data).sort().join() !== "planning,portfolio,portfolioSnapshots" || !Array.isArray(data.portfolioSnapshots)) throw new TypeError("Invalid V7 data.");
    // V7 has no technical-clock bound on business knowledge dates.
    const current = decodePlanningInputs({ planning: data.planning, portfolio: data.portfolio }, 5, undefined, true);
    const seen = new Set<string>();
    const portfolioSnapshots = data.portfolioSnapshots.map((item: unknown, index: number) => {
      try {
        const snapshot = validateHistoricalSnapshot(item, current);
        if (seen.has(snapshot.snapshotId)) throw new TypeError("Duplicate snapshotId.");
        seen.add(snapshot.snapshotId);
        return snapshot;
      } catch (cause) { throw new TypeError(`portfolioSnapshots[${index}]: ${cause instanceof Error ? cause.message : cause}`); }
    });
    return Object.freeze({ ...current, portfolioSnapshots: Object.freeze(portfolioSnapshots) });
  } catch (cause) { throw new InvalidFlowplanBackup(cause instanceof Error ? cause.message : "Invalid V7."); }
}
export function encodeFlowplanBackupV7(state: PlanningSessionState, exportedAt = new Date().toISOString()): string {
  const text = JSON.stringify({ format: "flowplan", version: 7, exportedAt, data: { ...encodePlanningInputs(state), portfolioSnapshots: state.portfolioSnapshots ?? [] } });
  decodeFlowplanBackup(text);
  return text;
}
