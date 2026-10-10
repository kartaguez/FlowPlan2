import { invalid, success, type DomainResult } from './result.js';
import { dataRecord, field, hasKeys } from './data.js';
export const idFamilies = Object.freeze(['EntityId', 'VersionId', 'ProjectId', 'ReservationId', 'TeamId', 'PortfolioId'] as const);
export type IdFamily = typeof idFamilies[number];
declare const idBrand: unique symbol;
/** The discriminator is runtime evidence of family; value bytes have no semantics. */
export interface OpaqueId<F extends IdFamily> { readonly family: F; readonly value: string; readonly [idBrand]: true }
export type EntityId = OpaqueId<'EntityId'>;
export type VersionId = OpaqueId<'VersionId'>;
export type ProjectId = OpaqueId<'ProjectId'>;
export type ReservationId = OpaqueId<'ReservationId'>;
export type TeamId = OpaqueId<'TeamId'>;
export type PortfolioId = OpaqueId<'PortfolioId'>;
export function createId<F extends IdFamily>(family: F, input: unknown, path = 'id'): DomainResult<OpaqueId<F>> {
  if (!idFamilies.includes(family) || typeof input !== 'string' || input.trim().length === 0) return invalid('INVALID_OPAQUE_ID', path);
  return success(Object.freeze({ family, value: input }) as OpaqueId<F>);
}
export function validateId<F extends IdFamily>(family: F, input: unknown, path = 'id'): DomainResult<OpaqueId<F>> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (!hasKeys(record.value, ['family', 'value']) || field(record.value, 'family') !== family) return invalid('ID_FAMILY_MISMATCH', path);
  return createId(family, field(record.value, 'value'), path);
}
