import type { HistoryScratch } from "../../application/history/historyScratch.js";
import { persistenceError } from "./indexedDbRepositoryStorage.js";
/** Separate, disposable scratch DB: quota failures never alter the planning repository. */
export async function createIndexedDbHistoryScratch(factory: IDBFactory, namespace = crypto.randomUUID()): Promise<HistoryScratch> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open("flowplan-history-workspace", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("chunks");
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(persistenceError(request.error));
  });
  db.onversionchange = () => db.close();
  const operation = <T>(mode: IDBTransactionMode, act: (store: IDBObjectStore, complete: (value: T) => void) => void): Promise<T> => new Promise((resolve, reject) => {
    const tx = db.transaction("chunks", mode); let result: T;
    tx.oncomplete = () => resolve(result); tx.onabort = () => reject(persistenceError(tx.error));
    act(tx.objectStore("chunks"), value => { result = value; });
  });
  const remove = (prefix: IDBValidKey[]): Promise<void> => operation("readwrite", store => {
    const request = store.openKeyCursor(IDBKeyRange.bound(prefix, [...prefix, []], false, true));
    request.onsuccess = () => { const row = request.result; if (row) { store.delete(row.primaryKey); row.continue(); } };
  });
  return {
    put: (level, run, part, values) => operation("readwrite", store => { store.put([...values], [namespace, level, run, part]); }),
    get: (level, run, part) => operation("readonly", (store, complete) => {
      const request = store.get([namespace, level, run, part]); request.onsuccess = () => complete(request.result ?? []);
    }),
    removeRun: (level, run) => remove([namespace, level, run]),
    dispose: async () => { try { await remove([namespace]); } finally { db.close(); } },
  };
}
