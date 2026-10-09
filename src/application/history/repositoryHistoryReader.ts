import { projectHistoryCapture, type HistoryProjectionReader } from "./historyCaptureProjection.js";
import type { PlanningRepository, RepositoryToken, SnapshotMetadata } from "../persistence/planningRepository.js";
import { PersistenceError, sameToken } from "../persistence/planningRepository.js";
import { assembleProjectHistoryViewModel, type HistoryPresentRow } from "./buildProjectHistoryViewModel.js";
import { type Rational } from "../../domain/model/rational.js";
import type { CivilDate } from "../../domain/model/date.js";
const rowKey = (projectId: string, snapshotId: string) => JSON.stringify([projectId, snapshotId]);
const EMPTY = assembleProjectHistoryViewModel([], null, []);
const yieldUi = () => new Promise<void>(resolve => setTimeout(resolve, 0));
function estimate(row: HistoryPresentRow): number { return 1024 + row.days.length * 256; }
/** No snapshot payload collection or persistent summary store. Single-document reads and a bounded row LRU. */
export function createRepositoryHistoryReader(repository: PlanningRepository, getToken: () => RepositoryToken, budget = 32 * 1024 * 1024, readProjection?: HistoryProjectionReader) {
  let base = EMPTY, model = EMPTY, metadata: readonly SnapshotMetadata[] = [], key = "", epoch = 0, bytes = 0;
  const rows = new Map<string, { row: HistoryPresentRow; bytes: number }>();
  let queue: Promise<void> = Promise.resolve();
  const load: HistoryProjectionReader = readProjection ?? (async (id, token, request) => projectHistoryCapture(await repository.readSnapshot(id, token), request));
  const rebuild = () => {
    model = Object.freeze({ ...base, projects: Object.freeze(base.projects.map(project => Object.freeze({ ...project,
      rows: Object.freeze(project.rows.map(row => row.kind === "present" ? rows.get(rowKey(row.metadata.id, row.snapshotId))?.row ?? row : row)) }))) });
  };
  return {
    getModel: () => model,
    getKey: () => key,
    getCacheStats: () => ({ rows: rows.size, estimatedBytes: bytes, budget }),
    refresh: async (progress?: (done: number, total: number) => void): Promise<boolean> => {
      const token = getToken(), nextKey = JSON.stringify([token.generation, token.revision]);
      if (key === nextKey) return false;
      queue = Promise.resolve();
      const revision = ++epoch, entries: SnapshotMetadata[] = []; let after = null;
      do { const page = await repository.listSnapshotMetadata(token, after); entries.push(...page.items); after = page.next; } while (after);
      const presences: ReadonlyMap<string, Omit<HistoryPresentRow, "comparison">>[] = []; let compactBytes = 0;
      for (const [i, entry] of entries.entries()) {
        if (revision !== epoch) throw new PersistenceError("CONFLICT", "History loading cancelled.");
        const projection = await load(entry.snapshotId, token, { mode: "summary" });
        if (revision !== epoch) throw new PersistenceError("CONFLICT", "History loading cancelled.");
        if (projection.projectionVersion !== 1) throw new PersistenceError("CORRUPT", "Unknown History projection version.");
        const map = new Map(projection.rows.map(row => [row.metadata.id, row]));
        compactBytes += map.size * 1536;
        if (compactBytes > 64 * 1024 * 1024) throw new PersistenceError("UNAVAILABLE", "History metadata exceeds the consultation memory budget. Data was preserved; export remains available.");
        presences.push(map); progress?.(i + 1, entries.length); await yieldUi();
      }
      if (revision !== epoch || !sameToken(token, getToken())) throw new PersistenceError("CONFLICT", "History loading cancelled.");
      const reference = entries.at(-1);
      base = assembleProjectHistoryViewModel(entries, reference ? { from: reference.horizon.from as CivilDate, through: reference.horizon.through as CivilDate } : null, presences);
      model = base; metadata = Object.freeze(entries); key = nextKey; rows.clear(); bytes = 0; return true;
    },
    ensureRows: (wanted: readonly Readonly<{ projectIndex: number; snapshotIndex: number }>[]): Promise<void> => {
      const revision = epoch, token = getToken();
      const valid = () => revision === epoch && sameToken(token, getToken()) && key === JSON.stringify([token.generation, token.revision]);
      const operation = queue.then(async () => {
        if (!valid()) return;
        for (const hit of wanted) { const row = base.projects[hit.projectIndex]?.rows[hit.snapshotIndex]; if (row?.kind === "present") { const id = rowKey(row.metadata.id, row.snapshotId), cached = rows.get(id); if (cached) { rows.delete(id); rows.set(id, cached); } } }
        const missing = wanted.filter(hit => { const row = base.projects[hit.projectIndex]?.rows[hit.snapshotIndex]; return row?.kind === "present" && row.profile === "available" && !rows.has(rowKey(row.metadata.id, row.snapshotId)); });
        if (!missing.length) return;
        const pinned = new Set(wanted.map(hit => { const row = base.projects[hit.projectIndex]?.rows[hit.snapshotIndex]; return row?.kind === "present" ? rowKey(row.metadata.id, row.snapshotId) : ""; }));

        for (const s of new Set(missing.map(hit => hit.snapshotIndex))) {
          if (!valid()) return;
          const entry = metadata[s]; if (!entry) continue;
          const targets = missing.filter(item => item.snapshotIndex === s);
          const projection = await load(entry.snapshotId, token, { mode: "profiles", projectIds: targets.map(hit => base.projects[hit.projectIndex]!.metadata.id) });
          if (!valid()) return;
          if (projection.projectionVersion !== 1) throw new PersistenceError("CORRUPT", "Unknown History projection version.");
          for (const hit of targets) {
            const row = base.projects[hit.projectIndex]?.rows[s]; if (row?.kind !== "present") continue;
            const projected = projection.rows.find(item => item.metadata.id === row.metadata.id);
            if (!projected || !projected.daysLoaded) throw new PersistenceError("CORRUPT", "Requested History profile missing.");
            const loaded = Object.freeze({ ...projected, comparison: row.comparison });
            const id = rowKey(row.metadata.id, row.snapshotId), size = estimate(loaded);
            if (size > budget) throw new PersistenceError("UNAVAILABLE", "Visible profiles exceed the memory budget. Data was preserved.");
            while (bytes - (rows.get(id)?.bytes ?? 0) + size > budget) {
              const oldest = [...rows.keys()].find(item => !pinned.has(item));
              if (!oldest) throw new PersistenceError("UNAVAILABLE", "Visible profiles exceed the memory budget. Data was preserved.");
              bytes -= rows.get(oldest)!.bytes; rows.delete(oldest);
            }
            bytes -= rows.get(id)?.bytes ?? 0; rows.set(id, { row: loaded, bytes: size }); bytes += size;
          }
          rebuild();
          await yieldUi();
        }
        if (valid()) rebuild();
      }).catch(cause => { if (valid()) { rows.clear(); bytes = 0; model = base; } throw cause; });
      queue = operation.catch(() => {});
      return operation;
    },
    async *dailyTotals(from: CivilDate, through: CivilDate): AsyncIterable<Readonly<{ date: CivilDate; total: Rational; count: number }>> {
      const revision = epoch, token = getToken();
      const valid = () => revision === epoch && sameToken(token, getToken()) && key === JSON.stringify([token.generation, token.revision]);
      if (!valid()) throw new PersistenceError("CONFLICT", "History scan cancelled.");
      for (const entry of metadata) {
        if (!valid()) throw new PersistenceError("CONFLICT", "History scan cancelled.");
        const projection = await load(entry.snapshotId, token, { mode: "totals", from, through });
        if (!valid()) throw new PersistenceError("CONFLICT", "History scan cancelled.");
        for (const day of projection.totals) {
          if (!valid()) throw new PersistenceError("CONFLICT", "History scan cancelled.");
          yield day;
        }
        await yieldUi();
        if (!valid()) throw new PersistenceError("CONFLICT", "History scan cancelled.");
      }
    },
    releaseProfiles: () => { epoch++; queue = Promise.resolve(); rows.clear(); bytes = 0; model = base; },
    releaseAll: () => { epoch++; queue = Promise.resolve(); rows.clear(); bytes = 0; model = base = EMPTY; metadata = []; key = ""; },
    cancel: () => { epoch++; queue = Promise.resolve(); },
  };
}
export type RepositoryHistoryReader = ReturnType<typeof createRepositoryHistoryReader>;
