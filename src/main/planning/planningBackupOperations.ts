import type { PlanningBackupDataset } from "../../application/backup/planningBackupDataset.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV7 } from "../../application/backup/flowplanBackupV1.js";
import type { PlanningBackupStore } from "../../infrastructure/backup/localPlanningBackup.js";

export function loadPlanningBackup(
  store: PlanningBackupStore,
  fallback: PlanningBackupDataset,
  preflight: (state: PlanningBackupDataset) => void,
): Readonly<{ state: PlanningBackupDataset; invalid: boolean }> {
  try {
    const document = store.read();
    if (document === null) return { state: fallback, invalid: false };
    const state = decodeFlowplanBackup(document);
    preflight(state);
    return { state, invalid: false };
  } catch {
    return { state: fallback, invalid: true };
  }
}

export function importPlanningBackup(input: {
  readonly document: string;
  readonly store: PlanningBackupStore;
  readonly preflight: (state: PlanningBackupDataset) => void;
  readonly confirm: () => boolean;
  readonly reload: () => void;
}): "imported" | "cancelled" | "failed" {
  try {
    const state = decodeFlowplanBackup(input.document);
    input.preflight(state);
    if (!input.confirm()) return "cancelled";
    input.store.write(encodeFlowplanBackupV7(state));
  } catch {
    return "failed";
  }
  input.reload();
  return "imported";
}
