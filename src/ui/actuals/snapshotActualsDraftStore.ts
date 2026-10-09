import { parseExactQuantityInput, type SnapshotActualsViewModel, type UpdateProjectCommand,
  type UpdateReservationCommand } from "../../application/index.js";
import { serializeQuantity, type TeamId } from "../../domain/index.js";

export interface SnapshotPeriodDraft {
  readonly originalPeriodId?: string;
  readonly from: string;
  readonly through: string;
  readonly values: readonly Readonly<{ teamId: TeamId; text: string; provenance?: "copied" | "user-entered" | "user-confirmed" | "domain-zero-propagated" | "needs-confirmation" }>[];
}
export interface SnapshotTeamDraft {
  readonly teamId: TeamId;
  readonly enabled: boolean;
  readonly raf: string;
  readonly rafConfirmed?: boolean;
  readonly allocationKind: "ratio" | "fixed-daily";
  readonly allocationValue: string;
}
export interface SnapshotActualsDraft {
  readonly model: SnapshotActualsViewModel;
  readonly baseModel: SnapshotActualsViewModel;
  readonly open: boolean;
  readonly baseVersion: number;
  readonly baseSnapshotId?: string;
  readonly periods: readonly SnapshotPeriodDraft[];
  readonly teams: readonly SnapshotTeamDraft[];
  readonly baseline: string;
  readonly stale: boolean;
  readonly confirmed: boolean;
  readonly retirementConfirmed: boolean;
  readonly errors: readonly string[];
  readonly handoff?: UpdateProjectCommand | UpdateReservationCommand;
  readonly modal?: Readonly<{
    step: 1 | 2 | 3;
    selection: Readonly<{ from: number; through: number }> | "before" | "after" | "initial";
    periods: readonly SnapshotPeriodDraft[];
    teams: readonly SnapshotTeamDraft[];
    confirmed: boolean;
    retirementConfirmed: boolean;
    anchor: number;
    prepared?: boolean;
    handoff?: UpdateProjectCommand | UpdateReservationCommand;
  }>;
}

function values(draft: Pick<SnapshotActualsDraft, "periods" | "teams">): string {
  const exact = (text: string) => parseExactQuantityInput(text) ?? text;
  return JSON.stringify({ periods: draft.periods.map((row) => ({ from: row.from, through: row.through,
    values: row.values.map((cell) => ({ teamId: cell.teamId, value: exact(cell.text) })) })),
    teams: draft.teams.map((row) => ({ teamId: row.teamId, enabled: row.enabled, raf: exact(row.raf),
      allocationKind: row.allocationKind, allocationValue: exact(row.allocationValue) })) });
}

function fromModel(model: SnapshotActualsViewModel): SnapshotActualsDraft {
  const current = model.snapshots.at(-1);
  const periods = current?.coverage?.periods.map((period) => ({ originalPeriodId: period.periodId,
    from: period.from, through: period.through,
    values: period.consumed.map((row) => ({ teamId: row.teamId, text: serializeQuantity(row.amount), provenance: "copied" as const })) })) ?? [];
  const teams = model.teams.map((team) => {
    const amount = team.reservationAmount;
    return { teamId: team.teamId, enabled: team.participating,
      raf: team.forecastRaf ? serializeQuantity(team.forecastRaf) : "",
      rafConfirmed: false,
      allocationKind: amount?.kind ?? "ratio" as const,
      allocationValue: amount ? serializeQuantity(amount.kind === "ratio" ? amount.ratio : amount.dailyCapacity) : "",
    };
  });
  return { model, baseModel: model, open: false, baseVersion: current?.version ?? 0,
    ...(current ? { baseSnapshotId: current.snapshotId } : {}), periods, teams,
    baseline: values({ periods, teams }), stale: false, confirmed: false, retirementConfirmed: false, errors: [] };
}

export interface SnapshotActualsDraftStore {
  readonly get: (id: string) => SnapshotActualsDraft | undefined;
  readonly ids: () => readonly string[];
  readonly initialize: (model: SnapshotActualsViewModel) => SnapshotActualsDraft;
  readonly update: (id: string, draft: SnapshotActualsDraft) => void;
  readonly isDirty: (id: string) => boolean;
  readonly rebase: (model: SnapshotActualsViewModel) => void;
  readonly review: (id: string) => boolean;
  readonly cancel: (id: string) => void;
}

