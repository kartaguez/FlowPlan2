import { compareCivilDates, type CivilDate } from "../model/date.js";
import type { ReservationId, ReservationRatio, TeamId } from "../model/scalars.js";
import { error, failure, success, type DomainResult } from "../model/result.js";

export interface FirmCapacityReservation {
  readonly id: ReservationId;
  readonly teamId: TeamId;
  readonly label: string;
  readonly start: CivilDate;
  readonly end: CivilDate;
  readonly ratio: ReservationRatio;
}

export function createFirmCapacityReservation(input: {
  readonly id: ReservationId;
  readonly teamId: TeamId;
  readonly label: string;
  readonly start: CivilDate;
  readonly end: CivilDate;
  readonly ratio: ReservationRatio;
}): DomainResult<FirmCapacityReservation> {
  if (compareCivilDates(input.start, input.end) > 0) {
    return failure([
      error(
        "INVALID_RESERVATION_INTERVAL",
        "end",
        "Reservation start must be before or equal to end.",
      ),
    ]);
  }
  return success(Object.freeze({ ...input }));
}

export function isReservationApplicable(
  reservation: FirmCapacityReservation,
  teamId: TeamId,
  date: CivilDate,
): boolean {
  return (
    reservation.teamId === teamId &&
    compareCivilDates(reservation.start, date) <= 0 &&
    compareCivilDates(date, reservation.end) <= 0
  );
}
