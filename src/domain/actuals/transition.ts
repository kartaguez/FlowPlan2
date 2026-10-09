import { compareCivilDates, type CivilDate } from "../model/date.js";
import { compareRationals, rationalFromInteger } from "../model/rational.js";
import { rationalOf, type ProjectId, type ReservationId, type TeamId } from "../model/scalars.js";
import { error, failure, success, type DomainError, type DomainResult } from "../model/result.js";
import { createProjectActualsSnapshot, createReservationActualsSnapshot, snapshotId,
  type ActualsPeriod, type ProjectActualsSnapshot, type ReservationActualsSnapshot } from "./snapshots.js";

export interface SnapshotEvidence {
  /** One key per deliberately validated period/Team cell, including explicit zero. */
  readonly consumedCells: readonly Readonly<{ periodId: string; teamId: TeamId }>[];
  /** Deliberately validated Project RAF values. */
  readonly rafTeams?: readonly TeamId[];
  /** Explicit confirmation of a positive-RAF Team's retirement at current RAF zero. */
  readonly retiredTeams?: readonly TeamId[];
}

export type SnapshotEditIntent =
  | Readonly<{ kind: "initial" | "reconcile" | "raf-only" | "membership" | "extension" | "erosion" }>
  | Readonly<{ kind: "replace"; editedZone: Readonly<{ from: CivilDate; through: CivilDate }> }>;

export interface SnapshotReplacement<T> {
  readonly baseVersion: number;
  readonly knowledgeDate: CivilDate;
  /** Complete new business state. Metadata is assigned only after validation and no-op detection. */
  readonly current: Omit<T, "snapshotId" | "version" | "knowledgeDate">;
  readonly evidence: SnapshotEvidence;
  readonly intent: SnapshotEditIntent;
}

const ZERO = rationalFromInteger(0n);
const key = (periodId: string, teamId: TeamId) => `${periodId}\u0000${teamId}`;
const amount = (period: ActualsPeriod, teamId: TeamId) => period.consumed.find((row) => row.teamId === teamId)?.amount;
const same = (left: { readonly amount: Parameters<typeof rationalOf>[0] } | undefined,
  right: { readonly amount: Parameters<typeof rationalOf>[0] } | undefined) =>
  left !== undefined && right !== undefined && compareRationals(rationalOf(left.amount), rationalOf(right.amount)) === 0;

export function canonicalActualsKnowledge(snapshot: Pick<ReservationActualsSnapshot, "participation" | "retiredZeroTeams" | "coverage"> & { readonly raf?: ProjectActualsSnapshot["raf"] }, includeRaf = false): string {
  const cover = snapshot.coverage;
  return JSON.stringify({
    participation: [...snapshot.participation].sort(), retired: [...snapshot.retiredZeroTeams].sort(),
    coverage: cover ? { from: cover.actualsFrom, through: cover.actualsThrough,
      periods: cover.periods.map((period) => ({ from: period.from, through: period.through,
        values: period.consumed.map((row) => [row.teamId, rationalOf(row.amount)] as const)
          .sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => [id, `${value.numerator}/${value.denominator}`]),
      })) } : null,
    raf: includeRaf && "raf" in snapshot ? snapshot.raf!.map((row) => [row.teamId, rationalOf(row.amount)] as const)
      .sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => [id, `${value.numerator}/${value.denominator}`]) : null,
  });
}

