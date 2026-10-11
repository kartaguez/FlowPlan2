import type { ExactReference, VersionKind } from '../primitives/exactReference.js';
import type { VersionOwner } from './owner.js';

interface Node<T> { readonly children: Map<string, Node<T>>; value?: T }
/** Temporary, operation-local component trie. Never retained in a public value. */
export class LocalVersionTable<T> {
  private readonly root: Node<T> = { children: new Map() };
  get(parts: readonly string[]): T | undefined {
    let node = this.root;
    for (const part of parts) {
      const child = node.children.get(part); if (child === undefined) return undefined;
      node = child;
    }
    return node.value;
  }
  set(parts: readonly string[], value: T): void {
    let node = this.root;
    for (const part of parts) {
      let child = node.children.get(part);
      if (child === undefined) { child = { children: new Map() }; node.children.set(part,child); }
      node = child;
    }
    node.value = value;
  }
}
export function identityParts(ref: ExactReference<VersionKind>): readonly string[] {
  return [ref.kind,ref.entityId.family,ref.entityId.value];
}
export function referenceParts(ref: ExactReference<VersionKind>): readonly string[] {
  return [...identityParts(ref),ref.versionId.family,ref.versionId.value];
}
/** Only validated owners enter here; all discriminants and ID families are retained.
 * Component equality is equivalent to structured owner equality, regardless of record key order.
 */
export function ownerParts(kind: VersionKind, owner: VersionOwner<VersionKind>): readonly string[] {
  const prefix = [kind,owner.type];
  switch (owner.type) {
    case 'Project': return [...prefix,owner.projectId.family,owner.projectId.value];
    case 'Reservation': return [...prefix,owner.reservationId.family,owner.reservationId.value];
    case 'Team': return [...prefix,owner.teamId.family,owner.teamId.value];
    case 'Portfolio': return [...prefix,owner.portfolioId.family,owner.portfolioId.value];
    case 'ProjectTeam': return [...prefix,owner.projectId.family,owner.projectId.value,owner.teamId.family,owner.teamId.value];
    case 'ReservationTeam': return [...prefix,owner.reservationId.family,owner.reservationId.value,owner.teamId.family,owner.teamId.value];
    case 'ActualPeriod': return [...prefix,owner.actualPeriod.kind,owner.actualPeriod.entityId.family,owner.actualPeriod.entityId.value];
    case 'PT': return [...prefix,owner.pt.kind,owner.pt.entityId.family,owner.pt.entityId.value];
    case 'PTSubPeriod': case 'RTSubPeriod': return [...prefix,owner.association.kind,owner.association.entityId.family,owner.association.entityId.value,
      owner.subPeriod.kind,owner.subPeriod.entityId.family,owner.subPeriod.entityId.value];
  }
}
