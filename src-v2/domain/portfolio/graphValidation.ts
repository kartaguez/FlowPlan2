import { invalid, success, type DomainResult } from '../primitives/result.js';
import { civilDayDifference } from '../primitives/civilDate.js';
import { sameIdentity, sameReference, type ExactReference, type VersionKind } from '../primitives/exactReference.js';
import { equalImmutableValues, type ImmutableValue } from '../versioning/immutableValue.js';
import { catalogNameKey } from './payloadValidation.js';
import { resolvePortfolioManifest, type PortfolioGraph } from './graphResolver.js';
import { createPortfolioSnapshot } from './manifest.js';
import type { BusinessVersion } from './payloads.js';
function ofKind<K extends VersionKind>(graph: PortfolioGraph, kind: K): readonly BusinessVersion<K>[] {
  // The business factory validates the correlated kind/owner/payload union.
  return graph.versions.filter(v => v.ref.kind === kind) as BusinessVersion<K>[];
}
function equal(a: unknown, b: unknown): boolean { return equalImmutableValues(a as ImmutableValue,b as ImmutableValue); }
function validateResolved(graph: PortfolioGraph): DomainResult<PortfolioGraph> {
  const projects = ofKind(graph,'ProjectSettings'), reservations = ofKind(graph,'ReservationSettings'), teams = ofKind(graph,'TeamSettings');
  const capacities = ofKind(graph,'TeamCapacity'), aps = ofKind(graph,'ActualPeriod'), subs = ofKind(graph,'ActualSubPeriod');
  const pts = ofKind(graph,'PT'), rts = ofKind(graph,'RT'), actuals = ofKind(graph,'TeamActual'), ptecs = ofKind(graph,'PTEC');
  const portfolio = graph.manifest.portfolioId;
  for (const version of graph.versions) {
    if (version.owner.type === 'Portfolio' && !equal(version.owner.portfolioId,portfolio)) return invalid('FOREIGN_PORTFOLIO',`versions.${version.ref.kind}`);
  }
  for (const team of teams) if (capacities.filter(c => equal(c.owner.teamId,team.owner.teamId)).length !== 1) return invalid('TEAM_CAPACITY_REQUIRED','teamCapacities');
  for (const capacity of capacities) if (!teams.some(t => equal(t.owner.teamId,capacity.owner.teamId))) return invalid('FOREIGN_CAPACITY_OWNER','teamCapacities');
  for (const owner of [...projects,...reservations]) {
    if (aps.filter(ap => equal(ap.owner,owner.owner)).length !== 1) return invalid('ACTUAL_PERIOD_REQUIRED','actualPeriods');
    for (const [kind,ref] of [['Program',owner.payload.program],['Pas',owner.payload.pas]] as const) {
      if (ref === null) continue;
      const catalog = ofKind(graph,kind).find(v => sameIdentity(v.ref,ref));
      if (catalog === undefined) return invalid('MISSING_CATALOG_REFERENCE',`${owner.ref.kind}.${kind}`);
      if (owner.payload.lifecycle === 'existing' && catalog.payload.lifecycle === 'deleted') return invalid('DELETED_CATALOG_REFERENCE',`${owner.ref.kind}.${kind}`);
    }
  }
  for (const kind of ['Program','Pas'] as const) {
    const keys = ofKind(graph,kind).filter(v => v.payload.lifecycle === 'existing').map(v => catalogNameKey(v.payload.name));
    if (new Set(keys).size !== keys.length) return invalid('DUPLICATE_CATALOG_NAME',kind);
  }
  for (const pt of pts) {
    const project = projects.find(p => equal(p.owner.projectId,pt.owner.projectId));
    const team = teams.find(t => equal(t.owner.teamId,pt.owner.teamId));
    if (!project || !team) return invalid('MISSING_ASSOCIATION_ENDPOINT','pts');
    if (pt.payload.lifecycle === 'existing' && (project.payload.lifecycle !== 'existing' || team.payload.lifecycle !== 'existing')) return invalid('DELETED_ASSOCIATION_ENDPOINT','pts');
    const selected = ptecs.filter(p => sameIdentity(p.owner.pt,pt.ref));
    if (selected.length !== (pt.payload.lifecycle === 'existing' ? 1 : 0)) return invalid('PTEC_SELECTION_MISMATCH','ptecs');
    for (const ptec of selected) {
      const ap = aps.find(a => equal(a.owner,project.owner));
      if (!ap || !sameIdentity(ap.ref,ptec.payload.actualPeriod)) return invalid('PTEC_AP_OWNER_MISMATCH','ptecs');
      if (ptec.payload.lastActualsDate !== ap.payload.through) return invalid('PTEC_ACTUALS_BOUNDARY_MISMATCH','ptecs');
    }
  }
  for (const rt of rts) {
    const reservation = reservations.find(r => equal(r.owner.reservationId,rt.owner.reservationId));
    const team = teams.find(t => equal(t.owner.teamId,rt.owner.teamId));
    if (!reservation || !team) return invalid('MISSING_ASSOCIATION_ENDPOINT','rts');
    if (rt.payload.lifecycle === 'existing' && (reservation.payload.lifecycle !== 'existing' || team.payload.lifecycle !== 'existing')) return invalid('DELETED_ASSOCIATION_ENDPOINT','rts');
  }
  for (const ptec of ptecs) if (!pts.some(pt => sameIdentity(pt.ref,ptec.owner.pt))) return invalid('FOREIGN_PTEC_OWNER','ptecs');
  const expectedCells: { readonly association: BusinessVersion<'PT' | 'RT'>; readonly sub: BusinessVersion<'ActualSubPeriod'> }[] = [];
  const partitionRefs: ExactReference<'ActualSubPeriod'>[] = [];
  for (const ap of aps) {
    const root = ap.owner.type === 'Project' ? projects.find(p => equal(p.owner,ap.owner)) : reservations.find(r => equal(r.owner,ap.owner));
    if (!root) return invalid('FOREIGN_AP_OWNER','actualPeriods');
    if (root.ref.kind === 'ProjectSettings') {
      const project = projects.find(p => sameIdentity(p.ref,root.ref));
      if (project && project.payload.earliestStartDate !== null && ap.payload.from !== null && ap.payload.from < project.payload.earliestStartDate) return invalid('AP_BEFORE_EARLIEST','actualPeriods');
    }
    const partition: BusinessVersion<'ActualSubPeriod'>[] = [];
    for (const ref of ap.payload.subPeriods) {
      const sub = subs.find(s => sameReference(s.ref,ref));
      if (!sub) return invalid('MISSING_PARTITION_REFERENCE','actualSubPeriods');
      if (!sameIdentity(sub.owner.actualPeriod,ap.ref)) return invalid('SUBPERIOD_AP_OWNER_MISMATCH','actualSubPeriods');
      partition.push(sub); partitionRefs.push(ref);
    }
    if (ap.payload.coverage === 'covered') {
      const first = partition.at(0), last = partition.at(-1);
      if (!first || !last || first.payload.from !== ap.payload.from || last.payload.through !== ap.payload.through) return invalid('PARTITION_BOUNDARY_MISMATCH','actualPeriods');
      let previous: BusinessVersion<'ActualSubPeriod'> | undefined;
      for (const sub of partition) {
        if (previous) { const gap = civilDayDifference(sub.payload.from,previous.payload.through); if (!gap.ok) return gap;
          if (gap.value !== 1) return invalid('NON_CONTIGUOUS_PARTITION','actualSubPeriods'); }
        previous = sub;
      }
    }
    const associations = ap.owner.type === 'Project' ? pts.filter(pt => ap.owner.type === 'Project' && equal(pt.owner.projectId,ap.owner.projectId)) : rts.filter(rt => ap.owner.type === 'Reservation' && equal(rt.owner.reservationId,ap.owner.reservationId));
    for (const association of associations) if (association.payload.lifecycle === 'existing') for (const sub of partition) expectedCells.push({association,sub});
  }
  if (partitionRefs.length !== subs.length || subs.some(sub => !partitionRefs.some(ref => sameReference(sub.ref,ref)))) return invalid('EXTRA_SUBPERIOD','actualSubPeriods');
  if (actuals.length !== expectedCells.length || expectedCells.some(cell => actuals.filter(ta => sameIdentity(ta.owner.association,cell.association.ref) && sameIdentity(ta.owner.subPeriod,cell.sub.ref)).length !== 1)) return invalid('INCOMPLETE_OR_FOREIGN_ACTUAL_GRID','teamActuals');
  const order = ofKind(graph,'PortfolioOrder').at(0);
  if (!order || order.payload.projectIds.length !== projects.length || projects.some(p => !order.payload.projectIds.some(id => equal(id,p.owner.projectId)))) return invalid('INCOMPLETE_PORTFOLIO_ORDER','portfolioOrder');
  return success(graph);
}
/** Unknown data is resolved and validated anew; no trusted graph/cast entry point. */
export function validatePortfolioGraph(manifest: unknown, supplied: unknown): DomainResult<PortfolioGraph> {
  const resolved = resolvePortfolioManifest(manifest,supplied); return resolved.ok ? validateResolved(resolved.value) : resolved;
}
export function validateSnapshotGraph(snapshot: unknown, supplied: unknown): DomainResult<PortfolioGraph> {
  const checked = createPortfolioSnapshot(snapshot); if (!checked.ok) return checked;
  const graph = validatePortfolioGraph(checked.value.manifest,supplied); if (!graph.ok) return graph;
  for (const ap of ofKind(graph.value,'ActualPeriod')) if (ap.payload.through !== null && ap.payload.through > checked.value.knowledgeDate) return invalid('SNAPSHOT_BEFORE_ACTUALS','snapshot.knowledgeDate');
  return graph;
}
