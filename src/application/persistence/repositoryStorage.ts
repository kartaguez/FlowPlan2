/** Internal adapter seam shared by the memory and IndexedDB implementations. */
export const REPOSITORY_STORES = ["control", "current", "snapshotMetadata", "snapshotContent", "snapshotIdentityRefs", "identityReservations", "jobs", "receipts"] as const;
export type RepositoryStore = typeof REPOSITORY_STORES[number];
export type RepositoryKey = string | readonly string[];
export interface StorageRow<T> { readonly key: RepositoryKey; readonly value: T }
export interface RepositoryTransaction {
  get<T>(store: RepositoryStore, key: RepositoryKey): Promise<T | undefined>;
  put<T>(store: RepositoryStore, key: RepositoryKey, value: T): Promise<void>;
  add<T>(store: RepositoryStore, key: RepositoryKey, value: T): Promise<void>;
  delete(store: RepositoryStore, key: RepositoryKey): Promise<void>;
  trimReceipts(keep: number): Promise<void>;
  scan<T>(store: RepositoryStore, prefix: readonly string[] | string, after?: RepositoryKey, limit?: number): Promise<readonly StorageRow<T>[]>;
}
/** Transaction bodies await adapter requests only; parsing, hashes and business validation
 * happen before entry. A rejected write is not proof of rollback unless the adapter
 * explicitly reports commitOutcome=not-applied after authoritative abort. */
export interface RepositoryStorage {
  transaction<T>(stores: readonly RepositoryStore[], mode: "readonly" | "readwrite", body: (tx: RepositoryTransaction) => Promise<T>): Promise<T>;
  close(): void;
}
