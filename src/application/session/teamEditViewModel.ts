import {
  serializeQuantity,
  type CivilDate,
  type IsoWeekday,
  type TeamId,
} from "../../domain/index.js";
import type { PlanningSessionState } from "./planningSession.js";

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
  readonly unavailabilityPercent: string;
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
          capacity: serializeQuantity(period.dailyCapacity),
          unavailabilityPercent: ratioToPercent(
            period.unavailabilityRatio === undefined
              ? "0/1"
              : serializeQuantity(period.unavailabilityRatio),
          ),
        }),
      ),
    ),
  });
}

function ratioToPercent(serializedRatio: string): string {
  const [numerator, denominator] = serializedRatio.split("/");
  if (numerator === undefined || denominator === undefined) {
    throw new TypeError("Canonical ratio serialization is invalid.");
  }
  const percentNumerator = BigInt(numerator) * 100n;
  const percentDenominator = BigInt(denominator);
  const divisor = greatestCommonDivisor(percentNumerator, percentDenominator);
  const reducedNumerator = percentNumerator / divisor;
  const reducedDenominator = percentDenominator / divisor;
  return reducedDenominator === 1n
    ? String(reducedNumerator)
    : `${reducedNumerator}/${reducedDenominator}`;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === 0n ? 1n : a;
}
