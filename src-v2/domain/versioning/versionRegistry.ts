import { invalid, success, type DomainResult } from '../primitives/result.js';
import { sameIdentity, sameReference, validateExactReference, type ExactReference, type VersionKind } from '../primitives/exactReference.js';
import { copyImmutableValue, equalImmutableValues, type ImmutableValue } from './immutableValue.js';
import { validateVersionContext, type ContextReport } from './versionEnvelope.js';
import { createBusinessVersion } from '../portfolio/payloadValidation.js';
import type { BusinessVersion } from '../portfolio/payloads.js';
export interface VersionRegistry { readonly versions: readonly BusinessVersion[]; readonly context: ContextReport }
const uniqueOwners: readonly VersionKind[] = ['ProjectSettings','ReservationSettings','TeamSettings','TeamCapacity','ActualPeriod','PTEC','TeamActual','PT','RT','PlanningSettings','PortfolioOrder'];
export function createVersionRegistry(input: unknown, path = 'versions'): DomainResult<VersionRegistry> {
  const copied = copyImmutableValue(input,path); if (!copied.ok) return copied;
  if (!Array.isArray(copied.value)) return invalid('INVALID_VERSION_LIST',path);
  const versions: BusinessVersion[] = [];
  for (const [i,entry] of copied.value.entries()) {
    const v = createBusinessVersion(entry,`${path}.${i}`); if (!v.ok) return v;
    versions.push(v.value);
  }
  const context = validateVersionContext(versions,path); if (!context.ok) return context;
  for (const version of versions) {
    if (uniqueOwners.includes(version.ref.kind) && versions.some(other => other.ref.kind === version.ref.kind &&
      !sameIdentity(other.ref,version.ref) && equalImmutableValues(other.owner as unknown as ImmutableValue,version.owner as unknown as ImmutableValue)))
      return invalid('OWNER_IDENTITY_CONFLICT',path);
  }
  const distinct: BusinessVersion[] = [];
  for (const version of versions) if (!distinct.some(other => sameReference(other.ref,version.ref))) distinct.push(version);
  return success(Object.freeze({versions:Object.freeze(distinct),context:context.value}));
}
export function withVersions(registry: VersionRegistry, batch: unknown): DomainResult<VersionRegistry> {
  const copied = copyImmutableValue(batch,'batch'); if (!copied.ok) return copied;
  return Array.isArray(copied.value) ? createVersionRegistry([...registry.versions,...copied.value]) : invalid('INVALID_VERSION_LIST','batch');
}
export function lookupExact(registry: VersionRegistry, input: unknown): DomainResult<BusinessVersion> {
  const ref = validateExactReference(input); if (!ref.ok) return ref;
  const found = registry.versions.find(v => sameReference(v.ref,ref.value));
  return found === undefined ? invalid('MISSING_EXACT_VERSION','ref',`Missing ${ref.value.kind}/${ref.value.entityId.value}/${ref.value.versionId.value}`) : success(found);
}
export function referenceLabel(ref: ExactReference<VersionKind>): string { return `${ref.kind}/${ref.entityId.value}/${ref.versionId.value}`; }
