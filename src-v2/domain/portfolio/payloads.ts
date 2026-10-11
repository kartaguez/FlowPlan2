import type { CivilDate } from '../primitives/civilDate.js';
import type { EntityIdentity, ExactReference, VersionKind } from '../primitives/exactReference.js';
import type { ProjectId } from '../primitives/identity.js';
import type { Quantity, OptionalQuantity } from '../primitives/quantity.js';
import type { VersionEnvelope } from '../versioning/versionEnvelope.js';
export type Lifecycle = 'existing' | 'deleted';
interface Named { readonly name: string; readonly lifecycle: Lifecycle }
interface Grouped extends Named { readonly isActive: boolean; readonly program: EntityIdentity<'Program'> | null; readonly pas: EntityIdentity<'Pas'> | null; readonly ownColor: string | null }
export interface BusinessPayloadByKind {
  readonly ProjectSettings: Grouped & { readonly earliestStartDate: CivilDate | null; readonly objectiveEndDate: CivilDate | null; readonly mandatory: boolean };
  readonly ReservationSettings: Grouped & { readonly startDate: CivilDate; readonly endDate: CivilDate };
  readonly TeamSettings: Named & { readonly isVisible: boolean };
  readonly Program: Named & { readonly color: string };
  readonly Pas: Named;
  readonly TeamCapacity: { readonly periods: readonly { readonly start: CivilDate; readonly end: CivilDate; readonly dailyCapacity: Quantity<'Capacity'>; readonly unavailabilityRatio: Quantity<'UnavailabilityRatio'> }[]; readonly exceptions: readonly { readonly date: CivilDate; readonly capacity: Quantity<'Capacity'> }[] };
  readonly PT: { readonly lifecycle: Lifecycle; readonly dailyCap: OptionalQuantity<'DailyCap'> };
  readonly RT: { readonly lifecycle: Lifecycle; readonly demand: { readonly mode: 'ratio'; readonly ratio: Quantity<'ReservationRatio'> } | { readonly mode: 'fixed-daily'; readonly daily: Quantity<'FixedDailyDemand'> } };
  readonly ActualPeriod: { readonly coverage: 'empty'; readonly from: null; readonly through: null; readonly subPeriods: readonly [] } | { readonly coverage: 'covered'; readonly from: CivilDate; readonly through: CivilDate; readonly subPeriods: readonly ExactReference<'ActualSubPeriod'>[] };
  readonly ActualSubPeriod: { readonly from: CivilDate; readonly through: CivilDate };
  readonly TeamActual: { readonly consumed: Quantity<'Consumption'> };
  readonly PTEC: { readonly actualPeriod: EntityIdentity<'ActualPeriod'>; readonly lastActualsDate: CivilDate | null; readonly etc: Quantity<'ETC'> };
  readonly PlanningSettings: { readonly horizon: { readonly start: CivilDate; readonly end: CivilDate }; readonly workingWeekdays: readonly number[]; readonly maxParallelProjects: number };
  readonly PortfolioOrder: { readonly projectIds: readonly ProjectId[] };
}
export type BusinessVersion<K extends VersionKind = VersionKind> = { [T in K]: VersionEnvelope<T, BusinessPayloadByKind[T]> }[K];
