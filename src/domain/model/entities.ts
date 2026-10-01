import type { TeamCapacitySchedule } from "../capacity/schedule.js";
import type { Reservation } from "../capacity/reservation.js";
import { createProjectActualsChronology, type ProjectActualsChronology } from "../actuals/records.js";
import { createSnapshotHistory, type ProjectActualsSnapshot } from "../actuals/snapshots.js";
import type { CivilDate } from "./date.js";
import { compareRationals } from "./rational.js";
import { rationalOf } from "./scalars.js";
import { catalogNameKey, createColor, normalizeCatalogName, suggestColor, type Color } from "./color.js";
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
  readonly rafAuthority?: "latest-actuals" | "current-configuration";
}

export interface Program {
  readonly id: ProgramId;
  readonly name: string;
  readonly color: Color;
}

export interface PriorityFamily {
  readonly id: PriorityFamilyId;
  readonly name: string;
}

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly isActive: boolean;
  readonly programId?: ProgramId;
  readonly ownColor?: Color;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectTeamRequirement[];
  readonly actuals?: ProjectActualsChronology;
  readonly legacyV4Actuals?: ProjectActualsChronology;
  readonly legacyV4RafAuthority?: readonly Readonly<{ teamId: TeamId; authority: "latest-actuals" | "current-configuration" }>[];
  readonly snapshots?: readonly ProjectActualsSnapshot[];
}

export interface Portfolio {
  readonly teams: readonly Team[];
  readonly projects: readonly Project[];
  readonly programs: readonly Program[];
  readonly priorityFamilies: readonly PriorityFamily[];
  readonly priorityOrder: readonly ProjectId[];
  readonly reservations: readonly Reservation[];
}

export function effectiveColor(portfolio: Portfolio, item: Project | Reservation): Color {
  if (item.programId === undefined) return item.ownColor!;
  const program = portfolio.programs.find((candidate) => candidate.id === item.programId);
  if (!program) throw new TypeError(`Unknown Program ${item.programId}.`);
  return program.color;
}

export function createProgram(input: {
  readonly id: ProgramId;
  readonly name: string;
  readonly color?: Color;
}): DomainResult<Program> {
  const name = normalizeCatalogName(input.name);
  if (!name) return failure([error("EMPTY_PROGRAM_NAME", "name", "Program name must not be empty.")]);
  const color = createColor(input.color ?? suggestColor(input.id));
  if (!color.ok) return color;
  return success(Object.freeze({ id: input.id, name, color: color.value }));
}

export function createPriorityFamily(input: {
  readonly id: PriorityFamilyId;
  readonly name: string;
}): DomainResult<PriorityFamily> {
  const name = normalizeCatalogName(input.name);
  if (!name) return failure([error("EMPTY_PRIORITY_FAMILY_NAME", "name", "Pas name must not be empty.")]);
  return success(Object.freeze({ id: input.id, name }));
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
  readonly rafAuthority?: "latest-actuals" | "current-configuration";
}): DomainResult<ProjectTeamRequirement> {
  if (input.rafAuthority !== undefined && input.rafAuthority !== "latest-actuals" && input.rafAuthority !== "current-configuration") {
    return failure([error("INVALID_RAF_AUTHORITY", "rafAuthority", "Unknown RAF authority.")]);
  }
  return success(Object.freeze({ ...input }));
}

