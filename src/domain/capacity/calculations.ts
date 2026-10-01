import type { CivilDate } from "../model/date.js";
import type { Team } from "../model/entities.js";
import type { DomainResult } from "../model/result.js";
import {
  addRationals,
  compareRationals,
  maxRational,
  multiplyRationals,
  rationalFromInteger,
  subtractRationals,
} from "../model/rational.js";
import {
  capacityFromRational,
  rationalOf,
  type Capacity,
} from "../model/scalars.js";
import type { Reservation } from "./reservation.js";
import {
  isReservationDateApplicable,
  reservationAllocationForTeam,
} from "./reservation.js";
import { isWorkingDay, type WorkingPattern } from "./schedule.js";

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

export function effectiveCapacity(
  team: Team,
  date: CivilDate,
  workingPattern: WorkingPattern,
): Capacity {
  const exception = team.capacitySchedule.exceptions.find(
    (item) => item.date === date,
  );
  if (exception) return exception.capacity;

  if (!isWorkingDay(workingPattern, date)) {
    return ZERO_CAPACITY;
  }

  const period = team.capacitySchedule.periods.find(
    (item) => item.start <= date && date <= item.end,
  );
  if (!period) return ZERO_CAPACITY;
  if (period.unavailabilityRatio === undefined) return period.dailyCapacity;
  const availability = subtractRationals(
    ONE,
    rationalOf(period.unavailabilityRatio),
  );
  return unwrapProvenQuantity(
    capacityFromRational(
      multiplyRationals(rationalOf(period.dailyCapacity), availability),
    ),
  );
}

export function requestedReservationCapacity(
  reservation: Reservation,
  team: Team,
  date: CivilDate,
  workingPattern: WorkingPattern,
  effectiveForDate?: Capacity,
): Capacity {
  const allocation = reservationAllocationForTeam(reservation, team.id);
  if (
    allocation === undefined ||
    !isReservationDateApplicable(reservation, date) ||
    !isWorkingDay(workingPattern, date)
  ) {
    return ZERO_CAPACITY;
  }
  if (allocation.amount.kind === "ratio") {
    return unwrapProvenQuantity(
      capacityFromRational(
        multiplyRationals(
          rationalOf(effectiveForDate ?? effectiveCapacity(team, date, workingPattern)),
          rationalOf(allocation.amount.ratio),
        ),
      ),
    );
  }
  const hasCapacityPeriod = team.capacitySchedule.periods.some(
    (period) => period.start <= date && date <= period.end,
  );
  return hasCapacityPeriod ? allocation.amount.dailyCapacity : ZERO_CAPACITY;
}

export function reservedCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly Reservation[],
  workingPattern: WorkingPattern,
  effectiveForDate?: Capacity,
): Capacity {
  let total = ZERO;
  for (const reservation of reservations) {
    if (!reservation.isActive) continue;
    total = addRationals(
      total,
      rationalOf(requestedReservationCapacity(reservation, team, date, workingPattern, effectiveForDate)),
    );
  }
  return unwrapProvenQuantity(capacityFromRational(total));
}

/** The single exact daily capacity snapshot used by planning and lookahead. */
export function dailyCapacitySnapshot(
  team: Team,
  date: CivilDate,
  reservations: readonly Reservation[],
  workingPattern: WorkingPattern,
  projectActual: Capacity = ZERO_CAPACITY,
  reservationActual: Capacity = ZERO_CAPACITY,
) {
  const effective = effectiveCapacity(team, date, workingPattern);
  const reserved = reservedCapacity(team, date, reservations, workingPattern, effective);
  const actual = addRationals(rationalOf(projectActual), rationalOf(reservationActual));
  const total = addRationals(actual, rationalOf(reserved));
  const available = maxRational(ZERO, subtractRationals(rationalOf(effective), total));
  const actualOver = maxRational(ZERO, subtractRationals(actual, rationalOf(effective)));
  const totalOver = maxRational(ZERO, subtractRationals(total, rationalOf(effective)));
  const reservationOver = subtractRationals(totalOver, actualOver);
  return Object.freeze({
    effectiveCapacity: effective,
    projectActualCapacity: projectActual,
    reservationActualCapacity: reservationActual,
    reservedCapacity: reserved,
    projectCapacity: unwrapProvenQuantity(capacityFromRational(available)),
    actualOverCapacity: unwrapProvenQuantity(capacityFromRational(actualOver)),
    reservationOverCapacity: unwrapProvenQuantity(capacityFromRational(reservationOver)),
  });
}

/** Reserved capacity is subtracted exactly, then the result is bounded at zero. */
export function projectCapacity(
  team: Team,
  date: CivilDate,
  reservations: readonly Reservation[],
  workingPattern: WorkingPattern,
): Capacity {
  return dailyCapacitySnapshot(team, date, reservations, workingPattern).projectCapacity;
}

export function isOverReserved(
  team: Team,
  date: CivilDate,
  reservations: readonly Reservation[],
  workingPattern: WorkingPattern,
): boolean {
  return compareRationals(rationalOf(dailyCapacitySnapshot(team, date, reservations, workingPattern).reservationOverCapacity), ZERO) > 0;
}
