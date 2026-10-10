import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord, field, hasKeys } from '../primitives/data.js';
import { validateId, type ProjectId, type ReservationId, type TeamId, type PortfolioId } from '../primitives/identity.js';
import { createEntityIdentity, validateKind, type EntityIdentity, type VersionKind } from '../primitives/exactReference.js';
export interface ProjectOwner { readonly type: 'Project'; readonly projectId: ProjectId }
export interface ReservationOwner { readonly type: 'Reservation'; readonly reservationId: ReservationId }
export interface TeamOwner { readonly type: 'Team'; readonly teamId: TeamId }
export interface PortfolioOwner { readonly type: 'Portfolio'; readonly portfolioId: PortfolioId }
export interface PTOwner { readonly type: 'ProjectTeam'; readonly projectId: ProjectId; readonly teamId: TeamId }
export interface RTOwner { readonly type: 'ReservationTeam'; readonly reservationId: ReservationId; readonly teamId: TeamId }
export interface SubPeriodOwner { readonly type: 'ActualPeriod'; readonly actualPeriod: EntityIdentity<'ActualPeriod'> }
export interface PTECOwner { readonly type: 'PT'; readonly pt: EntityIdentity<'PT'> }
export type TeamActualOwner =
  | { readonly type: 'PTSubPeriod'; readonly association: EntityIdentity<'PT'>; readonly subPeriod: EntityIdentity<'ActualSubPeriod'> }
  | { readonly type: 'RTSubPeriod'; readonly association: EntityIdentity<'RT'>; readonly subPeriod: EntityIdentity<'ActualSubPeriod'> };
export interface OwnerByKind {
  readonly ProjectSettings: ProjectOwner; readonly ReservationSettings: ReservationOwner;
  readonly TeamSettings: TeamOwner; readonly TeamCapacity: TeamOwner;
  readonly Program: PortfolioOwner; readonly Pas: PortfolioOwner;
  readonly PlanningSettings: PortfolioOwner; readonly PortfolioOrder: PortfolioOwner;
  readonly PT: PTOwner; readonly RT: RTOwner; readonly ActualPeriod: ProjectOwner | ReservationOwner;
  readonly ActualSubPeriod: SubPeriodOwner; readonly PTEC: PTECOwner; readonly TeamActual: TeamActualOwner;
}
export type VersionOwner<K extends VersionKind> = OwnerByKind[K];
export function createOwner<K extends VersionKind>(kind: K, input: unknown, path = 'owner'): DomainResult<VersionOwner<K>> {
  if (!validateKind(kind).ok) return invalid('INVALID_VERSION_KIND', path);
  const record = dataRecord(input, path); if (!record.ok) return record;
  const r = record.value, type = field(r, 'type');
  let owner: VersionOwner<VersionKind>;
  if (kind === 'ProjectSettings' || (kind === 'ActualPeriod' && type === 'Project')) {
    if (type !== 'Project' || !hasKeys(r, ['type', 'projectId'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const id = validateId('ProjectId', field(r, 'projectId'), `${path}.projectId`); if (!id.ok) return id;
    owner = Object.freeze({ type, projectId: id.value });
  } else if (kind === 'ReservationSettings' || kind === 'ActualPeriod') {
    if (type !== 'Reservation' || !hasKeys(r, ['type', 'reservationId'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const id = validateId('ReservationId', field(r, 'reservationId'), `${path}.reservationId`); if (!id.ok) return id;
    owner = Object.freeze({ type, reservationId: id.value });
  } else if (kind === 'TeamSettings' || kind === 'TeamCapacity') {
    if (type !== 'Team' || !hasKeys(r, ['type', 'teamId'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const id = validateId('TeamId', field(r, 'teamId'), `${path}.teamId`); if (!id.ok) return id;
    owner = Object.freeze({ type, teamId: id.value });
  } else if (kind === 'PT' || kind === 'RT') {
    const project = kind === 'PT';
    if (type !== (project ? 'ProjectTeam' : 'ReservationTeam') || !hasKeys(r, ['type', project ? 'projectId' : 'reservationId', 'teamId'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const team = validateId('TeamId', field(r, 'teamId'), `${path}.teamId`); if (!team.ok) return team;
    if (project) {
      const id = validateId('ProjectId', field(r, 'projectId'), `${path}.projectId`); if (!id.ok) return id;
      owner = Object.freeze({ type: 'ProjectTeam', projectId: id.value, teamId: team.value });
    } else {
      const id = validateId('ReservationId', field(r, 'reservationId'), `${path}.reservationId`); if (!id.ok) return id;
      owner = Object.freeze({ type: 'ReservationTeam', reservationId: id.value, teamId: team.value });
    }
  } else if (kind === 'ActualSubPeriod') {
    if (type !== 'ActualPeriod' || !hasKeys(r, ['type', 'actualPeriod'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const ap = createEntityIdentity('ActualPeriod', field(r, 'actualPeriod'), `${path}.actualPeriod`); if (!ap.ok) return ap;
    owner = Object.freeze({ type, actualPeriod: ap.value });
  } else if (kind === 'PTEC') {
    if (type !== 'PT' || !hasKeys(r, ['type', 'pt'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const pt = createEntityIdentity('PT', field(r, 'pt'), `${path}.pt`); if (!pt.ok) return pt;
    owner = Object.freeze({ type, pt: pt.value });
  } else if (kind === 'TeamActual') {
    if ((type !== 'PTSubPeriod' && type !== 'RTSubPeriod') || !hasKeys(r, ['type', 'association', 'subPeriod'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const sp = createEntityIdentity('ActualSubPeriod', field(r, 'subPeriod'), `${path}.subPeriod`); if (!sp.ok) return sp;
    if (type === 'PTSubPeriod') {
      const pt = createEntityIdentity('PT', field(r, 'association'), `${path}.association`); if (!pt.ok) return pt;
      owner = Object.freeze({ type, association: pt.value, subPeriod: sp.value });
    } else {
      const rt = createEntityIdentity('RT', field(r, 'association'), `${path}.association`); if (!rt.ok) return rt;
      owner = Object.freeze({ type, association: rt.value, subPeriod: sp.value });
    }
  } else {
    if (type !== 'Portfolio' || !hasKeys(r, ['type', 'portfolioId'])) return invalid('OWNER_FAMILY_MISMATCH', path);
    const id = validateId('PortfolioId', field(r, 'portfolioId'), `${path}.portfolioId`); if (!id.ok) return id;
    owner = Object.freeze({ type, portfolioId: id.value });
  }
  // Discriminated cases above establish the dependent kind/owner relationship.
  return success(owner as VersionOwner<K>);
}