export function createProject(input: {
  readonly id: ProjectId;
  readonly name: string;
  readonly isActive?: boolean;
  readonly programId?: ProgramId;
  readonly ownColor?: Color;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly requirements: readonly ProjectTeamRequirement[];
  readonly actuals?: ProjectActualsChronology;
  readonly legacyV4Actuals?: ProjectActualsChronology;
  readonly legacyV4RafAuthority?: readonly Readonly<{ teamId: TeamId; authority: "latest-actuals" | "current-configuration" }>[];
  readonly snapshots?: readonly ProjectActualsSnapshot[];
}): DomainResult<Project> {
  const errors: DomainError[] = [];
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    errors.push(error("INVALID_PROJECT_ACTIVATION", "isActive", "Project activation must be a boolean."));
  }
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
    if (requirement.rafAuthority !== undefined && requirement.rafAuthority !== "latest-actuals" && requirement.rafAuthority !== "current-configuration") {
      errors.push(error("INVALID_RAF_AUTHORITY", `requirements[${index}].rafAuthority`, "Unknown RAF authority."));
    }
    if (input.actuals && !input.snapshots?.length && requirement.rafAuthority === undefined) {
      errors.push(error("MISSING_RAF_AUTHORITY", `requirements[${index}].rafAuthority`, "Requirements with Actuals need explicit RAF authority."));
    }
  });
  const actuals = input.actuals === undefined ? undefined : createProjectActualsChronology(input.actuals);
  if (actuals && !actuals.ok) errors.push(...actuals.errors);
  const legacy = input.legacyV4Actuals === undefined ? undefined : createProjectActualsChronology(input.legacyV4Actuals);
  if (legacy && !legacy.ok) errors.push(...legacy.errors);
  const snapshots = input.snapshots === undefined ? undefined : createSnapshotHistory(input.snapshots, input.id, "project");
  if (snapshots && !snapshots.ok) errors.push(...snapshots.errors);
  if (errors.length > 0) return failure(errors);

  if (input.programId !== undefined && input.ownColor !== undefined) {
    return failure([error("PROGRAM_OWN_COLOR", "ownColor", "A Project in a Program cannot have its own color.")]);
  }
  const ownColor = input.programId === undefined ? createColor(input.ownColor ?? suggestColor(input.id), "ownColor") : undefined;
  if (ownColor && !ownColor.ok) return ownColor;
  const { ownColor: _discardedOwnColor, actuals: _unvalidatedActuals,
    legacyV4Actuals: _unvalidatedLegacy, snapshots: _unvalidatedSnapshots, ...withoutOwnColor } = input;

  return success(
    Object.freeze({
      ...withoutOwnColor,
      ...(ownColor?.ok ? { ownColor: ownColor.value } : {}),
      isActive: input.isActive ?? true,
      requirements: Object.freeze(input.requirements.map((requirement) => Object.freeze({ ...requirement }))),
      ...(actuals?.ok ? { actuals: actuals.value } : {}),
      ...(legacy?.ok ? { legacyV4Actuals: legacy.value } : {}),
      ...(snapshots?.ok ? { snapshots: snapshots.value } : {}),
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
    if (project.programId === undefined) {
      if (!project.ownColor || !createColor(project.ownColor).ok) errors.push(error("MISSING_PROJECT_OWN_COLOR", `projects[${projectIndex}].ownColor`, "Project without Program needs a valid own color."));
    } else if (project.ownColor !== undefined) errors.push(error("PROGRAM_OWN_COLOR", `projects[${projectIndex}].ownColor`, "Project in Program cannot retain an own color."));
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
      if (project.actuals && !project.snapshots?.length && requirement.rafAuthority === undefined) {
        errors.push(error("MISSING_RAF_AUTHORITY", `projects[${projectIndex}].requirements[${requirementIndex}].rafAuthority`, "Requirements with Actuals need explicit RAF authority."));
      }
      if (!teamIds.has(requirement.teamId)) {
        errors.push(
          error(
            "UNKNOWN_REQUIREMENT_TEAM",
            `projects[${projectIndex}].requirements[${requirementIndex}].teamId`,
            "Project requirement must reference a team in the portfolio.",
          ),
        );
      }
      if (project.snapshots?.length) {
        const current = project.snapshots.at(-1)!;
        const snapshotRaf = current.raf.find((row) => row.teamId === requirement.teamId);
        if (!snapshotRaf || compareRationals(rationalOf(snapshotRaf.amount), rationalOf(requirement.remainingWorkload)) !== 0) {
          errors.push(error("ACTUALS_RAF_MISMATCH", `projects[${projectIndex}].requirements[${requirementIndex}].remainingWorkload`, "Current RAF must match the current Project snapshot."));
        }
      } else if (requirement.rafAuthority === "latest-actuals") {
        // A later object record without this Team proves a membership break.
        // A remove/reintroduce cycle between records still requires persisted provenance.
        const latest = project.actuals?.records.at(-1)?.teams.find((entry) => entry.teamId === requirement.teamId);
        if (!latest || compareRationals(rationalOf(latest.remainingWorkload), rationalOf(requirement.remainingWorkload)) !== 0) {
          errors.push(error("ACTUALS_RAF_MISMATCH", `projects[${projectIndex}].requirements[${requirementIndex}].remainingWorkload`, "Current RAF must match its latest authoritative Actuals entry."));
        }
      }
    });
    (project.legacyV4Actuals ?? project.actuals)?.records.forEach((record, recordIndex) => record.teams.forEach((entry, entryIndex) => {
      if (!teamIds.has(entry.teamId)) errors.push(error("UNKNOWN_HISTORICAL_TEAM", `projects[${projectIndex}].actuals.records[${recordIndex}].teams[${entryIndex}].teamId`, "Historical Team must remain in the Portfolio."));
    }));
    project.legacyV4RafAuthority?.forEach((row, rowIndex) => {
      if (!teamIds.has(row.teamId)) errors.push(error("UNKNOWN_HISTORICAL_TEAM",
        `projects[${projectIndex}].legacyV4RafAuthority[${rowIndex}].teamId`, "Legacy RAF authority Team must remain in the Portfolio."));
    });
    project.snapshots?.forEach((snapshot, snapshotIndex) => {
      const currentIds = project.requirements.map((requirement) => requirement.teamId);
      if (snapshotIndex === project.snapshots!.length - 1 &&
          (snapshot.participation.length !== currentIds.length || snapshot.participation.some((id, index) => id !== currentIds[index]))) {
        errors.push(error("SNAPSHOT_MEMBERSHIP_MISMATCH", `projects[${projectIndex}].snapshots[${snapshotIndex}].participation`, "Current snapshot must match current requirements in Portfolio order."));
      }
      [...snapshot.participation, ...snapshot.retiredZeroTeams].forEach((id) => {
        if (!teamIds.has(id)) errors.push(error("UNKNOWN_HISTORICAL_TEAM", `projects[${projectIndex}].snapshots[${snapshotIndex}]`, "Historical Team must remain in Portfolio."));
      });
    });
    if (project.snapshots?.length && project.legacyV4Actuals) {
      const current = project.snapshots.at(-1)!;
      const represented = new Set([...current.participation, ...current.retiredZeroTeams]);
      project.legacyV4Actuals.records.forEach((record, recordIndex) => record.teams.forEach((entry) => {
        if (!represented.has(entry.teamId)) errors.push(error("LEGACY_TEAM_NOT_RECONCILED",
          `projects[${projectIndex}].legacyV4Actuals.records[${recordIndex}]`, "Legacy Team needs current participation or an explicit retired zero marker."));
      }));
    }
  });
  input.reservations.forEach((reservation, reservationIndex) => {
    (reservation.legacyV4Actuals ?? reservation.actuals)?.records.forEach((record, recordIndex) => record.teams.forEach((entry, entryIndex) => {
      if (!teamIds.has(entry.teamId)) errors.push(error("UNKNOWN_HISTORICAL_TEAM", `reservations[${reservationIndex}].actuals.records[${recordIndex}].teams[${entryIndex}].teamId`, "Historical Team must remain in the Portfolio."));
    }));
    reservation.snapshots?.forEach((snapshot, snapshotIndex) => {
      const currentIds = reservation.teamAllocations.map((allocation) => allocation.teamId);
      if (snapshotIndex === reservation.snapshots!.length - 1 &&
          (snapshot.participation.length !== currentIds.length || snapshot.participation.some((id, index) => id !== currentIds[index]))) {
        errors.push(error("SNAPSHOT_MEMBERSHIP_MISMATCH", `reservations[${reservationIndex}].snapshots[${snapshotIndex}].participation`, "Current snapshot must match current allocations in Portfolio order."));
      }
      [...snapshot.participation, ...snapshot.retiredZeroTeams].forEach((id) => {
        if (!teamIds.has(id)) errors.push(error("UNKNOWN_HISTORICAL_TEAM", `reservations[${reservationIndex}].snapshots[${snapshotIndex}]`, "Historical Team must remain in Portfolio."));
      });
    });
    if (reservation.snapshots?.length && reservation.legacyV4Actuals) {
      const current = reservation.snapshots.at(-1)!;
      const represented = new Set([...current.participation, ...current.retiredZeroTeams]);
      reservation.legacyV4Actuals.records.forEach((record, recordIndex) => record.teams.forEach((entry) => {
        if (!represented.has(entry.teamId)) errors.push(error("LEGACY_TEAM_NOT_RECONCILED",
          `reservations[${reservationIndex}].legacyV4Actuals.records[${recordIndex}]`, "Legacy Team needs current participation or an explicit retired zero marker."));
      }));
    }
    if (reservation.programId === undefined) {
      if (!reservation.ownColor || !createColor(reservation.ownColor).ok) errors.push(error("MISSING_RESERVATION_OWN_COLOR", `reservations[${reservationIndex}].ownColor`, "Reservation without Program needs a valid own color."));
    } else if (reservation.ownColor !== undefined) errors.push(error("PROGRAM_OWN_COLOR", `reservations[${reservationIndex}].ownColor`, "Reservation in Program cannot retain an own color."));
    if (reservation.programId !== undefined && !programIds.has(reservation.programId)) errors.push(error("UNKNOWN_RESERVATION_PROGRAM", `reservations[${reservationIndex}].programId`, "Unknown Program."));
    if (reservation.priorityFamilyId !== undefined && !priorityFamilyIds.has(reservation.priorityFamilyId)) errors.push(error("UNKNOWN_RESERVATION_PRIORITY_FAMILY", `reservations[${reservationIndex}].priorityFamilyId`, "Unknown Pas."));
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

  const usedPrograms = new Set([...input.projects.map((p) => p.programId), ...input.reservations.map((r) => r.programId)]);
  const usedFamilies = new Set([...input.projects.map((p) => p.priorityFamilyId), ...input.reservations.map((r) => r.priorityFamilyId)]);
  const programNames = new Set<string>();
  input.programs.forEach((program, index) => {
    const key = catalogNameKey(program.name);
    if (!key || programNames.has(key)) errors.push(error("DUPLICATE_OR_EMPTY_PROGRAM_NAME", `programs[${index}].name`, "Program names must be unique and nonempty."));
    if (program.name !== normalizeCatalogName(program.name)) errors.push(error("UNNORMALIZED_PROGRAM_NAME", `programs[${index}].name`, "Program name must be normalized."));
    programNames.add(key);
    if (!createColor(program.color).ok) errors.push(error("INVALID_COLOR", `programs[${index}].color`, "Program needs a valid color."));
    if (!usedPrograms.has(program.id)) errors.push(error("ORPHAN_PROGRAM", `programs[${index}]`, "Program must be used."));
  });
  const familyNames = new Set<string>();
  input.priorityFamilies.forEach((family, index) => {
    const key = catalogNameKey(family.name);
    if (!key || familyNames.has(key)) errors.push(error("DUPLICATE_OR_EMPTY_PRIORITY_FAMILY_NAME", `priorityFamilies[${index}].name`, "Pas names must be unique and nonempty."));
    if (family.name !== normalizeCatalogName(family.name)) errors.push(error("UNNORMALIZED_PRIORITY_FAMILY_NAME", `priorityFamilies[${index}].name`, "Pas name must be normalized."));
    familyNames.add(key);
    if (!usedFamilies.has(family.id)) errors.push(error("ORPHAN_PRIORITY_FAMILY", `priorityFamilies[${index}]`, "Pas must be used."));
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
