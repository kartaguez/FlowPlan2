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
import type { PlanningHorizon, PlanningResult, Portfolio, WorkingPattern, ActualsReconstruction } from "../../domain/index.js";
import { projectActualsKnowledgeFromPortfolio, actualOccupationFromReconstruction, createPlanningHorizon, reconstructActuals } from "../../domain/index.js";

export interface PlanningSessionProjection {
  readonly portfolio: Portfolio;
  readonly workingPattern: WorkingPattern;
  readonly horizon: PlanningHorizon;
  readonly planningResult: PlanningResult;
  readonly actualsReconstruction: ActualsReconstruction;
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
  const actualsReconstruction = reconstructActuals(input.state.portfolio, input.state.planning.workingPattern);
  const planningInput = Object.freeze({
    portfolio: input.state.portfolio,
    horizon: horizonResult.value,
    workingPattern: input.state.planning.workingPattern,
    maxParallelProjects: input.state.planning.maxParallelProjects,
    projectActualsKnowledge: projectActualsKnowledgeFromPortfolio(input.state.portfolio),
    actualOccupation: actualOccupationFromReconstruction(actualsReconstruction),
  });
  const { planningResult } = recomputePlanning(planningInput);
  const viewModel = buildTimelineViewModel({
    portfolio: input.state.portfolio,
    horizon: horizonResult.value,
    planningResult,
    workingPattern: input.state.planning.workingPattern,
    actualsContributions: actualsReconstruction.contributions,
  });
  const geometry = buildTimelineGeometry({
    viewModel,
    viewport: input.geometryViewport,
  });
  return Object.freeze({
    portfolio: planningInput.portfolio,
    workingPattern: planningInput.workingPattern,
    horizon: planningInput.horizon,
    planningResult,
    actualsReconstruction,
    viewModel,
    geometry,
  });
}
