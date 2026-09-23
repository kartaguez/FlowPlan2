import {
  compareRationals,
  isNegative,
  parseDecimalRational,
  parseSerializedRational,
  rationalFromInteger,
  rationalToCanonicalString,
  rationalToDecimalString,
  type Rational,
} from "./rational.js";
import { error, failure, success, type DomainResult } from "./result.js";

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type TeamId = Brand<string, "TeamId">;
export type ProjectId = Brand<string, "ProjectId">;
export type ReservationId = Brand<string, "ReservationId">;

declare const capacityBrand: unique symbol;
declare const remainingWorkloadBrand: unique symbol;
declare const dailyCapBrand: unique symbol;
declare const capacityRatioBrand: unique symbol;
declare const reservationRatioBrand: unique symbol;
declare const unavailabilityRatioBrand: unique symbol;

export interface Capacity {
  readonly [capacityBrand]: true;
}
export interface RemainingWorkload {
  readonly [remainingWorkloadBrand]: true;
}
export interface DailyCap {
  readonly [dailyCapBrand]: true;
}
export interface CapacityRatio {
  readonly [capacityRatioBrand]: true;
}
export interface ReservationRatio {
  readonly [reservationRatioBrand]: true;
}
export interface UnavailabilityRatio {
  readonly [unavailabilityRatioBrand]: true;
}

export type DomainQuantity =
  | Capacity
  | RemainingWorkload
  | DailyCap
  | CapacityRatio
  | ReservationRatio
  | UnavailabilityRatio;
export type MaxParallelProjects = Brand<number, "MaxParallelProjects">;

const rationalByQuantity = new WeakMap<DomainQuantity, Rational>();

function unsafeWrapValidatedQuantity<T extends DomainQuantity>(
  value: Rational,
): T {
  const quantity = Object.freeze({}) as T;
  rationalByQuantity.set(quantity, value);
  return quantity;
}

export function rationalOf(value: DomainQuantity): Rational {
  const rational = rationalByQuantity.get(value);
  if (!rational) {
    throw new TypeError("Domain quantity was not created by a domain factory.");
  }
  return rational;
}

function createNonNegativeFromRational<T extends DomainQuantity>(
  value: Rational,
  path: string,
  code: string,
  label: string,
): DomainResult<T> {
  if (isNegative(value)) {
    return failure([
      error(code, path, `${label} must be greater than or equal to zero.`),
    ]);
  }
  return success(unsafeWrapValidatedQuantity<T>(value));
}

export function capacityFromRational(
  value: Rational,
  path = "capacity",
): DomainResult<Capacity> {
  return createNonNegativeFromRational(
    value,
    path,
    "NEGATIVE_CAPACITY",
    "Capacity",
  );
}

export function capacityRatioFromRational(
  value: Rational,
  path = "ratio",
): DomainResult<CapacityRatio> {
  return createNonNegativeFromRational(value, path, "NEGATIVE_RATIO", "Ratio");
}

export function remainingWorkloadFromRational(
  value: Rational,
  path = "remainingWorkload",
): DomainResult<RemainingWorkload> {
  return createNonNegativeFromRational(
    value,
    path,
    "NEGATIVE_REMAINING_WORKLOAD",
    "Remaining workload",
  );
}

function createId<T extends TeamId | ProjectId | ReservationId>(
  value: string,
  path: string,
  code: string,
  label: string,
): DomainResult<T> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure([error(code, path, `${label} must be a non-empty string.`)]);
  }
  return success(value as T);
}

export function createTeamId(
  value: string,
  path = "teamId",
): DomainResult<TeamId> {
  return createId(value, path, "INVALID_TEAM_ID", "Team id");
}

export function createProjectId(
  value: string,
  path = "projectId",
): DomainResult<ProjectId> {
  return createId(value, path, "INVALID_PROJECT_ID", "Project id");
}

export function createReservationId(
  value: string,
  path = "reservationId",
): DomainResult<ReservationId> {
  return createId(value, path, "INVALID_RESERVATION_ID", "Reservation id");
}

function createNonNegative<T extends DomainQuantity>(
  value: string,
  path: string,
  code: string,
  label: string,
): DomainResult<T> {
  const rational = parseDecimalRational(value, path);
  if (!rational.ok) return rational;
  return createNonNegativeFromRational(rational.value, path, code, label);
}

export function createCapacity(
  value: string,
  path = "capacity",
): DomainResult<Capacity> {
  return createNonNegative(value, path, "NEGATIVE_CAPACITY", "Capacity");
}

export function createRemainingWorkload(
  value: string,
  path = "remainingWorkload",
): DomainResult<RemainingWorkload> {
  return createNonNegative(
    value,
    path,
    "NEGATIVE_REMAINING_WORKLOAD",
    "Remaining workload",
  );
}

