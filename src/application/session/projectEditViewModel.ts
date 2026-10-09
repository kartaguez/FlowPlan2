import {
  serializeQuantity,
  type CivilDate,
  type ProjectId,
  type ProgramId,
  type PriorityFamilyId,
  type TeamId,
} from "../../domain/index.js";
import { formatActualsQuantity } from "./formatActualsQuantity.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface ProjectEditViewModel {
  readonly projectId: ProjectId;
  readonly label: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly effectiveColor?: string;
  readonly programs: readonly Readonly<{ id: ProgramId; name: string; color?: string }>[];
  readonly priorityFamilies: readonly Readonly<{ id: PriorityFamilyId; name: string }>[];
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectRequirementEditViewModel[];
}

export interface ProjectRequirementEditViewModel {
  readonly teamId: TeamId;
  readonly teamLabel: string;
  readonly enabled: boolean;
  readonly remainingWorkload: string;
  readonly remainingWorkloadExact: string;
  readonly currentRafEditable?: boolean;
  readonly rafAuthority?: "current-configuration" | "latest-actuals";
  readonly dailyCapExact?: string;
}

export function buildProjectEditViewModel(
  state: PlanningSessionState,
  projectId: ProjectId,
): ProjectEditViewModel | undefined {
  const project = state.portfolio.projects.find(
    (candidate) => candidate.id === projectId,
  );
  if (project === undefined) return undefined;
  const requirementsByTeam = new Map(
    project.requirements.map((requirement) => [requirement.teamId, requirement]),
  );
  const requirements = state.portfolio.teams.map((team) => {
    const requirement = requirementsByTeam.get(team.id);
    if (requirement === undefined) return Object.freeze({
      teamId: team.id,
      teamLabel: team.name,
      enabled: false,
      remainingWorkload: "",
      remainingWorkloadExact: "",
    });
    return Object.freeze({
        teamId: team.id,
        teamLabel: team.name,
        enabled: true,
        remainingWorkload: formatActualsQuantity(requirement.remainingWorkload),
        remainingWorkloadExact: serializeQuantity(requirement.remainingWorkload),
        currentRafEditable: true,
        rafAuthority: requirement.rafAuthority ?? "current-configuration",
        ...(requirement.dailyCap === undefined
          ? {}
          : { dailyCapExact: serializeQuantity(requirement.dailyCap) }),
      });
  });
  return Object.freeze({
    projectId: project.id,
    label: project.name,
    ...(project.programId === undefined ? {} : { programId: project.programId }),
    ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyId: project.priorityFamilyId }),
    effectiveColor: project.programId === undefined ? project.ownColor! : state.portfolio.programs.find((program) => program.id === project.programId)!.color,
    programs: Object.freeze(state.portfolio.programs.map((program) => Object.freeze({ id: program.id, name: program.name, color: program.color }))),
    priorityFamilies: Object.freeze(state.portfolio.priorityFamilies.map((family) => Object.freeze({ id: family.id, name: family.name }))),
    ...(project.earliestStartDate === undefined
      ? {}
      : { earliestStartDate: project.earliestStartDate }),
    ...(project.objectiveEndDate === undefined
      ? {}
      : { objectiveEndDate: project.objectiveEndDate }),
    ...(project.mandatoryDeadline === undefined
      ? {}
      : { mandatoryDeadline: project.mandatoryDeadline }),
    requirements: Object.freeze(requirements),
  });
}
