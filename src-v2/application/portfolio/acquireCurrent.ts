import { invalid, success, type DomainResult } from '../../domain/primitives/result.js';
import { createCurrentSelection } from '../../domain/portfolio/manifest.js';
import { certifyPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
import type { ExactVersionsReader } from '../ports/portfolioReadPort.js';
import type { CurrentAcquisitionBinding, CurrentCapturePort, OwnedCurrentCapture } from '../ports/currentAuthorityPort.js';
import { collectExactSelected } from './loadPortfolioGraph.js';

/** The installer closure is private to this service; callers never supply a certificate. */
export function createCurrentAcquisitionService(binding: CurrentAcquisitionBinding) {
  const install = binding.bindAcquirer();
  let request = 0;
  return Object.freeze({
    async acquireCurrent(source: CurrentCapturePort, reader: ExactVersionsReader): Promise<DomainResult<OwnedCurrentCapture>> {
      const ticket = ++request;
      const captured = source.capture(); if (!captured.ok) return captured;
      const selection = createCurrentSelection(captured.value.current); if (!selection.ok) return selection;
      if (captured.value.scope.portfolioId.family !== 'PortfolioId' ||
          captured.value.scope.portfolioId.value !== selection.value.manifest.portfolioId.value ||
          captured.value.scope.portfolioId.value !== binding.portfolioId.value ||
          typeof captured.value.scope.owner !== 'object' || captured.value.scope.owner === null)
        return invalid('FOREIGN_PORTFOLIO','current.scope');
      const selected = await collectExactSelected(selection.value.manifest,reader); if (!selected.ok) return selected;
      if (ticket !== request || !source.isCurrent(captured.value.marker)) return invalid('StaleCurrentCapture','current');
      const graph = certifyPortfolioGraph({source:'current',manifest:selection.value.manifest,versions:selected.value});
      if (!graph.ok) return graph;
      if (ticket !== request || !source.isCurrent(captured.value.marker) || ticket !== request) return invalid('StaleCurrentCapture','current');
      return success(install(captured.value.scope,selection.value,graph.value,graph.value.versions));
    }
  });
}
