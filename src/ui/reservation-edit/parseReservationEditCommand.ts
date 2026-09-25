import {
  parseExactPercentageInput,
  parseExactQuantityInput,
  type UpdateReservationCommand,
  type UpdateReservationTeamAllocation,
} from "../../application/index.js";
import {
  capacityFromSerialized,
  createCivilDate,
  reservationRatioFromSerialized,
  type DomainError,
  type ReservationId,
  type TeamId,
} from "../../domain/index.js";

export interface ReservationEditFormValues {
  readonly reservationId: ReservationId;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly teamAllocations: readonly ReservationTeamAllocationFormValues[];
}

export interface ReservationTeamAllocationFormValues {
  readonly teamId: TeamId;
  readonly enabled: boolean;
  readonly kind: "ratio" | "fixed-daily";
  readonly value: string;
  readonly originalKind?: "ratio" | "fixed-daily";
  readonly originalDisplay?: string;
  readonly originalExact?: string;
  readonly dirty: boolean;
}

export type ReservationEditCommandParseResult =
  | Readonly<{ ok: true; command: UpdateReservationCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parseReservationEditCommand(
  values: ReservationEditFormValues,
): ReservationEditCommandParseResult {
  const parsed = parseReservationFields(values);
  if (!parsed.ok) return parsed;
  return Object.freeze({ ok: true, command: Object.freeze({
    kind: "update-reservation", reservationId: values.reservationId, ...parsed.fields,
  }) });
}

export function parseReservationFields(
  values: Omit<ReservationEditFormValues, "reservationId">,
): Readonly<{ ok: true; fields: Omit<UpdateReservationCommand, "kind" | "reservationId"> }> |
  Readonly<{ ok: false; errors: readonly DomainError[] }> {
  const errors: DomainError[] = [];
  const name = values.name.trim();
  if (name.length === 0) {
    errors.push(error("EMPTY_RESERVATION_NAME", "reservation.name", "Reservation name must not be empty."));
  }
  const start = createCivilDate(values.startDate.trim(), "reservation.startDate");
  const end = createCivilDate(values.endDate.trim(), "reservation.endDate");
  if (!start.ok) errors.push(...start.errors);
  if (!end.ok) errors.push(...end.errors);
  if (start.ok && end.ok && start.value > end.value) {
    errors.push(
      error(
        "INVALID_RESERVATION_INTERVAL",
        "reservation.endDate",
        "Reservation end date must be on or after its start date.",
      ),
    );
  }
  const teamAllocations = values.teamAllocations
    .filter((row) => row.enabled)
    .map((row) => parseAllocation(row, errors));
  if (!start.ok || !end.ok || errors.length > 0 || teamAllocations.some((item) => item === undefined)) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }
  return Object.freeze({
    ok: true,
    fields: Object.freeze({
      name,
      startDate: start.value,
      endDate: end.value,
      teamAllocations: Object.freeze(teamAllocations as UpdateReservationTeamAllocation[]),
    }),
  });
}

function parseAllocation(
  row: ReservationTeamAllocationFormValues,
  errors: DomainError[],
): UpdateReservationTeamAllocation | undefined {
  const path = `reservation.teamAllocations.${row.teamId}`;
  const canPreserveExact =
    !row.dirty && row.kind === row.originalKind && row.originalExact !== undefined;
  const serialized = canPreserveExact
    ? row.originalExact
    : row.kind === "ratio"
      ? parseExactPercentageInput(row.value)
      : parseExactQuantityInput(row.value);
  if (serialized === undefined) {
    errors.push(error("INVALID_RESERVATION_VALUE", `${path}.value`, "Enter a decimal or exact fraction."));
    return undefined;
  }
  if (row.kind === "ratio") {
    const ratio = reservationRatioFromSerialized(serialized, `${path}.ratio`);
    if (!ratio.ok) {
      errors.push(...ratio.errors);
      return undefined;
    }
    return Object.freeze({ teamId: row.teamId, kind: "ratio", ratio: ratio.value });
  }
  const capacity = capacityFromSerialized(serialized, `${path}.dailyCapacity`);
  if (!capacity.ok) {
    errors.push(...capacity.errors);
    return undefined;
  }
  return Object.freeze({
    teamId: row.teamId,
    kind: "fixed-daily",
    dailyCapacity: capacity.value,
  });
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
