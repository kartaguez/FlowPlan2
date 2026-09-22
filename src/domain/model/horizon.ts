import { compareCivilDates, type CivilDate } from "./date.js";
import { error, failure, success, type DomainResult } from "./result.js";

export interface PlanningHorizon {
  readonly start: CivilDate;
  readonly end: CivilDate;
}

export function createPlanningHorizon(input: {
  readonly start: CivilDate;
  readonly end: CivilDate;
}): DomainResult<PlanningHorizon> {
  if (compareCivilDates(input.start, input.end) > 0) {
    return failure([
      error(
        "INVALID_PLANNING_HORIZON_INTERVAL",
        "end",
        "Planning horizon start must be before or equal to end.",
      ),
    ]);
  }
  return success(Object.freeze({ start: input.start, end: input.end }));
}
