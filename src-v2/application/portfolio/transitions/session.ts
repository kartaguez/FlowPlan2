import { dataRecord, field, hasKeys } from '../../../domain/primitives/data.js';
import { invalid, success, type DomainError, type DomainResult } from '../../../domain/primitives/result.js';
import { createId, validateId, type VersionId, type EntityId } from '../../../domain/primitives/identity.js';
import { createEntityIdentity, validateExactReference, sameIdentity, type ExactReference, type VersionKind } from '../../../domain/primitives/exactReference.js';
import { createOwner, type VersionOwner } from '../../../domain/versioning/owner.js';
import { LocalVersionTable, referenceParts } from '../../../domain/versioning/localVersionTables.js';
import { copyImmutableValue } from '../../../domain/versioning/immutableValue.js';
import { createVersionRegistry, withVersions, lookupExactBatch } from '../../../domain/versioning/versionRegistry.js';
import { createCurrentSelection, createPortfolioManifest, manifestTables, selectedReferences } from '../../../domain/portfolio/manifest.js';
import { certifyPortfolioGraph } from '../../../domain/portfolio/validatedPortfolioGraph.js';
import { createBusinessVersion } from '../../../domain/portfolio/payloadValidation.js';
import type { BusinessVersion } from '../../../domain/portfolio/payloads.js';
import { analyseTransition, resolveObligations, businessEqual, type TransitionPlan, type Obligation, type ObligationAnswer } from '../../../domain/portfolio/transitions/transition.js';
import type { CompleteRamHistorySource, CurrentRamPort, PublishedCurrent } from '../../ports/currentRamPort.js';
import type { TransitionAllocationPort } from '../../ports/transitionAllocationPort.js';
import type { CandidateAssemblyPort } from '../../ports/candidateAssemblyPort.js';

