import type { TeamCapacitySchedule } from "../capacity/schedule.js";
import type { FirmCapacityReservation } from "../capacity/reservation.js";
import type { CivilDate } from "./date.js";
import type {
  DailyCap,
  ProjectId,
  RemainingWorkload,
  TeamId,
} from "./scalars.js";
import {
  error,
  failure,
  success,
  type DomainError,
  type DomainResult,
} from "./result.js";

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly capacitySchedule: TeamCapacitySchedule;
}

export interface ProjectTeamRequirement {
  readonly teamId: TeamId;
  readonly remainingWorkload: RemainingWorkload;
  readonly dailyCap?: DailyCap;
}

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectTeamRequirement[];
}

export interface Portfolio {
  readonly teams: readonly Team[];
  readonly projects: readonly Project[];
  readonly priorityOrder: readonly ProjectId[];
  readonly reservations: readonly FirmCapacityReservation[];
}

export function createTeam(input: {
  readonly id: TeamId;
  readonly name: string;
  readonly capacitySchedule: TeamCapacitySchedule;
}): DomainResult<Team> {
  return success(
    Object.freeze({
      id: input.id,
      name: input.name,
      capacitySchedule: input.capacitySchedule,
    }),
  );
}

export function createProjectTeamRequirement(input: {
  readonly teamId: TeamId;
  readonly remainingWorkload: RemainingWorkload;
  readonly dailyCap?: DailyCap;
}): DomainResult<ProjectTeamRequirement> {
  return success(Object.freeze({ ...input }));
}

export function createProject(input: {
  readonly id: ProjectId;
  readonly name: string;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectTeamRequirement[];
}): DomainResult<Project> {
  const errors: DomainError[] = [];
  if (input.requirements.length === 0) {
    errors.push(
      error(
        "EMPTY_PROJECT_REQUIREMENTS",
        "requirements",
        "Project must have at least one team requirement.",
      ),
    );
  }
  const teamIds = new Set<TeamId>();
  input.requirements.forEach((requirement, index) => {
    if (teamIds.has(requirement.teamId)) {
      errors.push(
        error(
          "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
          `requirements[${index}].teamId`,
          "A team may appear only once in project requirements.",
        ),
      );
    }
    teamIds.add(requirement.teamId);
  });
  if (errors.length > 0) return failure(errors);

  return success(
    Object.freeze({
      ...input,
      requirements: Object.freeze([...input.requirements]),
    }),
  );
}

export function createPortfolio(input: {
  readonly teams: readonly Team[];
  readonly projects: readonly Project[];
  readonly priorityOrder: readonly ProjectId[];
  readonly reservations: readonly FirmCapacityReservation[];
}): DomainResult<Portfolio> {
  const errors: DomainError[] = [];
  const teamIds = collectUniqueIds(
    input.teams,
    (team) => team.id,
    "teams",
    "DUPLICATE_TEAM_ID",
    "Team id must be unique in the portfolio.",
    errors,
  );
  const projectIds = collectUniqueIds(
    input.projects,
    (project) => project.id,
    "projects",
    "DUPLICATE_PROJECT_ID",
    "Project id must be unique in the portfolio.",
    errors,
  );
  collectUniqueIds(
    input.reservations,
    (reservation) => reservation.id,
    "reservations",
    "DUPLICATE_RESERVATION_ID",
    "Reservation id must be unique in the portfolio.",
    errors,
  );

  input.projects.forEach((project, projectIndex) => {
    project.requirements.forEach((requirement, requirementIndex) => {
      if (!teamIds.has(requirement.teamId)) {
        errors.push(
          error(
            "UNKNOWN_REQUIREMENT_TEAM",
            `projects[${projectIndex}].requirements[${requirementIndex}].teamId`,
            "Project requirement must reference a team in the portfolio.",
          ),
        );
      }
    });
  });
  input.reservations.forEach((reservation, index) => {
    if (!teamIds.has(reservation.teamId)) {
      errors.push(
        error(
          "UNKNOWN_RESERVATION_TEAM",
          `reservations[${index}].teamId`,
          "Reservation must reference a team in the portfolio.",
        ),
      );
    }
  });

  const priorities = new Set<ProjectId>();
  input.priorityOrder.forEach((projectId, index) => {
    if (priorities.has(projectId)) {
      errors.push(
        error(
          "DUPLICATE_PRIORITY_PROJECT",
          `priorityOrder[${index}]`,
          "Project must appear only once in priority order.",
        ),
      );
    }
    if (!projectIds.has(projectId)) {
      errors.push(
        error(
          "UNKNOWN_PRIORITY_PROJECT",
          `priorityOrder[${index}]`,
          "Priority order must reference a project in the portfolio.",
        ),
      );
    }
    priorities.add(projectId);
  });
  input.projects.forEach((project, index) => {
    if (!priorities.has(project.id)) {
      errors.push(
        error(
          "MISSING_PRIORITY_PROJECT",
          `projects[${index}].id`,
          "Every project must appear exactly once in priority order.",
        ),
      );
    }
  });

  if (errors.length > 0) return failure(errors);
  return success(
    Object.freeze({
      teams: Object.freeze([...input.teams]),
      projects: Object.freeze([...input.projects]),
      priorityOrder: Object.freeze([...input.priorityOrder]),
      reservations: Object.freeze([...input.reservations]),
    }),
  );
}

function collectUniqueIds<T, Id>(
  values: readonly T[],
  getId: (value: T) => Id,
  collection: string,
  code: string,
  message: string,
  errors: DomainError[],
): Set<Id> {
  const ids = new Set<Id>();
  values.forEach((value, index) => {
    const id = getId(value);
    if (ids.has(id))
      errors.push(error(code, `${collection}[${index}].id`, message));
    ids.add(id);
  });
  return ids;
}
