import {
  planPortfolio,
  type PlanningHorizon,
  type PlanningResult,
  type Portfolio,
  type MaxParallelProjects,
  type WorkingPattern,
  type ActualOccupationDay,
  type ProjectActualsKnowledge,
} from "../../domain/index.js";

export interface RecomputePlanningRequest {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
  readonly workingPattern: WorkingPattern;
  readonly maxParallelProjects: MaxParallelProjects;
  readonly projectActualsKnowledge: readonly ProjectActualsKnowledge[];
  readonly actualOccupation: readonly ActualOccupationDay[];
}

export interface RecomputePlanningResponse {
  readonly planningResult: PlanningResult;
}

export function recomputePlanning(
  request: RecomputePlanningRequest,
): RecomputePlanningResponse {
  return {
    planningResult: planPortfolio({
      portfolio: request.portfolio,
      horizon: request.horizon,
      workingPattern: request.workingPattern,
      maxParallelProjects: request.maxParallelProjects,
      projectActualsKnowledge: request.projectActualsKnowledge,
      actualOccupation: request.actualOccupation,
    }),
  };
}
