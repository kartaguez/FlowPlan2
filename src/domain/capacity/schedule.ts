import { compareCivilDates, isoWeekday, type CivilDate } from "../model/date.js";
import type {
  Capacity,
  UnavailabilityRatio,
} from "../model/scalars.js";
import {
  error,
  failure,
  success,
  type DomainError,
  type DomainResult,
} from "../model/result.js";

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WorkingPattern {
  readonly workingWeekdays: readonly IsoWeekday[];
}

export interface CapacityPeriod {
  readonly start: CivilDate;
  readonly end: CivilDate;
  readonly dailyCapacity: Capacity;
  readonly unavailabilityRatio?: UnavailabilityRatio;
}

export interface CapacityException {
  readonly date: CivilDate;
  readonly capacity: Capacity;
}

export interface TeamCapacitySchedule {
  readonly periods: readonly CapacityPeriod[];
  readonly exceptions: readonly CapacityException[];
}

export function createWorkingPattern(input: {
  readonly workingWeekdays: readonly number[];
}): DomainResult<WorkingPattern> {
  const errors: DomainError[] = [];
  const seen = new Set<number>();
  input.workingWeekdays.forEach((weekday, index) => {
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      errors.push(
        error(
          "INVALID_ISO_WEEKDAY",
          `workingWeekdays[${index}]`,
          "Working weekday must be an ISO weekday from 1 to 7.",
        ),
      );
    } else if (seen.has(weekday)) {
      errors.push(
        error(
          "DUPLICATE_WORKING_WEEKDAY",
          `workingWeekdays[${index}]`,
          "Working weekday must appear at most once.",
        ),
      );
    }
    seen.add(weekday);
  });
  if (errors.length > 0) return failure(errors);

  return success(
    Object.freeze({
      workingWeekdays: Object.freeze([
        ...input.workingWeekdays,
      ]) as readonly IsoWeekday[],
    }),
  );
}

export function createCapacityPeriod(input: {
  readonly start: CivilDate;
  readonly end: CivilDate;
  readonly dailyCapacity: Capacity;
  readonly unavailabilityRatio?: UnavailabilityRatio;
}): DomainResult<CapacityPeriod> {
  if (compareCivilDates(input.start, input.end) > 0) {
    return failure([
      error(
        "INVALID_CAPACITY_PERIOD_INTERVAL",
        "end",
        "Capacity period start must be before or equal to end.",
      ),
    ]);
  }
  return success(Object.freeze({ ...input }));
}

export function createCapacityException(input: {
  readonly date: CivilDate;
  readonly capacity: Capacity;
}): DomainResult<CapacityException> {
  return success(Object.freeze({ ...input }));
}

export function createTeamCapacitySchedule(input: {
  readonly periods: readonly CapacityPeriod[];
  readonly exceptions: readonly CapacityException[];
}): DomainResult<TeamCapacitySchedule> {
  const periods = [...input.periods].sort((left, right) => {
    const startComparison = compareCivilDates(left.start, right.start);
    return startComparison !== 0
      ? startComparison
      : compareCivilDates(left.end, right.end);
  });
  const exceptions = [...input.exceptions].sort((left, right) =>
    compareCivilDates(left.date, right.date),
  );
  const errors: DomainError[] = [];

  for (let index = 1; index < periods.length; index += 1) {
    const previous = periods[index - 1];
    const current = periods[index];
    if (
      previous &&
      current &&
      compareCivilDates(previous.end, current.start) >= 0
    ) {
      errors.push(
        error(
          "OVERLAPPING_CAPACITY_PERIODS",
          `periods[${index}]`,
          "Capacity periods must not overlap.",
        ),
      );
    }
  }

  for (let index = 1; index < exceptions.length; index += 1) {
    if (exceptions[index - 1]?.date === exceptions[index]?.date) {
      errors.push(
        error(
          "DUPLICATE_CAPACITY_EXCEPTION_DATE",
          `exceptions[${index}]`,
          "Only one capacity exception is allowed per date.",
        ),
      );
    }
  }
  if (errors.length > 0) return failure(errors);

  return success(
    Object.freeze({
      periods: Object.freeze(periods),
      exceptions: Object.freeze(exceptions),
    }),
  );
}

export function isWorkingDay(
  pattern: WorkingPattern,
  date: CivilDate,
): boolean {
  return pattern.workingWeekdays.includes(isoWeekday(date));
}
