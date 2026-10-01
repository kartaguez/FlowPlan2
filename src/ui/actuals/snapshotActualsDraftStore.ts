import type { SnapshotActualsViewModel } from "../../application/index.js";
import { serializeQuantity, type TeamId } from "../../domain/index.js";

export interface SnapshotPeriodDraft {
  readonly originalPeriodId?: string;
  readonly from: string;
  readonly through: string;
  readonly values: readonly Readonly<{ teamId: TeamId; text: string }>[];
}
export interface SnapshotTeamDraft {
  readonly teamId: TeamId;
  readonly enabled: boolean;
  readonly raf: string;
  readonly allocationKind: "ratio" | "fixed-daily";
  readonly allocationValue: string;
}
export interface SnapshotActualsDraft {
  readonly model: SnapshotActualsViewModel;
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
}

function values(draft: Pick<SnapshotActualsDraft, "periods" | "teams">): string {
  return JSON.stringify({ periods: draft.periods, teams: draft.teams });
}

function fromModel(model: SnapshotActualsViewModel): SnapshotActualsDraft {
  const current = model.snapshots.at(-1);
  const periods = current?.coverage?.periods.map((period) => ({ originalPeriodId: period.periodId,
    from: period.from, through: period.through,
    values: period.consumed.map((row) => ({ teamId: row.teamId, text: serializeQuantity(row.amount) })) })) ?? [];
  const raf = "raf" in (current ?? {}) ? new Map((current as Extract<typeof current, { raf: unknown }>).raf.map((row) => [row.teamId, row.amount])) : new Map();
  const teams = model.teams.map((team) => {
    const amount = team.reservationAmount;
    return { teamId: team.teamId, enabled: team.participating,
      raf: raf.has(team.teamId) ? serializeQuantity(raf.get(team.teamId)!) : "",
      allocationKind: amount?.kind ?? "ratio" as const,
      allocationValue: amount ? serializeQuantity(amount.kind === "ratio" ? amount.ratio : amount.dailyCapacity) : "",
    };
  });
  return { model, open: false, baseVersion: current?.version ?? 0,
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
      return draft !== undefined && values(draft) !== draft.baseline;
    },
    rebase: (model: SnapshotActualsViewModel) => {
      const old = entries.get(model.id);
      if (!old) return;
      const version = model.snapshots.at(-1)?.version ?? 0;
      const membershipChanged = old.model.teams.some((team, index) => team.participating !== model.teams[index]?.participating || team.teamId !== model.teams[index]?.teamId);
      if (version !== old.baseVersion || membershipChanged) {
        if (values(old) === old.baseline) entries.set(model.id, { ...fromModel(model), open: old.open });
        else {
          const base = fromModel(old.model);
          const fresh = fromModel(model);
          const partition = (draft: SnapshotActualsDraft) => JSON.stringify(draft.periods.map((row) =>
            [row.from, row.through]));
          const localPartitionChanged = partition(old) !== partition(base);
          const remotePartitionChanged = partition(fresh) !== partition(base);
          const localMembershipChanged = old.teams.some((row, index) => row.enabled !== base.teams[index]?.enabled);
          const canRebase = !membershipChanged && !localMembershipChanged && !localPartitionChanged && !remotePartitionChanged &&
            old.periods.length === fresh.periods.length && old.teams.length === fresh.teams.length;
          let conflict = !canRebase;
          const merge = (before: string | boolean, local: typeof before, remote: typeof before) => {
            if (local !== before && remote !== before && local !== remote) conflict = true;
            return local !== before ? local : remote;
          };
          const teams = canRebase ? fresh.teams.map((row, index) => {
            const before = base.teams[index]!;
            const local = old.teams[index]!;
            if (row.teamId !== before.teamId || local.teamId !== before.teamId) conflict = true;
            return { ...row, enabled: merge(before.enabled, local.enabled, row.enabled) as boolean,
              raf: merge(before.raf, local.raf, row.raf) as string,
              allocationKind: merge(before.allocationKind, local.allocationKind, row.allocationKind) as typeof row.allocationKind,
              allocationValue: merge(before.allocationValue, local.allocationValue, row.allocationValue) as string };
          }) : old.teams;
          const periods = canRebase ? fresh.periods.map((row, index) => ({ ...row,
            values: row.values.map((cell) => {
              const before = base.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              const local = old.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              if (!before || !local) { conflict = true; return cell; }
              return { ...cell, text: merge(before.text, local.text, cell.text) as string };
            }),
          })) : old.periods;
          entries.set(model.id, conflict ? { ...old, model, stale: true,
            errors: ["Actuals changed in the same field or partition. Cancel and review the current snapshot before applying."] }
            : { ...fresh, open: old.open, periods, teams, confirmed: false, retirementConfirmed: false });
        }
      } else entries.set(model.id, { ...old, model });
    },
    cancel: (id: string) => { entries.delete(id); },
  });
}
