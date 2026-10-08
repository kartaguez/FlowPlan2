import { projectHistoryCapture, type HistoryProjectionReader } from "../../application/history/historyCaptureProjection.js";
import { decodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import { createSnapshotValidationWorker } from "./snapshotValidationWorker.js";
import { REPOSITORY_STORES, type RepositoryStorage, type RepositoryTransaction, type RepositoryKey, type StorageRow } from "../../application/persistence/repositoryStorage.js";
import { createPlanningRepository } from "../../application/persistence/createPlanningRepository.js";
import { PersistenceError } from "../../application/persistence/planningRepository.js";
import { sha256 } from "./fingerprint.js";
export const PLANNING_DATABASE = "flowplan-planning";
export function persistenceError(cause: unknown): Error {
  if (cause instanceof PersistenceError) return cause;
  const name = cause instanceof Error ? cause.name : "";
  const code = name === "QuotaExceededError" ? "QUOTA" : name === "ConstraintError" ? "INVALID" : "UNAVAILABLE";
  return new PersistenceError(code, code === "QUOTA" ? "Browser storage quota exceeded. Data and drafts were preserved; export or free space, then retry." : cause instanceof Error ? cause.message : "Browser storage unavailable.", { cause });
}
export async function openIndexedDbRepositoryStorage(input: {
  readonly factory: IDBFactory;
  readonly name?: string;
  readonly onBlocked?: () => void;
  readonly onVersionChange?: () => void;
  readonly onCommit?: () => void;
}): Promise<RepositoryStorage> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    let abandoned = false;
    const request = input.factory.open(input.name ?? PLANNING_DATABASE, 2);
    request.onupgradeneeded = event => {
      for (const store of REPOSITORY_STORES) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
      const receipts = request.transaction!.objectStore("receipts");
      if (!receipts.indexNames.contains("revision")) receipts.createIndex("revision", "token.revision");
      if (event.oldVersion === 1) {
        const cursor = request.transaction!.objectStore("jobs").openCursor(IDBKeyRange.bound("stage-", "stage.", false, true));
        cursor.onsuccess = () => { const row = cursor.result; if (row) { if (row.value.complete) row.update({ ...row.value, activated: true }); row.continue(); } };
      }
      // Upgrade the unreleased v1 prototype using indexes only, never historical payloads.
      const control = request.transaction!.objectStore("control"), active = control.get("active");
      active.onsuccess = () => { if (active.result && active.result.identityCount === undefined) {
        const count = request.transaction!.objectStore("identityReservations").count(IDBKeyRange.bound([active.result.generation], [active.result.generation, []], false, true));
        count.onsuccess = () => control.put({ ...active.result, identityCount: count.result }, "active");
      } };
    };
    request.onblocked = () => { abandoned = true; input.onBlocked?.(); reject(new PersistenceError("BLOCKED", "Close older FlowPlan tabs to allow the storage upgrade.")); };
    request.onerror = () => reject(persistenceError(request.error));
    request.onsuccess = () => { if (abandoned) request.result.close(); else resolve(request.result); };
  });
  db.onversionchange = () => { db.close(); input.onVersionChange?.(); };
  return {
    close: () => db.close(),
    transaction: (stores, mode, body) => new Promise((resolve, reject) => {
      let native: IDBTransaction;
      try { native = db.transaction([...stores], mode, { durability: mode === "readwrite" ? "strict" : "default" }); }
      catch (cause) { reject(persistenceError(cause)); return; }
      let result: unknown, failure: unknown, settled = false;
      const request = <T>(value: IDBRequest<T>): Promise<T> => new Promise((yes, no) => { value.onsuccess = () => yes(value.result); value.onerror = () => no(value.error); });
      const key = (value: RepositoryKey): IDBValidKey => typeof value === "string" ? value : [...value];
      const tx: RepositoryTransaction = {
        get: <T>(store: string, id: RepositoryKey) => request(native.objectStore(store).get(key(id))) as Promise<T | undefined>,
        put: async (store, id, value) => { await request(native.objectStore(store).put(value, key(id))); },
        add: async (store, id, value) => { await request(native.objectStore(store).add(value, key(id))); },
        delete: async (store, id) => { await request(native.objectStore(store).delete(key(id))); },
        trimReceipts: keep => new Promise<void>((yes, no) => {
          const receipts = native.objectStore("receipts"), count = receipts.count();
          count.onerror = () => no(count.error);
          count.onsuccess = () => { let extra = count.result - keep; if (extra <= 0) { yes(); return; }
            const cursor = receipts.index("revision").openCursor(); cursor.onerror = () => no(cursor.error);
            cursor.onsuccess = () => { const row = cursor.result; if (!row || extra <= 0) { yes(); return; } row.delete(); extra--; row.continue(); };
          };
        }),
        scan: <T>(store: string, prefix: readonly string[] | string, after?: RepositoryKey, limit = Number.MAX_SAFE_INTEGER) => new Promise<readonly StorageRow<T>[]>((yes, no) => {
          // Array sentinel compares above every string continuation, including unusual snapshot IDs.
          const range = typeof prefix === "string" ? prefix ? IDBKeyRange.bound(after ? key(after) : prefix, prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1), !!after, true) : IDBKeyRange.lowerBound("")
            : IDBKeyRange.bound(after ? key(after) : [...prefix], [...prefix, []], !!after, true);
          const cursor = native.objectStore(store).openCursor(range); const rows: StorageRow<T>[] = [];
          cursor.onerror = () => no(cursor.error);
          cursor.onsuccess = () => { const row = cursor.result; if (!row || rows.length >= limit) { yes(rows); return; }
            rows.push({ key: row.key as RepositoryKey, value: row.value as T }); row.continue(); };
        }),
      };
      native.oncomplete = () => { settled = true; if (mode === "readwrite") input.onCommit?.(); resolve(result as never); };
      native.onabort = () => { settled = true; reject(persistenceError(failure ?? native.error)); };
      native.onerror = () => { failure ??= native.error; };
      void body(tx).then(value => { result = value; }, cause => { failure = cause; if (!settled) { try { native.abort(); } catch { reject(persistenceError(cause)); } } });
    }),
  };
}
export async function openIndexedDbPlanningRepository(input: Parameters<typeof openIndexedDbRepositoryStorage>[0]) {
  let validator: ReturnType<typeof createSnapshotValidationWorker> | undefined;
  const storage = await openIndexedDbRepositoryStorage({ ...input, onVersionChange: () => { validator?.close(); input.onVersionChange?.(); } });
  if (typeof Worker !== "undefined") validator = createSnapshotValidationWorker();
  const repository = createPlanningRepository(storage, sha256, validator?.validate);
  const historyProjection: HistoryProjectionReader = (id, token, view) => validator ? validator.history(input.name ?? PLANNING_DATABASE, id, token, view)
    : repository.readSnapshot(id, token).then(snapshot => projectHistoryCapture(snapshot, view));
  return { ...repository, readHistoryProjection: historyProjection,
    inspectPortableFile: async (file: Blob) => { if (!validator) return repository.inspectPortableDocument(await file.text());
      const header = await validator.inspect(file); return { current: decodePlanningInputs(header.current, 5, undefined, true), repairs: header.repairs }; },
    stagePortableFile: (file: Blob, stageId: string) => validator ? validator.stage(file, stageId, input.name ?? PLANNING_DATABASE) : file.text().then(text => repository.stagePortableDocument(text, stageId)),
    inspectPortableDocument: validator ? async (document: string) => { const header = await validator!.inspect(document); return { current: decodePlanningInputs(header.current, 5, undefined, true), repairs: header.repairs }; } : repository.inspectPortableDocument,
    stagePortableDocument: validator ? (document: string, stageId: string) => validator!.stage(document, stageId, input.name ?? PLANNING_DATABASE) : repository.stagePortableDocument,
    close: () => { validator?.close(); storage.close(); } };
}
