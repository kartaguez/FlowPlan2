import type { CivilDate } from "../model/date";
import type { Team } from "../model/entities";
import {
  addRationals,
  compareRationals,
  maxRational,
  multiplyRationals,
  rationalFromInteger,
  subtractRationals,
} from "../model/rational";
import {
  capacityFromRational,
  capacityRatioFromRational,
  rationalOf,
  type Capacity,
  type CapacityRatio,
  type TeamId,
} from "../model/scalars";
import type { FirmCapacityReservation } from "./reservation";
import { isReservationApplicable } from "./reservation";
import { isWorkingDay } from "./schedule";

const ZERO = rationalFromInteger(0n);
const ONE = rationalFromInteger(1n);

export function effectiveCapacity(team: Team, date: CivilDate): Capacity {
  const exception = team.capacitySchedule.exceptions.find(
    (item) => item.date === date,
  );
  if (exception) return exception.capacity;

  if (!isWorkingDay(team.capacitySchedule.workingPattern, date)) {
    return capacityFromRational(ZERO);
  }

  const period = team.capacitySchedule.periods.find(
    (item) => item.start <= date && date <= item.end,
  );
  return period?.dailyCapacity ?? capacityFromRational(ZERO);
}

/** Applicable ratios are summed exactly in collection order. */
export function totalReservationRatio(
  teamId: TeamId,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): CapacityRatio {
  let total = ZERO;
  for (const reservation of reservations) {
    if (isReservationApplicable(reservation, teamId, date)) {
      total = addRationals(total, rationalOf(reservation.ratio));
    }
  }
  return capacityRatioFromRational(total);
}

/** Effective capacity is multiplied by the exact total reservation ratio. */
export function reservedCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): Capacity {
  return capacityFromRational(
    multiplyRationals(
      rationalOf(effectiveCapacity(team, date)),
      rationalOf(totalReservationRatio(team.id, date, reservations)),
    ),
  );
}

/** Reserved capacity is subtracted exactly, then the result is bounded at zero. */
export function projectCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): Capacity {
  const available = subtractRationals(
    rationalOf(effectiveCapacity(team, date)),
    rationalOf(reservedCapacity(team, date, reservations)),
  );
  return capacityFromRational(maxRational(ZERO, available));
}

export function isOverReserved(
  teamId: TeamId,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): boolean {
  return (
    compareRationals(
      rationalOf(totalReservationRatio(teamId, date, reservations)),
      ONE,
    ) > 0
  );
}
