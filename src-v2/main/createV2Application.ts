import { createEmptyPortfolioShellState } from "../bootstrap/emptyPortfolioShellState.js";
import { assertV2Origin } from "../environment/browserIsolation.js";
import { renderV2Shell } from "../ui/renderV2Shell.js";

export function createV2Application(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) throw new Error("FlowPlan2 V2 browser window is missing.");
  assertV2Origin(view.location.origin);
  const state = createEmptyPortfolioShellState();
  const destroy = renderV2Shell(root, state);
  return Object.freeze({ state, destroy });
}
