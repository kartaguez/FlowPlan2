import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord, field, hasKeys } from '../primitives/data.js';
import { createExactReference, sameIdentity, sameReference, validateExactReference, type ExactReference, type VersionKind } from '../primitives/exactReference.js';
import { createOwner, type VersionOwner } from './owner.js';
import { copyImmutableValue, equalImmutableValues, type DeepReadonly, type ImmutableValue } from './immutableValue.js';
declare const envelopeBrand: unique symbol;
export interface VersionEnvelope<K extends VersionKind, P = ImmutableValue> {
  readonly ref: ExactReference<K>; readonly owner: VersionOwner<K>; readonly payload: DeepReadonly<P>;
  readonly predecessor?: ExactReference<K>; readonly provenance: readonly ExactReference<VersionKind>[];
  readonly [envelopeBrand]: true;
}
/** Validate payload business schema separately, then pass its successful value here. */
export function createVersionEnvelope<K extends VersionKind>(kind: K, input: unknown, path = 'version'): DomainResult<VersionEnvelope<K>> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  const r = record.value;
  if (!hasKeys(r, ['ref', 'owner', 'payload', 'provenance'], ['predecessor'])) return invalid('INVALID_VERSION_ENVELOPE', path);
  const ref = createExactReference(kind, field(r, 'ref'), `${path}.ref`); if (!ref.ok) return ref;
  const owner = createOwner(kind, field(r, 'owner'), `${path}.owner`); if (!owner.ok) return owner;
  const payload = copyImmutableValue(field(r, 'payload'), `${path}.payload`); if (!payload.ok) return payload;
  let predecessor: ExactReference<K> | undefined;
  if (Object.keys(r).includes('predecessor')) {
    const parent = createExactReference(kind, field(r, 'predecessor'), `${path}.predecessor`); if (!parent.ok) return parent;
    if (!sameIdentity(ref.value, parent.value)) return invalid('PREDECESSOR_IDENTITY_MISMATCH', `${path}.predecessor`);
    if (sameReference(ref.value, parent.value)) return invalid('LINEAGE_CYCLE', `${path}.predecessor`);
    predecessor = parent.value;
  }
  const sources = copyImmutableValue(field(r, 'provenance'), `${path}.provenance`); if (!sources.ok) return sources;
  if (!Array.isArray(sources.value)) return invalid('INVALID_PROVENANCE', `${path}.provenance`);
  const provenance: ExactReference<VersionKind>[] = [];
  for (const source of sources.value) {
    const checked = validateExactReference(source, `${path}.provenance`); if (!checked.ok) return checked;
    if (sameReference(ref.value, checked.value)) return invalid('SELF_PROVENANCE', `${path}.provenance`);
    if (provenance.some(p => sameReference(p, checked.value))) return invalid('DUPLICATE_PROVENANCE', `${path}.provenance`);
    provenance.push(checked.value);
  }
  return success(Object.freeze({ ref: ref.value, owner: owner.value, payload: payload.value,
    ...(predecessor === undefined ? {} : { predecessor }), provenance: Object.freeze(provenance) }) as VersionEnvelope<K>);
}
export interface ContextReport {
  readonly status: 'established' | 'not-established';
  readonly missingPredecessors: readonly ExactReference<VersionKind>[];
  readonly identicalRepetitions: readonly ExactReference<VersionKind>[];
}
/** Finite explicit context only. No retained registry, loading, selection or closure resolution. */
export function validateVersionContext(input: unknown, path = 'context'): DomainResult<ContextReport> {
  const copied = copyImmutableValue(input, path); if (!copied.ok) return copied;
  if (!Array.isArray(copied.value)) return invalid('INVALID_VERSION_CONTEXT', path);
  const versions: VersionEnvelope<VersionKind>[] = [], identical: ExactReference<VersionKind>[] = [];
  for (const entry of copied.value) {
    const record = dataRecord(entry, path); if (!record.ok) return record;
    const ref = validateExactReference(field(record.value, 'ref'), `${path}.ref`); if (!ref.ok) return ref;
    const version = createVersionEnvelope(ref.value.kind, entry, path); if (!version.ok) return version;
    const duplicate = versions.find(v => sameReference(v.ref, version.value.ref));
    if (duplicate !== undefined) {
      if (!equalImmutableValues(duplicate as unknown as ImmutableValue, version.value as unknown as ImmutableValue)) return invalid('DIVERGENT_VERSION_COLLISION', path);
      identical.push(version.value.ref);
    } else versions.push(version.value);
  }
  for (const version of versions) {
    if (versions.some(other => sameIdentity(version.ref, other.ref) &&
        !equalImmutableValues(version.owner as unknown as ImmutableValue, other.owner as unknown as ImmutableValue))) return invalid('IMMUTABLE_OWNER_MISMATCH', path);
  }
  const missing: ExactReference<VersionKind>[] = [];
  for (const version of versions) {
    let current: VersionEnvelope<VersionKind> | undefined = version;
    const visited: ExactReference<VersionKind>[] = [];
    while (current !== undefined) {
      if (visited.some(ref => sameReference(ref, current!.ref))) return invalid('LINEAGE_CYCLE', path);
      visited.push(current.ref);
      const parent: ExactReference<VersionKind> | undefined = current.predecessor;
      if (parent === undefined) break;
      current = versions.find(v => sameReference(v.ref, parent));
      if (current === undefined && !missing.some(ref => sameReference(ref, parent))) missing.push(parent);
    }
  }
  return success(Object.freeze({ status: missing.length ? 'not-established' : 'established',
    missingPredecessors: Object.freeze(missing), identicalRepetitions: Object.freeze(identical) }));
}
/** Owner-sensitive local comparison when the caller explicitly supplies the referenced AP. */
export function validateActualPeriodOwner(ref: unknown, expectedOwner: unknown, supplied: unknown, path = 'actualPeriod'): DomainResult<'established' | 'not-established'> {
  const exact = createExactReference('ActualPeriod', ref, `${path}.ref`); if (!exact.ok) return exact;
  const owner = createOwner('ActualPeriod', expectedOwner, `${path}.owner`); if (!owner.ok) return owner;
  if (supplied === undefined) return success('not-established');
  const version = createVersionEnvelope('ActualPeriod', supplied, path); if (!version.ok) return version;
  if (!sameReference(exact.value, version.value.ref)) return invalid('SUPPLIED_REFERENCE_MISMATCH', path);
  if (!equalImmutableValues(owner.value as unknown as ImmutableValue, version.value.owner as unknown as ImmutableValue)) return invalid('ACTUAL_PERIOD_OWNER_MISMATCH', path);
  return success('established');
}

export interface VersionEnvelopeInput<K extends VersionKind, P> {
  readonly ref: ExactReference<K>; readonly owner: VersionOwner<K>; readonly payload: P;
  readonly predecessor?: ExactReference<K>; readonly provenance: readonly ExactReference<VersionKind>[];
}
/** Typed assembly preserves the supplied payload type; runtime validation/copy still applies.
 * R1.1 validates immutable data, not future business payload schemas.
 */
export function createTypedVersionEnvelope<K extends VersionKind, P>(kind: K, input: VersionEnvelopeInput<NoInfer<K>, P>, path = 'version'): DomainResult<VersionEnvelope<K, P>> {
  const checked = createVersionEnvelope(kind, input, path);
  // Successful data copying preserves own record fields and list positions, with deep readonly output.
  return checked as DomainResult<VersionEnvelope<K, P>>;
}
