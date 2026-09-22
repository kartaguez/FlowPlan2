import {
  buildTimelineGeometry,
  buildTimelineViewModel,
} from "../adapters/index.js";
import { recomputePlanning } from "../application/index.js";
import { renderApp } from "../ui/renderApp.js";
import { createTimelineCursorController } from "../ui/timeline/createTimelineCursorController.js";
import { createTimelineInteractionController } from "../ui/timeline/createTimelineInteractionController.js";
import { createTimelineViewportController } from "../ui/timeline/createTimelineViewportController.js";
import { renderPlanningDiagnostics } from "../ui/timeline/renderPlanningDiagnostics.js";
import { renderTimelineSvg } from "../ui/timeline/renderTimelineSvg.js";
import { createDemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("FlowPlan root element is missing");
}

const {
  svg,
  diagnostics,
  dateSummary,
  cursorControl,
  viewportControls,
  tooltip,
  selectionSummary,
} = renderApp(root);
const scenario = createDemoPlanningScenario();
const { planningResult } = recomputePlanning(scenario);
const viewModel = buildTimelineViewModel({
  ...scenario,
  planningResult,
});
const geometry = buildTimelineGeometry({
  viewModel,
  viewport: {
    width: 2160,
    teamLaneHeight: 100,
    timeAxisHeight: 56,
  },
});

renderTimelineSvg({ svg, geometry });
renderPlanningDiagnostics({ container: diagnostics, viewModel });
const viewportController = createTimelineViewportController({
  svg,
  geometry,
  controls: viewportControls,
});
createTimelineCursorController({
  svg,
  geometry,
  viewModel,
  summaryContainer: dateSummary,
  cursorControl,
  initialDate: scenario.horizon.start,
  getViewport: viewportController.getState,
});
createTimelineInteractionController({
  svg,
  geometry,
  viewModel,
  getViewport: viewportController.getState,
  tooltipContainer: tooltip,
  selectionSummaryContainer: selectionSummary,
  keyboardControl: cursorControl,
});
