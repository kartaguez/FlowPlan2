import {
  buildTimelineGeometry,
  buildTimelineViewModel,
} from "../adapters/index.js";
import { recomputePlanning } from "../application/index.js";
import { renderApp } from "../ui/renderApp.js";
import { createTimelineCursorController } from "../ui/timeline/createTimelineCursorController.js";
import { renderPlanningDiagnostics } from "../ui/timeline/renderPlanningDiagnostics.js";
import { renderTimelineSvg } from "../ui/timeline/renderTimelineSvg.js";
import { createDemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("FlowPlan root element is missing");
}

const { svg, diagnostics, dateSummary, cursorControl } = renderApp(root);
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
createTimelineCursorController({
  svg,
  geometry,
  viewModel,
  summaryContainer: dateSummary,
  cursorControl,
  initialDate: scenario.horizon.start,
});
