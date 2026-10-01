import { compareCivilDates, createCivilDate, type CivilDate } from "../model/date.js";
import { compareRationals, rationalFromInteger } from "../model/rational.js";
import { rationalOf, type ConsumedWorkload, type RemainingWorkload, type TeamId } from "../model/scalars.js";
import { error, failure, success, type DomainError, type DomainResult } from "../model/result.js";

export interface ProjectActualsTeamEntry {
  readonly teamId: TeamId;
  readonly cumulativeConsumed: ConsumedWorkload;
  readonly remainingWorkload: RemainingWorkload;
}
export interface ReservationActualsTeamEntry {
  readonly teamId: TeamId;
  readonly cumulativeConsumed: ConsumedWorkload;
}
export interface ActualsRecord<Entry extends ReservationActualsTeamEntry> {
  readonly actualsThroughDate: CivilDate;
  readonly teams: readonly Entry[];
}
export interface ActualsChronology<Entry extends ReservationActualsTeamEntry> {
  readonly actualsFromDate: CivilDate;
  readonly records: readonly ActualsRecord<Entry>[];
}
export type ProjectActualsRecord = ActualsRecord<ProjectActualsTeamEntry>;
export type ReservationActualsRecord = ActualsRecord<ReservationActualsTeamEntry>;
export type ProjectActualsChronology = ActualsChronology<ProjectActualsTeamEntry>;
export type ReservationActualsChronology = ActualsChronology<ReservationActualsTeamEntry>;

function validateChronology<Entry extends ReservationActualsTeamEntry>(
  input: ActualsChronology<Entry>, project: boolean,
): DomainResult<ActualsChronology<Entry>> {
  const errors: DomainError[] = [];
  if (!createCivilDate(input.actualsFromDate).ok) errors.push(error("INVALID_ACTUALS_FROM_DATE", "actualsFromDate", "Invalid Actuals start date."));
  if (input.records.length === 0) errors.push(error("EMPTY_ACTUALS_CHRONOLOGY", "records", "Actuals chronology needs a first record."));
  const latest = new Map<TeamId, ReturnType<typeof rationalFromInteger>>();
  let previous: CivilDate | undefined;
  input.records.forEach((record, recordIndex) => {
    const path = `records[${recordIndex}]`;
    if (!createCivilDate(record.actualsThroughDate).ok) errors.push(error("INVALID_ACTUALS_THROUGH_DATE", `${path}.actualsThroughDate`, "Invalid Actuals through date."));
    if (recordIndex === 0 && compareCivilDates(record.actualsThroughDate, input.actualsFromDate) < 0) {
      errors.push(error("ACTUALS_FIRST_DATE_BEFORE_START", `${path}.actualsThroughDate`, "First through date must be on or after the Actuals start."));
    }
    if (previous !== undefined && compareCivilDates(record.actualsThroughDate, previous) <= 0) {
      errors.push(error("ACTUALS_DATE_NOT_INCREASING", `${path}.actualsThroughDate`, "Later through dates must strictly increase."));
    }
    previous = record.actualsThroughDate;
    const seen = new Set<TeamId>();
    record.teams.forEach((entry, teamIndex) => {
      const teamPath = `${path}.teams[${teamIndex}]`;
      if (seen.has(entry.teamId)) errors.push(error("DUPLICATE_ACTUALS_TEAM", `${teamPath}.teamId`, "Team appears twice in one Actuals record."));
      seen.add(entry.teamId);
      if (typeof entry.teamId !== "string" || !entry.teamId.trim()) errors.push(error("INVALID_ACTUALS_TEAM", `${teamPath}.teamId`, "Team ID must be nonempty."));
      const cumul = rationalOf(entry.cumulativeConsumed);
      if (compareRationals(cumul, rationalFromInteger(0n)) < 0) errors.push(error("NEGATIVE_CONSUMED_WORKLOAD", `${teamPath}.cumulativeConsumed`, "Consumed workload must be non-negative."));
      const prior = latest.get(entry.teamId);
      if (prior && compareRationals(cumul, prior) < 0) errors.push(error("ACTUALS_CUMULATIVE_DECREASE", `${teamPath}.cumulativeConsumed`, "Cumulative consumed workload cannot decrease."));
      latest.set(entry.teamId, cumul);
      if (project) {
        const raf = (entry as unknown as ProjectActualsTeamEntry).remainingWorkload;
        if (raf === undefined || compareRationals(rationalOf(raf), rationalFromInteger(0n)) < 0) {
          errors.push(error("INVALID_ACTUALS_RAF", `${teamPath}.remainingWorkload`, "Project Actuals need a non-negative RAF."));
        }
      }
    });
  });
  if (errors.length) return failure(errors);
  return success(Object.freeze({
    actualsFromDate: input.actualsFromDate,
    records: Object.freeze(input.records.map((record) => Object.freeze({
      actualsThroughDate: record.actualsThroughDate,
      teams: Object.freeze(record.teams.map((entry) => Object.freeze({ ...entry }))),
    }))),
  }));
}

export function createProjectActualsChronology(input: ProjectActualsChronology): DomainResult<ProjectActualsChronology> {
  return validateChronology(input, true);
}
export function createReservationActualsChronology(input: ReservationActualsChronology): DomainResult<ReservationActualsChronology> {
  return validateChronology(input, false);
}
