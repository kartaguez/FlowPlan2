import type { HistoryCaptureProjection, HistoryReadRequest } from "../../application/history/historyCaptureProjection.js";
import type { RepositoryToken } from "../../application/persistence/planningRepository.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { PersistenceError, type PersistenceErrorCode, type StagedImport } from "../../application/persistence/planningRepository.js";
import type { StoredContent } from "../../application/persistence/createPlanningRepository.js";
import type { PlanningInputsDto } from "../../application/backup/planningInputCodec.js";
function freezeTransferred<T>(value: T): T {
  if (value !== null && typeof value === "object") { for (const child of Object.values(value)) freezeTransferred(child); Object.freeze(value); }
  return value;
}
export function createSnapshotValidationWorker() {
  const worker = new Worker(new URL("./planningStorageWorker.js", import.meta.url), { type: "module" });
  let id = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (cause: Error) => void }>();
  worker.onmessage = (event: MessageEvent<{ id: number; value?: unknown; error?: string; code?: PersistenceErrorCode }>) => {
    const task = pending.get(event.data.id); if (!task) return; pending.delete(event.data.id);
    if (event.data.error || !event.data.value) task.reject(new PersistenceError(event.data.code ?? "CORRUPT", event.data.error ?? "Storage validation failed."));
    else task.resolve(freezeTransferred(event.data.value));
  };
  const rejectAll = (message: string) => { for (const task of pending.values()) task.reject(new PersistenceError("UNAVAILABLE", message)); pending.clear(); };
  worker.onerror = () => rejectAll("Storage worker failed; data was preserved.");
  let queue: Promise<unknown> = Promise.resolve(), closed = false;
  const request = <T>(payload: object): Promise<T> => {
    const operation = queue.then(() => new Promise<T>((resolve, reject) => {
      if (closed) { reject(new PersistenceError("UNAVAILABLE", "Storage closed.")); return; }
      const key = ++id; pending.set(key, { resolve: value => resolve(value as T), reject }); worker.postMessage({ id: key, ...payload });
    }));
    queue = operation.catch(() => {}); return operation;
  };
  return {
    validate: (snapshot: StoredContent, current: StoredContent) => request<PortfolioSnapshot>({ type: "snapshot", snapshot, current }),
    inspect: (document: string | Blob) => request<{ current: PlanningInputsDto; repairs: readonly string[] }>({ type: "header", document }),
    stage: (document: string | Blob, stageId: string, database: string) => request<StagedImport>({ type: "stage", document, stageId, database }),
    history: (database: string, snapshotId: string, token: RepositoryToken, view: HistoryReadRequest) => request<HistoryCaptureProjection>({ type: "history", database, snapshotId, token, view }),
    close: () => { closed = true; rejectAll("Storage closed."); worker.terminate(); },
  };
}
