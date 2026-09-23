import {
  serializeQuantity,
  type CivilDate,
  type ReservationId,
  type TeamId,
} from "../../domain/index.js";
import { formatPercentageForEditing } from "./editableQuantity.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface TeamReservationsEditViewModel {
  readonly teamId: TeamId;
  readonly teamLabel: string;
  readonly reservations: readonly ReservationEditItemViewModel[];
}

export interface ReservationEditItemViewModel {
  readonly reservationId: ReservationId;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly ratioPercent: string;
  readonly ratioExact: string;
}

export function buildTeamReservationsEditViewModel(
  state: PlanningSessionState,
  teamId: TeamId,
): TeamReservationsEditViewModel | undefined {
  const team = state.portfolio.teams.find((candidate) => candidate.id === teamId);
  if (team === undefined) return undefined;
  return Object.freeze({
    teamId,
    teamLabel: team.name,
    reservations: Object.freeze(
      state.portfolio.reservations
        .filter((reservation) => reservation.teamId === teamId)
        .map((reservation) =>
          Object.freeze({
            reservationId: reservation.id,
            startDate: reservation.start,
            endDate: reservation.end,
            ratioPercent: formatPercentageForEditing(
              serializeQuantity(reservation.ratio),
            ),
            ratioExact: serializeQuantity(reservation.ratio),
          }),
        ),
    ),
  });
}