function validateTransition<T extends ProjectActualsSnapshot | ReservationActualsSnapshot>(
  previous: T | undefined, candidate: T, evidence: SnapshotEvidence, project: boolean,
  currentRaf?: ProjectActualsSnapshot["raf"],
): DomainError[] {
  const errors: DomainError[] = [];
  const oldPeriods = new Map(previous?.coverage?.periods.map((period) => [period.periodId, period]) ?? []);
  const oldByBounds = new Map(previous?.coverage?.periods.map((period) => [`${period.from}/${period.through}`, period]) ?? []);
  const confirmed = new Set(evidence.consumedCells.map((cell) => key(cell.periodId, cell.teamId)));
  const oldParticipants = new Set(previous?.participation ?? []);
  const newParticipants = new Set(candidate.participation);
  const oldCoverage = previous?.coverage;
  const newCoverage = candidate.coverage;
  const throughChanged = oldCoverage?.actualsThrough !== newCoverage?.actualsThrough;

  for (const period of newCoverage?.periods ?? []) {
    const old = oldPeriods.get(period.periodId);
    const sameBounds = old?.from === period.from && old.through === period.through;
    if (old && (!sameBounds || period.consumed.length !== old.consumed.length ||
      period.consumed.some((row) => !same(row, old.consumed.find((item) => item.teamId === row.teamId))))) {
      errors.push(error("PERIOD_ID_REUSED", `coverage.periods.${period.periodId}`, "A changed period needs a new ID."));
    }
    if (!old && oldByBounds.has(`${period.from}/${period.through}`)) {
      const oldAtBounds = oldByBounds.get(`${period.from}/${period.through}`)!;
      if (period.consumed.every((row) => same(row, oldAtBounds.consumed.find((item) => item.teamId === row.teamId))) &&
          period.consumed.length === oldAtBounds.consumed.length) {
        errors.push(error("UNCHANGED_PERIOD_ID", `coverage.periods.${period.periodId}`, "An unchanged period keeps its ID."));
      }
    }
    for (const row of period.consumed) {
      const copied = sameBounds ? old : oldByBounds.get(`${period.from}/${period.through}`);
      const unchanged = copied !== undefined && same(row, copied.consumed.find((item) => item.teamId === row.teamId));
      if (unchanged) continue;
      const overlapping = (oldCoverage?.periods ?? []).filter((prior) => prior.from <= period.through && prior.through >= period.from);
      const automaticallyZero = oldParticipants.has(row.teamId) && oldCoverage !== undefined &&
        period.from >= oldCoverage.actualsFrom && period.through <= oldCoverage.actualsThrough &&
        compareRationals(rationalOf(row.amount), ZERO) === 0 &&
        overlapping.length > 0 && overlapping.every((prior) => compareRationals(rationalOf(amount(prior, row.teamId)!), ZERO) === 0);
      if (!confirmed.has(key(period.periodId, row.teamId)) && !automaticallyZero) {
        errors.push(error("ACTUALS_VALUE_UNCONFIRMED", `coverage.periods.${period.periodId}.${row.teamId}`, "Changed values require explicit validation."));
      }
    }
  }
  for (const teamId of previous?.participation ?? []) {
    if (newParticipants.has(teamId)) continue;
    if ((oldCoverage?.periods ?? []).some((period) => compareRationals(rationalOf(amount(period, teamId)!), ZERO) !== 0)) {
      errors.push(error("NONZERO_TEAM_REMOVAL", `participation.${teamId}`, "A Team with current consumed work cannot be retired."));
    }
    if (!candidate.retiredZeroTeams.includes(teamId)) errors.push(error("MISSING_RETIRED_ZERO", `retiredZeroTeams.${teamId}`, "Retirement needs an explicit current zero marker."));
    if (project && !evidence.retiredTeams?.includes(teamId)) errors.push(error("RETIREMENT_UNCONFIRMED", `retiredZeroTeams.${teamId}`, "Project retirement needs confirmation of current RAF zero."));
  }
  for (const teamId of previous?.retiredZeroTeams ?? []) {
    if (!newParticipants.has(teamId) && !candidate.retiredZeroTeams.includes(teamId)) {
      errors.push(error("RETIRED_ZERO_LOST", `retiredZeroTeams.${teamId}`, "Retired zero marker must follow partition changes."));
    }
  }
  if (project) {
    const priorRaf = new Map((currentRaf ?? (previous as ProjectActualsSnapshot | undefined)?.raf)?.map((row) => [row.teamId, row.amount]));
    for (const row of (candidate as ProjectActualsSnapshot).raf) {
      const old = priorRaf.get(row.teamId);
      const partitionChanged = JSON.stringify(oldCoverage ? [oldCoverage.actualsFrom, oldCoverage.actualsThrough, oldCoverage.periods.map(p => [p.from, p.through])] : null) !==
        JSON.stringify(newCoverage ? [newCoverage.actualsFrom, newCoverage.actualsThrough, newCoverage.periods.map(p => [p.from, p.through])] : null);
      const consumedChanged = (newCoverage?.periods ?? []).some(period => {
        const prior = oldByBounds.get(`${period.from}/${period.through}`);
        return !same(period.consumed.find(item => item.teamId === row.teamId), prior?.consumed.find(item => item.teamId === row.teamId));
      });
      if (((currentRaf ? partitionChanged || consumedChanged || !oldParticipants.has(row.teamId) : throughChanged) || !old || compareRationals(rationalOf(old), rationalOf(row.amount)) !== 0) &&
          !evidence.rafTeams?.includes(row.teamId)) {
        errors.push(error("RAF_UNCONFIRMED", `raf.${row.teamId}`, "RAF needs explicit validation."));
      }
    }
  }
  return errors;
}

