import type { ActualsTeamViewModel, ActualsViewModel } from "../../application/index.js";
import { formatQuantityForEditing, parseExactQuantityInput } from "../../application/index.js";
import { addDays, compareRationals, consumedWorkloadFromSerialized, maxRational, parseSerializedRational, rationalFromInteger,
  rationalToCanonicalString, subtractRationals, type TeamId } from "../../domain/index.js";

export interface ActualsTeamDraft {
  readonly teamId: TeamId;
  readonly consumed: string;
  readonly consumedReference: string;
  readonly consumedExact: string;
  readonly raf?: string;
  readonly rafReference?: string;
  readonly rafExact?: string | undefined;
  readonly rafEdited: boolean;
  readonly unresolved: boolean;
}
export interface ActualsDraft {
  readonly model: ActualsViewModel;
  readonly open: boolean;
  readonly from: string;
  readonly through: string;
  readonly teams: readonly ActualsTeamDraft[];
  readonly baseline: Readonly<{
    from: string;
    through: string;
    teams: readonly Readonly<{ teamId: TeamId; consumed: string; raf?: string; unresolved: boolean }>[];
  }>;
  readonly errors: readonly string[];
}
export interface ActualsDraftStore {
  readonly get: (id: string) => ActualsDraft | undefined;
  readonly ids: () => readonly string[];
  readonly isDirty: (id: string) => boolean;
  readonly initialize: (model: ActualsViewModel, proposedDate: string) => ActualsDraft;
  readonly update: (id: string, draft: ActualsDraft) => void;
  readonly rebase: (model: ActualsViewModel) => void;
  readonly cancel: (id: string) => void;
}

function display(exact: string): string {
  const parsed = consumedWorkloadFromSerialized(exact);
  if (!parsed.ok) throw new TypeError("Invalid exact Actuals quantity.");
  return formatQuantityForEditing(parsed.value);
}

function teamDraft(team: ActualsTeamViewModel, unresolved = false): ActualsTeamDraft {
  const consumedReference = unresolved ? "" : display(team.previousConsumedExact);
  const rafReference = team.currentRafExact === undefined ? undefined : unresolved ? "" : display(team.currentRafExact);
  return { teamId: team.teamId, consumed: consumedReference, consumedReference,
    consumedExact: team.previousConsumedExact, ...(rafReference === undefined ? {} : {
      raf: rafReference, rafReference, rafExact: team.currentRafExact,
    }), rafEdited: false, unresolved };
}

function baselineTeam(row: ActualsTeamDraft): ActualsDraft["baseline"]["teams"][number] {
  return { teamId: row.teamId, consumed: row.consumed,
    ...(row.raf === undefined ? {} : { raf: row.raf }), unresolved: row.unresolved };
}

function proposedThrough(model: ActualsViewModel, proposedDate: string): string {
  const latest = model.records.at(-1)?.actualsThroughDate;
  const next = latest === undefined ? undefined : addDays(latest, 1);
  return next?.ok ? next.value : proposedDate;
}

export function suggestedRafExact(team: ActualsTeamViewModel, consumedExact: string): string | undefined {
  if (team.currentRafExact === undefined) return undefined;
  const previous = parseSerializedRational(team.previousConsumedExact);
  const next = parseSerializedRational(consumedExact);
  const remaining = parseSerializedRational(team.currentRafExact);
  if (!previous.ok || !next.ok || !remaining.ok || compareRationals(next.value, previous.value) < 0) return undefined;
  return rationalToCanonicalString(maxRational(rationalFromInteger(0n),
    subtractRationals(remaining.value, subtractRationals(next.value, previous.value))));
}

export function updateConsumedSuggestion(row: ActualsTeamDraft, model: ActualsTeamViewModel, text: string): ActualsTeamDraft {
  const exact = text === row.consumedReference ? row.consumedExact : parseExactQuantityInput(text);
  const suggestion = exact === undefined ? undefined : suggestedRafExact(model, exact);
  return { ...row, consumed: text, unresolved: false,
    ...(row.rafEdited || model.currentRafExact === undefined ? {} : {
      raf: suggestion === undefined ? "" : display(suggestion),
      rafReference: suggestion === undefined ? "" : display(suggestion),
      rafExact: suggestion,
    }) };
}

export function createActualsDraftStore(): ActualsDraftStore {
  const entries = new Map<string, ActualsDraft>();
  return {
    get: (id) => entries.get(id), ids: () => [...entries.keys()],
    isDirty: (id) => {
      const draft = entries.get(id);
      if (!draft) return false;
      if (draft.from !== draft.baseline.from || draft.through !== draft.baseline.through) return true;
      if (draft.teams.length !== draft.baseline.teams.length) return true;
      const baseline = new Map(draft.baseline.teams.map((team) => [team.teamId, team]));
      return draft.teams.some((team) => {
        const reference = baseline.get(team.teamId);
        return reference === undefined || reference.unresolved || team.unresolved ||
          team.consumed !== reference.consumed || team.raf !== reference.raf;
      });
    },
    initialize: (model, proposedDate) => {
      const old = entries.get(model.id);
      if (old) return old;
      const through = proposedThrough(model, proposedDate);
      const teams = model.teams.map((team) => teamDraft(team));
      const draft: ActualsDraft = { model, open: false, from: "", through, teams,
        baseline: { from: "", through, teams: teams.map(baselineTeam) }, errors: [] };
      entries.set(model.id, draft);
      return draft;
    },
    update: (id, draft) => { entries.set(id, draft); },
    rebase: (model) => {
      const old = entries.get(model.id);
      if (!old) return;
      const previous = new Map(old.teams.map((team) => [team.teamId, team]));
      const teams = model.teams.map((team) => {
        const local = previous.get(team.teamId);
        if (!local) return teamDraft(team, true);
        const baselineChanged = old.model.teams.find((item) => item.teamId === team.teamId)?.currentRafExact !== team.currentRafExact ||
          old.model.teams.find((item) => item.teamId === team.teamId)?.previousConsumedExact !== team.previousConsumedExact;
        const reference = teamDraft(team);
        if (!baselineChanged) return local;
        const consumed = local.consumed === local.consumedReference ? reference.consumed : local.consumed;
        const updated = updateConsumedSuggestion({ ...local, ...reference, consumed,
          rafEdited: local.rafEdited, ...(local.rafEdited ? { raf: local.raf, rafExact: local.rafExact, rafReference: local.rafReference } : {}) }, team, consumed);
        return updated;
      });
      const previousBaseline = new Map(old.baseline.teams.map((team) => [team.teamId, team]));
      const baselineTeams = model.teams.map((team) => {
        const current = teamDraft(team);
        return previousBaseline.get(team.teamId)?.unresolved
          ? baselineTeam(teamDraft(team, true))
          : baselineTeam(current);
      });
      const recordsChanged = old.model.records.at(-1)?.actualsThroughDate !== model.records.at(-1)?.actualsThroughDate;
      const baselineThrough = recordsChanged ? proposedThrough(model, old.baseline.through) : old.baseline.through;
      const through = old.through === old.baseline.through ? baselineThrough : old.through;
      const from = model.records.length > 0 ? "" : old.from;
      entries.set(model.id, { ...old, model, from, through, teams,
        baseline: { from: model.records.length > 0 ? "" : old.baseline.from,
          through: baselineThrough, teams: baselineTeams } });
    },
    cancel: (id) => { entries.delete(id); },
  };
}
