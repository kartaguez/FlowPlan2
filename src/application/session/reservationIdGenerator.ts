import {
  createReservationId,
  type ReservationId,
} from "../../domain/index.js";

export interface ReservationIdGenerator {
  readonly peek: () => ReservationId;
  readonly next: () => ReservationId;
}

export function createReservationIdGenerator(
  existingIds: () => readonly ReservationId[],
  prefix = "reservation-session",
): ReservationIdGenerator {
  let sequence = 1;
  const candidate = (): Readonly<{ id: ReservationId; sequence: number }> => {
    const occupied = new Set(existingIds());
    let current = sequence;
    while (true) {
      const result = createReservationId(`${prefix}-${current}`);
      if (!result.ok) throw new TypeError("Reservation ID generator is invalid.");
      if (!occupied.has(result.value)) return { id: result.value, sequence: current };
      current += 1;
    }
  };
  return Object.freeze({
    peek: (): ReservationId => candidate().id,
    next: (): ReservationId => {
      const selected = candidate();
      sequence = selected.sequence + 1;
      return selected.id;
    },
  });
}
