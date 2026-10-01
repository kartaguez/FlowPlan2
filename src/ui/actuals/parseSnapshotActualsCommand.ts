import { parseExactQuantityInput, type ReplaceProjectActualsCommand, type ReplaceReservationActualsCommand,
  type SnapshotActualsViewModel } from "../../application/index.js";
import { capacityFromSerialized, consumedWorkloadFromSerialized, createCivilDate, isZero, rationalOf,
  remainingWorkloadFromSerialized, reservationRatioFromSerialized, serializeQuantity,
  type DomainError, type TeamId } from "../../domain/index.js";
import type { SnapshotEditIntent } from "../../domain/index.js";
import type { SnapshotActualsDraft } from "./snapshotActualsDraftStore.js";

export type ParsedSnapshotActualsCommand =
  | Readonly<{ ok: true; command: ReplaceProjectActualsCommand | ReplaceReservationActualsCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

const error = (path: string, message: string): DomainError => ({ code: "INVALID_ACTUALS_DRAFT", path, message });

export function parseSnapshotActualsCommand(model: SnapshotActualsViewModel, draft: SnapshotActualsDraft): ParsedSnapshotActualsCommand {
  const errors: DomainError[] = [];
  if (draft.stale || draft.baseVersion !== (model.snapshots.at(-1)?.version ?? 0) ||
      draft.baseSnapshotId !== model.snapshots.at(-1)?.snapshotId) {
    errors.push(error("baseVersion", "Actuals draft is stale; review the current snapshot."));
  }
  if (!draft.confirmed) errors.push(error("confirmation", "Confirm the complete current knowledge before Apply."));
  const enabled = draft.teams.filter((row) => row.enabled);
  const participation = enabled.map((row) => row.teamId);
  const old = model.snapshots.at(-1);
  const historicallySeen = new Set<TeamId>([
    ...(old?.participation ?? []), ...(old?.retiredZeroTeams ?? []),
    ...(model.legacyV4Actuals?.records.flatMap((record) => record.teams.map((row) => row.teamId)) ?? []),
  ]);
  const retiredZeroTeams = model.teams.map((row) => row.teamId).filter((id) => historicallySeen.has(id) && !participation.includes(id));
  const removed = old?.participation.filter((id) => !participation.includes(id)) ?? [];
  if (removed.length && !draft.retirementConfirmed) errors.push(error("retirementConfirmation", "Confirm that each retired Team has current Actuals and RAF exactly zero."));
  const periods = draft.periods.map((row, index) => {
    const from = createCivilDate(row.from, `periods[${index}].from`);
    const through = createCivilDate(row.through, `periods[${index}].through`);
    if (!from.ok) errors.push(...from.errors);
    if (!through.ok) errors.push(...through.errors);
    const consumed = enabled.map((team) => {
      let text = row.values.find((value) => value.teamId === team.teamId)?.text ?? "";
      if (text.trim() === "" && from.ok && through.ok && old?.participation.includes(team.teamId) && old.coverage &&
          from.value >= old.coverage.actualsFrom && through.value <= old.coverage.actualsThrough) {
        const overlapping = old.coverage.periods.filter((period) => period.from <= through.value && period.through >= from.value);
        if (overlapping.length && overlapping.every((period) =>
          isZero(rationalOf(period.consumed.find((item) => item.teamId === team.teamId)!.amount)))) text = "0";
      }
      const exact = parseExactQuantityInput(text);
      const value = exact === undefined ? undefined : consumedWorkloadFromSerialized(exact);
      if (!value?.ok) errors.push(error(`periods[${index}].${team.teamId}`, "Enter an exact nonnegative consumed value."));
      return value?.ok ? { teamId: team.teamId, amount: value.value } : undefined;
    }).filter((item): item is NonNullable<typeof item> => item !== undefined);
    const prior = old?.coverage?.periods.find((period) => period.periodId === row.originalPeriodId);
    const unchanged = prior && from.ok && through.ok && prior.from === from.value && prior.through === through.value &&
      prior.consumed.length === consumed.length && consumed.every((item) =>
        prior.consumed.some((before) => before.teamId === item.teamId && serializeQuantity(before.amount) === serializeQuantity(item.amount)));
    const periodId = unchanged ? prior.periodId : `${model.kind}:${model.id}:v${draft.baseVersion + 1}:p${index + 1}`;
    return from.ok && through.ok ? { periodId, from: from.value, through: through.value, consumed } : undefined;
  }).filter((item): item is NonNullable<typeof item> => item !== undefined);
  const coverage = periods.length ? { actualsFrom: periods[0]!.from, actualsThrough: periods.at(-1)!.through, periods } : undefined;
  const membershipChanged = old !== undefined &&
    (old.participation.length !== participation.length || old.participation.some((id, index) => id !== participation[index]));
  const samePartition = old?.coverage?.actualsFrom === coverage?.actualsFrom && old?.coverage?.actualsThrough === coverage?.actualsThrough &&
    (old?.coverage?.periods.length ?? 0) === (coverage?.periods.length ?? 0) &&
    (old?.coverage?.periods.every((period, index) => period.from === coverage?.periods[index]?.from &&
      period.through === coverage?.periods[index]?.through) ?? true);
  let intent: SnapshotEditIntent;
  if (!old) intent = { kind: model.legacyV4Actuals ? "reconcile" : "initial" };
  else if (membershipChanged && samePartition) intent = { kind: "membership" };
  else if (membershipChanged) {
    const from = [old.coverage?.actualsFrom, coverage?.actualsFrom].filter((value): value is NonNullable<typeof value> => value !== undefined).sort()[0];
    const through = [old.coverage?.actualsThrough, coverage?.actualsThrough].filter((value): value is NonNullable<typeof value> => value !== undefined).sort().at(-1);
    if (!from || !through) return { ok: false, errors: [...errors, error("coverage", "A combined membership and partition edit needs an edited zone.")] };
    intent = { kind: "replace", editedZone: { from, through } };
  }
  else if (old.coverage && (!coverage || coverage.actualsFrom > old.coverage.actualsFrom || coverage.actualsThrough < old.coverage.actualsThrough)) {
    intent = { kind: "erosion" };
  } else if (old.coverage && coverage &&
      (coverage.actualsFrom < old.coverage.actualsFrom || coverage.actualsThrough > old.coverage.actualsThrough) &&
      old.coverage.periods.every((period) => coverage.periods.some((item) => item.periodId === period.periodId))) {
    intent = { kind: "extension" };
  } else if (model.kind === "project" && samePartition && !membershipChanged &&
      old.coverage?.periods.every((period, index) => period.periodId === coverage?.periods[index]?.periodId) !== false) {
    intent = { kind: "raf-only" };
  } else {
    const from = old.coverage?.actualsFrom ?? coverage?.actualsFrom;
    const through = coverage?.actualsThrough ?? old.coverage?.actualsThrough;
    if (!from || !through) return { ok: false, errors: [...errors, error("coverage", "A replacement needs an edited zone.")] };
    intent = { kind: "replace", editedZone: { from, through } };
  }
  if (model.kind === "project") {
    const raf = enabled.map((row) => {
      const exact = parseExactQuantityInput(row.raf);
      const amount = exact === undefined ? undefined : remainingWorkloadFromSerialized(exact);
      if (!amount?.ok) errors.push(error(`raf.${row.teamId}`, "Enter an exact nonnegative RAF."));
      return amount?.ok ? { teamId: row.teamId, amount: amount.value } : undefined;
    }).filter((item): item is NonNullable<typeof item> => item !== undefined);
    if (errors.length) return { ok: false, errors };
    return { ok: true, command: { kind: "replace-project-actuals", projectId: model.id as ReplaceProjectActualsCommand["projectId"],
      baseVersion: draft.baseVersion, teamRequirements: enabled.map((row) => {
        const source = model.teams.find((team) => team.teamId === row.teamId)!;
        return { teamId: row.teamId, ...(source.dailyCap === undefined ? {} : { dailyCap: source.dailyCap }) };
      }),
      current: { participation, retiredZeroTeams, raf, ...(coverage === undefined ? {} : { coverage }) },
      intent,
      evidence: { consumedCells: periods.flatMap((period) => period.consumed.map((row) => ({ periodId: period.periodId, teamId: row.teamId }))),
        rafTeams: participation, retiredTeams: removed },
    } };
  }
  const allocations = enabled.map((row) => {
    const exact = parseExactQuantityInput(row.allocationValue);
    const result = exact === undefined ? undefined : row.allocationKind === "ratio"
      ? reservationRatioFromSerialized(exact) : capacityFromSerialized(exact);
    if (!result?.ok) errors.push(error(`allocations.${row.teamId}`, "Enter an exact valid Reservation allocation."));
    if (!result?.ok) return undefined;
    return row.allocationKind === "ratio" ? { teamId: row.teamId, kind: "ratio" as const,
      ratio: result.value as ReturnType<typeof reservationRatioFromSerialized> extends { ok: true; value: infer T } ? T : never }
      : { teamId: row.teamId, kind: "fixed-daily" as const,
        dailyCapacity: result.value as ReturnType<typeof capacityFromSerialized> extends { ok: true; value: infer T } ? T : never };
  }).filter((item): item is NonNullable<typeof item> => item !== undefined);
  if (errors.length) return { ok: false, errors };
  return { ok: true, command: { kind: "replace-reservation-actuals", reservationId: model.id as ReplaceReservationActualsCommand["reservationId"],
    baseVersion: draft.baseVersion, teamAllocations: allocations,
    intent,
    current: { participation, retiredZeroTeams, ...(coverage === undefined ? {} : { coverage }) },
    evidence: { consumedCells: periods.flatMap((period) => period.consumed.map((row) => ({ periodId: period.periodId, teamId: row.teamId }))),
      retiredTeams: removed },
  } };
}