function validateIntent<T extends ProjectActualsSnapshot | ReservationActualsSnapshot>(
  previous: T | undefined, candidate: T, intent: SnapshotEditIntent,
): DomainError[] {
  const invalid = (message: string) => [error("ACTUALS_INTENT_MISMATCH", "intent", message)];
  const old = previous?.coverage;
  const next = candidate.coverage;
  if (intent.kind === "initial" || intent.kind === "reconcile") {
    return previous ? invalid("Initial knowledge requires no prior snapshot.") : [];
  }
  if (!previous) return invalid("This operation needs an existing snapshot.");
  if (intent.kind === "raf-only") {
    if (!("raf" in candidate)) return invalid("RAF-only applies only to Projects.");
    const oldState = { ...previous, raf: (candidate as ProjectActualsSnapshot).raf } as T;
    return canonicalActualsKnowledge(oldState, true) === canonicalActualsKnowledge(candidate, true) ? [] : invalid("RAF-only cannot change coverage or membership.");
  }
  if (intent.kind === "membership") {
    const membershipChanged = previous.participation.join("\u0000") !== candidate.participation.join("\u0000");
    const samePartition = old?.actualsFrom === next?.actualsFrom && old?.actualsThrough === next?.actualsThrough &&
      (old?.periods.length ?? 0) === (next?.periods.length ?? 0) &&
      (old?.periods.every((period, index) => period.from === next?.periods[index]?.from && period.through === next?.periods[index]?.through) ?? true);
    return membershipChanged && samePartition ? [] : invalid("Membership operation cannot change the partition.");
  }
  if (intent.kind === "extension") {
    if (!old || !next || next.actualsFrom > old.actualsFrom || next.actualsThrough < old.actualsThrough ||
        (next.actualsFrom === old.actualsFrom && next.actualsThrough === old.actualsThrough)) {
      return invalid("Extension must grow coverage without erosion.");
    }
    for (const period of old.periods) {
      const copied = next.periods.find((item) => item.periodId === period.periodId);
      if (!copied || copied.from !== period.from || copied.through !== period.through ||
          copied.consumed.length !== period.consumed.length || period.consumed.some((row) =>
            !same(row, copied.consumed.find((item) => item.teamId === row.teamId)))) {
        return invalid("Extension must copy previous periods unchanged.");
      }
    }
    return [];
  }
  if (intent.kind === "erosion") {
    if (!old || next && (next.actualsFrom < old.actualsFrom || next.actualsThrough > old.actualsThrough ||
        next.actualsFrom === old.actualsFrom && next.actualsThrough === old.actualsThrough)) {
      return invalid("Erosion must remove or trim coverage at its edges.");
    }
    for (const period of old.periods) {
      if (!next || period.from < next.actualsFrom || period.through > next.actualsThrough) continue;
      const copied = next.periods.find((item) => item.periodId === period.periodId);
      if (!copied || copied.from !== period.from || copied.through !== period.through ||
          copied.consumed.length !== period.consumed.length || period.consumed.some((row) =>
            !same(row, copied.consumed.find((item) => item.teamId === row.teamId)))) {
        return invalid("Erosion must copy every fully retained period unchanged.");
      }
    }
    return [];
  }
  if (intent.kind !== "replace") return invalid("Unknown Actuals operation intent.");
  const { editedZone } = intent;
  if (editedZone.from > editedZone.through) return invalid("Edited zone dates are reversed.");
  const outside = (period: ActualsPeriod) => period.through < editedZone.from || period.from > editedZone.through;
  for (const period of old?.periods ?? []) {
    if (!outside(period)) continue;
    const copied = next?.periods.find((item) => item.periodId === period.periodId);
    if (!copied || copied.from !== period.from || copied.through !== period.through ||
        copied.consumed.length !== period.consumed.length || period.consumed.some((row) =>
          !same(row, copied.consumed.find((item) => item.teamId === row.teamId)))) {
      return invalid("Periods outside the edited zone must be copied verbatim.");
    }
  }
  if (next?.periods.some((period) => outside(period) && !(old?.periods.some((prior) => prior.periodId === period.periodId)))) {
    return invalid("New periods must lie in the edited zone.");
  }
  return [];
}

