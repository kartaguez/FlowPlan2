import type { TeamCapacitySchedule } from "../capacity/schedule.js";
import type { Reservation } from "../capacity/reservation.js";
import type { CivilDate } from "./date.js";
import type {
  DailyCap,
  ProjectId,
  ProgramId,
  PriorityFamilyId,
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

export interface Program {
  readonly id: ProgramId;
  readonly name: string;
}

export interface PriorityFamily {
  readonly id: PriorityFamilyId;
  readonly name: string;
}

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectTeamRequirement[];
}

export interface Portfolio {
  readonly teams: readonly Team[];
  readonly projects: readonly Project[];
  readonly programs: readonly Program[];
  readonly priorityFamilies: readonly PriorityFamily[];
  readonly priorityOrder: readonly ProjectId[];
  readonly reservations: readonly Reservation[];
}

export function createProgram(input: {
  readonly id: ProgramId;
  readonly name: string;
}): DomainResult<Program> {
  return success(Object.freeze({ id: input.id, name: input.name }));
}

export function createPriorityFamily(input: {
  readonly id: PriorityFamilyId;
  readonly name: string;
}): DomainResult<PriorityFamily> {
  return success(Object.freeze({ id: input.id, name: input.name }));
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
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
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
  readonly programs: readonly Program[];
  readonly priorityFamilies: readonly PriorityFamily[];
  readonly priorityOrder: readonly ProjectId[];
  readonly reservations: readonly Reservation[];
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
  const programIds = collectUniqueIds(
    input.programs,
    (program) => program.id,
    "programs",
    "DUPLICATE_PROGRAM_ID",
    "Program id must be unique in the portfolio.",
    errors,
  );
  const priorityFamilyIds = collectUniqueIds(
    input.priorityFamilies,
    (family) => family.id,
    "priorityFamilies",
    "DUPLICATE_PRIORITY_FAMILY_ID",
    "Priority family id must be unique in the portfolio.",
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
    if (project.programId !== undefined && !programIds.has(project.programId)) {
      errors.push(error(
        "UNKNOWN_PROJECT_PROGRAM",
        `projects[${projectIndex}].programId`,
        "Project program must reference a program in the portfolio.",
      ));
    }
    if (project.priorityFamilyId !== undefined && !priorityFamilyIds.has(project.priorityFamilyId)) {
      errors.push(error(
        "UNKNOWN_PROJECT_PRIORITY_FAMILY",
        `projects[${projectIndex}].priorityFamilyId`,
        "Project priority family must reference a priority family in the portfolio.",
      ));
    }
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
  input.reservations.forEach((reservation, reservationIndex) => {
    const allocatedTeamIds = new Set<TeamId>();
    reservation.teamAllocations.forEach((allocation, allocationIndex) => {
      if (allocatedTeamIds.has(allocation.teamId)) {
        errors.push(
          error(
            "DUPLICATE_RESERVATION_TEAM_ALLOCATION",
            `reservations[${reservationIndex}].teamAllocations[${allocationIndex}].teamId`,
            "A team may appear only once in reservation allocations.",
          ),
        );
      }
      allocatedTeamIds.add(allocation.teamId);
      if (!teamIds.has(allocation.teamId)) {
        errors.push(
          error(
            "UNKNOWN_RESERVATION_TEAM",
            `reservations[${reservationIndex}].teamAllocations[${allocationIndex}].teamId`,
            "Reservation allocation must reference a team in the portfolio.",
          ),
        );
      }
    });
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
      programs: Object.freeze([...input.programs]),
      priorityFamilies: Object.freeze([...input.priorityFamilies]),
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
