import { failure, invalid, success, type DomainError, type DomainResult } from '../../primitives/result.js';
import { dataRecord, field, hasKeys } from '../../primitives/data.js';
import { createId, validateId, type ProjectId } from '../../primitives/identity.js';
import { createEntityIdentity, validateExactReference, sameIdentity, sameReference, type EntityIdentity, type ExactReference, type VersionKind } from '../../primitives/exactReference.js';
import { createCivilDate, civilDayDifference } from '../../primitives/civilDate.js';
import { createQuantity, validateQuantity, type Quantity } from '../../primitives/quantity.js';
import { copyImmutableValue, equalImmutableValues } from '../../versioning/immutableValue.js';
import { createOwner, type VersionOwner } from '../../versioning/owner.js';
import { createBusinessVersion, validateBusinessPayload } from '../payloadValidation.js';
import type { BusinessVersion } from '../payloads.js';
import type { PortfolioGraph } from '../graphResolver.js';

export type LifecycleKind = 'ProjectSettings' | 'ReservationSettings' | 'TeamSettings' | 'PT' | 'RT';
export type TransitionCommand =
  | { readonly type: 'RenameProject'; readonly projectId: ProjectId; readonly name: string }
  | { readonly type: 'ReorderProjects'; readonly projectIds: readonly ProjectId[] }
  | { readonly type: 'DeleteLifecycle'; readonly target: EntityIdentity<LifecycleKind> }
  | { readonly type: 'RestoreRoot'; readonly target: EntityIdentity<'ProjectSettings' | 'ReservationSettings' | 'TeamSettings'>; readonly payload: unknown }
  | { readonly type: 'RestoreAssociation'; readonly target: EntityIdentity<'PT' | 'RT'>; readonly payload: unknown; readonly cells: readonly unknown[]; readonly bases: readonly ExactReference<VersionKind>[]; readonly etc?: Quantity<'ETC'> }
  | { readonly type: 'CorrectActuals'; readonly actualPeriod: EntityIdentity<'ActualPeriod'>; readonly cells: readonly unknown[] }
  | { readonly type: 'EditActualPartition' | 'CoverActualPeriod'; readonly actualPeriod: EntityIdentity<'ActualPeriod'>; readonly operation: 'extend' | 'reduce' | 'adjust' | 'split' | 'merge' | 'cover'; readonly periods: readonly unknown[]; readonly cells: readonly unknown[]; readonly bases: readonly ExactReference<VersionKind>[] }
  | { readonly type: 'EmptyActualPeriod'; readonly actualPeriod: EntityIdentity<'ActualPeriod'> }
  | { readonly type: 'SetPTETC'; readonly pt: EntityIdentity<'PT'>; readonly etc: Quantity<'ETC'> }
  | { readonly type: 'DeleteUsedCatalog'; readonly target: EntityIdentity<'Program' | 'Pas'>; readonly assignments: readonly unknown[] };
export interface Change { readonly proposed: BusinessVersion; readonly base: BusinessVersion | null; readonly force: boolean }
export interface IdentitySlot { readonly identity: EntityIdentity<VersionKind>; readonly owner: VersionOwner<VersionKind> }
export type Obligation =
  | { readonly kind: 'ConfirmRemoval' | 'ConfirmTeamDeletion' | 'ConfirmCell' | 'ConfirmRestoreGrid' | 'ConfirmPositiveETC'; readonly obligationId: string; readonly reason: string; readonly context: unknown }
  | { readonly kind: 'ReviewETC'; readonly obligationId: string; readonly reason: string; readonly context: unknown; readonly ptec: BusinessVersion<'PTEC'> };
export type ObligationAnswer =
  | { readonly obligationId: string; readonly kind: 'Confirm'; readonly accept: boolean }
  | { readonly obligationId: string; readonly kind: 'ReviewETC'; readonly accept: boolean; readonly choice: 'keep' }
  | { readonly obligationId: string; readonly kind: 'ReviewETC'; readonly accept: boolean; readonly choice: 'replace'; readonly etc: Quantity<'ETC'> };
export interface TransitionPlan { readonly desired: readonly BusinessVersion[]; readonly changes: readonly Change[]; readonly slots: readonly IdentitySlot[]; readonly obligations: readonly Obligation[] }
/** Equality of validated data; acquisition also avoids treating unsafe objects as data. */
export function businessEqual(a: unknown, b: unknown): boolean {
  const left = copyImmutableValue(a), right = copyImmutableValue(b);
  return left.ok && right.ok && equalImmutableValues(left.value,right.value);
}
export function ofKind<K extends VersionKind>(versions: readonly BusinessVersion[], kind: K): readonly BusinessVersion<K>[] {
  // Inputs are acquired BusinessVersion values; this assertion only correlates the nested discriminant.
  return versions.filter(v => v.ref.kind === kind) as BusinessVersion<K>[];
}
function ident<K extends VersionKind>(ref: ExactReference<K>): EntityIdentity<K> { return Object.freeze({kind:ref.kind,entityId:ref.entityId}); }

