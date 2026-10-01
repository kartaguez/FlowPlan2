import { addDays, compareCivilDates, createCivilDate, type CivilDate } from "../model/date.js";
import { compareRationals, rationalFromInteger } from "../model/rational.js";
import { rationalOf, type ConsumedWorkload, type ProjectId, type RemainingWorkload, type ReservationId, type TeamId } from "../model/scalars.js";
import { error, failure, success, type DomainError, type DomainResult } from "../model/result.js";

/** A period is one exact, inclusive part of an object's common partition. */
export interface ActualsPeriod {
  readonly periodId: string;
  readonly from: CivilDate;
  readonly through: CivilDate;
  readonly consumed: readonly Readonly<{ teamId: TeamId; amount: ConsumedWorkload }>[];
}

export interface ActualsCoverage {
  readonly actualsFrom: CivilDate;
  readonly actualsThrough: CivilDate;
  readonly periods: readonly ActualsPeriod[];
}

export interface ActualsSnapshotBase {
  readonly snapshotId: string;
  readonly version: number;
  readonly knowledgeDate: CivilDate;
  readonly participation: readonly TeamId[];
  /** Each retired Team has explicit zero current Actuals on the whole partition. */
  readonly retiredZeroTeams: readonly TeamId[];
  readonly coverage?: ActualsCoverage;
}

export interface ProjectActualsSnapshot extends ActualsSnapshotBase {
  readonly raf: readonly Readonly<{ teamId: TeamId; amount: RemainingWorkload }>[];
}

export type ReservationActualsSnapshot = ActualsSnapshotBase;

export function snapshotId(kind: "project" | "reservation", objectId: ProjectId | ReservationId, version: number): string {
  return `${kind}:${objectId}:v${version}`;
}

const ZERO = rationalFromInteger(0n);
const validId = (id: unknown): id is string => typeof id === "string" && id.trim().length > 0;

function validateIds(values: readonly string[], path: string, errors: DomainError[]): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!validId(value)) errors.push(error("INVALID_SNAPSHOT_ID", `${path}[${index}]`, "ID must be nonempty."));
    if (seen.has(value)) errors.push(error("DUPLICATE_SNAPSHOT_ID", `${path}[${index}]`, "ID must be unique."));
    seen.add(value);
  });
}

function validateQuantity(value: ConsumedWorkload | RemainingWorkload | undefined, path: string, errors: DomainError[]): void {
  try {
    if (value === undefined || compareRationals(rationalOf(value), ZERO) < 0) {
      errors.push(error("INVALID_SNAPSHOT_QUANTITY", path, "An exact nonnegative quantity is required."));
    }
  } catch {
    errors.push(error("INVALID_SNAPSHOT_QUANTITY", path, "An exact nonnegative quantity is required."));
  }
}

