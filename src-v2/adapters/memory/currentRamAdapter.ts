import type { CompleteRamHistorySource, CurrentRamPort, PublishedCurrent } from '../../application/ports/currentRamPort.js';
import type { TransitionAllocationPort } from '../../application/ports/transitionAllocationPort.js';
import { copyImmutableValue } from '../../domain/versioning/immutableValue.js';
import { invalid, success, type DomainResult } from '../../domain/primitives/result.js';
import { createId } from '../../domain/primitives/identity.js';

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
