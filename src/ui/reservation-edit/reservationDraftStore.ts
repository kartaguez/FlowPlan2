import type { ReservationEditViewModel } from "../../application/index.js";
import type { ReservationId, TeamId } from "../../domain/index.js";

export interface ReservationTeamDraft {
  readonly teamId: TeamId;
  readonly enabled: boolean;
  readonly kind: "ratio" | "fixed-daily";
  readonly value: string;
  readonly exact?: string;
  readonly expanded: boolean;
}

export interface ReservationDraftValues {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly teams: readonly ReservationTeamDraft[];
}

export interface ReservationDraft {
  readonly reference: ReservationDraftValues;
  readonly values: ReservationDraftValues;
  readonly model: ReservationEditViewModel;
  readonly expanded: boolean;
  readonly errors: readonly string[];
  readonly invalidReference: boolean;
}

export interface ReservationDraftStore {
  readonly get: (id: ReservationId) => ReservationDraft | undefined;
  readonly ids: () => readonly ReservationId[];
  readonly initialize: (id: ReservationId, model: ReservationEditViewModel) => ReservationDraft;
  readonly update: (id: ReservationId, values: ReservationDraftValues) => void;
  readonly setExpanded: (id: ReservationId, expanded: boolean) => void;
  readonly setErrors: (id: ReservationId, errors: readonly string[]) => void;
  readonly cancel: (id: ReservationId) => void;
  readonly rebase: (id: ReservationId, model: ReservationEditViewModel) => void;
  readonly isDirty: (id: ReservationId) => boolean;
  readonly isTeamDirty: (id: ReservationId, teamId: TeamId) => boolean;
}

export function reservationValuesFromModel(model: ReservationEditViewModel): ReservationDraftValues {
  return {
    name: model.name, startDate: model.startDate, endDate: model.endDate,
    teams: model.teamAllocations.map((team) => ({
      teamId: team.teamId, enabled: team.enabled, kind: team.kind,
      value: team.value, ...(team.exact === undefined ? {} : { exact: team.exact }),
      expanded: false,
    })),
  };
}

const choose = <T>(local: T, old: T, next: T): T => local === old ? next : local;
const teamDirty = (a: ReservationTeamDraft, b: ReservationTeamDraft): boolean =>
  a.enabled !== b.enabled || a.kind !== b.kind || a.value !== b.value;

export function createReservationDraftStore(): ReservationDraftStore {
  const entries = new Map<ReservationId, ReservationDraft>();
  const requireEntry = (id: ReservationId): ReservationDraft => {
    const entry = entries.get(id);
    if (!entry) throw new TypeError(`Reservation draft ${id} is not initialized.`);
    return entry;
  };
  return {
    get: (id) => entries.get(id),
    ids: () => [...entries.keys()],
    initialize: (id, model) => {
      const existing = entries.get(id);
      if (existing) return existing;
      const reference = reservationValuesFromModel(model);
      const entry = { reference, values: reference, model, expanded: false,
        errors: [] as readonly string[], invalidReference: false };
      entries.set(id, entry);
      return entry;
    },
    update: (id, values) => { entries.set(id, { ...requireEntry(id), values }); },
    setExpanded: (id, expanded) => { entries.set(id, { ...requireEntry(id), expanded }); },
    setErrors: (id, errors) => { const entry = entries.get(id); if (entry) entries.set(id, { ...entry, errors }); },
    cancel: (id) => { entries.delete(id); },
    rebase: (id, model) => {
      const old = requireEntry(id);
      const next = reservationValuesFromModel(model);
      const oldTeams = new Map(old.reference.teams.map((team) => [team.teamId, team]));
      const localTeams = new Map(old.values.teams.map((team) => [team.teamId, team]));
      const nextTeamIds = new Set(next.teams.map((team) => team.teamId));
      const teams = next.teams.map((team) => {
        const previous = oldTeams.get(team.teamId);
        const local = localTeams.get(team.teamId);
        if (!previous || !local) return team;
        const localPairChanged = local.kind !== previous.kind || local.value !== previous.value;
        return { ...team,
          enabled: choose(local.enabled, previous.enabled, team.enabled),
          kind: localPairChanged ? local.kind : team.kind,
          value: localPairChanged ? local.value : team.value,
          ...(localPairChanged && local.exact !== undefined ? { exact: local.exact } : {}),
          expanded: local.expanded && choose(local.enabled, previous.enabled, team.enabled),
        };
      });
      const values: ReservationDraftValues = {
        name: choose(old.values.name, old.reference.name, next.name),
        startDate: choose(old.values.startDate, old.reference.startDate, next.startDate),
        endDate: choose(old.values.endDate, old.reference.endDate, next.endDate),
        teams: [...teams, ...old.values.teams.filter((team) => !nextTeamIds.has(team.teamId))],
      };
      const invalidReference = values.teams.some((team) => !nextTeamIds.has(team.teamId) &&
        (team.enabled || teamDirty(team, oldTeams.get(team.teamId)!)));
      entries.set(id, { ...old, reference: next, values, model, invalidReference });
    },
    isDirty: (id) => {
      const entry = entries.get(id);
      if (!entry) return false;
      const references = new Map(entry.reference.teams.map((team) => [team.teamId, team]));
      return entry.values.name !== entry.reference.name ||
        entry.values.startDate !== entry.reference.startDate ||
        entry.values.endDate !== entry.reference.endDate ||
        entry.values.teams.some((team) => {
          const reference = references.get(team.teamId);
          return reference ? teamDirty(team, reference) : team.enabled;
        });
    },
    isTeamDirty: (id, teamId) => {
      const entry = entries.get(id);
      const local = entry?.values.teams.find((team) => team.teamId === teamId);
      const reference = entry?.reference.teams.find((team) => team.teamId === teamId);
      return local !== undefined && reference !== undefined && teamDirty(local, reference);
    },
  };
}
