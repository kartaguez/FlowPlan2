import type { CompleteRamHistorySource, CurrentRamPort, PublishedCurrent } from '../../application/ports/currentRamPort.js';
import type { CurrentAcquisitionBinding, OwnedCurrentCapture, RamScope } from '../../application/ports/currentAuthorityPort.js';
import type { CurrentSelection } from '../../domain/portfolio/manifest.js';
import type { ValidatedPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
import type { BusinessVersion } from '../../domain/portfolio/payloads.js';
import type { TransitionAllocationPort } from '../../application/ports/transitionAllocationPort.js';
import { copyImmutableValue } from '../../domain/versioning/immutableValue.js';
import { invalid, success, type DomainResult } from '../../domain/primitives/result.js';
import { createId, type PortfolioId } from '../../domain/primitives/identity.js';

/** Final owner primitive under construction in A.1–A.3; no session uses it until A.4. */
export function createCurrentAcquisitionCell(portfolioId: PortfolioId): Readonly<{
  binding: CurrentAcquisitionBinding;
  read(): OwnedCurrentCapture | null;
  isTokenCurrent(token: object): boolean;
}> {
  let root: (OwnedCurrentCapture & { readonly generation: object; readonly technicalRevision: bigint }) | null = null;
  let bound = false;
  let entered = false;
  const binding: CurrentAcquisitionBinding = Object.freeze({
    portfolioId,
    bindAcquirer() {
      if (bound) throw new Error('RamAcquirerAlreadyBound');
      bound = true;
      return (scope: RamScope, selection: CurrentSelection, graph: ValidatedPortfolioGraph, selected: readonly BusinessVersion[]): OwnedCurrentCapture => {
        if (entered) throw new Error('ConcurrentRamExecution');
        entered = true;
        try {
          const token = Object.freeze(Object.create(null)) as object;
          const next = Object.freeze({selection,graph,selected,scope,token,generation:Object.freeze(Object.create(null)) as object,technicalRevision:0n});
          root = next;
          return next;
        } finally { entered = false; }
      };
    }
  });
  return Object.freeze({binding,read:() => root,isTokenCurrent:(token: object) => root?.token === token});
}

export function createCurrentRamAdapter(initial: PublishedCurrent): CurrentRamPort {
  let current = initial, entered = false, bound = false;
  return Object.freeze({
    bindTransitionSession() { if (bound) throw new Error('RamSessionAlreadyBound'); bound = true; },
    read: () => current,
    exclusive<T>(operation: () => T): T { if (entered) throw new Error('ConcurrentRamExecution'); entered = true; try { return operation(); } finally { entered = false; } },
    publish(view: PublishedCurrent) { if (!entered) throw new Error('PublicationOutsideExclusive'); current = Object.freeze(view); }
  });
}
/** Composition explicitly owns the entire native dataset and expected closed inventory. */
export function createNativeRamHistorySource(current: unknown, versions: unknown, inventory: unknown, reservations: unknown): DomainResult<CompleteRamHistorySource> {
  const data = copyImmutableValue({current,versions,inventory,reservations},'nativeRam'); if (!data.ok) return data;
  // Capture each acquired component without accepting a deserialized completeness assertion.
  const entries = Object.entries(data.value ?? {});
  const get = (key: string) => entries.find(([name]) => name === key)?.at(1);
  const scope = Object.freeze({current:get('current'),versions:get('versions'),inventory:get('inventory'),reservations:get('reservations')});
  return success(Object.freeze({origin:'native-ram',captureCompleteScope:() => scope}));
}
export function createDeterministicTransitionAllocator(namespace: string): DomainResult<TransitionAllocationPort> {
  if (!namespace.trim()) return invalid('INVALID_ALLOCATION_NAMESPACE','namespace');
  let entity = 0n, version = 0n, preparation = 0n;
  return success(Object.freeze({
    reserveEntity: () => createId('EntityId',`${namespace}/e/${++entity}`),
    reserveVersion: () => createId('VersionId',`${namespace}/v/${++version}`),
    reservePreparation: () => success(`${namespace}/p/${++preparation}`)
  }));
}
