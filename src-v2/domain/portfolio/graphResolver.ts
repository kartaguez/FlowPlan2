import { failure, success, type DomainResult } from '../primitives/result.js';
import { type ProjectId, type ReservationId, type TeamId } from '../primitives/identity.js';
import { createVersionRegistry, lookupExactBatch, type VersionRegistry } from '../versioning/versionRegistry.js';
import { createPortfolioManifest, selectedReferences, type PortfolioManifest } from './manifest.js';
import type { BusinessVersion } from './payloads.js';
export interface PortfolioGraph {
  readonly manifest: PortfolioManifest; readonly versions: readonly BusinessVersion[];
  readonly inventories: { readonly projects: readonly ProjectId[]; readonly reservations: readonly ReservationId[]; readonly teams: readonly TeamId[] };
  readonly context: VersionRegistry['context'];
}
export function resolvePortfolioManifest(input: unknown, supplied: unknown): DomainResult<PortfolioGraph> {
  const manifest = createPortfolioManifest(input); if (!manifest.ok) return manifest;
  const registry = createVersionRegistry(supplied); if (!registry.ok) return registry;
  const batch = lookupExactBatch(registry.value,selectedReferences(manifest.value));
  if (!batch.result.ok) return failure(batch.result.errors.map(e => ({...e,path:`manifest.references.${batch.failedIndex}`})));
  const versions = batch.result.value;
  const projects: ProjectId[] = [], reservations: ReservationId[] = [], teams: TeamId[] = [];
  for (const version of versions) {
    if (version.ref.kind === 'ProjectSettings' && version.owner.type === 'Project') projects.push(version.owner.projectId);
    if (version.ref.kind === 'ReservationSettings' && version.owner.type === 'Reservation') reservations.push(version.owner.reservationId);
    if (version.ref.kind === 'TeamSettings' && version.owner.type === 'Team') teams.push(version.owner.teamId);
  }
  return success(Object.freeze({manifest:manifest.value,versions:Object.freeze(versions),inventories:Object.freeze({projects:Object.freeze(projects),reservations:Object.freeze(reservations),teams:Object.freeze(teams)}),context:registry.value.context}));
}
