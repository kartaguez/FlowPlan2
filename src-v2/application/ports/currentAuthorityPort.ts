import type { DomainResult } from '../../domain/primitives/result.js';
import type { CurrentSelection } from '../../domain/portfolio/manifest.js';
import type { ValidatedPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
import type { BusinessVersion } from '../../domain/portfolio/payloads.js';
import type { PortfolioId } from '../../domain/primitives/identity.js';

export interface RamScope {
  readonly portfolioId: PortfolioId;
  readonly owner: object;
}

/** A coherent unknown Current capture. The marker is checked after asynchronous exact reads. */
export interface UnknownCurrentCapture {
  readonly current: unknown;
  readonly marker: object;
  readonly scope: RamScope;
}
export interface CurrentCapturePort {
  capture(): DomainResult<UnknownCurrentCapture>;
  isCurrent(marker: object): boolean;
}

/** This binding is consumed once by the Application acquisition service. */
export interface CurrentAcquisitionBinding {
  readonly portfolioId: PortfolioId;
  bindAcquirer(): (scope: RamScope, selection: CurrentSelection, graph: ValidatedPortfolioGraph,
    selected: readonly BusinessVersion[]) => OwnedCurrentCapture;
}

/** A token is an identity capability, never reconstructed from the business revision. */
export interface OwnedCurrentCapture {
  readonly selection: CurrentSelection;
  readonly graph: ValidatedPortfolioGraph;
  readonly selected: readonly BusinessVersion[];
  readonly token: object;
  readonly scope: RamScope;
}
