import type { CivilDate } from "../model/date";
import type { Team } from "../model/entities";
import type { DomainResult } from "../model/result";
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

function unwrapProvenQuantity<T>(result: DomainResult<T>): T {
  if (!result.ok) {
    throw new TypeError(
      "A capacity calculation violated its proven invariant.",
    );
  }
  return result.value;
}

const ZERO_CAPACITY = unwrapProvenQuantity(capacityFromRational(ZERO));

export function effectiveCapacity(team: Team, date: CivilDate): Capacity {
  const exception = team.capacitySchedule.exceptions.find(
    (item) => item.date === date,
  );
  if (exception) return exception.capacity;

  if (!isWorkingDay(team.capacitySchedule.workingPattern, date)) {
    return ZERO_CAPACITY;
  }

  const period = team.capacitySchedule.periods.find(
    (item) => item.start <= date && date <= item.end,
  );
  return period?.dailyCapacity ?? ZERO_CAPACITY;
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
  // A sum of non-negative reservation ratios remains non-negative.
  return unwrapProvenQuantity(capacityRatioFromRational(total));
}

/** Effective capacity is multiplied by the exact total reservation ratio. */
export function reservedCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly FirmCapacityReservation[],
): Capacity {
  const reserved = multiplyRationals(
    rationalOf(effectiveCapacity(team, date)),
    rationalOf(totalReservationRatio(team.id, date, reservations)),
  );
  // Both factors are non-negative, so their product is non-negative.
  return unwrapProvenQuantity(capacityFromRational(reserved));
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
  // The maximum with zero is non-negative by construction.
  return unwrapProvenQuantity(
    capacityFromRational(maxRational(ZERO, available)),
  );
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