export function createDailyCap(
  value: string,
  path = "dailyCap",
): DomainResult<DailyCap> {
  return createNonNegative(value, path, "NEGATIVE_DAILY_CAP", "Daily cap");
}

export function createCapacityRatio(
  value: string,
  path = "ratio",
): DomainResult<CapacityRatio> {
  return createNonNegative(value, path, "NEGATIVE_RATIO", "Ratio");
}

export function createReservationRatio(
  value: string,
  path = "ratio",
): DomainResult<ReservationRatio> {
  const rational = parseDecimalRational(value, path);
  if (!rational.ok) return rational;
  if (
    isNegative(rational.value) ||
    compareRationals(rational.value, rationalFromInteger(1n)) > 0
  ) {
    return failure([
      error(
        "RATIO_OUT_OF_RANGE",
        path,
        "Reservation ratio must be between zero and one.",
      ),
    ]);
  }
  return success(unsafeWrapValidatedQuantity<ReservationRatio>(rational.value));
}

export function createUnavailabilityRatio(
  value: string,
  path = "unavailabilityRatio",
): DomainResult<UnavailabilityRatio> {
  const rational = parseDecimalRational(value, path);
  if (!rational.ok) return rational;
  const one = rationalFromInteger(1n);
  if (isNegative(rational.value) || compareRationals(rational.value, one) > 0) {
    return failure([
      error(
        "UNAVAILABILITY_RATIO_OUT_OF_RANGE",
        path,
        "Unavailability ratio must be between zero and one.",
      ),
    ]);
  }
  return success(
    unsafeWrapValidatedQuantity<UnavailabilityRatio>(rational.value),
  );
}

export function quantityToDecimalString(
  value: DomainQuantity,
  precision?: number,
): DomainResult<string> {
  return rationalToDecimalString(rationalOf(value), precision);
}

export function serializeQuantity(value: DomainQuantity): string {
  return rationalToCanonicalString(rationalOf(value));
}

function quantityFromSerialized<T extends DomainQuantity>(
  value: string,
  path: string,
  validate: (rational: Rational) => boolean,
  message: string,
): DomainResult<T> {
  const rational = parseSerializedRational(value, path);
  if (!rational.ok) return rational;
  if (!validate(rational.value)) {
    return failure([error("SERIALIZED_QUANTITY_OUT_OF_RANGE", path, message)]);
  }
  return success(unsafeWrapValidatedQuantity<T>(rational.value));
}

const isNonNegative = (value: Rational) => !isNegative(value);

export function capacityFromSerialized(
  value: string,
  path = "capacity",
): DomainResult<Capacity> {
  return quantityFromSerialized(
    value,
    path,
    isNonNegative,
    "Capacity must be non-negative.",
  );
}

export function remainingWorkloadFromSerialized(
  value: string,
  path = "remainingWorkload",
): DomainResult<RemainingWorkload> {
  return quantityFromSerialized(
    value,
    path,
    isNonNegative,
    "Remaining workload must be non-negative.",
  );
}

export function dailyCapFromSerialized(
  value: string,
  path = "dailyCap",
): DomainResult<DailyCap> {
  return quantityFromSerialized(
    value,
    path,
    isNonNegative,
    "Daily cap must be non-negative.",
  );
}

export function capacityRatioFromSerialized(
  value: string,
  path = "ratio",
): DomainResult<CapacityRatio> {
  return quantityFromSerialized(
    value,
    path,
    isNonNegative,
    "Ratio must be non-negative.",
  );
}

export function reservationRatioFromSerialized(
  value: string,
  path = "ratio",
): DomainResult<ReservationRatio> {
  const one = rationalFromInteger(1n);
  return quantityFromSerialized(
    value,
    path,
    (rational) => !isNegative(rational) && compareRationals(rational, one) <= 0,
    "Reservation ratio must be between zero and one.",
  );
}

export function unavailabilityRatioFromSerialized(
  value: string,
  path = "unavailabilityRatio",
): DomainResult<UnavailabilityRatio> {
  const one = rationalFromInteger(1n);
  return quantityFromSerialized(
    value,
    path,
    (rational) => !isNegative(rational) && compareRationals(rational, one) <= 0,
    "Unavailability ratio must be between zero and one.",
  );
}

export function createMaxParallelProjects(
  value: number,
  path = "maxParallelProjects",
): DomainResult<MaxParallelProjects> {
  if (!Number.isSafeInteger(value) || value < 1) {
    return failure([
      error(
        "INVALID_MAX_PARALLEL_PROJECTS",
        path,
        "Maximum parallel projects must be a safe integer greater than or equal to one.",
      ),
    ]);
  }
  return success(value as MaxParallelProjects);
}
