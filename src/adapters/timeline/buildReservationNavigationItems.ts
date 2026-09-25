import {
  addRationals,
  civilDatesInclusive,
  compareCivilDates,
  compareRationals,
  rationalFromInteger,
  rationalOf,
  requestedReservationCapacity,
  type Portfolio,
  type ReservationId,
  type WorkingPattern,
} from "../../domain/index.js";

export interface ReservationNavigationItem {
  readonly id: ReservationId;
  readonly name: string;
}

/** Presentation order only; Portfolio.reservations remains untouched. */
export function buildReservationNavigationItems(
  portfolio: Portfolio,
  workingPattern: WorkingPattern,
): readonly ReservationNavigationItem[] {
  const teams = new Map(portfolio.teams.map((team) => [team.id, team]));
  const ranked = portfolio.reservations.map((reservation) => {
    let total = rationalFromInteger(0n);
    const dates = reservation.teamAllocations.length === 0
      ? [] : civilDatesInclusive(reservation.startDate, reservation.endDate);
    for (const allocation of reservation.teamAllocations) {
      const team = teams.get(allocation.teamId);
      if (!team) throw new TypeError(`Unknown Reservation Team ${allocation.teamId}.`);
      for (const date of dates) {
        total = addRationals(total, rationalOf(
          requestedReservationCapacity(reservation, team, date, workingPattern),
        ));
      }
    }
    return { reservation, total };
  });
  ranked.sort((left, right) =>
    compareCivilDates(left.reservation.startDate, right.reservation.startDate) ||
    compareCivilDates(left.reservation.endDate, right.reservation.endDate) ||
    -compareRationals(left.total, right.total) ||
    left.reservation.name.localeCompare(right.reservation.name, "fr") ||
    String(left.reservation.id).localeCompare(String(right.reservation.id), "fr"));
  return Object.freeze(ranked.map(({ reservation }) => Object.freeze({
    id: reservation.id,
    name: reservation.name,
  })));
}
