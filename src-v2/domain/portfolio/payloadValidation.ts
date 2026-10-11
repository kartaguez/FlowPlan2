import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord, field, hasKeys } from '../primitives/data.js';
import { createCivilDate } from '../primitives/civilDate.js';
import { createEntityIdentity, createExactReference, sameIdentity, validateExactReference, type ExactReference, type VersionKind } from '../primitives/exactReference.js';
import { validateId } from '../primitives/identity.js';
import { validateQuantity, createOptionalQuantity, type QuantityFamily } from '../primitives/quantity.js';
import { copyImmutableValue } from '../versioning/immutableValue.js';
import { createVersionEnvelope } from '../versioning/versionEnvelope.js';
import type { BusinessPayloadByKind, BusinessVersion } from './payloads.js';

type Check = (input: unknown, path: string) => DomainResult<unknown>;
const boolean: Check = (v,p) => typeof v === 'boolean' ? success(v) : invalid('INVALID_BOOLEAN',p);
const name: Check = (v,p) => typeof v === 'string' && v.trim().length > 0 ? success(v) : invalid('INVALID_NAME',p);
const lifecycle: Check = (v,p) => v === 'existing' || v === 'deleted' ? success(v) : invalid('INVALID_LIFECYCLE',p);
const color: Check = (v,p) => typeof v === 'string' && /^#[0-9A-F]{6}$/.test(v) ? success(v) : invalid('INVALID_CANONICAL_COLOR',p);
const nullable = (check: Check): Check => (v,p) => v === null ? success(null) : check(v,p);
const quantity = (family: QuantityFamily): Check => (v,p) => validateQuantity(family,v,p);
const identity = (kind: VersionKind): Check => (v,p) => createEntityIdentity(kind,v,p);
function record(input: unknown, schema: readonly (readonly [string, Check])[], path: string): DomainResult<unknown> {
  const r = dataRecord(input,path); if (!r.ok) return r;
  if (!hasKeys(r.value,schema.map(([key]) => key))) return invalid('INVALID_PAYLOAD_KEYS',path);
  for (const [key,check] of schema) { const result = check(field(r.value,key),`${path}.${key}`); if (!result.ok) return result; }
  return success(input);
}
function list(check: Check): Check { return (v,p) => {
  if (!Array.isArray(v)) return invalid('INVALID_LIST',p);
  for (const [i,item] of v.entries()) { const r = check(item,`${p}.${i}`); if (!r.ok) return r; }
  return success(v);
}; }
function interval(input: unknown, from: string, through: string, path: string): DomainResult<unknown> {
  const r = dataRecord(input,path); if (!r.ok) return r;
  const a = createCivilDate(field(r.value,from),`${path}.${from}`); if (!a.ok) return a;
  const b = createCivilDate(field(r.value,through),`${path}.${through}`); if (!b.ok) return b;
  return a.value <= b.value ? success(input) : invalid('INVERTED_INTERVAL',path);
}
const named: readonly (readonly [string,Check])[] = [['name',name],['lifecycle',lifecycle]];
const grouped: readonly (readonly [string,Check])[] = [...named,['isActive',boolean],['program',nullable(identity('Program'))],['pas',nullable(identity('Pas'))],['ownColor',nullable(color)]];
export function catalogNameKey(name: string): string { return name.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr'); }
export function validateBusinessPayload<K extends VersionKind>(kind: K, input: unknown, path = 'payload'): DomainResult<BusinessPayloadByKind[K]> {
  return acquireAndValidate({ entry: 'payload', kind, input, path });
}
export function createBusinessVersion(input: unknown, path = 'version'): DomainResult<BusinessVersion> {
  return acquireAndValidate({ entry: 'version', input, path });
}

type PayloadEntry<K extends VersionKind> = { readonly entry: 'payload'; readonly kind: K; readonly input: unknown; readonly path: string };
type VersionEntry = { readonly entry: 'version'; readonly input: unknown; readonly path: string };
function acquireAndValidate<K extends VersionKind>(request: PayloadEntry<K>): DomainResult<BusinessPayloadByKind[K]>;
function acquireAndValidate(request: VersionEntry): DomainResult<BusinessVersion>;
function acquireAndValidate<K extends VersionKind>(request: PayloadEntry<K> | VersionEntry): DomainResult<BusinessPayloadByKind[K] | BusinessVersion> {
  // Both entry routes acquire unknown data. Neither accepts an acquired payload.
  const acquired = (() => {
    if (request.entry === 'payload') {
      const copied = copyImmutableValue(request.input,request.path); if (!copied.ok) return copied;
      return success({ entry: request.entry, kind: request.kind, path: request.path, payload: copied.value });
    }
    const r = dataRecord(request.input,request.path); if (!r.ok) return r;
    const ref = validateExactReference(field(r.value,'ref'),`${request.path}.ref`); if (!ref.ok) return ref;
    const envelope = createVersionEnvelope(ref.value.kind,request.input,request.path); if (!envelope.ok) return envelope;
    return success({ entry: request.entry, kind: ref.value.kind, path: `${request.path}.payload`, payload: envelope.value.payload, envelope: envelope.value });
  })();
  if (!acquired.ok) return acquired;
  const owned = acquired.value;
  const { kind, path, payload } = owned;
  // A single lexical checker owns this acquisition; it takes no data argument,
  // never escapes and runs synchronously before either public result is returned.
  const checkBusinessSchema = (): DomainResult<unknown> => {
    const r = dataRecord(payload,path); if (!r.ok) return r;
    const v = r.value;
    let checked: DomainResult<unknown>;
    switch (kind) {
      case 'ProjectSettings':
        checked = record(v,[...grouped,['earliestStartDate',nullable(createCivilDate)],['objectiveEndDate',nullable(createCivilDate)],['mandatory',boolean]],path);
        if (checked.ok && field(v,'mandatory') === true && field(v,'objectiveEndDate') === null) return invalid('MANDATORY_OBJECTIVE_REQUIRED',path);
        break;
      case 'ReservationSettings':
        checked = record(v,[...grouped,['startDate',createCivilDate],['endDate',createCivilDate]],path);
        if (checked.ok) checked = interval(v,'startDate','endDate',path); break;
      case 'TeamSettings': checked = record(v,[...named,['isVisible',boolean]],path); break;
      case 'Program': checked = record(v,[...named,['color',color]],path); break;
      case 'Pas': checked = record(v,named,path); break;
      case 'PT': checked = record(v,[['lifecycle',lifecycle],['dailyCap',(x,p) => createOptionalQuantity('DailyCap',x,p)]],path); break;
      case 'RT': checked = record(v,[['lifecycle',lifecycle],['demand',(x,p) => {
        const d = dataRecord(x,p); if (!d.ok) return d;
        return field(d.value,'mode') === 'ratio' ? record(x,[['mode',(m,q) => m === 'ratio' ? success(m) : invalid('INVALID_DEMAND_MODE',q)],['ratio',quantity('ReservationRatio')]],p) :
          record(x,[['mode',(m,q) => m === 'fixed-daily' ? success(m) : invalid('INVALID_DEMAND_MODE',q)],['daily',quantity('FixedDailyDemand')]],p);
      }]],path); break;
      case 'TeamActual': checked = record(v,[['consumed',quantity('Consumption')]],path); break;
      case 'PTEC': checked = record(v,[['actualPeriod',identity('ActualPeriod')],['lastActualsDate',nullable(createCivilDate)],['etc',quantity('ETC')]],path); break;
      case 'ActualSubPeriod': checked = record(v,[['from',createCivilDate],['through',createCivilDate]],path);
        if (checked.ok) checked = interval(v,'from','through',path); break;
      case 'ActualPeriod': {
        const empty = field(v,'coverage') === 'empty';
        checked = record(v,[['coverage',(x,p) => x === 'empty' || x === 'covered' ? success(x) : invalid('INVALID_COVERAGE',p)],['from',empty ? (x,p) => x === null ? success(x) : invalid('EMPTY_BOUND',p) : createCivilDate],['through',empty ? (x,p) => x === null ? success(x) : invalid('EMPTY_BOUND',p) : createCivilDate],['subPeriods',list((x,p) => createExactReference('ActualSubPeriod',x,p))]],path);
        if (!checked.ok) break;
        const refs = field(v,'subPeriods');
        if (!Array.isArray(refs) || (empty ? refs.length !== 0 : refs.length === 0)) return invalid('INVALID_AP_PARTITION',path);
        const identities: ExactReference<'ActualSubPeriod'>[] = [];
        for (const ref of refs) { const a = createExactReference('ActualSubPeriod',ref,path); if (!a.ok) return a;
          if (identities.some(b => sameIdentity(a.value,b))) return invalid('DUPLICATE_SUBPERIOD',path); identities.push(a.value); }
        if (!empty) checked = interval(v,'from','through',path); break;
      }
      case 'PortfolioOrder': {
        checked = record(v,[['projectIds',list((x,p) => validateId('ProjectId',x,p))]],path);
        if (!checked.ok) break;
        const ids = field(v,'projectIds'); const seen = new Set<string>();
        if (Array.isArray(ids)) for (const id of ids) { const a = validateId('ProjectId',id,path); if (!a.ok) return a;
          if (seen.has(a.value.value)) return invalid('DUPLICATE_PROJECT_ORDER',path); seen.add(a.value.value); }
        break;
      }
      case 'PlanningSettings': checked = record(v,[['horizon',(x,p) => {
        const a = record(x,[['start',createCivilDate],['end',createCivilDate]],p); return a.ok ? interval(x,'start','end',p) : a;
      }],['workingWeekdays',(x,p) => {
        const a = list((d,q) => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7 ? success(d) : invalid('INVALID_WEEKDAY',q))(x,p);
        return a.ok && Array.isArray(x) && new Set(x).size !== x.length ? invalid('DUPLICATE_WEEKDAY',p) : a;
      }],['maxParallelProjects',(x,p) => typeof x === 'number' && Number.isSafeInteger(x) && x > 0 ? success(x) : invalid('INVALID_PARALLEL_LIMIT',p)]],path); break;
      case 'TeamCapacity': {
        checked = record(v,[['periods',list((x,p) => { const a = record(x,[['start',createCivilDate],['end',createCivilDate],['dailyCapacity',quantity('Capacity')],['unavailabilityRatio',quantity('UnavailabilityRatio')]],p); return a.ok ? interval(x,'start','end',p) : a; })],['exceptions',list((x,p) => record(x,[['date',createCivilDate],['capacity',quantity('Capacity')]],p))]],path);
        if (!checked.ok) break;
        for (const [key,start,end] of [['periods','start','end'],['exceptions','date','date']] as const) {
          const items = field(v,key); let previous: string | undefined;
          if (Array.isArray(items)) for (const item of items) { const a = dataRecord(item,path); if (!a.ok) return a;
            const s = field(a.value,start), e = field(a.value,end);
            if (typeof s === 'string' && typeof e === 'string') { if (previous !== undefined && s <= previous) return invalid('UNORDERED_OR_OVERLAPPING_CALENDAR',`${path}.${key}`); previous = e; }
          }
        } break;
      }
      default: return invalid('INVALID_VERSION_KIND',path);
    }
    if (!checked.ok) return checked;
    if (kind === 'ProjectSettings' || kind === 'ReservationSettings') {
      if ((field(v,'program') === null) !== (field(v,'ownColor') !== null)) return invalid('PROGRAM_COLOR_EXCLUSIVITY',path);
    }
    if ((kind === 'Program' || kind === 'Pas') && typeof field(v,'name') === 'string') {
      const n = field(v,'name'); if (typeof n === 'string' && n !== n.trim().replace(/\s+/g,' ')) return invalid('NON_CANONICAL_CATALOG_NAME',`${path}.name`);
    }
    return success(payload);
  };
  const checked = checkBusinessSchema(); if (!checked.ok) return checked;
  if (owned.entry === 'version') return success(owned.envelope as unknown as BusinessVersion);
  // Every kind's closed schema above establishes the dependent payload type.
  return success(payload as unknown as BusinessPayloadByKind[K]);
}
