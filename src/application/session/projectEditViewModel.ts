import {
  serializeQuantity,
  type CivilDate,
  type ProjectId,
  type TeamId,
} from "../../domain/index.js";
import { formatQuantityForEditing } from "./editableQuantity.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface ProjectEditViewModel {
  readonly projectId: ProjectId;
  readonly label: string;
  readonly priorityPosition: number;
  readonly projectCount: number;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectRequirementEditViewModel[];
}

export interface ProjectRequirementEditViewModel {
  readonly teamId: TeamId;
  readonly teamLabel: string;
  readonly remainingWorkload: string;
  readonly remainingWorkloadExact: string;
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
  const requirements = state.portfolio.teams.flatMap((team) => {
    const requirement = requirementsByTeam.get(team.id);
    if (requirement === undefined) return [];
    return [
      Object.freeze({
        teamId: team.id,
        teamLabel: team.name,
        remainingWorkload: formatQuantityForEditing(requirement.remainingWorkload),
        remainingWorkloadExact: serializeQuantity(requirement.remainingWorkload),
        ...(requirement.dailyCap === undefined
          ? {}
          : { dailyCapExact: serializeQuantity(requirement.dailyCap) }),
      }),
    ];
  });
  const priorityIndex = state.portfolio.priorityOrder.indexOf(project.id);
  if (priorityIndex < 0) {
    throw new TypeError(`Project ${project.id} is missing from priority order.`);
  }
  return Object.freeze({
    projectId: project.id,
    label: project.name,
    priorityPosition: priorityIndex + 1,
    projectCount: state.portfolio.projects.length,
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
