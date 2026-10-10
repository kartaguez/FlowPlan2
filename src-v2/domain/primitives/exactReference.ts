import { invalid, success, type DomainResult } from './result.js';
import { dataRecord, field, hasKeys } from './data.js';
import { validateId, type EntityId, type VersionId } from './identity.js';
export const versionKinds = Object.freeze(['ProjectSettings', 'ReservationSettings', 'TeamSettings', 'TeamCapacity', 'Program', 'Pas', 'PT', 'RT', 'ActualPeriod', 'ActualSubPeriod', 'TeamActual', 'PTEC', 'PlanningSettings', 'PortfolioOrder'] as const);
export type VersionKind = typeof versionKinds[number];
export function validateKind(input: unknown, path = 'kind'): DomainResult<VersionKind> {
  const kind = versionKinds.find(k => k === input);
  return kind === undefined ? invalid('INVALID_VERSION_KIND', path) : success(kind);
}
export interface EntityIdentity<K extends VersionKind> { readonly kind: K; readonly entityId: EntityId }
export interface ExactReference<K extends VersionKind> extends EntityIdentity<K> { readonly versionId: VersionId }
export function createEntityIdentity<K extends VersionKind>(expected: K, input: unknown, path = 'identity'): DomainResult<EntityIdentity<K>> {
  if (!validateKind(expected).ok) return invalid('INVALID_VERSION_KIND', path);
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (!hasKeys(record.value, ['kind', 'entityId']) || field(record.value, 'kind') !== expected) return invalid('IDENTITY_KIND_MISMATCH', path);
  const entityId = validateId('EntityId', field(record.value, 'entityId'), `${path}.entityId`); if (!entityId.ok) return entityId;
  return success(Object.freeze({ kind: expected, entityId: entityId.value }));
}
export function createExactReference<K extends VersionKind>(expected: K, input: unknown, path = 'ref'): DomainResult<ExactReference<K>> {
  if (!validateKind(expected).ok) return invalid('INVALID_VERSION_KIND', path);
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (!hasKeys(record.value, ['kind', 'entityId', 'versionId']) || field(record.value, 'kind') !== expected) return invalid('REFERENCE_KIND_MISMATCH', path);
  const entityId = validateId('EntityId', field(record.value, 'entityId'), `${path}.entityId`); if (!entityId.ok) return entityId;
  const versionId = validateId('VersionId', field(record.value, 'versionId'), `${path}.versionId`); if (!versionId.ok) return versionId;
  return success(Object.freeze({ kind: expected, entityId: entityId.value, versionId: versionId.value }));
}
export function validateExactReference(input: unknown, path = 'ref'): DomainResult<ExactReference<VersionKind>> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  const kind = validateKind(field(record.value, 'kind'), `${path}.kind`); if (!kind.ok) return kind;
  return createExactReference(kind.value, record.value, path);
}
export function sameIdentity(left: EntityIdentity<VersionKind>, right: EntityIdentity<VersionKind>): boolean {
  return left.kind === right.kind && left.entityId.value === right.entityId.value;
}
export function sameReference(left: ExactReference<VersionKind>, right: ExactReference<VersionKind>): boolean {
  return sameIdentity(left, right) && left.versionId.value === right.versionId.value;
}
