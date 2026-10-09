import { formatActualsQuantity, parseExactQuantityInput, type SnapshotActualsViewModel, type UpdateProjectCommand,
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

// Cache is weakly owned by immutable draft cells/rows. It holds at most one
// reading per field of a live row; old text is not retained after replacement.
const quantityReadings = new WeakMap<object, Map<string, { text: string; exact: string }>>();
function readDraftQuantity(owner: object, field: string, text: string): string {
  const readings = quantityReadings.get(owner) ?? new Map();
  const previous = readings.get(field);
  if (previous?.text === text) return previous.exact;
  const exact = parseExactQuantityInput(text) ?? text;
  readings.set(field, { text, exact }); quantityReadings.set(owner, readings);
  return exact;
}

function values(draft: Pick<SnapshotActualsDraft, "periods" | "teams">): string {
  return JSON.stringify({ periods: draft.periods.map((row) => ({ from: row.from, through: row.through,
    values: row.values.map((cell) => ({ teamId: cell.teamId, value: readDraftQuantity(cell, "text", cell.text) })) })),
    teams: draft.teams.map((row) => ({ teamId: row.teamId, enabled: row.enabled, raf: readDraftQuantity(row, "raf", row.raf),
      allocationKind: row.allocationKind, allocationValue: readDraftQuantity(row, "allocation", row.allocationValue) })) });
}

const modelDrafts = new WeakMap<SnapshotActualsViewModel, SnapshotActualsDraft>();
function rememberQuantity(owner: object, field: string, text: string, exact: string): void {
  const readings = quantityReadings.get(owner) ?? new Map();
  readings.set(field, { text, exact }); quantityReadings.set(owner, readings);
}
function fromModel(model: SnapshotActualsViewModel): SnapshotActualsDraft {
  const cached = modelDrafts.get(model);
  if (cached) return cached;
  const current = model.snapshots.at(-1);
  const periods = current?.coverage?.periods.map((period) => ({ originalPeriodId: period.periodId,
    from: period.from, through: period.through,
    values: period.consumed.map((row) => {
      const cell = { teamId: row.teamId, text: formatActualsQuantity(row.amount), provenance: "copied" as const };
      rememberQuantity(cell, "text", cell.text, serializeQuantity(row.amount));
      return cell;
    }) })) ?? [];
  const teams = model.teams.map((team) => {
    const amount = team.reservationAmount;
    const row = { teamId: team.teamId, enabled: team.participating,
      raf: team.forecastRaf ? formatActualsQuantity(team.forecastRaf) : "",
      rafConfirmed: false,
      allocationKind: amount?.kind ?? "ratio" as const,
      allocationValue: amount ? serializeQuantity(amount.kind === "ratio" ? amount.ratio : amount.dailyCapacity) : "",
    };
    if (team.forecastRaf) rememberQuantity(row, "raf", row.raf, serializeQuantity(team.forecastRaf));
    return row;
  });
  const draft: SnapshotActualsDraft = { model, baseModel: model, open: false, baseVersion: current?.version ?? 0,
    ...(current ? { baseSnapshotId: current.snapshotId } : {}), periods, teams,
    baseline: values({ periods, teams }), stale: false, confirmed: false, retirementConfirmed: false, errors: [] };
  modelDrafts.set(model, draft);
  return draft;
}

// Operation-local cache: no global text history, budget or persistent authority.
// Validated opening/recent cells seed exact readings; local text is still parsed.
function draftReader(...drafts: readonly SnapshotActualsDraft[]): (text: string) => string | undefined {
  const readings = new Map<string, string | undefined>();
  for (const draft of drafts) {
    for (const row of draft.teams) {
      if (row.raf !== "") readings.set(row.raf, readDraftQuantity(row, "raf", row.raf));
    }
    for (const period of draft.periods) for (const cell of period.values) {
      if (cell.text !== "") readings.set(cell.text, readDraftQuantity(cell, "text", cell.text));
    }
  }
  return text => {
    if (!readings.has(text)) readings.set(text, parseExactQuantityInput(text));
    return readings.get(text);
  };
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
          const parseExact = draftReader(base, fresh);
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
            const canonical = (value: string) => parseExact(value) ?? value;
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
              rafConfirmed: parseExact(before.raf) === parseExact(row.raf) &&
                base.periods.every((period, i) => parseExact(period.values.find(cell => cell.teamId === row.teamId)?.text ?? "") === parseExact(fresh.periods[i]?.values.find(cell => cell.teamId === row.teamId)?.text ?? "")) ? local.rafConfirmed ?? false : false,
              allocationKind: merge(before.allocationKind, local.allocationKind, row.allocationKind) as typeof row.allocationKind,
              allocationValue: merge(before.allocationValue, local.allocationValue, row.allocationValue) as string };
          }) : old.teams;
          const periods = canRebase ? fresh.periods.map((row, index) => ({ ...row,
            values: row.values.map((cell) => {
              const before = base.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              const local = old.periods[index]?.values.find((item) => item.teamId === cell.teamId);
              if (!before || !local) { conflict = true; return cell; }
              return { ...local, text: mergeExact(before.text, local.text, cell.text), provenance: parseExact(before.text) === parseExact(cell.text) ? local.provenance ?? "copied" as const : "copied" as const };
            }),
          })) : old.periods;
          for (const row of teams) {
            const exact = parseExact(row.raf);
            if (exact !== undefined) rememberQuantity(row, "raf", row.raf, exact);
          }
          for (const period of periods) for (const cell of period.values) {
            const exact = parseExact(cell.text);
            if (exact !== undefined) rememberQuantity(cell, "text", cell.text, exact);
          }
          entries.set(model.id, conflict || old.modal ? { ...old, model, stale: true,
            errors: ["Current Actuals or RAF changed concurrently. Review explicitly or Cancel and reopen; your draft is preserved."] }
            : { ...fresh, open: old.open, periods, teams, confirmed: false, retirementConfirmed: false });
        }
      } else entries.set(model.id, { ...old, model });
    },
    review: (id: string) => {
      const old = entries.get(id);
      if (!old?.stale || !old.modal) return false;
      const base = fromModel(old.baseModel);
      const fresh = fromModel(old.model);
      const parseExact = draftReader(base, fresh);
      if (old.baseModel.currentBase?.source !== old.model.currentBase?.source &&
          !(old.baseModel.currentBase?.source.startsWith('["snapshot",') && old.model.currentBase?.source.startsWith('["snapshot",'))) return false;
      if (JSON.stringify(old.baseModel.currentBase?.requirements.map(row => [row.teamId, row.dailyCap])) !== JSON.stringify(old.model.currentBase?.requirements.map(row => [row.teamId, row.dailyCap]))) return false;
      const periodValues = (periods: readonly SnapshotPeriodDraft[]) => values({ periods, teams: [] });
      // Local Actuals edits survive an explicit RAF-only review. A remote
      // Actuals/partition edit still requires Cancel and a new draft.
      if (periodValues(fresh.periods) !== periodValues(base.periods) ||
          old.modal.teams.some((row, index) => row.teamId !== base.teams[index]?.teamId ||
            row.enabled !== base.teams[index]?.enabled || row.enabled !== fresh.teams[index]?.enabled)) return false;
      let conflict = false;
      const mergeRaf = (before: string, local: string, remote: string): string => {
        const canonical = (text: string) => parseExact(text) ?? text;
        const localChanged = canonical(local) !== canonical(before);
        const remoteChanged = canonical(remote) !== canonical(before);
        if (localChanged && remoteChanged && canonical(local) !== canonical(remote)) conflict = true;
        return localChanged || !remoteChanged ? local : remote;
      };
      const teams = fresh.teams.map((row, index) => ({ ...row,
        raf: mergeRaf(base.teams[index]!.raf, old.teams[index]!.raf, row.raf),
        rafConfirmed: parseExact(base.teams[index]!.raf) === parseExact(row.raf) && parseExact(old.teams[index]!.raf) !== undefined && (old.teams[index]!.rafConfirmed ?? false) }));
      const modalTeams = fresh.teams.map((row, index) => ({ ...row,
        raf: mergeRaf(base.teams[index]!.raf, old.modal!.teams[index]!.raf, row.raf),
        rafConfirmed: parseExact(base.teams[index]!.raf) === parseExact(row.raf) && parseExact(old.modal!.teams[index]!.raf) !== undefined && (old.modal!.teams[index]!.rafConfirmed ?? false) }));
      if (conflict) return false;
      entries.set(id, { ...fresh, teams, modal: { ...old.modal, periods: old.modal.periods,
        teams: modalTeams, confirmed: false, retirementConfirmed: false }, stale: false });
      return true;
    },
    cancel: (id: string) => { entries.delete(id); },
  });
}
