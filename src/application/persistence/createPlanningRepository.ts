import { validateStoredSnapshotContent } from "./validateStoredSnapshot.js";
import { assertCanonicalTimestamp, assertSnapshotId } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { createCivilDate } from "../../domain/model/date.js";
import { legacyRepairs } from "./repositoryTransfer.js";
import { portableBackupParts } from "../backup/portableBackupParts.js";
import { decodePlanningInputs, encodePlanningInputs, type PlanningInputsDto } from "../backup/planningInputCodec.js";
import { validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";
import { IDENTITY_KINDS, snapshotIdentities, type HistoricalIdentities } from "./historicalIdentities.js";
import { PersistenceError, sameToken, type PlanningRepository, type RepositoryToken, type SnapshotMetadata, type StagedImport } from "./planningRepository.js";
import type { RepositoryStorage, RepositoryTransaction, RepositoryStore } from "./repositoryStorage.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";

interface Control extends RepositoryToken {
  snapshotCount: number;
  identityCount: number;
  storageDataVersion: 1;
  legacySourceFingerprintAtMigration: string | null;
  acknowledgedLegacyFingerprint: string | null;
}
export interface StoredContent { readonly text: string; readonly digest: string; readonly validationVersion?: 1 }
type Content = StoredContent;
interface References { metadata: SnapshotMetadata; ids: HistoricalIdentities }
interface Receipt { signature: string; token: RepositoryToken }
interface Job { digest: string; complete: boolean; count: number; identityCount: number; activated?: boolean }
const CURRENT_STORES = ["control", "current", "receipts"] as const;
const HISTORY_STORES = ["control", "snapshotMetadata", "snapshotContent", "snapshotIdentityRefs", "identityReservations", "receipts"] as const;
function required<T>(value: T | undefined, message: string): T { if (value === undefined) throw new PersistenceError("CORRUPT", message); return value; }
function token(control: Control): RepositoryToken { return Object.freeze({ generation: control.generation, revision: control.revision, currentRevision: control.currentRevision, historyRevision: control.historyRevision }); }
function check(control: Control | undefined, expected: RepositoryToken | null): void {
  if (!sameToken(control ? token(control) : null, expected)) throw new PersistenceError("CONFLICT", "Planning changed in another tab. Reload or resolve your drafts before retrying.");
  if (control && (control.storageDataVersion !== 1 || !control.generation || ![control.revision, control.currentRevision, control.historyRevision, control.snapshotCount, control.identityCount].every(value => Number.isSafeInteger(value) && value >= 0))) throw new PersistenceError("CORRUPT", "Unsupported storage data version.");
}
function advance(control: Control, kind: "current" | "history" | "import"): Control {
  const next = { ...control, revision: control.revision + 1,
    currentRevision: control.currentRevision + (kind === "current" || kind === "import" ? 1 : 0),
    historyRevision: control.historyRevision + (kind === "history" || kind === "import" ? 1 : 0) };
  if (![next.revision, next.currentRevision, next.historyRevision].every(Number.isSafeInteger)) throw new PersistenceError("UNAVAILABLE", "Storage revision exhausted.");
  return next;
}
/** Validation/hashing is deliberately outside the storage transaction. */
export function createPlanningRepository(storage: RepositoryStorage, digest: (text: string) => Promise<string>, validateStoredSnapshot?: (snapshot: Content, current: Content) => Promise<PortfolioSnapshot>): PlanningRepository {
  const hash = (text: string | null) => text === null ? Promise.resolve("absent") : digest(text);
  const content = async (value: unknown): Promise<Content> => { const text = JSON.stringify(value); return { text, digest: await digest(text) }; };
  const verified = async (value: Content): Promise<unknown> => {
    if (await digest(value.text) !== value.digest) throw new PersistenceError("CORRUPT", "Stored content checksum mismatch. Data was preserved.");
    try { return JSON.parse(value.text); } catch (cause) { throw new PersistenceError("CORRUPT", "Stored JSON is invalid.", { cause }); }
  };
  const mutate = async (stores: readonly RepositoryStore[], expected: RepositoryToken | null, id: string, signature: string,
    body: (tx: RepositoryTransaction, control: Control | undefined) => Promise<Control>): Promise<RepositoryToken> => {
    if (!id.trim()) throw new PersistenceError("INVALID", "Missing operationId.");
    return storage.transaction(stores, "readwrite", async tx => {
      const receipt = await tx.get<Receipt>("receipts", id);
      if (receipt) {
        if (receipt.signature !== signature) throw new PersistenceError("INVALID", "operationId reused for a different request.");
        return receipt.token;
      }
      const control = await tx.get<Control>("control", "active"); check(control, expected);
      const next = await body(tx, control);
      await tx.put("control", "active", next);
      const result = token(next);
      await tx.add("receipts", id, { signature, token: result });
      await tx.trimReceipts(1024);
      return result;
    });
  };
  const adjustIds = async (tx: RepositoryTransaction, generation: string, ids: HistoricalIdentities, change: 1 | -1) => {
    let delta = 0;
    for (const kind of IDENTITY_KINDS) for (const id of new Set(ids[kind])) {
      const key = [generation, kind, id]; const old = await tx.get<number>("identityReservations", key) ?? 0;
      const next = old + change;
      delta += next === 0 ? -1 : old === 0 ? 1 : 0;
      if (next < 0) throw new PersistenceError("CORRUPT", "Invalid historical identity reference count.");
      if (next) await tx.put("identityReservations", key, next); else await tx.delete("identityReservations", key);
    }
    return delta;
  };
  const readContent = async (store: "current" | "snapshotContent", key: readonly string[], expected: RepositoryToken): Promise<Content> => storage.transaction(["control", store], "readonly", async tx => {
    check(await tx.get<Control>("control", "active"), expected);
    return required(await tx.get<Content>(store, key), "Stored content missing.");
  });
  const readSnapshotContent = async (id: string, expected: RepositoryToken): Promise<PortfolioSnapshot> => {
    const [saved, current] = await Promise.all([readContent("snapshotContent", [expected.generation, id], expected), readContent("current", [expected.generation], expected)]);
    const valid = validateStoredSnapshot ? await validateStoredSnapshot(saved, current)
      : await validateStoredSnapshotContent(saved, current, digest);
    if (valid.snapshotId !== id) throw new PersistenceError("CORRUPT", "Historical content identity mismatch.");
    return valid;
  };
  let snapshotQueue: Promise<unknown> = Promise.resolve();
  const readSnapshot = (id: string, expected: RepositoryToken): Promise<PortfolioSnapshot> => {
    const operation = snapshotQueue.then(() => readSnapshotContent(id, expected));
    snapshotQueue = operation.catch(() => {}); return operation;
  };
  const prepareSnapshot = async (snapshot: PortfolioSnapshot): Promise<References & { content: Content }> => {
    const saved = await content(snapshot), inputs = snapshot.inputs as unknown as PlanningInputsDto;
    return { content: saved, ids: snapshotIdentities(snapshot), metadata: Object.freeze({ snapshotId: snapshot.snapshotId,
      createdAt: snapshot.createdAt, inputsSchemaVersion: snapshot.inputsSchemaVersion, forecastSchemaVersion: snapshot.forecast.forecastSchemaVersion,
      horizon: { from: inputs.planning.startDate, through: inputs.planning.endDate }, bytes: new TextEncoder().encode(saved.text).length, digest: saved.digest }) };
  };
  const addPrepared = async (tx: RepositoryTransaction, generation: string, prepared: Awaited<ReturnType<typeof prepareSnapshot>>) => {
    const meta = prepared.metadata;
    await tx.add("snapshotContent", [generation, meta.snapshotId], prepared.content);
    await tx.add("snapshotMetadata", [generation, meta.createdAt, meta.snapshotId], meta);
    await tx.add("snapshotIdentityRefs", [generation, meta.snapshotId], { metadata: meta, ids: prepared.ids });
    return adjustIds(tx, generation, prepared.ids, 1);
  };
  const stagePortableDocument = async (text: string, stageId: string) => {
      const parts = portableBackupParts(text), validated = parts.current, stageDigest = await digest(text);
      const unfinished = await storage.transaction(["jobs"], "readonly", tx => tx.scan<Job>("jobs", "stage-"));
      const resume = unfinished.find(row => !row.value.activated && !row.value.complete && row.value.digest === stageDigest);
      const generation = resume ? String(resume.key) : `stage-${stageId}`;
      const captured = function* () {
        const seen = new Set<string>(); let index = 0;
        for (const raw of parts.snapshots()) {
          try {
            if (parts.version === 6 && (raw as PortfolioSnapshot)?.forecast?.forecastSchemaVersion !== 1) throw new TypeError("V6 requires forecast schema 1.");
            const value = validateHistoricalSnapshot(raw, validated);
            if (seen.has(value.snapshotId)) throw new TypeError("Duplicate snapshotId.");
            seen.add(value.snapshotId); yield value; index++;
          } catch (cause) { throw new PersistenceError("INVALID", `portfolioSnapshots[${index}]: ${cause instanceof Error ? cause.message : cause}`); }
        }
      };
      const existing = await storage.transaction(["jobs"], "readonly", tx => tx.get<Job>("jobs", generation));
      if (existing && existing.digest !== stageDigest) throw new PersistenceError("INVALID", "Stage ID reused with different data.");
      if (existing?.complete) return { generation, digest: stageDigest };
      const saved = await content(encodePlanningInputs(validated));
      const sealed = await storage.transaction(["jobs", "current"], "readwrite", async tx => {
        const job = await tx.get<Job>("jobs", generation);
        if (job && job.digest !== stageDigest) throw new PersistenceError("INVALID", "Stage source changed.");
        if (job?.complete) return true;
        await tx.put("jobs", generation, { digest: stageDigest, complete: false, count: 0, identityCount: 0 });
        await tx.put("current", [generation], saved); return false;
      });
      if (sealed) return { generation, digest: stageDigest };
      for (const snapshot of captured()) {
        const prepared = await prepareSnapshot(snapshot);
        await storage.transaction(["jobs", "snapshotContent", "snapshotMetadata", "snapshotIdentityRefs", "identityReservations"], "readwrite", async tx => {
          if ((await tx.get<Job>("jobs", generation))?.complete) return;
          const old = await tx.get<Content>("snapshotContent", [generation, snapshot.snapshotId]);
          if (old) { if (old.digest !== prepared.content.digest) throw new PersistenceError("CORRUPT", "Stage content differs."); return; }
          await addPrepared(tx, generation, prepared);
        });
      }
      // Read-back each stored artifact and Current before sealing the generation.
      const storedCurrent = await storage.transaction(["current"], "readonly", tx => tx.get<Content>("current", [generation]));
      const readback = decodePlanningInputs(await verified(required(storedCurrent, "Stage Current missing.")), 5, undefined, true);
      if (JSON.stringify(encodePlanningInputs(readback)) !== JSON.stringify(encodePlanningInputs(validated))) throw new PersistenceError("CORRUPT", "Stage Current changed.");
      for (const snapshot of captured()) {
        const stored = await storage.transaction(["snapshotContent"], "readonly", tx => tx.get<Content>("snapshotContent", [generation, snapshot.snapshotId]));
        const readbackSnapshot = validateHistoricalSnapshot(await verified(required(stored, "Stage snapshot missing.")), readback);
        if (JSON.stringify(readbackSnapshot) !== JSON.stringify(snapshot)) throw new PersistenceError("CORRUPT", "Stage snapshot changed.");
      }
      const expectedCounts = new Map<string, number>(); let count = 0;
      for (const snapshot of captured()) {
        count++;
        const refs = snapshotIdentities(snapshot);
        for (const kind of IDENTITY_KINDS) for (const id of new Set(refs[kind])) { const key = JSON.stringify([generation, kind, id]); expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1); }
        const prepared = await prepareSnapshot(snapshot);
        const stored = await storage.transaction(["snapshotMetadata", "snapshotIdentityRefs"], "readonly", async tx => ({
          metadata: await tx.get<SnapshotMetadata>("snapshotMetadata", [generation, snapshot.createdAt, snapshot.snapshotId]),
          refs: await tx.get<References>("snapshotIdentityRefs", [generation, snapshot.snapshotId]),
        }));
        if (JSON.stringify(stored.metadata) !== JSON.stringify(prepared.metadata) || JSON.stringify(stored.refs?.ids) !== JSON.stringify(refs)) throw new PersistenceError("CORRUPT", "Stage metadata or identities changed.");
      }
      const storedCounts = await storage.transaction(["identityReservations", "snapshotMetadata"], "readonly", async tx => ({
        identities: await tx.scan<number>("identityReservations", [generation]), metadata: await tx.scan<unknown>("snapshotMetadata", [generation]),
      }));
      if (storedCounts.identities.length !== expectedCounts.size || storedCounts.identities.some(row => expectedCounts.get(JSON.stringify(row.key)) !== row.value) || storedCounts.metadata.length !== count) throw new PersistenceError("CORRUPT", "Stage identity index or count differs.");
      await storage.transaction(["jobs"], "readwrite", async tx => {
        const job = required(await tx.get<Job>("jobs", generation), "Stage job missing.");
        if (job.activated) return;
        if (job.digest !== stageDigest) throw new PersistenceError("CONFLICT", "Stage source changed before validation completed.");
        await tx.put("jobs", generation, { digest: stageDigest, complete: true, count, identityCount: expectedCounts.size });
      });
      return { generation, digest: stageDigest };
    };
  return {
    fingerprint: hash, close: () => storage.close(),
    readInfo: () => storage.transaction(["control"], "readonly", async tx => {
      const control = await tx.get<Control>("control", "active"); if (control) check(control, token(control));
      return { token: control ? token(control) : null, snapshotCount: control?.snapshotCount ?? 0,
        legacySourceFingerprintAtMigration: control?.legacySourceFingerprintAtMigration ?? null,
        acknowledgedLegacyFingerprint: control?.acknowledgedLegacyFingerprint ?? null };
    }),
    readLegacySource: () => storage.transaction(["jobs"], "readonly", async tx => (await tx.get<{ document: string | null }>("jobs", "legacy-source"))?.document ?? null),
    readCurrent: async () => {
      const result = await storage.transaction(["control", "current", "identityReservations"], "readonly", async tx => {
        const control = required(await tx.get<Control>("control", "active"), "No initialized planning repository."); check(control, token(control));
        const saved = required(await tx.get<Content>("current", [control.generation]), "Current missing.");
        const rows = await tx.scan<number>("identityReservations", [control.generation]);
        if (rows.length !== control.identityCount || rows.some(row => !Number.isSafeInteger(row.value) || row.value <= 0 || !Array.isArray(row.key) || row.key.length !== 3 || !IDENTITY_KINDS.includes(row.key[1] as typeof IDENTITY_KINDS[number]) || !row.key[2])) throw new PersistenceError("CORRUPT", "Identity index invalid.");
        const identities = Object.fromEntries(IDENTITY_KINDS.map(kind => [kind, Object.freeze(rows.filter(row => (row.key as string[])[1] === kind).map(row => (row.key as string[])[2]!))])) as unknown as HistoricalIdentities;
        return { saved, token: token(control), identities: Object.freeze(identities), snapshotCount: control.snapshotCount };
      });
      const state = decodePlanningInputs(await verified(result.saved), 5, undefined, true);
      return { state: Object.freeze({ portfolio: state.portfolio, planning: state.planning }), token: result.token, identities: result.identities, snapshotCount: result.snapshotCount };
    },
    writeCurrent: async (candidate, expected, id) => {
      const state = decodePlanningInputs(candidate, 5, undefined, true), normalized = encodePlanningInputs(state), saved = await content(normalized);
      const signature = await digest(JSON.stringify(["current", expected, saved.digest]));
      const receipt = await storage.transaction(["receipts"], "readonly", tx => tx.get<Receipt>("receipts", id));
      if (receipt) {
        if (receipt.signature !== signature) throw new PersistenceError("INVALID", "operationId reused for a different request.");
        return receipt.token;
      }
      // Owned-prefix checks can be large. Perform them outside IDB; the final CAS
      // proves that this Current is still the one being replaced.
      const oldInputs = await verified(await readContent("current", [expected.generation], expected)) as PlanningInputsDto;
      for (const kind of ["projects", "reservations"] as const) for (const owner of oldInputs.portfolio[kind]) {
        const replacement = normalized.portfolio[kind].find(item => item.id === owner.id);
        if ((owner.snapshots?.length || owner.legacyV4Actuals) && !replacement) throw new PersistenceError("INVALID", "Cannot remove an owned Actuals history through writeCurrent.");
        if (owner.snapshots?.some((snapshot, i) => JSON.stringify(snapshot) !== JSON.stringify(replacement?.snapshots?.[i]))) throw new PersistenceError("INVALID", "Owned Actuals history is immutable.");
        if (owner.legacyV4Actuals && (!replacement?.legacyV4Actuals || owner.legacyV4Actuals.actualsFromDate !== replacement.legacyV4Actuals.actualsFromDate || JSON.stringify(owner.legacyV4Actuals.records) !== JSON.stringify(replacement.legacyV4Actuals.records))) throw new PersistenceError("INVALID", "Legacy Actuals evidence cannot be changed or removed.");
      }
      return mutate(CURRENT_STORES, expected, id, signature, async (tx, original) => {
        const next = advance(required(original, "Current unavailable."), "current");
        await tx.put("current", [next.generation], saved); return next;
      });
    },
    listSnapshotMetadata: (expected, after = null, limit = 50) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new PersistenceError("INVALID", "Metadata page size must be 1..200.");
      return storage.transaction(["control", "snapshotMetadata"], "readonly", async tx => {
        check(await tx.get<Control>("control", "active"), expected);
        const rows = await tx.scan<SnapshotMetadata>("snapshotMetadata", [expected.generation], after ? [expected.generation, after.createdAt, after.snapshotId] : undefined, limit + 1);
        const items = rows.slice(0, limit).map(row => {
          const meta = row.value; assertSnapshotId(meta.snapshotId); assertCanonicalTimestamp(meta.createdAt);
          if (!Array.isArray(row.key) || row.key[1] !== meta.createdAt || row.key[2] !== meta.snapshotId || meta.inputsSchemaVersion !== 1 || ![1, 2].includes(meta.forecastSchemaVersion)
            || !Number.isSafeInteger(meta.bytes) || meta.bytes <= 0 || !/^[a-f0-9]{64}$/.test(meta.digest)
            || !createCivilDate(meta.horizon.from).ok || !createCivilDate(meta.horizon.through).ok || meta.horizon.from > meta.horizon.through) throw new PersistenceError("CORRUPT", "Snapshot metadata is invalid; data was preserved.");
          return meta;
        }), last = items.at(-1);
        return { items: Object.freeze(items), next: rows.length > limit && last ? { createdAt: last.createdAt, snapshotId: last.snapshotId } : null };
      });
    },
    readSnapshot,
    createSnapshot: async (snapshot, capturedRevision, expected, id) => {
      const prepared = await prepareSnapshot(snapshot);
      const signature = await digest(JSON.stringify(["create", expected, capturedRevision, prepared.content.digest]));
      const previous = await storage.transaction(["receipts"], "readonly", tx => tx.get<Receipt>("receipts", id));
      if (previous) {
        if (previous.signature !== signature) throw new PersistenceError("INVALID", "operationId reused for a different request.");
        return previous.token;
      }
      // Read only Current for validation; never an existing historical content payload.
      const current = decodePlanningInputs(await verified(await readContent("current", [expected.generation], expected)), 5, undefined, true);
      validateHistoricalSnapshot(snapshot, current);
      return mutate(HISTORY_STORES, expected, id, signature, async (tx, original) => {
        const control = required(original, "Current unavailable.");
        if (control.currentRevision !== capturedRevision) throw new PersistenceError("CONFLICT", "Published run is stale; snapshot was not saved.");
        const delta = await addPrepared(tx, control.generation, prepared);
        return { ...advance(control, "history"), snapshotCount: control.snapshotCount + 1, identityCount: control.identityCount + delta };
      });
    },
    deleteSnapshot: async (snapshotId, expected, id) => {
      const signature = await digest(JSON.stringify(["delete", expected, snapshotId]));
      return mutate(HISTORY_STORES, expected, id, signature, async (tx, original) => {
        const control = required(original, "Current unavailable."), key = [control.generation, snapshotId];
        const refs = await tx.get<References>("snapshotIdentityRefs", key);
        if (!refs) throw new PersistenceError("NOT_FOUND", "Snapshot not found.");
        await tx.delete("snapshotContent", key); await tx.delete("snapshotIdentityRefs", key);
        await tx.delete("snapshotMetadata", [control.generation, refs.metadata.createdAt, snapshotId]);
        const delta = await adjustIds(tx, control.generation, refs.ids, -1);
        return { ...advance(control, "history"), snapshotCount: control.snapshotCount - 1, identityCount: control.identityCount + delta };
      });
    },
    inspectPortableDocument: async document => { const current = portableBackupParts(document).current; return { current, repairs: legacyRepairs(document, current) }; },
    stagePortableDocument,
    stageImport: async (dataset, stageId) => stagePortableDocument(JSON.stringify({ format: "flowplan", version: 7,
      exportedAt: "2000-01-01T00:00:00.000Z", data: { ...encodePlanningInputs(dataset), portfolioSnapshots: dataset.portfolioSnapshots ?? [] } }), stageId),
    activateImport: async (stage, expected, id, legacy) => {
      if (legacy && await hash(legacy.document) !== legacy.fingerprint) throw new PersistenceError("INVALID", "Legacy source fingerprint mismatch.");
      const signature = await digest(JSON.stringify(["activate", stage, expected, legacy?.fingerprint]));
      return mutate(["control", "jobs", "receipts"], expected, id, signature, async (tx, original) => {
        const job = await tx.get<Job>("jobs", stage.generation);
        if (!job?.complete || job.activated || job.digest !== stage.digest) throw new PersistenceError("INVALID", "Import stage is incomplete or unvalidated.");
        await tx.put("jobs", stage.generation, { ...job, activated: true });
        const base: Control = original ?? { generation: "empty", revision: 0, currentRevision: 0, historyRevision: 0, snapshotCount: 0, identityCount: 0, storageDataVersion: 1,
          legacySourceFingerprintAtMigration: null, acknowledgedLegacyFingerprint: null };
        if (legacy && !original) await tx.add("jobs", "legacy-source", { fingerprint: legacy.fingerprint, document: legacy.document });
        return { ...advance(base, "import"), generation: stage.generation, snapshotCount: job.count, identityCount: job.identityCount,
          ...(legacy && !original ? { legacySourceFingerprintAtMigration: legacy.fingerprint } : {}) };
      });
    },
    listUnfinishedStages: () => storage.transaction(["control", "jobs"], "readonly", async tx => {
      const control = await tx.get<Control>("control", "active"), rows = await tx.scan<Job>("jobs", "stage-");
      return rows.filter(row => !row.value.activated && row.key !== control?.generation).map(row => ({ generation: String(row.key), digest: row.value.digest }));
    }),
    discardStage: (stage: StagedImport) => storage.transaction(["control", "jobs", "current", "snapshotContent", "snapshotMetadata", "snapshotIdentityRefs", "identityReservations"], "readwrite", async tx => {
      if ((await tx.get<Control>("control", "active"))?.generation === stage.generation) throw new PersistenceError("INVALID", "Cannot discard active data.");
      const stores = ["current", "snapshotContent", "snapshotMetadata", "snapshotIdentityRefs", "identityReservations"] as const;
      for (const store of stores) for (const row of await tx.scan<unknown>(store, [stage.generation])) await tx.delete(store, row.key);
      await tx.delete("jobs", stage.generation);
    }),
    acknowledgeLegacy: (fingerprint, document, expected) => storage.transaction(["control", "jobs"], "readwrite", async tx => {
      const control = required(await tx.get<Control>("control", "active"), "Current missing."); check(control, expected);
      await tx.put("jobs", `legacy-resolution-${fingerprint}`, { fingerprint, document });
      await tx.put("control", "active", { ...control, acknowledgedLegacyFingerprint: fingerprint });
    }),
  };
}
