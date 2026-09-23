import {
  createReservationId,
  type ReservationId,
} from "../../domain/index.js";

export interface ReservationIdGenerator {
  readonly next: () => ReservationId;
}

export function createReservationIdGenerator(
  existingIds: () => readonly ReservationId[],
  prefix = "reservation-session",
): ReservationIdGenerator {
  let sequence = 1;
  return Object.freeze({
    next: (): ReservationId => {
      const occupied = new Set(existingIds());
      while (true) {
        const result = createReservationId(`${prefix}-${sequence}`);
        sequence += 1;
        if (!result.ok) throw new TypeError("Reservation ID generator is invalid.");
        if (!occupied.has(result.value)) return result.value;
      }
    },
  });
}
