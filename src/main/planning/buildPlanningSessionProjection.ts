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
import type { PlanningHorizon, PlanningResult, Portfolio } from "../../domain/index.js";
import { createPlanningHorizon } from "../../domain/index.js";

export interface PlanningSessionProjection {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
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
  const horizonResult = createPlanningHorizon({
    start: input.state.planning.startDate,
    end: input.state.planning.endDate,
  });
  if (!horizonResult.ok) {
    throw new TypeError("Planning session contains an invalid horizon.");
  }
  const planningInput = Object.freeze({
    portfolio: input.state.portfolio,
    horizon: horizonResult.value,
    workingPattern: input.state.planning.workingPattern,
    maxParallelProjects: input.state.planning.maxParallelProjects,
  });
  const { planningResult } = recomputePlanning(planningInput);
  const viewModel = buildTimelineViewModel({
    portfolio: input.state.portfolio,
    horizon: horizonResult.value,
    planningResult,
    workingPattern: input.state.planning.workingPattern,
  });
  const geometry = buildTimelineGeometry({
    viewModel,
    viewport: input.geometryViewport,
  });
  return Object.freeze({
    portfolio: planningInput.portfolio,
    horizon: planningInput.horizon,
    planningResult,
    viewModel,
    geometry,
  });
}