function validateBase(snapshot: ActualsSnapshotBase, kind: "project" | "reservation", objectId: ProjectId | ReservationId, errors: DomainError[]): void {
  if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 1 ||
      snapshot.snapshotId !== snapshotId(kind, objectId, snapshot.version)) {
    errors.push(error("INVALID_SNAPSHOT_ID", "snapshotId", "Snapshot ID must match object and positive version."));
  }
  if (!createCivilDate(snapshot.knowledgeDate).ok) errors.push(error("INVALID_KNOWLEDGE_DATE", "knowledgeDate", "Invalid knowledge date."));
  validateIds(snapshot.participation, "participation", errors);
  validateIds(snapshot.retiredZeroTeams, "retiredZeroTeams", errors);
  const participants = new Set(snapshot.participation);
  snapshot.retiredZeroTeams.forEach((id, index) => {
    if (participants.has(id)) errors.push(error("RETIRED_TEAM_PARTICIPATES", `retiredZeroTeams[${index}]`, "Retired Team cannot participate."));
  });
  const coverage = snapshot.coverage;
  if (!coverage) return;
  if (!createCivilDate(coverage.actualsFrom).ok || !createCivilDate(coverage.actualsThrough).ok ||
      compareCivilDates(coverage.actualsFrom, coverage.actualsThrough) > 0 ||
      compareCivilDates(coverage.actualsThrough, snapshot.knowledgeDate) > 0) {
    errors.push(error("INVALID_ACTUALS_COVERAGE", "coverage", "Coverage needs valid ordered dates no later than knowledge date."));
  }
  if (!coverage.periods.length) errors.push(error("EMPTY_ACTUALS_PARTITION", "coverage.periods", "Covered Actuals need a period."));
  validateIds(coverage.periods.map((period) => period.periodId), "coverage.periods.periodId", errors);
  let previousThrough: CivilDate | undefined;
  coverage.periods.forEach((period, index) => {
    const path = `coverage.periods[${index}]`;
    if (!createCivilDate(period.from).ok || !createCivilDate(period.through).ok || compareCivilDates(period.from, period.through) > 0) {
      errors.push(error("INVALID_ACTUALS_PERIOD", path, "Period dates must be valid and ordered."));
    }
    const nextDate = previousThrough === undefined ? undefined : addDays(previousThrough, 1);
    const expected = previousThrough === undefined ? coverage.actualsFrom : nextDate?.ok ? nextDate.value : undefined;
    if (period.from !== expected) errors.push(error("ACTUALS_PARTITION_GAP", `${path}.from`, "Periods must form one contiguous partition."));
    previousThrough = period.through;
    validateIds(period.consumed.map((row) => row.teamId), `${path}.consumed.teamId`, errors);
    const rowIds = new Set(period.consumed.map((row) => row.teamId));
    if (rowIds.size !== participants.size || [...rowIds].some((id) => !participants.has(id))) {
      errors.push(error("ACTUALS_PARTICIPATION_MISMATCH", `${path}.consumed`, "Every period needs exactly the participating Teams."));
    }
    period.consumed.forEach((row, rowIndex) => validateQuantity(row.amount, `${path}.consumed[${rowIndex}].amount`, errors));
  });
  if (previousThrough !== coverage.actualsThrough) errors.push(error("ACTUALS_PARTITION_END", "coverage.actualsThrough", "Last period must end at coverage through date."));
}

function freezeBase<T extends ActualsSnapshotBase>(snapshot: T): T {
  return Object.freeze({ ...snapshot,
    participation: Object.freeze([...snapshot.participation]),
    retiredZeroTeams: Object.freeze([...snapshot.retiredZeroTeams]),
    ...(snapshot.coverage ? { coverage: Object.freeze({ ...snapshot.coverage,
      periods: Object.freeze(snapshot.coverage.periods.map((period) => Object.freeze({ ...period,
        consumed: Object.freeze(period.consumed.map((row) => Object.freeze({ ...row }))),
      }))),
    }) } : {}),
  });
}

export function createProjectActualsSnapshot(snapshot: ProjectActualsSnapshot, objectId: ProjectId): DomainResult<ProjectActualsSnapshot> {
  const errors: DomainError[] = [];
  validateBase(snapshot, "project", objectId, errors);
  validateIds(snapshot.raf.map((row) => row.teamId), "raf.teamId", errors);
  const ids = new Set(snapshot.raf.map((row) => row.teamId));
  if (ids.size !== snapshot.participation.length || snapshot.participation.some((id) => !ids.has(id))) {
    errors.push(error("ACTUALS_RAF_MEMBERSHIP", "raf", "RAF needs exactly the participating Teams."));
  }
  snapshot.raf.forEach((row, index) => validateQuantity(row.amount, `raf[${index}].amount`, errors));
  if (errors.length) return failure(errors);
  return success(Object.freeze({ ...freezeBase(snapshot), raf: Object.freeze(snapshot.raf.map((row) => Object.freeze({ ...row }))) }));
}

