import type { CurrentSelection } from '../../domain/portfolio/manifest.js';
import type { VersionRegistry } from '../../domain/versioning/versionRegistry.js';
import type { ValidatedPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
export interface PublishedCurrent { readonly selection: CurrentSelection; readonly registry: VersionRegistry; readonly graph: ValidatedPortfolioGraph }
/** Trusted synchronous RAM capability. Exclusive rejects reentrancy, including through another service. */
export interface CurrentRamPort {
  bindTransitionSession(): void;
  read(): PublishedCurrent;
  exclusive<T>(operation: () => T): T;
  publish(view: PublishedCurrent): void;
}
/** Completeness is a composition/source contract, never inferred from a certificate or an unknown flag. */
export interface CompleteRamHistorySource {
  readonly origin: 'native-ram';
  captureCompleteScope(): { readonly current: unknown; readonly versions: unknown; readonly inventory: unknown; readonly reservations: unknown };
}
