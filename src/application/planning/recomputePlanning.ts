import {
  planPortfolio,
  type PlanningHorizon,
  type PlanningResult,
  type Portfolio,
} from "../../domain/index.js";

export interface RecomputePlanningRequest {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
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
    }),
  };
}
