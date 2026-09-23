import { percentageToSerializedRatio } from "../../application/session/exactPercentage.js";
import type {
  ReplaceTeamReservation,
  ReplaceTeamReservationsCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  reservationRatioFromSerialized,
  type DomainError,
  type ReservationId,
  type TeamId,
} from "../../domain/index.js";

export interface ReservationEditFormValues {
  readonly teamId: TeamId;
  readonly reservations: readonly ReservationEditRowValues[];
}

export interface ReservationEditRowValues {
  readonly reservationId: ReservationId;
  readonly startDate: string;
  readonly endDate: string;
  readonly ratioPercent: string;
  readonly ratioOriginalDisplay: string;
  readonly ratioExact?: string;
  readonly ratioDirty: boolean;
}

export type ReservationEditCommandParseResult =
  | Readonly<{ ok: true; command: ReplaceTeamReservationsCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parseReservationEditCommand(
  values: ReservationEditFormValues,
): ReservationEditCommandParseResult {
  const errors: DomainError[] = [];
  const reservations = values.reservations.map((row, index) =>
    parseRow(row, index, errors),
  );
  if (errors.length > 0 || reservations.some((item) => item === undefined)) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }
  return Object.freeze({
    ok: true,
    command: Object.freeze({
      kind: "replace-team-reservations",
      teamId: values.teamId,
      reservations: Object.freeze(
        reservations.filter(
          (item): item is ReplaceTeamReservation => item !== undefined,
        ),
      ),
    }),
  });
}

function parseRow(
  row: ReservationEditRowValues,
  index: number,
  errors: DomainError[],
): ReplaceTeamReservation | undefined {
  const path = `reservations[${index}]`;
  const start = createCivilDate(row.startDate.trim(), `${path}.startDate`);
  const end = createCivilDate(row.endDate.trim(), `${path}.endDate`);
  const serializedRatio =
    !row.ratioDirty && row.ratioExact !== undefined
      ? row.ratioExact
      : percentageToSerializedRatio(row.ratioPercent);
  if (!start.ok) errors.push(...start.errors);
  if (!end.ok) errors.push(...end.errors);
  if (serializedRatio === undefined) {
    errors.push(
      error(
        "INVALID_RESERVATION_PERCENT",
        `${path}.ratio`,
        "Reservation must be an exact percentage from 0 to 100.",
      ),
    );
    return undefined;
  }
  const ratio = reservationRatioFromSerialized(serializedRatio, `${path}.ratio`);
  if (!ratio.ok) errors.push(...ratio.errors);
  if (!start.ok || !end.ok || !ratio.ok) return undefined;
  return Object.freeze({
    reservationId: row.reservationId,
    startDate: start.value,
    endDate: end.value,
    ratio: ratio.value,
  });
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
