import {
  addDecimals,
  multiplyDecimals,
  subtractDecimals,
  type NormalizedDecimal,
} from "../model/decimal";
import type { CivilDate } from "../model/date";
import type { Team } from "../model/entities";
import type { Capacity, CapacityRatio, TeamId } from "../model/scalars";
import type { FirmCapacityReservation } from "./reservation";
import { isReservationApplicable } from "./reservation";
import { isWorkingDay } from "./schedule";

const ZERO = 0 as NormalizedDecimal;

export function effectiveCapacity(team: Team, date: CivilDate): Capacity {
  const exception = team.capacitySchedule.exceptions.find(
    (item) => item.date === date,
  );
  if (exception) return exception.capacity;

  if (!isWorkingDay(team.capacitySchedule.workingPattern, date))
    return ZERO as Capacity;

  const period = team.capacitySchedule.periods.find(
    (item) => item.start <= date && date <= item.end,
  );
  return period?.dailyCapacity ?? (ZERO as Capacity);
}

/** Ratios are added in collection order and normalized after every addition. */
export function totalReservationRatio(
  teamId: TeamId,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): CapacityRatio {
  let total = ZERO;
  for (const reservation of reservations) {
    if (isReservationApplicable(reservation, teamId, date)) {
      total = addDecimals(total, reservation.ratio);
    }
  }
  return total as CapacityRatio;
}

/** Effective capacity is calculated first, then multiplied by the normalized total ratio. */
export function reservedCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): Capacity {
  return multiplyDecimals(
    effectiveCapacity(team, date),
    totalReservationRatio(team.id, date, reservations),
  ) as Capacity;
}

/** Reserved capacity is subtracted, normalized, then the result is bounded at zero. */
export function projectCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): Capacity {
  const available = subtractDecimals(
    effectiveCapacity(team, date),
    reservedCapacity(team, date, reservations),
  );
  return (available < 0 ? ZERO : available) as Capacity;
}

export function isOverReserved(
  teamId: TeamId,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): boolean {
  return totalReservationRatio(teamId, date, reservations) > 1;
}
