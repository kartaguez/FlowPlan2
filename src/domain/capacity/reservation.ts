import { compareCivilDates, type CivilDate } from "../model/date.js";
import type { Capacity, ReservationId, ReservationRatio, TeamId } from "../model/scalars.js";
import { error, failure, success, type DomainResult } from "../model/result.js";

export type ReservationAmount =
  | Readonly<{ kind: "ratio"; ratio: ReservationRatio }>
  | Readonly<{ kind: "fixed-daily"; dailyCapacity: Capacity }>;

export interface ReservationTeamAllocation {
  readonly teamId: TeamId;
  readonly amount: ReservationAmount;
}

export interface Reservation {
  readonly id: ReservationId;
  readonly name: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly ReservationTeamAllocation[];
}

export function createReservationTeamAllocation(input: {
  readonly teamId: TeamId;
  readonly amount: ReservationAmount;
}): DomainResult<ReservationTeamAllocation> {
  return success(Object.freeze({ teamId: input.teamId, amount: Object.freeze({ ...input.amount }) }));
}

export function createReservation(input: {
  readonly id: ReservationId;
  readonly name: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly ReservationTeamAllocation[];
}): DomainResult<Reservation> {
  const errors = [];
  const name = input.name.trim();
  if (name.length === 0) {
    errors.push(error("EMPTY_RESERVATION_NAME", "name", "Reservation name must not be empty."));
  }
  if (compareCivilDates(input.startDate, input.endDate) > 0) {
    errors.push(
      error(
        "INVALID_RESERVATION_INTERVAL",
        "endDate",
        "Reservation start must be before or equal to end.",
      ),
    );
  }
  const teamIds = new Set<TeamId>();
  input.teamAllocations.forEach((allocation, index) => {
    if (teamIds.has(allocation.teamId)) {
      errors.push(
        error(
          "DUPLICATE_RESERVATION_TEAM_ALLOCATION",
          `teamAllocations[${index}].teamId`,
          "A team may appear only once in reservation allocations.",
        ),
      );
    }
    teamIds.add(allocation.teamId);
  });
  if (errors.length > 0) return failure(errors);
  return success(
    Object.freeze({
      id: input.id,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
      teamAllocations: Object.freeze(
        input.teamAllocations.map((allocation) =>
          Object.freeze({ teamId: allocation.teamId, amount: Object.freeze({ ...allocation.amount }) }),
        ),
      ),
    }),
  );
}

export function isReservationDateApplicable(
  reservation: Reservation,
  date: CivilDate,
): boolean {
  return (
    compareCivilDates(reservation.startDate, date) <= 0 &&
    compareCivilDates(date, reservation.endDate) <= 0
  );
}

export function reservationAllocationForTeam(
  reservation: Reservation,
  teamId: TeamId,
): ReservationTeamAllocation | undefined {
  return reservation.teamAllocations.find((allocation) => allocation.teamId === teamId);
}
