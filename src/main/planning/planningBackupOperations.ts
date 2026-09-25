import type { PlanningSessionState } from "../../application/index.js";
import { decodeFlowplanBackupV1 } from "../../application/backup/flowplanBackupV1.js";
import type { PlanningBackupStore } from "../../infrastructure/backup/localPlanningBackup.js";

export function loadPlanningBackup(
  store: PlanningBackupStore,
  fallback: PlanningSessionState,
  preflight: (state: PlanningSessionState) => void,
): Readonly<{ state: PlanningSessionState; invalid: boolean }> {
  try {
    const document = store.read();
    if (document === null) return { state: fallback, invalid: false };
    const state = decodeFlowplanBackupV1(document);
    preflight(state);
    return { state, invalid: false };
  } catch {
    return { state: fallback, invalid: true };
  }
}

export function importPlanningBackup(input: {
  readonly document: string;
  readonly store: PlanningBackupStore;
  readonly preflight: (state: PlanningSessionState) => void;
  readonly confirm: () => boolean;
  readonly reload: () => void;
}): "imported" | "cancelled" | "failed" {
  try {
    const state = decodeFlowplanBackupV1(input.document);
    input.preflight(state);
    if (!input.confirm()) return "cancelled";
    input.store.write(input.document);
  } catch {
    return "failed";
  }
  input.reload();
  return "imported";
}
