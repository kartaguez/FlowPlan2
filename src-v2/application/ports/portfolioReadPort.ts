import type { DomainResult } from '../../domain/primitives/result.js';
import type { ExactReference, VersionKind } from '../../domain/primitives/exactReference.js';
import type { SnapshotId } from '../../domain/portfolio/manifest.js';
/** External responses remain unknown until the Domain factories validate them. */
export interface ExactVersionsReader { readExactVersions(refs: readonly ExactReference<VersionKind>[]): Promise<DomainResult<unknown>> }
export interface CurrentSelectionReader { readCurrentSelection(): Promise<DomainResult<unknown>> }
export interface SnapshotReader { readSnapshot(id: SnapshotId): Promise<DomainResult<unknown>> }
