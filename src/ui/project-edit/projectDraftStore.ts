import type { ProjectEditViewModel } from "../../application/index.js";
import type { ProjectId, TeamId } from "../../domain/index.js";

export interface ProjectTeamDraft {
  readonly teamId: TeamId;
  readonly enabled: boolean;
  readonly remainingWorkload: string;
  readonly remainingWorkloadExact: string;
  readonly dailyCapExact?: string;
  readonly expanded: boolean;
}

export interface ProjectDraftValues {
  readonly name: string;
  readonly programId: string;
  readonly priorityFamilyId: string;
  readonly earliestStartDate: string;
  readonly objectiveEndDate: string;
  readonly mandatory: boolean;
  readonly resolution: "unresolved" | "align" | "remove";
  readonly teams: readonly ProjectTeamDraft[];
}

export interface ProjectDraft {
  readonly reference: ProjectDraftValues;
  readonly values: ProjectDraftValues;
  readonly model: ProjectEditViewModel;
  readonly expanded: boolean;
  readonly errors: readonly string[];
  readonly invalidReference: boolean;
}

export interface ProjectDraftStore {
  readonly get: (id: ProjectId) => ProjectDraft | undefined;
  readonly ids: () => readonly ProjectId[];
  readonly initialize: (id: ProjectId, model: ProjectEditViewModel) => ProjectDraft;
  readonly update: (id: ProjectId, values: ProjectDraftValues) => void;
  readonly setExpanded: (id: ProjectId, expanded: boolean) => void;
  readonly setErrors: (id: ProjectId, errors: readonly string[]) => void;
  readonly cancel: (id: ProjectId) => void;
  readonly rebase: (id: ProjectId, model: ProjectEditViewModel) => void;
  readonly isDirty: (id: ProjectId) => boolean;
  readonly isTeamDirty: (id: ProjectId, teamId: TeamId) => boolean;
}

export function projectValuesFromModel(model: ProjectEditViewModel): ProjectDraftValues {
  const divergent = model.mandatoryDeadline !== undefined &&
    model.mandatoryDeadline !== model.objectiveEndDate;
  return {
    name: model.label,
    programId: model.programId ?? "",
    priorityFamilyId: model.priorityFamilyId ?? "",
    earliestStartDate: model.earliestStartDate ?? "",
    objectiveEndDate: model.objectiveEndDate ?? "",
    mandatory: !divergent && model.objectiveEndDate !== undefined &&
      model.mandatoryDeadline === model.objectiveEndDate,
    resolution: divergent ? "unresolved" : "remove",
    teams: model.requirements.map((team) => ({
      teamId: team.teamId, enabled: team.enabled,
      remainingWorkload: team.remainingWorkload,
      remainingWorkloadExact: team.remainingWorkloadExact,
      ...(team.dailyCapExact === undefined ? {} : { dailyCapExact: team.dailyCapExact }),
      expanded: false,
    })),
  };
}

const choose = <T>(local: T, old: T, next: T): T => local === old ? next : local;
const teamDirty = (a: ProjectTeamDraft, b: ProjectTeamDraft): boolean =>
  a.enabled !== b.enabled || a.remainingWorkload !== b.remainingWorkload;
const retainMissingTeam = (team: ProjectTeamDraft, reference?: ProjectTeamDraft): boolean =>
  reference === undefined || team.enabled || teamDirty(team, reference);
const globalDirty = (a: ProjectDraftValues, b: ProjectDraftValues): boolean =>
  a.name !== b.name || a.programId !== b.programId ||
  a.priorityFamilyId !== b.priorityFamilyId ||
  a.earliestStartDate !== b.earliestStartDate || a.objectiveEndDate !== b.objectiveEndDate ||
  a.mandatory !== b.mandatory || a.resolution !== b.resolution;

export function createProjectDraftStore(): ProjectDraftStore {
  const entries = new Map<ProjectId, ProjectDraft>();
  const requireEntry = (id: ProjectId): ProjectDraft => {
    const entry = entries.get(id);
    if (!entry) throw new TypeError(`Project draft ${id} is not initialized.`);
    return entry;
  };
  return {
    get: (id) => entries.get(id),
    ids: () => [...entries.keys()],
    initialize: (id, model) => {
      const existing = entries.get(id);
      if (existing) return existing;
      const reference = projectValuesFromModel(model);
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
      const next = projectValuesFromModel(model);
      const oldTeams = new Map(old.reference.teams.map((team) => [team.teamId, team]));
      const localTeams = new Map(old.values.teams.map((team) => [team.teamId, team]));
      const nextTeamIds = new Set(next.teams.map((team) => team.teamId));
      const teams = next.teams.map((team) => {
        const previous = oldTeams.get(team.teamId);
        const local = localTeams.get(team.teamId);
        if (!previous || !local) return team;
        const remainingWorkload = choose(local.remainingWorkload, previous.remainingWorkload, team.remainingWorkload);
        return { ...team,
          enabled: choose(local.enabled, previous.enabled, team.enabled),
          remainingWorkload,
          remainingWorkloadExact: remainingWorkload === team.remainingWorkload
            ? team.remainingWorkloadExact : local.remainingWorkloadExact,
          expanded: local.expanded && choose(local.enabled, previous.enabled, team.enabled),
        };
      });
      const values: ProjectDraftValues = {
        ...next,
        name: choose(old.values.name, old.reference.name, next.name),
        programId: choose(old.values.programId, old.reference.programId, next.programId),
        priorityFamilyId: choose(old.values.priorityFamilyId, old.reference.priorityFamilyId, next.priorityFamilyId),
        earliestStartDate: choose(old.values.earliestStartDate, old.reference.earliestStartDate, next.earliestStartDate),
        objectiveEndDate: choose(old.values.objectiveEndDate, old.reference.objectiveEndDate, next.objectiveEndDate),
        mandatory: choose(old.values.mandatory, old.reference.mandatory, next.mandatory),
        resolution: choose(old.values.resolution, old.reference.resolution, next.resolution),
        teams: [...teams, ...old.values.teams.filter((team) =>
          !nextTeamIds.has(team.teamId) &&
          retainMissingTeam(team, oldTeams.get(team.teamId)))],
      };
      const invalidReference = values.teams.some((team) => !nextTeamIds.has(team.teamId) &&
        retainMissingTeam(team, oldTeams.get(team.teamId))) ||
        (values.programId !== "" && !model.programs.some((program) => program.id === values.programId)) ||
        (values.priorityFamilyId !== "" && !model.priorityFamilies.some((family) => family.id === values.priorityFamilyId));
      entries.set(id, { ...old, reference: next, values, model, invalidReference });
    },
    isDirty: (id) => {
      const entry = entries.get(id);
      if (!entry) return false;
      const referenceTeams = new Map(entry.reference.teams.map((team) => [team.teamId, team]));
      return globalDirty(entry.values, entry.reference) || entry.values.teams.some((team) => {
        const reference = referenceTeams.get(team.teamId);
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