export function createReservationActualsSnapshot(snapshot: ReservationActualsSnapshot, objectId: ReservationId): DomainResult<ReservationActualsSnapshot> {
  const errors: DomainError[] = [];
  validateBase(snapshot, "reservation", objectId, errors);
  if (errors.length) return failure(errors);
  return success(freezeBase(snapshot));
}

export function createSnapshotHistory<T extends ActualsSnapshotBase>(
  snapshots: readonly T[], objectId: ProjectId | ReservationId, kind: "project" | "reservation",
): DomainResult<readonly T[]> {
  const errors: DomainError[] = [];
  const validated = snapshots.map((snapshot, index) => {
    if (snapshot.version !== index + 1) errors.push(error("SNAPSHOT_VERSION_GAP", `snapshots[${index}].version`, "Versions must be consecutive."));
    if (index && compareCivilDates(snapshot.knowledgeDate, snapshots[index - 1]!.knowledgeDate) < 0) {
      errors.push(error("KNOWLEDGE_DATE_REVERSED", `snapshots[${index}].knowledgeDate`, "Knowledge dates cannot go backward."));
    }
    if (kind === "reservation" && index === 0 && !snapshot.coverage) {
      errors.push(error("RESERVATION_FIRST_COVERAGE", "snapshots[0].coverage", "First Reservation snapshot needs coverage."));
    }
    if (index) {
      const prior = snapshots[index - 1]!;
      const currentIds = new Set(snapshot.participation);
      const retiredIds = new Set(snapshot.retiredZeroTeams);
      for (const id of [...prior.participation, ...prior.retiredZeroTeams]) {
        if (!currentIds.has(id) && !retiredIds.has(id)) {
          errors.push(error("RETIRED_ZERO_LOST", `snapshots[${index}].retiredZeroTeams`, "Historical Team needs an explicit current zero marker."));
        }
      }
      for (const id of prior.participation) {
        if (currentIds.has(id)) continue;
        if (prior.coverage?.periods.some((period) => period.consumed.some((row) =>
          row.teamId === id && compareRationals(rationalOf(row.amount), ZERO) !== 0))) {
          errors.push(error("NONZERO_TEAM_REMOVAL", `snapshots[${index}].participation`, "A Team with current nonzero Actuals cannot be retired."));
        }
      }
      const oldPeriods = new Map(prior.coverage?.periods.map((period) => [period.periodId, period]) ?? []);
      const unchangedPeriod = (left: ActualsPeriod, right: ActualsPeriod): boolean =>
        left.from === right.from && left.through === right.through && left.consumed.length === right.consumed.length &&
        left.consumed.every((row) => right.consumed.some((other) => other.teamId === row.teamId &&
          compareRationals(rationalOf(other.amount), rationalOf(row.amount)) === 0));
      for (const period of snapshot.coverage?.periods ?? []) {
        const old = oldPeriods.get(period.periodId);
        if (old && !unchangedPeriod(old, period)) {
          errors.push(error("PERIOD_ID_REUSED", `snapshots[${index}].coverage.periods.${period.periodId}`, "A changed period needs a new ID."));
        }
        if (!old && prior.coverage?.periods.some((before) => unchangedPeriod(before, period))) {
          errors.push(error("UNCHANGED_PERIOD_ID", `snapshots[${index}].coverage.periods.${period.periodId}`, "An unchanged period keeps its ID."));
        }
      }
    }
    const result = kind === "project"
      ? createProjectActualsSnapshot(snapshot as unknown as ProjectActualsSnapshot, objectId as ProjectId)
      : createReservationActualsSnapshot(snapshot, objectId as ReservationId);
    if (!result.ok) errors.push(...result.errors.map((item) => ({ ...item, path: `snapshots[${index}].${item.path}` })));
    return result.ok ? result.value as T : undefined;
  });
  if (errors.length) return failure(errors);
  return success(Object.freeze(validated as T[]));
}
