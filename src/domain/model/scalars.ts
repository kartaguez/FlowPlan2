import { normalizeDecimal, type NormalizedDecimal } from "./decimal";
import { atPath, error, failure, success, type DomainResult } from "./result";

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type TeamId = Brand<string, "TeamId">;
export type ProjectId = Brand<string, "ProjectId">;
export type ReservationId = Brand<string, "ReservationId">;
export type Capacity = Brand<NormalizedDecimal, "Capacity">;
export type RemainingWorkload = Brand<NormalizedDecimal, "RemainingWorkload">;
export type DailyCap = Brand<NormalizedDecimal, "DailyCap">;
export type CapacityRatio = Brand<NormalizedDecimal, "CapacityRatio">;
export type ReservationRatio = Brand<NormalizedDecimal, "ReservationRatio">;
export type MaxParallelProjects = Brand<number, "MaxParallelProjects">;

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

function createNonNegative<
  T extends Capacity | RemainingWorkload | DailyCap | CapacityRatio,
>(value: number, path: string, code: string, label: string): DomainResult<T> {
  const normalized = normalizeDecimal(value, path);
  if (!normalized.ok)
    return failure(normalized.errors.map((item) => atPath(item, path)));
  if (normalized.value < 0) {
    return failure([
      error(code, path, `${label} must be greater than or equal to zero.`),
    ]);
  }
  return success(normalized.value as T);
}

export function createCapacity(
  value: number,
  path = "capacity",
): DomainResult<Capacity> {
  return createNonNegative(value, path, "NEGATIVE_CAPACITY", "Capacity");
}

export function createRemainingWorkload(
  value: number,
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
  value: number,
  path = "dailyCap",
): DomainResult<DailyCap> {
  return createNonNegative(value, path, "NEGATIVE_DAILY_CAP", "Daily cap");
}

export function createCapacityRatio(
  value: number,
  path = "ratio",
): DomainResult<CapacityRatio> {
  return createNonNegative(value, path, "NEGATIVE_RATIO", "Ratio");
}

export function createReservationRatio(
  value: number,
  path = "ratio",
): DomainResult<ReservationRatio> {
  const normalized = createCapacityRatio(value, path);
  if (!normalized.ok) return normalized;
  if (normalized.value > 1) {
    return failure([
      error(
        "RATIO_OUT_OF_RANGE",
        path,
        "Reservation ratio must be between zero and one.",
      ),
    ]);
  }
  return success(normalized.value as unknown as ReservationRatio);
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