function replace<T extends ProjectActualsSnapshot | ReservationActualsSnapshot>(
  kind: "project" | "reservation", objectId: ProjectId | ReservationId,
  history: readonly T[], input: SnapshotReplacement<T>, currentRaf?: ProjectActualsSnapshot["raf"],
): DomainResult<readonly T[]> {
  const previous = history.at(-1);
  if (input.baseVersion !== (previous?.version ?? 0)) return failure([error("STALE_SNAPSHOT_VERSION", "baseVersion", "Actuals draft is stale.")]);
  if (previous && compareCivilDates(input.knowledgeDate, previous.knowledgeDate) < 0) {
    return failure([error("KNOWLEDGE_DATE_REVERSED", "knowledgeDate", "Application clock cannot move backward.")]);
  }
  const order = new Map(input.current.participation.map((id, index) => [id, index]));
  const normalizedCoverage = input.current.coverage === undefined ? undefined : {
    ...input.current.coverage,
    periods: [...input.current.coverage.periods].sort((a, b) => a.from.localeCompare(b.from) || a.through.localeCompare(b.through))
      .map((period) => ({ ...period, consumed: [...period.consumed].sort((a, b) =>
        (order.get(a.teamId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.teamId) ?? Number.MAX_SAFE_INTEGER)) })),
  };
  const normalized = { ...input.current,
    ...(normalizedCoverage === undefined ? {} : { coverage: normalizedCoverage }),
    ...("raf" in input.current ? { raf: [...(input.current as unknown as ProjectActualsSnapshot).raf].sort((a, b) =>
      (order.get(a.teamId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.teamId) ?? Number.MAX_SAFE_INTEGER)) } : {}),
  };
  const next = { ...normalized, snapshotId: snapshotId(kind, objectId, input.baseVersion + 1),
    version: input.baseVersion + 1, knowledgeDate: input.knowledgeDate } as unknown as T;
  const validated = kind === "project"
    ? createProjectActualsSnapshot(next as ProjectActualsSnapshot, objectId as ProjectId)
    : createReservationActualsSnapshot(next, objectId as ReservationId);
  if (!validated.ok) return failure(validated.errors);
  if (kind === "reservation" && !previous && !next.coverage) {
    return failure([error("RESERVATION_FIRST_COVERAGE", "coverage", "First Reservation snapshot needs explicit coverage.")]);
  }
  if (previous && canonicalActualsKnowledge(previous, true) === canonicalActualsKnowledge(next, true)) {
    const identities = validateTransition(previous, next, input.evidence, kind === "project", currentRaf).filter(e => e.code === "UNCHANGED_PERIOD_ID" || e.code === "PERIOD_ID_REUSED");
    return identities.length ? failure(identities) : success(history);
  }
  const errors = [...validateIntent(previous, next, input.intent),
    ...validateTransition(previous, next, input.evidence, kind === "project", currentRaf)];
  if (errors.length) return failure(errors);
  return success(Object.freeze([...history, validated.value as T]));
}

export function replaceProjectSnapshot(
  objectId: ProjectId, history: readonly ProjectActualsSnapshot[], input: SnapshotReplacement<ProjectActualsSnapshot>, currentRaf?: ProjectActualsSnapshot["raf"],
): DomainResult<readonly ProjectActualsSnapshot[]> {
  return replace("project", objectId, history, input, currentRaf);
}

export function replaceReservationSnapshot(
  objectId: ReservationId, history: readonly ReservationActualsSnapshot[], input: SnapshotReplacement<ReservationActualsSnapshot>,
): DomainResult<readonly ReservationActualsSnapshot[]> {
  return replace("reservation", objectId, history, input);
}

export function validateProjectSnapshotIdentities(previous: ProjectActualsSnapshot, candidate: ProjectActualsSnapshot): readonly DomainError[] {
  return validateTransition(previous, candidate, { consumedCells: [] }, false).filter(e => e.code === "UNCHANGED_PERIOD_ID" || e.code === "PERIOD_ID_REUSED");
}
