import { REPOSITORY_STORES, type RepositoryKey, type RepositoryStorage, type RepositoryStore, type RepositoryTransaction, type StorageRow } from "../../application/persistence/repositoryStorage.js";
import { createPlanningRepository } from "../../application/persistence/createPlanningRepository.js";
import { sha256 } from "./fingerprint.js";
function compare(a: RepositoryKey, b: RepositoryKey): number {
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "string") return -1; if (typeof b === "string") return 1;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { if (a[i]! < b[i]!) return -1; if (a[i]! > b[i]!) return 1; }
  return a.length - b.length;
}
/** Transactional memory adapter used to characterize CAS independently of IndexedDB. */
export function createMemoryRepositoryStorage(input: {
  readonly observe?: (operation: string, store: RepositoryStore, key?: RepositoryKey) => void;
  readonly beforeWrite?: (store: RepositoryStore) => void;
} = {}): RepositoryStorage {
  let stores = new Map(REPOSITORY_STORES.map(store => [store, new Map<string, StorageRow<unknown>>() ]));
  let queue: Promise<unknown> = Promise.resolve(); let closed = false;
  return {
    transaction: <T>(scope: readonly RepositoryStore[], mode: "readonly" | "readwrite", body: (tx: RepositoryTransaction) => Promise<T>): Promise<T> => {
      const operation = queue.then(async () => {
        if (closed) throw new Error("Repository closed.");
        const candidate = new Map(stores);
        for (const store of scope) candidate.set(store, new Map(stores.get(store)!));
        const map = (store: RepositoryStore) => { if (!scope.includes(store)) throw new Error(`Store ${store} outside transaction scope.`); return candidate.get(store)!; };
        const write = (store: RepositoryStore) => { if (mode !== "readwrite") throw new Error("Readonly transaction."); input.beforeWrite?.(store); };
        const tx: RepositoryTransaction = {
          get: async <V>(store: RepositoryStore, key: RepositoryKey) => { input.observe?.("get", store, key); return structuredClone(map(store).get(JSON.stringify(key))?.value) as V | undefined; },
          put: async (store, key, value) => { input.observe?.("put", store, key); write(store); map(store).set(JSON.stringify(key), { key: structuredClone(key), value: structuredClone(value) }); },
          add: async (store, key, value) => { input.observe?.("add", store, key); write(store); if (map(store).has(JSON.stringify(key))) throw new DOMException("Duplicate key.", "ConstraintError"); map(store).set(JSON.stringify(key), { key: structuredClone(key), value: structuredClone(value) }); },
          delete: async (store, key) => { input.observe?.("delete", store, key); write(store); map(store).delete(JSON.stringify(key)); },
          trimReceipts: async keep => { write("receipts"); const entries = [...map("receipts").entries()].sort((a, b) => (a[1].value as { token: { revision: number } }).token.revision - (b[1].value as { token: { revision: number } }).token.revision);
            for (const [id] of entries.slice(0, Math.max(0, entries.length - keep))) map("receipts").delete(id); },
          scan: async <V>(store: RepositoryStore, prefix: readonly string[] | string, after?: RepositoryKey, limit = Number.MAX_SAFE_INTEGER) => {
            input.observe?.("scan", store, prefix);
            return [...map(store).values()].filter(row => (typeof prefix === "string" ? typeof row.key === "string" && row.key.startsWith(prefix) : Array.isArray(row.key) && prefix.every((part, i) => row.key[i] === part)) && (!after || compare(row.key, after) > 0))
              .sort((a, b) => compare(a.key, b.key)).slice(0, limit).map(row => structuredClone(row)) as StorageRow<V>[];
          },
        };
        const result = await body(tx); if (mode === "readwrite") stores = candidate; return result;
      });
      queue = operation.catch(() => {}); return operation;
    },
    close: () => { closed = true; },
  };
}
export function createMemoryPlanningRepository(input: Parameters<typeof createMemoryRepositoryStorage>[0] = {}) {
  return createPlanningRepository(createMemoryRepositoryStorage(input), sha256);
}
