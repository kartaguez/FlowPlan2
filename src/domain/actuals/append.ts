import { createProject, type Project } from "../model/entities.js";
import { createReservation, type Reservation } from "../capacity/reservation.js";
import type { CivilDate } from "../model/date.js";
import { error, failure, type DomainResult } from "../model/result.js";
import type { ProjectActualsRecord, ReservationActualsRecord } from "./records.js";

function membershipMatches(expected: readonly string[], actual: readonly { readonly teamId: string }[]): boolean {
  return expected.length === actual.length &&
    expected.every((id) => actual.some((entry) => entry.teamId === id));
}

export function appendProjectActuals(
  project: Project,
  record: ProjectActualsRecord,
  actualsFromDate?: CivilDate,
): DomainResult<Project> {
  if (project.actuals ? actualsFromDate !== undefined : actualsFromDate === undefined) {
    return failure([error("INVALID_ACTUALS_FROM_DATE", "actualsFromDate", "First append needs an explicit start; later appends cannot replace it.")]);
  }
  if (!membershipMatches(project.requirements.map((r) => r.teamId), record.teams)) {
    return failure([error("ACTUALS_MEMBERSHIP_MISMATCH", "teams", "Record Teams must match current Project requirements.")]);
  }
  const byTeam = new Map(record.teams.map((entry) => [entry.teamId, entry]));
  return createProject({
    ...project,
    requirements: project.requirements.map((requirement) => Object.freeze({
      ...requirement,
      remainingWorkload: byTeam.get(requirement.teamId)!.remainingWorkload,
      rafAuthority: "latest-actuals" as const,
    })),
    actuals: {
      actualsFromDate: project.actuals?.actualsFromDate ?? actualsFromDate!,
      records: [...(project.actuals?.records ?? []), record],
    },
  });
}

export function appendReservationActuals(
  reservation: Reservation,
  record: ReservationActualsRecord,
  actualsFromDate?: CivilDate,
): DomainResult<Reservation> {
  if (reservation.actuals ? actualsFromDate !== undefined : actualsFromDate === undefined) {
    return failure([error("INVALID_ACTUALS_FROM_DATE", "actualsFromDate", "First append needs an explicit start; later appends cannot replace it.")]);
  }
  if (!membershipMatches(reservation.teamAllocations.map((a) => a.teamId), record.teams)) {
    return failure([error("ACTUALS_MEMBERSHIP_MISMATCH", "teams", "Record Teams must match current Reservation allocations.")]);
  }
  return createReservation({
    ...reservation,
    actuals: {
      actualsFromDate: reservation.actuals?.actualsFromDate ?? actualsFromDate!,
      records: [...(reservation.actuals?.records ?? []), record],
    },
  });
}
