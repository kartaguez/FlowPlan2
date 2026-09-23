import {
  buildTimelineGeometry,
  buildTimelineViewModel,
  type TimelineGeometry,
  type TimelineGeometryViewport,
  type TimelineViewModel,
} from "../../adapters/index.js";
import {
  recomputePlanning,
  type PlanningSessionState,
} from "../../application/index.js";
import type { PlanningResult } from "../../domain/index.js";

export interface PlanningSessionProjection {
  readonly planningResult: PlanningResult;
  readonly viewModel: TimelineViewModel;
  readonly geometry: TimelineGeometry;
}

export interface BuildPlanningSessionProjectionInput {
  readonly state: PlanningSessionState;
  readonly geometryViewport: TimelineGeometryViewport;
}

export function buildPlanningSessionProjection(
  input: BuildPlanningSessionProjectionInput,
): PlanningSessionProjection {
  const { planningResult } = recomputePlanning(input.state);
  const viewModel = buildTimelineViewModel({
    ...input.state,
    planningResult,
  });
  const geometry = buildTimelineGeometry({
    viewModel,
    viewport: input.geometryViewport,
  });
  return Object.freeze({ planningResult, viewModel, geometry });
}