export function createSnapshotActualsDraftStore(): SnapshotActualsDraftStore {
  const entries = new Map<string, SnapshotActualsDraft>();
  return Object.freeze({
    get: (id: string) => entries.get(id), ids: () => [...entries.keys()],
    initialize: (model: SnapshotActualsViewModel) => {
      const existing = entries.get(model.id);
      if (existing) return existing;
      const draft = fromModel(model);
      entries.set(model.id, draft);
      return draft;
    },
    update: (id: string, draft: SnapshotActualsDraft) => { entries.set(id, draft); },
    isDirty: (id: string) => {
      const draft = entries.get(id);
      if (!draft) return false;
      const modal = draft.modal;
      const untouchedInitial = modal?.selection === "initial" && modal.periods.length === 1 &&
        modal.periods[0]?.from === "" && modal.periods[0]?.through === "" &&
        modal.periods[0]?.values.every((cell) => cell.text === "") &&
        values({ periods: draft.periods, teams: modal.teams }) === values(draft);
      return values(draft) !== draft.baseline ||
        modal !== undefined && !untouchedInitial && values(modal) !== values(draft);
    },
    rebase: (model: SnapshotActualsViewModel) => {
      const old = entries.get(model.id);
      if (!old) return;
      const version = model.snapshots.at(-1)?.version ?? 0;
      const membershipChanged = old.model.teams.length !== model.teams.length || old.model.teams.some((team, index) => team.participating !== model.teams[index]?.participating || team.teamId !== model.teams[index]?.teamId);
      if (version !== old.baseVersion || membershipChanged || JSON.stringify(model.currentBase) !== JSON.stringify(old.baseModel.currentBase) || JSON.stringify(model.teams.map(t => t.reservationAmount && [t.teamId, t.reservationAmount.kind, serializeQuantity(t.reservationAmount.kind === "ratio" ? t.reservationAmount.ratio : t.reservationAmount.dailyCapacity)])) !== JSON.stringify(old.baseModel.teams.map(t => t.reservationAmount && [t.teamId, t.reservationAmount.kind, serializeQuantity(t.reservationAmount.kind === "ratio" ? t.reservationAmount.ratio : t.reservationAmount.dailyCapacity)]))) {
        const opening = fromModel(old.baseModel);
        const localTextChanged = old.teams.some((row, i) => row.raf !== opening.teams[i]?.raf || row.allocationValue !== opening.teams[i]?.allocationValue) ||
          old.periods.some((period, i) => period.values.some(cell => cell.text !== opening.periods[i]?.values.find(row => row.teamId === cell.teamId)?.text));
        if (values(old) === old.baseline && !localTextChanged && !old.modal) entries.set(model.id, { ...fromModel(model), open: old.open });
        else {
          const base = fromModel(old.baseModel);
          const fresh = fromModel(model);
          const partition = (draft: SnapshotActualsDraft) => JSON.stringify(draft.periods.map((row) =>
            [row.from, row.through]));
          const localPartitionChanged = partition(old) !== partition(base);
          const remotePartitionChanged = partition(fresh) !== partition(base);
          const localMembershipChanged = old.teams.some((row, index) => row.enabled !== base.teams[index]?.enabled);
          const sourceCompatible = old.baseModel.currentBase?.source === model.currentBase?.source ||
            old.baseModel.currentBase?.source.startsWith('["snapshot",') && model.currentBase?.source.startsWith('["snapshot",');
          const parametersCompatible = JSON.stringify(old.baseModel.currentBase?.requirements.map(row => [row.teamId, row.dailyCap])) === JSON.stringify(model.currentBase?.requirements.map(row => [row.teamId, row.dailyCap]));
          const canRebase = sourceCompatible && parametersCompatible && !membershipChanged && !localMembershipChanged && !localPartitionChanged && !remotePartitionChanged &&
            old.periods.length === fresh.periods.length && old.teams.length === fresh.teams.length;
          let conflict = !canRebase;
          const merge = (before: string | boolean, local: typeof before, remote: typeof before) => {
            if (local !== before && remote !== before && local !== remote) conflict = true;
            return local !== before ? local : remote;
          };
          const mergeExact = (before: string, local: string, remote: string): string => {
            const canonical = (value: string) => parseExactQuantityInput(value) ?? value;
            if (canonical(local) !== canonical(before) && canonical(remote) !== canonical(before) &&
              canonical(local) !== canonical(remote)) conflict = true;
            return canonical(local) !== canonical(before) || canonical(remote) === canonical(before) ? local : remote;
          };
          const teams = canRebase ? fresh.teams.map((row, index) => {
            const before = base.teams[index]!;
            const local = old.teams[index]!;
            if (row.teamId !== before.teamId || local.teamId !== before.teamId) conflict = true;
            return { ...row, enabled: merge(before.enabled, local.enabled, row.enabled) as boolean,
              raf: mergeExact(before.raf, local.raf, row.raf),
              rafConfirmed: parseExactQuantityInput(before.raf) === parseExactQuantityInput(row.raf) &&
                base.periods.every((period, i) => parseExactQuantityInput(period.values.find(cell => cell.teamId === row.teamId)?.text ?? "") === parseExactQuantityInput(fresh.periods[i]?.values.find(cell => cell.teamId === row.teamId)?.text ?? "")) ? local.rafConfirmed ?? false : false,
              allocationKind: merge(before.allocationKind, local.allocationKind, row.allocationKind) as typeof row.allocationKind,
              allocationValue: merge(before.allocationValue, local.allocationValue, row.allocationValue) as string };
          }) : old.teams;
          const periods = canRebase ? fresh.periods.map((row, index) => ({ ...row,
            values: row.values.map((cell) => {
              const before = base.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              const local = old.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              if (!before || !local) { conflict = true; return cell; }
              return { ...local, text: mergeExact(before.text, local.text, cell.text), provenance: parseExactQuantityInput(before.text) === parseExactQuantityInput(cell.text) ? local.provenance ?? "copied" as const : "copied" as const };
            }),
          })) : old.periods;
          entries.set(model.id, conflict || old.modal ? { ...old, model, stale: true,
            errors: ["Actuals changed in the same field or partition. Cancel and review the current snapshot before applying."] }
            : { ...fresh, open: old.open, periods, teams, confirmed: false, retirementConfirmed: false });
        }
      } else entries.set(model.id, { ...old, model });
    },
    review: (id: string) => {
      const old = entries.get(id);
      if (!old?.stale || !old.modal) return false;
      const base = fromModel(old.baseModel);
      const fresh = fromModel(old.model);
      if (old.baseModel.currentBase?.source !== old.model.currentBase?.source &&
          !(old.baseModel.currentBase?.source.startsWith('["snapshot",') && old.model.currentBase?.source.startsWith('["snapshot",'))) return false;
      if (JSON.stringify(old.baseModel.currentBase?.requirements.map(row => [row.teamId, row.dailyCap])) !== JSON.stringify(old.model.currentBase?.requirements.map(row => [row.teamId, row.dailyCap]))) return false;
      const periodValues = (periods: readonly SnapshotPeriodDraft[]) => values({ periods, teams: [] });
      if (periodValues(old.modal.periods) !== periodValues(base.periods) ||
          periodValues(fresh.periods) !== periodValues(base.periods) ||
          old.modal.teams.some((row, index) => row.teamId !== base.teams[index]?.teamId ||
            row.enabled !== base.teams[index]?.enabled || row.enabled !== fresh.teams[index]?.enabled)) return false;
      let conflict = false;
      const mergeRaf = (before: string, local: string, remote: string): string => {
        const canonical = (text: string) => parseExactQuantityInput(text) ?? text;
        const localChanged = canonical(local) !== canonical(before);
        const remoteChanged = canonical(remote) !== canonical(before);
        if (localChanged && remoteChanged && canonical(local) !== canonical(remote)) conflict = true;
        return localChanged || !remoteChanged ? local : remote;
      };
      const teams = fresh.teams.map((row, index) => ({ ...row,
        raf: mergeRaf(base.teams[index]!.raf, old.teams[index]!.raf, row.raf), rafConfirmed: false }));
      const modalTeams = fresh.teams.map((row, index) => ({ ...row,
        raf: mergeRaf(base.teams[index]!.raf, old.modal!.teams[index]!.raf, row.raf), rafConfirmed: false }));
      if (conflict) return false;
      entries.set(id, { ...fresh, teams, modal: { ...old.modal, periods: fresh.periods,
        teams: modalTeams, confirmed: false, retirementConfirmed: false }, stale: false });
      return true;
    },
    cancel: (id: string) => { entries.delete(id); },
  });
}
