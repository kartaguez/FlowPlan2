import {
  serializeQuantity,
  type CivilDate,
  type IsoWeekday,
  type TeamId,
} from "../../domain/index.js";
import type { PlanningSessionState } from "./planningSession.js";
import {
  formatPercentageForEditing,
  formatQuantityForEditing,
} from "./editableQuantity.js";

export interface TeamEditViewModel {
  readonly teamId: TeamId;
  readonly label: string;
  readonly maxParallelProjects: number;
  readonly workingWeekdays: readonly IsoWeekday[];
  readonly capacityPeriods: readonly TeamCapacityPeriodEditViewModel[];
}

export interface TeamCapacityPeriodEditViewModel {
  /** Position is the temporary Phase 7C identity of an existing period. */
  readonly index: number;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly capacity: string;
  readonly capacityExact: string;
  readonly unavailabilityPercent: string;
  readonly unavailabilityExact: string;
}

export function buildTeamEditViewModel(
  state: PlanningSessionState,
  teamId: TeamId,
): TeamEditViewModel | undefined {
  const team = state.portfolio.teams.find((candidate) => candidate.id === teamId);
  if (team === undefined) return undefined;
  return Object.freeze({
    teamId: team.id,
    label: team.name,
    maxParallelProjects: team.maxParallelProjects,
    workingWeekdays: Object.freeze([
      ...team.capacitySchedule.workingPattern.workingWeekdays,
    ]),
    capacityPeriods: Object.freeze(
      team.capacitySchedule.periods.map((period, index) =>
        Object.freeze({
          index,
          startDate: period.start,
          endDate: period.end,
          capacity: formatQuantityForEditing(period.dailyCapacity),
          capacityExact: serializeQuantity(period.dailyCapacity),
          unavailabilityPercent: formatPercentageForEditing(
            period.unavailabilityRatio === undefined
              ? "0/1"
              : serializeQuantity(period.unavailabilityRatio),
          ),
          unavailabilityExact:
            period.unavailabilityRatio === undefined
              ? "0/1"
              : serializeQuantity(period.unavailabilityRatio),
        }),
      ),
    ),
  });
}
