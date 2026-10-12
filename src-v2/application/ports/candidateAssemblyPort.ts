import type { BusinessVersion } from '../../domain/portfolio/payloads.js';
import type { PortfolioManifest } from '../../domain/portfolio/manifest.js';
/** Synchronous composition seam for testing assembly faults. Never certifies or publishes. */
export interface CandidateAssemblyPort { assemble(base: PortfolioManifest, selected: readonly BusinessVersion[]): unknown }
