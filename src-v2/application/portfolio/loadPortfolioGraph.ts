import { invalid, type DomainResult } from '../../domain/primitives/result.js';
import { createVersionRegistry, lookupExactBatch, referenceLabel } from '../../domain/versioning/versionRegistry.js';
import { createCurrentSelection, createPortfolioSnapshot, createSnapshotId, selectedReferences, type PortfolioManifest } from '../../domain/portfolio/manifest.js';
import { certifyPortfolioGraph, type ValidatedPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
import type { ExactVersionsReader, CurrentSelectionReader, SnapshotReader } from '../ports/portfolioReadPort.js';
async function collect(manifest: PortfolioManifest, reader: ExactVersionsReader): Promise<DomainResult<unknown>> {
  const refs = selectedReferences(manifest);
  const response = await reader.readExactVersions(refs); if (!response.ok) return response;
  const registry = createVersionRegistry(response.value); if (!registry.ok) return registry;
  const batch = lookupExactBatch(registry.value,refs);
  if (!batch.result.ok) {
    const i = batch.failedIndex!;
    return invalid('READ_REFERENCE_MISMATCH',`readExactVersions.${i}`,`Expected ${referenceLabel(refs.at(i)!)}`);
  }
  if (registry.value.versions.length !== refs.length) return invalid('READ_REFERENCE_MISMATCH','readExactVersions','Unexpected unrequested version');
  return response;
}
export async function loadCurrentGraph(selectionReader: CurrentSelectionReader, versionsReader: ExactVersionsReader): Promise<DomainResult<ValidatedPortfolioGraph>> {
  const response = await selectionReader.readCurrentSelection(); if (!response.ok) return response;
  const selection = createCurrentSelection(response.value); if (!selection.ok) return selection;
  const versions = await collect(selection.value.manifest,versionsReader); if (!versions.ok) return versions;
  return certifyPortfolioGraph({source:'current',manifest:selection.value.manifest,versions:versions.value});
}
export async function loadSnapshotGraph(snapshotReader: SnapshotReader, versionsReader: ExactVersionsReader, snapshotId: unknown): Promise<DomainResult<ValidatedPortfolioGraph>> {
  const id = createSnapshotId(snapshotId); if (!id.ok) return id;
  const response = await snapshotReader.readSnapshot(id.value); if (!response.ok) return response;
  const snapshot = createPortfolioSnapshot(response.value); if (!snapshot.ok) return snapshot;
  if (snapshot.value.snapshotId.value !== id.value.value) return invalid('READ_SNAPSHOT_ID_MISMATCH','readSnapshot');
  const versions = await collect(snapshot.value.manifest,versionsReader); if (!versions.ok) return versions;
  return certifyPortfolioGraph({source:'snapshot',snapshot:snapshot.value,versions:versions.value});
}