/** Pure planning: provisional slots are private templates, never allocated business identities. */
export function analyseTransition(graph: PortfolioGraph, history: readonly BusinessVersion[], input: unknown): DomainResult<TransitionPlan> {
  let diagnostics: readonly DomainError[] | null = null;
  function take<T>(r: DomainResult<T>): T { if (!r.ok) { diagnostics = r.errors; throw new Error('TransitionRuleRefused'); } return r.value; }
  function refuse(code: string, path: string): never { take(invalid(code,path)); throw new Error('unreachable'); }
  const desired = [...graph.versions], changes: Change[] = [], slots: IdentitySlot[] = [], obligations: Obligation[] = [];
  function record(value: unknown, path: string) { return take(dataRecord(value,path)); }
  function list(value: unknown, path: string): readonly unknown[] { if (!Array.isArray(value)) refuse('INVALID_COMMAND_LIST',path); return value; }
  function keys(value: Readonly<Record<string,unknown>>, required: readonly string[], optional: readonly string[] = []) { if (!hasKeys(value,required,optional)) refuse('INVALID_COMMAND_KEYS','command'); }
  function find(target: EntityIdentity<VersionKind>) { const v = desired.find(v => sameIdentity(v.ref,target)); if (!v) refuse('UNKNOWN_TARGET','command.target'); return v; }
  function target(value: unknown, allowed: readonly VersionKind[]): EntityIdentity<VersionKind> {
    const r = record(value,'command.target'), kind = field(r,'kind');
    const k = allowed.find(k => k === kind); if (!k) refuse('INVALID_TARGET_KIND','command.target');
    return take(createEntityIdentity(k,value,'command.target'));
  }
  function selected(v: BusinessVersion) { return graph.versions.some(s => sameIdentity(s.ref,v.ref)); }
  function change(base: BusinessVersion | null, proposed: BusinessVersion, force = false) {
    const index = desired.findIndex(v => sameIdentity(v.ref,proposed.ref));
    if (index < 0) desired.push(proposed); else desired.splice(index,1,proposed);
    const earlier = changes.findIndex(c => sameIdentity(c.proposed.ref,proposed.ref));
    if (earlier >= 0) changes.splice(earlier,1);
    if (force || base === null || !selected(base) || !businessEqual(base.payload,proposed.payload)) changes.push(Object.freeze({base,proposed,force}));
  }
  function propose(base: BusinessVersion, payload: unknown, force = false) { const v = take(createBusinessVersion({...base,payload})); change(base,v,force); return v; }
  function remove(predicate: (v: BusinessVersion) => boolean) { for (let i = desired.length-1;i >= 0;i--) { const v = desired.at(i); if (v && predicate(v)) desired.splice(i,1); } }
  function obligation(kind: Exclude<Obligation['kind'],'ReviewETC'>, context: unknown) { obligations.push(Object.freeze({kind,obligationId:`o${obligations.length+1}`,reason:kind,context:take(copyImmutableValue(context))})); }
  function review(ptec: BusinessVersion<'PTEC'>, through: unknown, cause: string) {
    if (obligations.some(o => o.kind === 'ReviewETC' && sameIdentity(o.ptec.ref,ptec.ref))) return;
    if (ptec.payload.etc.value.numerator > 0n) obligations.push(Object.freeze({kind:'ReviewETC',obligationId:`o${obligations.length+1}`,reason:cause,ptec,context:take(copyImmutableValue({base:ptec.ref,previous:ptec.payload.etc,through,cause}))}));
  }
  function fresh(kind: VersionKind, owner: unknown, payload: unknown, provenance: readonly ExactReference<VersionKind>[] = []) {
    // Select a collision-free *template* label only. Business reservation still belongs exclusively to Application.
    let ordinal=slots.length+1;
    while(history.some(v => v.ref.entityId.value === `r13-template-${ordinal}`) || slots.some(s => s.identity.entityId.value === `r13-template-${ordinal}`)) ordinal++;
    const entityId = take(createId('EntityId',`r13-template-${ordinal}`));
    const identity = Object.freeze({kind,entityId}), validOwner = take(createOwner(kind,owner));
    slots.push(Object.freeze({identity,owner:validOwner}));
    const v = take(createBusinessVersion({ref:{...identity,versionId:take(createId('VersionId','r13-template-version'))},owner:validOwner,payload,provenance}));
    change(null,v); return v;
  }
  function historic(kind: VersionKind, owner: unknown, payload: unknown, bases: readonly ExactReference<VersionKind>[]) {
    const matches = history.filter(v => v.ref.kind === kind && businessEqual(v.owner,owner));
    const existing = matches.at(0); if (!existing) return fresh(kind,owner,payload);
    const baseRef = bases.find(r => sameIdentity(r,existing.ref));
    if (!baseRef) refuse('HistoricalBaseRequired',`history.${kind}.${existing.ref.entityId.value}`);
    const base = history.find(v => sameReference(v.ref,baseRef)); if (!base) refuse('HistoricalBaseMissing',`history.${kind}`);
    if (!businessEqual(base.owner,owner)) refuse('HistoricalBaseIdentityMismatch',`history.${kind}`);
    return propose(base,payload,true);
  }
  function parseBases(value: unknown): readonly ExactReference<VersionKind>[] {
    const refs = list(value,'command.bases').map(v => take(validateExactReference(v,'command.bases')));
    if (refs.some((r,i) => refs.slice(0,i).some(s => sameIdentity(r,s)))) refuse('DUPLICATE_HISTORICAL_BASE','command.bases');
    for (const r of refs) if (!history.some(v => sameReference(v.ref,r))) refuse('HistoricalBaseMissing','command.bases');
    return refs;
  }
  function apFor(a: BusinessVersion<'PT' | 'RT'>): BusinessVersion<'ActualPeriod'> {
    const ap = ofKind(graph.versions,'ActualPeriod').find(ap => ap.owner.type === 'Project' && a.owner.type === 'ProjectTeam' ? businessEqual(ap.owner.projectId,a.owner.projectId) : ap.owner.type === 'Reservation' && a.owner.type === 'ReservationTeam' && businessEqual(ap.owner.reservationId,a.owner.reservationId));
    if (!ap) refuse('ACTUAL_PERIOD_REQUIRED','command'); return ap;
  }
  function rootFor(ap: BusinessVersion<'ActualPeriod'>) {
    const r = graph.versions.find(v => ['ProjectSettings','ReservationSettings'].includes(v.ref.kind) && businessEqual(v.owner,ap.owner));
    if (!r || (r.ref.kind !== 'ProjectSettings' && r.ref.kind !== 'ReservationSettings')) refuse('UNKNOWN_AP_OWNER','command');
    if (field(record(r.payload,'root'),'lifecycle') !== 'existing') refuse('DELETED_NOT_EDITABLE','command');
    return r;
  }
  function associations(ap: BusinessVersion<'ActualPeriod'>) { return [...ofKind(graph.versions,'PT'),...ofKind(graph.versions,'RT')].filter(a => a.payload.lifecycle === 'existing' && sameIdentity(apFor(a).ref,ap.ref)); }
  function endpointCheck(a: BusinessVersion<'PT'|'RT'>) {
    const team = ofKind(graph.versions,'TeamSettings').find(t => businessEqual(t.owner.teamId,a.owner.teamId));
    const owner = a.owner;
    const root = owner.type === 'ProjectTeam' ? ofKind(graph.versions,'ProjectSettings').find(p => businessEqual(p.owner.projectId,owner.projectId)) : ofKind(graph.versions,'ReservationSettings').find(r => businessEqual(r.owner.reservationId,owner.reservationId));
    if (!team || !root || team.payload.lifecycle !== 'existing' || root.payload.lifecycle !== 'existing') refuse('DELETED_ASSOCIATION_ENDPOINT','command.target');
  }
  const zero = () => take(createQuantity('Consumption',{numerator:0n,denominator:1n}));
  try {
    const copied = take(copyImmutableValue(input,'command')), c = record(copied,'command'), type = field(c,'type');
    switch (type) {
      case 'RenameProject': {
        keys(c,['type','projectId','name']); const id = take(validateId('ProjectId',field(c,'projectId')));
        const p = ofKind(graph.versions,'ProjectSettings').find(p => businessEqual(p.owner.projectId,id)); if (!p) refuse('UNKNOWN_TARGET','command.projectId');
        if (p.payload.lifecycle !== 'existing') refuse('DELETED_NOT_EDITABLE','command.projectId');
        propose(p,{...p.payload,name:field(c,'name')}); break;
      }
      case 'ReorderProjects': {
        keys(c,['type','projectIds']); const ids = list(field(c,'projectIds'),'command.projectIds').map(v => take(validateId('ProjectId',v)));
        if (ids.length !== graph.inventories.projects.length || new Set(ids.map(id => id.value)).size !== ids.length || ids.some(id => !graph.inventories.projects.some(p => businessEqual(p,id)))) refuse('INVALID_PROJECT_ORDER','command.projectIds');
        const order = ofKind(graph.versions,'PortfolioOrder').at(0); if (!order) refuse('UNKNOWN_TARGET','order'); propose(order,{projectIds:ids}); break;
      }
      case 'SetPTETC': {
        keys(c,['type','pt','etc']); const pt = target(field(c,'pt'),['PT']), a = ofKind(graph.versions,'PT').find(a => sameIdentity(a.ref,pt));
        if (!a || a.payload.lifecycle !== 'existing') refuse('DELETED_NOT_EDITABLE','command.pt');
        const p = ofKind(graph.versions,'PTEC').find(p => sameIdentity(p.owner.pt,pt)); if (!p) refuse('PTEC_REQUIRED','command.pt');
        const etc = take(validateQuantity('ETC',field(c,'etc')));
        if (!businessEqual(etc,p.payload.etc)) { if (p.payload.etc.value.numerator > 0n) review(p,p.payload.lastActualsDate,'SetPTETC'); else obligation('ConfirmPositiveETC',{base:p.ref,previous:p.payload.etc,proposed:etc}); propose(p,{...p.payload,etc}); } break;
      }
      case 'DeleteLifecycle': {
        keys(c,['type','target']); const t = target(field(c,'target'),['ProjectSettings','ReservationSettings','TeamSettings','PT','RT']), v = find(t);
        if (field(record(v.payload,'target'),'lifecycle') === 'deleted') break;
        const affected = [...ofKind(graph.versions,'PT'),...ofKind(graph.versions,'RT')].filter(a => a.payload.lifecycle === 'existing' && (sameIdentity(a.ref,t) || (v.owner.type === 'Team' && businessEqual(a.owner.teamId,v.owner.teamId)) || (v.owner.type === 'Project' && a.owner.type === 'ProjectTeam' && businessEqual(a.owner.projectId,v.owner.projectId)) || (v.owner.type === 'Reservation' && a.owner.type === 'ReservationTeam' && businessEqual(a.owner.reservationId,v.owner.reservationId))));
        const removed = ofKind(graph.versions,'TeamActual').filter(ta => affected.some(a => sameIdentity(a.ref,ta.owner.association)));
        if (removed.length || t.kind === 'TeamSettings') obligation(removed.length ? 'ConfirmRemoval' : 'ConfirmTeamDeletion',{target:v.ref,removed:removed.map(v => ({ref:v.ref,payload:v.payload})),team:t.kind === 'TeamSettings' ? v.ref : null});
        propose(v,{...record(v.payload,'payload'),lifecycle:'deleted'});
        for (const a of affected) { if (!sameIdentity(a.ref,t)) propose(a,{...a.payload,lifecycle:'deleted'}); }
        remove(v => { const owner = v.owner; return (v.ref.kind === 'TeamActual' && (owner.type === 'PTSubPeriod' || owner.type === 'RTSubPeriod') && affected.some(a => sameIdentity(a.ref,owner.association))) || (v.ref.kind === 'PTEC' && owner.type === 'PT' && affected.some(a => sameIdentity(a.ref,owner.pt))); }); break;
      }
      case 'RestoreRoot': {
        keys(c,['type','target','payload']); const t = target(field(c,'target'),['ProjectSettings','ReservationSettings','TeamSettings']), v = find(t);
        const payload = take(validateBusinessPayload(t.kind,field(c,'payload'))), r = record(payload,'payload');
        if (field(r,'lifecycle') !== 'existing') refuse('RESTORE_REQUIRES_EXISTING','command.payload');
        if (field(record(v.payload,'payload'),'lifecycle') !== 'deleted') refuse('RESTORE_REQUIRES_DELETED','command.target');
        for (const k of ['Program','Pas'] as const) { const i = field(r,k === 'Program' ? 'program' : 'pas'); if (i !== null && i !== undefined) { const identity = take(createEntityIdentity(k,i)); const cat = ofKind(graph.versions,k).find(v => sameIdentity(v.ref,identity)); if (!cat || cat.payload.lifecycle !== 'existing') refuse('DELETED_CATALOG_REFERENCE','command.payload'); } }
        // Earliest is checked against the retained AP, without clipping it.
        if (t.kind === 'ProjectSettings') { const ap = ofKind(graph.versions,'ActualPeriod').find(ap => businessEqual(ap.owner,v.owner)); const earliest = field(r,'earliestStartDate'); if (typeof earliest === 'string' && ap?.payload.from !== null && ap?.payload.from !== undefined && earliest > take(createCivilDate(ap.payload.from))) refuse('AP_BEFORE_EARLIEST','command.payload'); }
        obligation('ConfirmRestoreGrid',{root:v.ref,settings:payload}); propose(v,payload); break;
      }
      case 'RestoreAssociation': {
        keys(c,['type','target','payload','cells','bases'],['etc']); const t = target(field(c,'target'),['PT','RT']);
        const a = [...ofKind(graph.versions,'PT'),...ofKind(graph.versions,'RT')].find(a => sameIdentity(a.ref,t)); if (!a || a.payload.lifecycle !== 'deleted') refuse('RESTORE_REQUIRES_DELETED','command.target'); endpointCheck(a);
        const payload = take(validateBusinessPayload(t.kind,field(c,'payload'))); if (field(record(payload,'payload'),'lifecycle') !== 'existing') refuse('RESTORE_REQUIRES_EXISTING','command.payload');
        const ap = apFor(a), bases = parseBases(field(c,'bases'));
        for (const r of bases) { const v = history.find(v => sameReference(v.ref,r))!; const owner = v.owner; if (!((r.kind === 'TeamActual' && (owner.type === 'PTSubPeriod' || owner.type === 'RTSubPeriod') && sameIdentity(owner.association,a.ref) && ap.payload.subPeriods.some(s => sameIdentity(s,owner.subPeriod))) || (a.ref.kind === 'PT' && r.kind === 'PTEC' && owner.type === 'PT' && sameIdentity(owner.pt,a.ref)))) refuse('HistoricalBaseIdentityMismatch','command.bases'); }
        const cells = list(field(c,'cells'),'command.cells').map(v => record(v,'command.cells'));
        const grid: unknown[] = [];
        for (const spRef of ap.payload.subPeriods) {
          const sp = ofKind(graph.versions,'ActualSubPeriod').find(s => sameReference(s.ref,spRef)); if (!sp) refuse('MISSING_EXACT_VERSION','command');
          const cell = cells.find(c => businessEqual(field(c,'subPeriod'),ident(sp.ref)));
          if (cell) keys(cell,['subPeriod','consumed']);
          const consumed = cell ? take(validateQuantity('Consumption',field(cell,'consumed'))) : zero();
          const owner = {type:a.ref.kind === 'PT' ? 'PTSubPeriod' : 'RTSubPeriod',association:ident(a.ref),subPeriod:ident(sp.ref)};
          const ta = historic('TeamActual',owner,{consumed},bases); grid.push({identity:ident(ta.ref),base:changes.find(v => sameIdentity(v.proposed.ref,ta.ref))?.base?.ref ?? null,subPeriod:sp.ref,bounds:sp.payload,consumed});
        }
        const seenCells:EntityIdentity<'ActualSubPeriod'>[] = [];
        for (const cell of cells) { keys(cell,['subPeriod','consumed']); const identity=take(createEntityIdentity('ActualSubPeriod',field(cell,'subPeriod'),'command.cells')); take(validateQuantity('Consumption',field(cell,'consumed'),'command.cells')); if(seenCells.some(i=>sameIdentity(i,identity)) || !ap.payload.subPeriods.some(s=>sameIdentity(s,identity))) refuse('INVALID_RESTORE_CELLS','command.cells'); seenCells.push(identity); }
        let ptec: BusinessVersion | null = null;
        if (a.ref.kind === 'PT') { const etc = take(validateQuantity('ETC',field(c,'etc'))); ptec = historic('PTEC',{type:'PT',pt:ident(a.ref)},{actualPeriod:ident(ap.ref),lastActualsDate:ap.payload.through,etc},bases); }
        else if (field(c,'etc') !== undefined) refuse('RT_HAS_NO_ETC','command.etc');
        obligation('ConfirmRestoreGrid',{association:a.ref,parameters:payload,grid,ptec}); propose(a,payload); break;
      }
      case 'CorrectActuals': {
        keys(c,['type','actualPeriod','cells']); const apId = target(field(c,'actualPeriod'),['ActualPeriod']), ap = ofKind(graph.versions,'ActualPeriod').find(v => sameIdentity(v.ref,apId)); if (!ap) refuse('UNKNOWN_TARGET','command.actualPeriod'); rootFor(ap);
        const seen: EntityIdentity<VersionKind>[] = [];
        for (const value of list(field(c,'cells'),'command.cells')) { const cell = record(value,'cell'); keys(cell,['teamActual','consumed']); const t = target(field(cell,'teamActual'),['TeamActual']); if (seen.some(s => sameIdentity(s,t))) refuse('DUPLICATE_CELL','command.cells'); seen.push(t);
          const ta = ofKind(graph.versions,'TeamActual').find(v => sameIdentity(v.ref,t)); if (!ta || !associations(ap).some(a => sameIdentity(a.ref,ta.owner.association))) refuse('FOREIGN_CELL','command.cells'); const consumed = take(validateQuantity('Consumption',field(cell,'consumed')));
          if (businessEqual(consumed,ta.payload.consumed)) continue;
          const sp = ofKind(graph.versions,'ActualSubPeriod').find(s => sameIdentity(s.ref,ta.owner.subPeriod)); if (!sp) refuse('UNKNOWN_SUBPERIOD','command.cells');
          obligation('ConfirmCell',{base:ta.ref,association:ta.owner.association,oldBounds:sp.payload,newBounds:sp.payload,consumed}); propose(ta,{consumed});
          const p = ofKind(graph.versions,'PTEC').find(p => sameIdentity(p.owner.pt,ta.owner.association)); if (p) review(p,ap.payload.through,'CorrectActuals');
        } break;
      }
      case 'EditActualPartition': case 'CoverActualPeriod': case 'EmptyActualPeriod': {
        const empty = type === 'EmptyActualPeriod'; keys(c,empty ? ['type','actualPeriod'] : ['type','actualPeriod','operation','periods','cells','bases']);
        const apId = target(field(c,'actualPeriod'),['ActualPeriod']), ap = ofKind(graph.versions,'ActualPeriod').find(v => sameIdentity(v.ref,apId)); if (!ap) refuse('UNKNOWN_TARGET','command.actualPeriod'); const root = rootFor(ap);
        if (empty && ap.payload.coverage === 'empty') break;
        const operation = empty ? 'empty' : field(c,'operation');
        if (type === 'CoverActualPeriod' && (ap.payload.coverage !== 'empty' || operation !== 'cover')) refuse('INVALID_PARTITION_OPERATION','command.operation');
        if (type === 'EditActualPartition' && (ap.payload.coverage !== 'covered' || !['extend','reduce','adjust','split','merge'].includes(String(operation)))) refuse('INVALID_PARTITION_OPERATION','command.operation');
        const bases = empty ? [] : parseBases(field(c,'bases'));
        const oldSubs = ofKind(graph.versions,'ActualSubPeriod').filter(s => ap.payload.subPeriods.some(r => sameReference(r,s.ref)));
        const periods = empty ? [] : list(field(c,'periods'),'command.periods');
        if (!empty && !periods.length) refuse('COVERED_PARTITION_REQUIRED','command.periods');
        const used: EntityIdentity<VersionKind>[] = [], labels: string[] = [];
        const newSubs: BusinessVersion<'ActualSubPeriod'>[] = [];
        for (const [i,value] of periods.entries()) {
          const p = record(value,'period'); keys(p,['slot','from','through'],['identity','provenance']); const slot = field(p,'slot'); if (typeof slot !== 'string' || !slot.trim() || labels.includes(slot)) refuse('INVALID_PERIOD_SLOT','command.periods'); labels.push(slot);
          const from = take(createCivilDate(field(p,'from'))), through = take(createCivilDate(field(p,'through'))); if (from > through) refuse('INVERTED_INTERVAL','command.periods');
          const previous = newSubs.at(-1); if (previous && take(civilDayDifference(from,previous.payload.through)) !== 1) refuse('NONCONTIGUOUS_PARTITION','command.periods');
          const existing = field(p,'identity'); let proposed: BusinessVersion;
          if (existing !== undefined) { const t = target(existing,['ActualSubPeriod']); if (used.some(u => sameIdentity(u,t))) refuse('DUPLICATE_SUBPERIOD','command.periods'); used.push(t); const base = oldSubs.find(s => sameIdentity(s.ref,t)); if (!base) refuse('FOREIGN_SUBPERIOD','command.periods'); proposed = propose(base,{from,through}); if (field(p,'provenance') !== undefined) refuse('EXISTING_PROVENANCE_IMMUTABLE','command.periods'); }
          else { const provenance = field(p,'provenance') === undefined ? [] : list(field(p,'provenance'),'provenance').map(v => take(validateExactReference(v))); for (const r of provenance) if (!oldSubs.some(s => sameReference(s.ref,r))) refuse('FOREIGN_PROVENANCE','command.periods'); proposed = fresh('ActualSubPeriod',{type:'ActualPeriod',actualPeriod:ident(ap.ref)},{from,through},provenance); }
          const s = ofKind([proposed],'ActualSubPeriod').at(0); if (!s) refuse('INVALID_SUBPERIOD','command.periods'); newSubs.push(s); void i;
        }
        const first = newSubs.at(0), last = newSubs.at(-1);
        if (first && root.ref.kind === 'ProjectSettings') { const ps = ofKind([root],'ProjectSettings').at(0); if (ps?.payload.earliestStartDate && first.payload.from < ps.payload.earliestStartDate) refuse('AP_BEFORE_EARLIEST','command.periods'); }
        if (operation === 'extend' && (first!.payload.from > ap.payload.from! || last!.payload.through < ap.payload.through!)) refuse('INVALID_EXTENSION','command.periods');
        if (operation === 'reduce' && (first!.payload.from < ap.payload.from! || last!.payload.through > ap.payload.through!)) refuse('INVALID_REDUCTION','command.periods');
        if (operation === 'extend' && (used.length !== oldSubs.length || oldSubs.some(old => { const next = newSubs.find(s => sameIdentity(s.ref,old.ref)); return !next || next.payload.from > old.payload.from || next.payload.through < old.payload.through; }))) refuse('EXTENSION_MUST_RETAIN_PORTIONS','command.periods');
        if (operation === 'reduce' && (used.length !== newSubs.length || newSubs.some(next => { const old = oldSubs.find(s => sameIdentity(s.ref,next.ref)); return !old || next.payload.from < old.payload.from || next.payload.through > old.payload.through; }))) refuse('REDUCTION_MUST_RETAIN_PORTIONS','command.periods');
        if (operation === 'adjust' && (newSubs.length !== oldSubs.length || used.length !== oldSubs.length)) refuse('ADJUST_REQUIRES_SAME_IDENTITIES','command.periods');
        if ((operation === 'split' || operation === 'merge') && (first!.payload.from !== ap.payload.from || last!.payload.through !== ap.payload.through || (operation === 'split' ? newSubs.length <= oldSubs.length : newSubs.length >= oldSubs.length))) refuse('INVALID_REPARTITION','command.periods');
        if ((operation === 'split' || operation === 'merge') && used.length) refuse('REPARTITION_REQUIRES_NEW_IDENTITIES','command.periods');
        const cells = empty ? [] : list(field(c,'cells'),'command.cells').map(v => record(v,'cell'));
        for (const cell of cells) keys(cell,['association','slot','consumed']);
        const usedCells = new Set<Readonly<Record<string,unknown>>>();
        const removedTA = ofKind(graph.versions,'TeamActual').filter(ta => oldSubs.some(s => sameIdentity(s.ref,ta.owner.subPeriod)) && !newSubs.some(s => sameIdentity(s.ref,ta.owner.subPeriod)));
        if (removedTA.length) obligation('ConfirmRemoval',{actualPeriod:ap.ref,removed:removedTA.map(v => ({ref:v.ref,payload:v.payload}))});
        remove(v => (v.ref.kind === 'ActualSubPeriod' && oldSubs.some(s => sameIdentity(s.ref,v.ref)) && !newSubs.some(s => sameIdentity(s.ref,v.ref))) || (v.ref.kind === 'TeamActual' && removedTA.some(t => sameIdentity(t.ref,v.ref))));
        for (const a of associations(ap)) {
          let affected = false;
          for (const [i,s] of newSubs.entries()) {
            const label = labels.at(i); const matches = cells.filter(c => businessEqual(field(c,'association'),ident(a.ref)) && field(c,'slot') === label); if (matches.length > 1) refuse('DUPLICATE_CELL','command.cells'); const cell = matches.at(0); if (cell) usedCells.add(cell);
            const ta = ofKind(graph.versions,'TeamActual').find(ta => sameIdentity(ta.owner.association,a.ref) && sameIdentity(ta.owner.subPeriod,s.ref));
            const consumed = cell ? take(validateQuantity('Consumption',field(cell,'consumed'))) : ta?.payload.consumed ?? zero();
            const old = oldSubs.find(o => sameIdentity(o.ref,s.ref));
            const changed = !ta || !businessEqual(ta.payload.consumed,consumed) || !old || !businessEqual(old.payload,s.payload);
            if (changed) { affected = true; obligation('ConfirmCell',{base:ta?.ref ?? null,association:ident(a.ref),subPeriod:ident(s.ref),oldBounds:old?.payload ?? null,newBounds:s.payload,consumed}); }
            if (ta) propose(ta,{consumed}); else historic('TeamActual',{type:a.ref.kind === 'PT' ? 'PTSubPeriod' : 'RTSubPeriod',association:ident(a.ref),subPeriod:ident(s.ref)},{consumed},bases);
          }
          if (removedTA.some(t => sameIdentity(t.owner.association,a.ref))) affected = true;
          const ptec = ofKind(graph.versions,'PTEC').find(p => sameIdentity(p.owner.pt,a.ref));
          if (ptec) { const through = last?.payload.through ?? null; if (affected || through !== ap.payload.through) review(ptec,through,String(operation)); propose(ptec,{...ptec.payload,lastActualsDate:through}); }
        }
        if (usedCells.size !== cells.length) refuse('FOREIGN_CELL','command.cells');
        propose(ap,first && last ? {coverage:'covered',from:first.payload.from,through:last.payload.through,subPeriods:newSubs.map(s => s.ref)} : {coverage:'empty',from:null,through:null,subPeriods:[]},newSubs.some(s => changes.some(ch => ch.proposed.ref.kind === 'ActualSubPeriod' && sameIdentity(ch.proposed.ref,s.ref)))); break;
      }
      case 'DeleteUsedCatalog': {
        keys(c,['type','target','assignments']); const t = target(field(c,'target'),['Program','Pas']), cat = find(t); if (field(record(cat.payload,'catalog'),'lifecycle') === 'deleted') break;
        const owners = [...ofKind(graph.versions,'ProjectSettings'),...ofKind(graph.versions,'ReservationSettings')].filter(o => o.payload.lifecycle === 'existing' && businessEqual(t.kind === 'Program' ? o.payload.program : o.payload.pas,t));
        const assignments = list(field(c,'assignments'),'command.assignments').map(v => record(v,'assignment')); if (assignments.length !== owners.length) refuse('CATALOG_ASSIGNMENTS_INCOMPLETE','command.assignments');
        for (const owner of owners) { const matches = assignments.filter(a => businessEqual(field(a,'owner'),ident(owner.ref))); if (matches.length !== 1) refuse('CATALOG_ASSIGNMENTS_INCOMPLETE','command.assignments'); const a = matches.at(0)!; keys(a,['owner','replacement'],['ownColor']);
          const replacement = field(a,'replacement'); let next: EntityIdentity<VersionKind> | null = null;
          if (replacement !== null) { next = target(replacement,[t.kind]); const replacementVersion = find(next); if (sameIdentity(next,t) || field(record(replacementVersion.payload,'catalog'),'lifecycle') !== 'existing') refuse('INVALID_CATALOG_REPLACEMENT','command.assignments'); }
          propose(owner,t.kind === 'Program' ? {...owner.payload,program:next,ownColor:next === null ? field(a,'ownColor') : null} : {...owner.payload,pas:next});
          if (t.kind === 'Pas' && field(a,'ownColor') !== undefined) refuse('PAS_DOES_NOT_CHANGE_COLOR','command.assignments');
        }
        propose(cat,{...record(cat.payload,'catalog'),lifecycle:'deleted'}); break;
      }
      default: refuse('UNKNOWN_COMMAND','command.type');
    }
    return success(Object.freeze({desired:Object.freeze(desired),changes:Object.freeze(changes),slots:Object.freeze(slots),obligations:Object.freeze(obligations)}));
  } catch (e) { if (diagnostics !== null) return failure(diagnostics); throw e; }
}

