import type { DomainResult } from '../../domain/primitives/result.js';
import type { VersionKind } from '../../domain/primitives/exactReference.js';
import type { VersionOwner } from '../../domain/versioning/owner.js';
export interface TransitionAllocationPort {
  reserveEntity(kind: VersionKind, owner: VersionOwner<VersionKind>): DomainResult<unknown>;
  reserveVersion(): DomainResult<unknown>;
  reservePreparation(): DomainResult<string>;
}
