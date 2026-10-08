import { portableBackupParts } from "../backup/portableBackupParts.js";
import { assertCanonicalTimestamp } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { encodePlanningInputs } from "../backup/planningInputCodec.js";
import type { PlanningSessionState } from "../session/planningSession.js";
import { PersistenceError, sameToken, type PlanningRepository, type RepositoryToken } from "./planningRepository.js";

export async function assertLegacyUnchanged(repository: PlanningRepository, readLegacy: () => string | null): Promise<void> {
  const info = await repository.readInfo(), fingerprint = await repository.fingerprint(readLegacy());
  if (info.legacySourceFingerprintAtMigration !== null && fingerprint !== info.legacySourceFingerprintAtMigration && fingerprint !== info.acknowledgedLegacyFingerprint) {
    throw new PersistenceError("LEGACY_CONFLICT", "An older client changed the legacy backup. Both sources were preserved. Export them and explicitly choose which planning to keep.");
  }
}
/** Only legacy color repairs and catalog removals need human resolution, not later IDB edits. */
export function legacyRepairs(document: string, current: PlanningSessionState): readonly string[] {
  if (portableBackupParts(document).version >= 6) return [];
  const raw = JSON.parse(document) as { version: number; data: { portfolio: Record<string, Record<string, unknown>[]> } };
  if (raw.version >= 6) return [];
  const normalized = encodePlanningInputs(current).portfolio, notes: string[] = [];
  for (const kind of ["programs", "priorityFamilies", "projects", "reservations"] as const) {
    for (const before of raw.data.portfolio[kind] ?? []) {
      const after = normalized[kind].find(row => row.id === before.id) as unknown as Record<string, unknown> | undefined;
      if (!after) { notes.push(`${kind}:${before.id} orphan catalog entry removed by the legacy reader.`); continue; }
      for (const color of ["color", "ownColor"] as const) if (before[color] !== undefined && before[color] !== after[color]) notes.push(`${kind}:${before.id}.${color} normalized by the legacy reader.`);
    }
  }
  return notes;
}
export async function openPlanningRepository(input: {
  repository: PlanningRepository; readLegacy: () => string | null; fallback: PlanningSessionState;
  preflight: (state: PlanningSessionState) => void;
  confirmRepairs?: (report: readonly string[]) => boolean;
}) {
  const { repository } = input, info = await repository.readInfo();
  if (info.token) { await assertLegacyUnchanged(repository, input.readLegacy); return repository.readCurrent(); }
  const document = input.readLegacy(), fingerprint = await repository.fingerprint(document);
  const inspected = document === null ? { current: input.fallback, repairs: [] } : await repository.inspectPortableDocument(document);
  const dataset = inspected.current;
  if (document !== null) {
    const report = inspected.repairs;
    if (report.length && !input.confirmRepairs?.(report)) throw new PersistenceError("INVALID", "Legacy migration requires approval of reader repairs. The original document was preserved.");
  }
  input.preflight(dataset);
  const stage = document === null ? await repository.stageImport(dataset, `migration-${fingerprint}`) : await repository.stagePortableDocument(document, `migration-${fingerprint}`);
  if (await repository.fingerprint(input.readLegacy()) !== fingerprint) throw new PersistenceError("LEGACY_CONFLICT", "Legacy backup changed during migration. Staging was not activated.");
  await repository.activateImport(stage, null, `migration-${fingerprint}`, { fingerprint, document });
  return repository.readCurrent();
}
/** Complete logical V7; physical keys/generations/chunks never enter the file. */
export async function exportRepositoryBackup(repository: PlanningRepository, exportedAt = new Date().toISOString()): Promise<readonly string[]> {
  assertCanonicalTimestamp(exportedAt);
  const current = await repository.readCurrent(), expected = current.token;
  const head = JSON.stringify({ format: "flowplan", version: 7, exportedAt, data: encodePlanningInputs(current.state) });
  const chunks: string[] = [head.slice(0, -2), ',"portfolioSnapshots":['];
  let after: Readonly<{ createdAt: string; snapshotId: string }> | null = null, first = true;
  do {
    const page = await repository.listSnapshotMetadata(expected, after);
    for (const meta of page.items) {
      const snapshot = await repository.readSnapshot(meta.snapshotId, expected);
      chunks.push(`${first ? "" : ","}${JSON.stringify(snapshot)}`); first = false;
    }
    after = page.next;
  } while (after);
  chunks.push("]}}");
  if (!sameToken((await repository.readInfo()).token, expected)) throw new PersistenceError("CONFLICT", "Planning changed during export; no mixed file was published. Retry.");
  return Object.freeze(chunks);
}
export async function importRepositoryBackup(input: {
  repository: PlanningRepository; document: string; expected: RepositoryToken; operationId: string;
  preflight: (state: PlanningSessionState) => void; confirm: () => boolean;
}): Promise<"imported" | "cancelled"> {
  const dataset = (await input.repository.inspectPortableDocument(input.document)).current;
  input.preflight(dataset);
  const stage = await input.repository.stagePortableDocument(input.document, input.operationId);
  if (!input.confirm()) { await input.repository.discardStage(stage); return "cancelled"; }
  await input.repository.activateImport(stage, input.expected, input.operationId);
  return "imported";
}
