import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord, field, hasKeys } from '../primitives/data.js';
import type { PortfolioGraph } from './graphResolver.js';
import { validatePortfolioGraph, validateSnapshotGraph } from './graphValidation.js';
declare const validatedGraphBrand: unique symbol;
export type ValidatedPortfolioGraph = PortfolioGraph & { readonly [validatedGraphBrand]: true };
/** Unique construction path; unknown and deserialized values always revalidate. */
export function certifyPortfolioGraph(input: unknown): DomainResult<ValidatedPortfolioGraph> {
  const r = dataRecord(input,'certification'); if (!r.ok) return r;
  const source = field(r.value,'source');
  if (source !== 'current' && source !== 'snapshot') return invalid('INVALID_GRAPH_SOURCE','certification.source');
  if (!hasKeys(r.value,['source','versions',source === 'current' ? 'manifest' : 'snapshot'])) return invalid('INVALID_CERTIFICATION_KEYS','certification');
  const graph = source === 'snapshot' ? validateSnapshotGraph(field(r.value,'snapshot'),field(r.value,'versions')) : validatePortfolioGraph(field(r.value,'manifest'),field(r.value,'versions'));
  return graph.ok ? success(graph.value as ValidatedPortfolioGraph) : graph;
}
