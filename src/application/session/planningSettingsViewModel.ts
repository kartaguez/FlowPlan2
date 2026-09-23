import type { CivilDate, IsoWeekday } from "../../domain/index.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface PlanningSettingsViewModel {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly workingWeekdays: readonly IsoWeekday[];
  readonly maxParallelProjects: number;
}

export function buildPlanningSettingsViewModel(
  state: PlanningSessionState,
): PlanningSettingsViewModel {
  return Object.freeze({
    startDate: state.planning.startDate,
    endDate: state.planning.endDate,
    workingWeekdays: Object.freeze([
      ...state.planning.workingPattern.workingWeekdays,
    ]),
    maxParallelProjects: state.planning.maxParallelProjects,
  });
}
