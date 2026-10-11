import { invalid, success, type DomainResult } from '../../domain/primitives/result.js';
import { createVersionRegistry, lookupExactBatch } from '../../domain/versioning/versionRegistry.js';
import { copyImmutableValue } from '../../domain/versioning/immutableValue.js';
import { createCurrentSelection, createPortfolioSnapshot, createSnapshotId, type PortfolioSnapshot } from '../../domain/portfolio/manifest.js';
import type { ExactVersionsReader, CurrentSelectionReader, SnapshotReader } from '../../application/ports/portfolioReadPort.js';
export interface MemoryPortfolioReader { readonly versions: ExactVersionsReader; readonly current: CurrentSelectionReader; readonly snapshots: SnapshotReader }
/** Explicit immutable inputs only. No business selection, publication or storage. */
export function createMemoryPortfolioReadAdapter(versions: unknown, current: unknown, snapshots: unknown): DomainResult<MemoryPortfolioReader> {
  const registry = createVersionRegistry(versions); if (!registry.ok) return registry;
  const selection = current === null ? success(null) : createCurrentSelection(current); if (!selection.ok) return selection;
  const copied = copyImmutableValue(snapshots,'snapshots'); if (!copied.ok) return copied;
  if (!Array.isArray(copied.value)) return invalid('INVALID_SNAPSHOT_LIST','snapshots');
  const list: PortfolioSnapshot[] = [];
  for (const item of copied.value) { const snapshot = createPortfolioSnapshot(item); if (!snapshot.ok) return snapshot;
    if (list.some(s => s.snapshotId.value === snapshot.value.snapshotId.value)) return invalid('DUPLICATE_SNAPSHOT_ID','snapshots');
    list.push(snapshot.value); }
  return success(Object.freeze({
    versions:Object.freeze({async readExactVersions(refs) {
      return lookupExactBatch(registry.value,refs).result;
    }} as ExactVersionsReader),
    current:Object.freeze({async readCurrentSelection() { return selection.value === null ? invalid('READ_CURRENT_MISSING','current') : success(selection.value); }}),
    snapshots:Object.freeze({async readSnapshot(input) {
      const id = createSnapshotId(input); if (!id.ok) return id;
      const found = list.find(s => s.snapshotId.value === id.value.value);
      return found === undefined ? invalid('READ_SNAPSHOT_MISSING','snapshotId') : success(found);
    }} as SnapshotReader)
  }));
}