/** Closed answers, quantities and obligations are revalidated on every submission. */
export function resolveObligations(plan: TransitionPlan, input: unknown): DomainResult<TransitionPlan> {
  const copied = copyImmutableValue(input,'answers'); if (!copied.ok) return copied;
  if (!Array.isArray(copied.value)) return invalid('INVALID_ANSWERS','answers');
  const seen = new Set<string>(), desired = [...plan.desired], changes = [...plan.changes];
  for (const value of copied.value) {
    const r = dataRecord(value,'answers'); if (!r.ok) return r;
    const id = field(r.value,'obligationId'); if (typeof id !== 'string' || seen.has(id)) return invalid('DUPLICATE_OR_INVALID_ANSWER','answers.obligationId'); seen.add(id);
    const o = plan.obligations.find(o => o.obligationId === id); if (!o) return invalid('UNKNOWN_OBLIGATION','answers.obligationId');
    if (field(r.value,'accept') !== true) return invalid('CONFIRMATION_DECLINED','answers.accept');
    if (o.kind !== 'ReviewETC') { if (!hasKeys(r.value,['obligationId','kind','accept']) || field(r.value,'kind') !== 'Confirm') return invalid('ANSWER_KIND_MISMATCH','answers'); continue; }
    const choice = field(r.value,'choice');
    if (field(r.value,'kind') !== 'ReviewETC' || (choice !== 'keep' && choice !== 'replace') || !hasKeys(r.value,choice === 'keep' ? ['obligationId','kind','accept','choice'] : ['obligationId','kind','accept','choice','etc'])) return invalid('INVALID_ETC_REVIEW','answers');
    const etc = choice === 'keep' ? success(o.ptec.payload.etc) : validateQuantity('ETC',field(r.value,'etc'),'answers.etc'); if (!etc.ok) return etc;
    const current = ofKind(desired,'PTEC').find(p => sameIdentity(p.ref,o.ptec.ref)); if (!current) return invalid('MISSING_REVIEW_TARGET','answers');
    const proposed = createBusinessVersion({...current,payload:{...current.payload,etc:etc.value}}); if (!proposed.ok) return proposed;
    const i = desired.findIndex(v => sameIdentity(v.ref,current.ref)); desired.splice(i,1,proposed.value);
    const old = changes.findIndex(c => sameIdentity(c.proposed.ref,current.ref)); if (old >= 0) changes.splice(old,1);
    if (!businessEqual(proposed.value.payload,o.ptec.payload)) changes.push(Object.freeze({proposed:proposed.value,base:o.ptec,force:false}));
  }
  if (seen.size !== plan.obligations.length) return invalid('MISSING_OBLIGATION','answers');
  return success(Object.freeze({...plan,desired:Object.freeze(desired),changes:Object.freeze(changes)}));
}
