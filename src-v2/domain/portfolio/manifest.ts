import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord, field, hasKeys } from '../primitives/data.js';
import { validateId, type PortfolioId } from '../primitives/identity.js';
import { createCivilDate, type CivilDate } from '../primitives/civilDate.js';
import { createExactReference, type ExactReference } from '../primitives/exactReference.js';
import { LocalVersionTable, identityParts } from '../versioning/localVersionTables.js';
import { copyImmutableValue } from '../versioning/immutableValue.js';
export const manifestTables = Object.freeze(([
  ['projectSettings','ProjectSettings'],['reservationSettings','ReservationSettings'],['teamSettings','TeamSettings'],['teamCapacities','TeamCapacity'],['programs','Program'],['pas','Pas'],['pts','PT'],['rts','RT'],['actualPeriods','ActualPeriod'],['actualSubPeriods','ActualSubPeriod'],['teamActuals','TeamActual'],['ptecs','PTEC']
] as const).map(entry => Object.freeze(entry)));
type Tables = { readonly [T in typeof manifestTables[number] as T[0]]: readonly ExactReference<T[1]>[] };
export type PortfolioManifest = Tables & { readonly portfolioId: PortfolioId; readonly planningSettings: ExactReference<'PlanningSettings'>; readonly portfolioOrder: ExactReference<'PortfolioOrder'> };
declare const snapshotIdBrand: unique symbol;
export type SnapshotId = { readonly family: 'SnapshotId'; readonly value: string; readonly [snapshotIdBrand]: true };
declare const revisionBrand: unique symbol;
export type SelectionRevision = string & { readonly [revisionBrand]: true };
export interface CurrentSelection { readonly manifest: PortfolioManifest; readonly revision: SelectionRevision }
export interface PortfolioSnapshot { readonly snapshotId: SnapshotId; readonly knowledgeDate: CivilDate; readonly createdAt: string; readonly manifest: PortfolioManifest }
export function createSnapshotId(input: unknown, path = 'snapshotId'): DomainResult<SnapshotId> {
  const r = dataRecord(input,path); if (!r.ok) return r;
  const value = field(r.value,'value');
  return hasKeys(r.value,['family','value']) && field(r.value,'family') === 'SnapshotId' && typeof value === 'string' && value.trim().length > 0 ?
    success(Object.freeze({family:'SnapshotId',value}) as SnapshotId) : invalid('INVALID_SNAPSHOT_ID',path);
}
export function createPortfolioManifest(input: unknown, path = 'manifest'): DomainResult<PortfolioManifest> {
  const copied = copyImmutableValue(input,path); if (!copied.ok) return copied;
  const r = dataRecord(copied.value,path); if (!r.ok) return r;
  if (!hasKeys(r.value,['portfolioId','planningSettings','portfolioOrder',...manifestTables.map(([key]) => key)])) return invalid('INVALID_MANIFEST_KEYS',path);
  const id = validateId('PortfolioId',field(r.value,'portfolioId'),`${path}.portfolioId`); if (!id.ok) return id;
  for (const [key,kind] of [['planningSettings','PlanningSettings'],['portfolioOrder','PortfolioOrder']] as const) {
    const ref = createExactReference(kind,field(r.value,key),`${path}.${key}`); if (!ref.ok) return ref;
  }
  for (const [key,kind] of manifestTables) {
    const refs = field(r.value,key); if (!Array.isArray(refs)) return invalid('INVALID_MANIFEST_TABLE',`${path}.${key}`);
    const seen = new LocalVersionTable<true>();
    for (const [i,ref] of refs.entries()) {
      const checked = createExactReference(kind,ref,`${path}.${key}.${i}`); if (!checked.ok) return checked;
      const identity = identityParts(checked.value);
      if (seen.get(identity) !== undefined) return invalid('MULTIPLE_IDENTITY_SELECTION',`${path}.${key}.${i}`);
      seen.set(identity,true);
    }
  }
  return success(copied.value as unknown as PortfolioManifest);
}
export function selectedReferences(manifest: PortfolioManifest): readonly ExactReference<typeof manifestTables[number][1] | 'PlanningSettings' | 'PortfolioOrder'>[] {
  return Object.freeze([manifest.planningSettings,manifest.portfolioOrder,
    ...manifest.projectSettings,...manifest.reservationSettings,...manifest.teamSettings,
    ...manifest.teamCapacities,...manifest.programs,...manifest.pas,...manifest.pts,...manifest.rts,
    ...manifest.actualPeriods,...manifest.actualSubPeriods,...manifest.teamActuals,...manifest.ptecs]);
}
export function createCurrentSelection(input: unknown): DomainResult<CurrentSelection> {
  const r = dataRecord(input,'current'); if (!r.ok) return r;
  if (!hasKeys(r.value,['manifest','revision'])) return invalid('INVALID_CURRENT_KEYS','current');
  const manifest = createPortfolioManifest(field(r.value,'manifest')); if (!manifest.ok) return manifest;
  const revision = field(r.value,'revision');
  return typeof revision === 'string' && revision.trim().length > 0 ? success(Object.freeze({manifest:manifest.value,revision:revision as SelectionRevision})) : invalid('INVALID_REVISION','current.revision');
}
export function createPortfolioSnapshot(input: unknown): DomainResult<PortfolioSnapshot> {
  const r = dataRecord(input,'snapshot'); if (!r.ok) return r;
  if (!hasKeys(r.value,['snapshotId','knowledgeDate','createdAt','manifest'])) return invalid('INVALID_SNAPSHOT_KEYS','snapshot');
  const id = createSnapshotId(field(r.value,'snapshotId')); if (!id.ok) return id;
  const date = createCivilDate(field(r.value,'knowledgeDate'),'snapshot.knowledgeDate'); if (!date.ok) return date;
  const manifest = createPortfolioManifest(field(r.value,'manifest')); if (!manifest.ok) return manifest;
  const at = field(r.value,'createdAt');
  if (typeof at !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{3}Z$/.test(at) || !createCivilDate(at.slice(0,10)).ok) return invalid('INVALID_CREATED_AT','snapshot.createdAt');
  return success(Object.freeze({snapshotId:id.value,knowledgeDate:date.value,createdAt:at,manifest:manifest.value}));
}