const preparedBrand: unique symbol = Symbol('PreparedTransition');
export type PreparedObligation=Obligation & {readonly preparationId:string};
export interface PreparedTransition { readonly preparationId: string; readonly baseRevision: string; readonly obligations: readonly PreparedObligation[]; readonly [preparedBrand]: true }
export interface ExecutionAnswers { readonly preparationId:string; readonly preparation:PreparedTransition; readonly answers:readonly ObligationAnswer[] }
export type PreparationResult = { readonly type:'Prepared'; readonly prepared: PreparedTransition } | { readonly type:'NoOp' } | { readonly type:'Rejected'; readonly stage:string; readonly errors:readonly DomainError[] };
export type ExecutionResult = { readonly type:'Applied'; readonly current:PublishedCurrent; readonly versionsCreated:readonly ExactReference<VersionKind>[] } | { readonly type:'NoOp' } | { readonly type:'Stale' } | { readonly type:'Rejected' | 'CandidateCertificationFailure' | 'InternalTransitionFailure'; readonly stage:string; readonly preparationId:string; readonly errors:readonly DomainError[] };
const admissionBrand:unique symbol=Symbol('AdmittedRamHistory');
export interface AdmittedRamHistory { readonly view:PublishedCurrent; readonly ledger:readonly Reservation[]; readonly entityIds:readonly string[]; readonly versionIds:readonly string[]; readonly [admissionBrand]:true }
interface Reservation { readonly kind:VersionKind; readonly owner:VersionOwner<VersionKind>; readonly entityId:EntityId; readonly state:'pending'|'burned'|'published' }
interface Dossier { readonly handle:PreparedTransition; readonly base:PublishedCurrent; readonly plan:TransitionPlan; readonly identities:readonly {readonly template:EntityId; readonly allocated:EntityId}[] }
export interface TransitionSession { prepare(command:unknown):PreparationResult; execute(prepared:PreparedTransition,answers:unknown):ExecutionResult; abandon(prepared:PreparedTransition):boolean; reservations():unknown }
export function assembleCandidateManifest(base: PublishedCurrent['selection']['manifest'], selected:readonly BusinessVersion[]): unknown {
  return {...base,...Object.fromEntries(manifestTables.map(([key,kind]) => [key,selected.filter(v => v.ref.kind === kind).map(v => v.ref)])),planningSettings:selected.find(v => v.ref.kind === 'PlanningSettings')?.ref,portfolioOrder:selected.find(v => v.ref.kind === 'PortfolioOrder')?.ref};
}
/** Revalidates H, the closed expected inventory, reservations and the exact current independently. */
export function admitRamHistory(source:CompleteRamHistorySource | null):DomainResult<AdmittedRamHistory> {
  if (!source || source.origin !== 'native-ram' || typeof source.captureCompleteScope !== 'function') return invalid('SessionHistoryIncomplete','source');
  const scope = source.captureCompleteScope(), selection = createCurrentSelection(scope.current); if (!selection.ok) return selection;
  const registry = createVersionRegistry(scope.versions); if (!registry.ok) return registry;
  const copied = copyImmutableValue(scope.inventory,'inventory'); if (!copied.ok) return copied;
  if (!Array.isArray(copied.value)) return invalid('SessionHistoryIncomplete','inventory');
  const seen = new LocalVersionTable<true>(), identities = new LocalVersionTable<true>(), exactHistory = new LocalVersionTable<BusinessVersion>(); let seenCount = 0;
  for (const v of registry.value.versions) { exactHistory.set(referenceParts(v.ref),v); if (v.owner.type === 'Portfolio' && !businessEqual(v.owner.portfolioId,selection.value.manifest.portfolioId)) return invalid('FOREIGN_PORTFOLIO','history'); }
  for (const entry of copied.value) {
    const r = dataRecord(entry,'inventory'); if (!r.ok) return r;
    if (!hasKeys(r.value,['identity','owner','refs'])) return invalid('SessionHistoryIncomplete','inventory');
    const rawIdentity = dataRecord(field(r.value,'identity'),'identity'); if (!rawIdentity.ok) return rawIdentity;
    const kind = registry.value.versions.find(v => v.ref.kind === field(rawIdentity.value,'kind'))?.ref.kind;
    if (!kind) return invalid('SessionHistoryIncomplete','inventory.identity');
    const identity = createEntityIdentity(kind,rawIdentity.value); if (!identity.ok) return identity;
    const owner = createOwner(kind,field(r.value,'owner')); if (!owner.ok) return owner;
    if (identities.get([identity.value.kind,identity.value.entityId.family,identity.value.entityId.value])) return invalid('SessionHistoryIncomplete','inventory.duplicate'); identities.set([identity.value.kind,identity.value.entityId.family,identity.value.entityId.value],true);
    const refs = field(r.value,'refs'); if (!Array.isArray(refs) || !refs.length) return invalid('SessionHistoryIncomplete','inventory.refs');
    for (const input of refs) { const ref = validateExactReference(input); if (!ref.ok) return ref;
      if (!sameIdentity(ref.value,identity.value) || seen.get(referenceParts(ref.value))) return invalid('SessionHistoryIncomplete','inventory.refs');
      const v = exactHistory.get(referenceParts(ref.value)); if (!v || !businessEqual(v.owner,owner.value)) return invalid('SessionHistoryIncomplete','inventory.refs'); seen.set(referenceParts(ref.value),true); seenCount++;
    }
  }
  if (seenCount !== registry.value.versions.length) return invalid('SessionHistoryIncomplete','inventory');
  const reserve = copyImmutableValue(scope.reservations,'reservations'); if (!reserve.ok) return reserve;
  const rr = dataRecord(reserve.value,'reservations'); if (!rr.ok) return rr;
  if (!hasKeys(rr.value,['entityIds','versionIds','couples'])) return invalid('SessionHistoryIncomplete','reservations');
  const entityIds = new Set(registry.value.versions.map(v => v.ref.entityId.value)), versionIds = new Set(registry.value.versions.map(v => v.ref.versionId.value));
  for (const [key,family,values] of [['entityIds','EntityId',entityIds],['versionIds','VersionId',versionIds]] as const) { const list = field(rr.value,key); if (!Array.isArray(list)) return invalid('SessionHistoryIncomplete',`reservations.${key}`); for (const raw of list) { const id = validateId(family,raw); if (!id.ok) return id; values.add(id.value.value); } }
  const couples = field(rr.value,'couples'); if (!Array.isArray(couples)) return invalid('SessionHistoryIncomplete','reservations.couples');
  const ledger:Reservation[] = [];
  for (const input of couples) { const r = dataRecord(input,'reservations.couples'); if (!r.ok) return r;
    if (!hasKeys(r.value,['identity','owner','state'])) return invalid('IdentityReservationConflict','reservations.couples');
    const identityInput = dataRecord(field(r.value,'identity'),'identity'); if (!identityInput.ok) return identityInput;
    const rawKind = field(identityInput.value,'kind'); const kinds:readonly VersionKind[] = ['ActualSubPeriod','TeamActual','PTEC']; const kind = kinds.find(k => k === rawKind); if (!kind) return invalid('IdentityReservationConflict','reservations.kind');
    const identity = createEntityIdentity(kind,identityInput.value); if (!identity.ok) return identity;
    const owner = createOwner(kind,field(r.value,'owner')); if (!owner.ok) return owner;
    const state = field(r.value,'state'); if (state !== 'pending' && state !== 'burned' && state !== 'published') return invalid('IdentityReservationConflict','reservations.state');
    if (!entityIds.has(identity.value.entityId.value)) return invalid('SessionHistoryIncomplete','reservations.entityIds');
    const sameCouple = registry.value.versions.filter(v => (kind === 'ActualSubPeriod' ? sameIdentity(v.ref,identity.value) : v.ref.kind === kind && businessEqual(v.owner,owner.value)));
    if (sameCouple.some(v => !businessEqual(v.owner,owner.value))) return invalid('IdentityReservationConflict','reservations.owner');
    if (registry.value.versions.some(v => v.ref.entityId.value === identity.value.entityId.value && (!sameIdentity(v.ref,identity.value) || state !== 'published')) || sameCouple.some(v => !sameIdentity(v.ref,identity.value)) || ledger.some(l => l.entityId.value === identity.value.entityId.value || (kind !== 'ActualSubPeriod' && l.kind === kind && businessEqual(l.owner,owner.value))) || (state === 'published') !== (sameCouple.length > 0)) return invalid('IdentityReservationConflict','reservations.couples');
    ledger.push(Object.freeze({kind,owner:owner.value,entityId:identity.value.entityId,state}));
  }
  const selected = lookupExactBatch(registry.value,selectedReferences(selection.value.manifest)); if (!selected.result.ok) return selected.result;
  const graph = certifyPortfolioGraph({source:'current',manifest:selection.value.manifest,versions:selected.result.value}); if (!graph.ok) return graph;
  return success(Object.freeze({view:Object.freeze({selection:selection.value,registry:registry.value,graph:graph.value}),ledger:Object.freeze(ledger),entityIds:Object.freeze([...entityIds]),versionIds:Object.freeze([...versionIds]),[admissionBrand]:true as const}));
}
/** Prepared handles are minted here, kept by object identity, and never admitted by a caller cast. */
export function createTransitionSession(admission:AdmittedRamHistory, store:CurrentRamPort, allocation:TransitionAllocationPort, assembly:CandidateAssemblyPort = {assemble:assembleCandidateManifest}):TransitionSession {
  if (!Object.getOwnPropertySymbols(admission).includes(admissionBrand)) throw new Error('SessionHistoryIncomplete');
  if (!businessEqual(store.read().selection,admission.view.selection) || !businessEqual(store.read().registry,admission.view.registry) || !businessEqual(store.read().graph,admission.view.graph)) throw new Error('SessionHistoryIncomplete');
  store.bindTransitionSession();
  const pending = new Map<PreparedTransition,Dossier>(), entityIds = new Set(admission.entityIds), versionIds = new Set(admission.versionIds), preparationIds = new Set<string>();
  let ledger = [...admission.ledger], revision = 0n, active = false;
  const initialRevision = admission.view.selection.revision;
  function burn(d:Dossier,state:'burned'|'published') { ledger = ledger.map(r => d.identities.some(i => i.allocated.value === r.entityId.value) ? Object.freeze({...r,state}) : r); pending.delete(d.handle); }
  function rejected(stage:string, errors:readonly DomainError[]):PreparationResult { return Object.freeze({type:'Rejected',stage,errors}); }
  function diagnostics(code:string,path:string):readonly DomainError[] { const r=invalid(code,path); return r.ok ? [] : r.errors; }
  function execute(prepared:PreparedTransition,input:unknown):ExecutionResult {
    const d = pending.get(prepared);
    const fail = (type:'Rejected'|'CandidateCertificationFailure'|'InternalTransitionFailure',stage:string,errors:readonly DomainError[]):ExecutionResult => Object.freeze({type,stage,preparationId:d?.handle.preparationId ?? '',errors});
    if (!d) return fail('Rejected','handle',diagnostics('InvalidPreparation','prepared'));
    if (active) return fail('Rejected','exclusive',diagnostics('ConcurrentRamExecution','prepared'));
    active = true; let stage = 'stale'; let internalErrors:readonly DomainError[] | null = null;
    try { return store.exclusive(() => {
      // R13-E3-BEGIN: stale is first; no await or asynchronous capability in this pipeline.
      if (store.read().selection.revision !== d.base.selection.revision) { burn(d,'burned'); return Object.freeze({type:'Stale'}); }
      stage = 'answers'; const answer = dataRecord(input,'answers'); if (!answer.ok) return fail('Rejected',stage,answer.errors);
      if (!hasKeys(answer.value,['preparationId','preparation','answers']) || field(answer.value,'preparationId') !== prepared.preparationId || field(answer.value,'preparation') !== prepared) return fail('Rejected',stage,diagnostics('AnswerPreparationMismatch','answers'));
      // The handle is already immutable and runtime-bound by the private Map; only response data needs acquisition.
      const copied = copyImmutableValue(field(answer.value,'answers'),'answers.answers'); if (!copied.ok) return fail('Rejected',stage,copied.errors);
      // R13-E2-ANSWERS-BEGIN
      const resolved = resolveObligations(d.plan,copied.value);
      // R13-E2-ANSWERS-END
      if (!resolved.ok) return fail('Rejected',stage,resolved.errors);
      const plan = resolved.value;
      if (!plan.changes.length && businessEqual(plan.desired,d.base.graph.versions)) { burn(d,'burned'); return Object.freeze({type:'NoOp'}); }
      // R13-E4-BEGIN
      stage = 'materialization'; const identitiesForExecution = d.identities; const replacements:{readonly proposed:BusinessVersion; readonly ref:ExactReference<VersionKind>}[] = [];
      function required<T>(r:DomainResult<T>):T { if (!r.ok) { internalErrors=r.errors; throw new Error('InternalTransitionFailure'); } return r.value; }
      for (const change of plan.changes) {
        const id = required(validateId('VersionId',required(allocation.reserveVersion())));
        if (versionIds.has(id.value)) { internalErrors=diagnostics('VersionAllocationCollision','allocation.version'); throw new Error('VersionAllocationCollision'); } versionIds.add(id.value);
        const allocated = identitiesForExecution.find(i => i.template.value === change.proposed.ref.entityId.value)?.allocated ?? change.proposed.ref.entityId;
        replacements.push({proposed:change.proposed,ref:Object.freeze({kind:change.proposed.ref.kind,entityId:allocated,versionId:id})});
      }
      function bind(value:unknown, exact:boolean):unknown {
        if (value === null || typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(v => bind(v,exact));
        const r = required(dataRecord(value,'binding'));
        if (field(r,'family') === 'EntityId') { const allocated = identitiesForExecution.find(i => i.template.value === field(r,'value')); if (allocated) return allocated.allocated; }
        if (exact && field(r,'versionId') !== undefined && field(r,'entityId') !== undefined) { const ref = required(validateExactReference(r)); const next = replacements.find(v => sameIdentity(v.proposed.ref,ref)); if (next) return next.ref; }
        return Object.fromEntries(Object.entries(r).map(([k,v]) => [k,bind(v,exact)]));
      }
      const batch:BusinessVersion[] = [];
      for (const change of plan.changes) {
        const next = replacements.find(v => sameIdentity(v.proposed.ref,change.proposed.ref)); if (!next) throw new Error('MissingReplacement');
        batch.push(required(createBusinessVersion({ref:next.ref,owner:bind(change.proposed.owner,false),payload:bind(change.proposed.payload,true),provenance:change.proposed.provenance,...(change.base ? {predecessor:change.base.ref} : {})})));
      }
      // R13-E4-END
      // R13-E5-BEGIN
      // R13-E5-REGISTRY-BEGIN
      stage = 'registry'; const registry = required(withVersions(d.base.registry,batch));
      // R13-E5-REGISTRY-END
      // R13-E5-MANIFEST-BEGIN
      const selected = plan.desired.map(v => batch.find(b => b.ref.kind === v.ref.kind && b.ref.entityId.value === (d.identities.find(i => i.template.value === v.ref.entityId.value)?.allocated.value ?? v.ref.entityId.value)) ?? v);
      stage = 'manifest'; const manifest = required(createPortfolioManifest(assembly.assemble(d.base.selection.manifest,selected)));
      const selection = required(createCurrentSelection({manifest,revision:`${initialRevision}/r13/${++revision}`}));
      // R13-E5-MANIFEST-END
      // R13-E5-EXTRACTION-BEGIN
      stage = 'extraction'; const exact = required(lookupExactBatch(registry,selectedReferences(manifest)).result);
      // R13-E5-EXTRACTION-END
      // R13-E5-END
      // R13-E6-BEGIN
      stage = 'certification'; const certified = certifyPortfolioGraph({source:'current',manifest,versions:exact});
      // R13-E6-END
      if (!certified.ok) { burn(d,'burned'); return fail('CandidateCertificationFailure',stage,certified.errors); }
      // R13-E7-BEGIN
      stage = 'publication'; const view = Object.freeze({selection,registry,graph:certified.value});
      store.publish(view);
      burn(d,'published');
      // R13-E7-END
      return Object.freeze({type:'Applied',current:view,versionsCreated:Object.freeze(batch.map(v => v.ref))});
    }); } catch { burn(d,'burned'); return fail('InternalTransitionFailure',stage,internalErrors ?? diagnostics('InternalTransitionFailure',stage));
    } finally { active = false; }
  }
  return Object.freeze({
    prepare(command:unknown):PreparationResult {
      if (active) return rejected('exclusive',diagnostics('ConcurrentRamExecution','prepare'));
      const base = store.read();
      // R13-E2-PREPARE-BEGIN
      const analysed = analyseTransition(base.graph,base.registry.versions,command);
      // R13-E2-PREPARE-END
      if (!analysed.ok) return rejected('business',analysed.errors);
      const plan = analysed.value;
      if (!plan.changes.length && !plan.obligations.length && businessEqual(plan.desired,base.graph.versions)) return Object.freeze({type:'NoOp'});
      const preparation = allocation.reservePreparation(); if (!preparation.ok) return rejected('allocation',preparation.errors);
      if (!preparation.value.trim() || preparationIds.has(preparation.value)) return rejected('allocation',diagnostics('PreparationAllocationCollision','allocation.preparation')); preparationIds.add(preparation.value);
      const identities:{template:EntityId;allocated:EntityId}[] = [];
      for (const slot of plan.slots) {
        const owner = bindOwner(slot.owner,identities);
        if (slot.identity.kind !== 'ActualSubPeriod' && ledger.some(l => l.kind === slot.identity.kind && businessEqual(l.owner,owner))) return rejected('history',diagnostics('IdentityReservationConflict','allocation.couple'));
        const allocated = allocation.reserveEntity(slot.identity.kind,slot.owner); if (!allocated.ok) return rejected('allocation',allocated.errors);
        const id = validateId('EntityId',allocated.value); if (!id.ok) return rejected('allocation',id.errors);
        if (entityIds.has(id.value.value)) return rejected('allocation',diagnostics('IdentityReservationConflict','allocation.entity')); entityIds.add(id.value.value);
        ledger.push(Object.freeze({kind:slot.identity.kind,owner,entityId:id.value,state:'burned'})); identities.push({template:slot.identity.entityId,allocated:id.value});
      }
      // Runtime unforgeability comes from the private Map, independent of the TS brand.
      const handle = Object.freeze({preparationId:preparation.value,baseRevision:base.selection.revision,obligations:Object.freeze(plan.obligations.map(o => Object.freeze({...o,preparationId:preparation.value,context:bindPreparationContext(o.context,identities)}))),[preparedBrand]:true as const});
      const dossier = Object.freeze({handle,base,plan,identities:Object.freeze(identities.map(v => Object.freeze(v)))}); pending.set(handle,dossier);
      ledger = ledger.map(r => identities.some(i => i.allocated.value === r.entityId.value) ? Object.freeze({...r,state:'pending'}) : r);
      return Object.freeze({type:'Prepared',prepared:handle});
    },execute,
    abandon(prepared:PreparedTransition) { const d = pending.get(prepared); if (!d || active) return false; burn(d,'burned'); return true; },
    reservations() { const entities:EntityId[] = [], versions:VersionId[] = []; for (const value of entityIds) { const r=createId('EntityId',value); if(r.ok) entities.push(r.value); } for(const value of versionIds) { const r=createId('VersionId',value); if(r.ok) versions.push(r.value); } return Object.freeze({entityIds:Object.freeze(entities),versionIds:Object.freeze(versions),couples:Object.freeze(ledger.map(r => Object.freeze({identity:Object.freeze({kind:r.kind,entityId:r.entityId}),owner:r.owner,state:r.state})))}); }
  });
}
function bindOwner(owner:VersionOwner<VersionKind>, identities:readonly {template:EntityId;allocated:EntityId}[]):VersionOwner<VersionKind> {
  if (owner.type !== 'PTSubPeriod' && owner.type !== 'RTSubPeriod') return owner;
  const subPeriod = identities.find(i => i.template.value === owner.subPeriod.entityId.value)?.allocated;
  return subPeriod ? Object.freeze({...owner,subPeriod:Object.freeze({...owner.subPeriod,entityId:subPeriod})}) : owner;
}

function bindPreparationContext(value:unknown, identities:readonly {template:EntityId;allocated:EntityId}[]):unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return Object.freeze(value.map(v => bindPreparationContext(v,identities)));
  const r = dataRecord(value,'context'); if (!r.ok) throw new Error('InvalidPreparationContext');
  if (field(r.value,'family') === 'EntityId') return identities.find(i => i.template.value === field(r.value,'value'))?.allocated ?? value;
  const templateRef = field(r.value,'versionId');
  const vr = dataRecord(templateRef,'ref');
  const entity = dataRecord(field(r.value,'entityId'),'entityId');
  const removeTemplateVersion = entity.ok && identities.some(i => i.template.value === field(entity.value,'value')) && vr.ok && field(vr.value,'value') === 'r13-template-version';
  return Object.freeze(Object.fromEntries(Object.entries(r.value).filter(([k]) => !removeTemplateVersion || k !== 'versionId').map(([k,v]) => [k,bindPreparationContext(v,identities)])));
}
