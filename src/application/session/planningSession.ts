import {
  capacityFromSerialized,
  compareCivilDates,
  createCapacityPeriod,
  createReservation,
  createReservationTeamAllocation,
  createMaxParallelProjects,
  createPlanningHorizon,
  createPortfolio,
  createProject,
  createProjectTeamRequirement,
  createTeam,
  createTeamCapacitySchedule,
  createWorkingPattern,
  serializeQuantity,
  reservationRatioFromSerialized,
  unavailabilityRatioFromSerialized,
  type Capacity,
  type CapacityPeriod,
  type CivilDate,
  type DailyCap,
  type DomainError,
  type Portfolio,
  type ProjectId,
  type ProgramId,
  type PriorityFamilyId,
  type ReservationId,
  type ReservationRatio,
  type RemainingWorkload,
  type Team,
  type TeamId,
  type UnavailabilityRatio,
  type WorkingPattern,
  type MaxParallelProjects,
} from "../../domain/index.js";
import { createTeamIdGenerator, type TeamIdGenerator } from "./teamIdGenerator.js";
import { createProjectIdGenerator, type ProjectIdGenerator } from "./projectIdGenerator.js";

export interface PlanningSettings {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly workingPattern: WorkingPattern;
  readonly maxParallelProjects: MaxParallelProjects;
}

export interface PlanningSessionState {
  readonly portfolio: Portfolio;
  readonly planning: PlanningSettings;
}

export interface UpdatePlanningSettingsCommand {
  readonly kind: "update-planning-settings";
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly workingPattern: WorkingPattern;
  readonly maxParallelProjects: number;
}

export interface UpdateProjectTeamRequirement {
  readonly teamId: TeamId;
  readonly remainingWorkload: RemainingWorkload;
  readonly dailyCap?: DailyCap;
}

export interface UpdateProjectCommand {
  readonly kind: "update-project";
  readonly projectId: ProjectId;
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly teamRequirements: readonly UpdateProjectTeamRequirement[];
}

export interface CreateProjectCommand {
  readonly kind: "create-project";
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly teamRequirements: readonly UpdateProjectTeamRequirement[];
}

export interface RemoveProjectCommand {
  readonly kind: "remove-project";
  readonly projectId: ProjectId;
}

export interface ReorderProjectCommand {
  readonly kind: "reorder-project";
  readonly projectId: ProjectId;
  /** One is the highest user-facing priority. */
  readonly targetPosition: number;
}

export interface UpdateTeamCapacityPeriod {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly capacity: Capacity;
  readonly unavailability: UnavailabilityRatio;
}

export interface UpdateTeamNameCommand {
  readonly kind: "update-team-name";
  readonly teamId: TeamId;
  readonly name: string;
}

export interface CreateTeamCommand {
  readonly kind: "create-team";
  readonly name: string;
  readonly capacityPeriods: readonly UpdateTeamCapacityPeriod[];
}

export interface RemoveTeamCommand {
  readonly kind: "remove-team";
  readonly teamId: TeamId;
}

export interface UpdateTeamCapacityPeriodsCommand {
  readonly kind: "update-team-capacity-periods";
  readonly teamId: TeamId;
  /** Period #i replaces existing period #i; add/remove/reorder is unsupported. */
  readonly capacityPeriods: readonly UpdateTeamCapacityPeriod[];
}

export type UpdateReservationTeamAllocation =
  | Readonly<{ teamId: TeamId; kind: "ratio"; ratio: ReservationRatio }>
  | Readonly<{ teamId: TeamId; kind: "fixed-daily"; dailyCapacity: Capacity }>;

export interface UpdateReservationCommand {
  readonly kind: "update-reservation";
  readonly reservationId: ReservationId;
  readonly name: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly UpdateReservationTeamAllocation[];
}

export type PlanningCommand =
  | UpdatePlanningSettingsCommand
  | UpdateProjectCommand
  | CreateProjectCommand
  | RemoveProjectCommand
  | ReorderProjectCommand
  | CreateTeamCommand
  | RemoveTeamCommand
  | UpdateTeamNameCommand
  | UpdateTeamCapacityPeriodsCommand
  | UpdateReservationCommand;

export type PlanningCommandResult =
  | Readonly<{ ok: true; state: PlanningSessionState }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface PlanningSession {
  readonly getState: () => PlanningSessionState;
  readonly dispatch: (command: PlanningCommand) => PlanningCommandResult;
}

export function createPlanningSession(
  initialState: PlanningSessionState,
): PlanningSession {
  let state = freezeState(initialState);
  const teamIds = createTeamIdGenerator(() => state.portfolio.teams.map((team) => team.id));
  const projectIds = createProjectIdGenerator(() => state.portfolio.projects.map((project) => project.id));
  return Object.freeze({
    getState: () => state,
    dispatch: (command: PlanningCommand): PlanningCommandResult => {
      const candidate = applyCommand(state, command, teamIds, projectIds);
      if (!candidate.ok) return candidate;
      state = candidate.state;
      return Object.freeze({ ok: true, state });
    },
  });
}

function applyCommand(
  state: PlanningSessionState,
  command: PlanningCommand,
  teamIds: TeamIdGenerator,
  projectIds: ProjectIdGenerator,
): PlanningCommandResult {
  switch (command.kind) {
    case "update-planning-settings":
      return updatePlanningSettings(state, command);
    case "update-project":
      return updateProject(state, command);
    case "create-project":
      return addProject(state, command, projectIds);
    case "remove-project":
      return removeProject(state, command);
    case "reorder-project":
      return reorderProject(state, command);
    case "create-team":
      return addTeam(state, command, teamIds);
    case "remove-team":
      return removeTeam(state, command);
    case "update-team-name":
      return updateTeamName(state, command);
    case "update-team-capacity-periods":
      return updateTeamCapacityPeriods(state, command);
    case "update-reservation":
      return updateReservation(state, command);
  }
}

function updateReservation(
  state: PlanningSessionState,
  command: UpdateReservationCommand,
): PlanningCommandResult {
  const reservationIndex = state.portfolio.reservations.findIndex(
    (reservation) => reservation.id === command.reservationId,
  );
  if (reservationIndex < 0) {
    return failure([
      applicationError(
        "UNKNOWN_RESERVATION",
        "reservationId",
        `Reservation ${command.reservationId} does not exist in the current portfolio.`,
      ),
    ]);
  }
  const errors: DomainError[] = [];
  const teamIds = new Set<TeamId>();
  const knownTeamIds = new Set(state.portfolio.teams.map((team) => team.id));
  const allocations = command.teamAllocations.map((allocation, index) => {
    const path = `reservation.teamAllocations[${index}]`;
    if (teamIds.has(allocation.teamId)) {
      errors.push(
        applicationError(
          "DUPLICATE_RESERVATION_TEAM_ALLOCATION",
          `${path}.teamId`,
          "A team may appear only once in reservation allocations.",
        ),
      );
    }
    teamIds.add(allocation.teamId);
    if (!knownTeamIds.has(allocation.teamId)) {
      errors.push(
        applicationError(
          "UNKNOWN_RESERVATION_TEAM",
          `${path}.teamId`,
          "Reservation allocation must reference an existing team.",
        ),
      );
    }
    const amount = allocation.kind === "ratio"
      ? reservationRatioFromSerialized(serializeQuantity(allocation.ratio), `${path}.ratio`)
      : capacityFromSerialized(serializeQuantity(allocation.dailyCapacity), `${path}.dailyCapacity`);
    if (!amount.ok) {
      errors.push(...amount.errors);
      return undefined;
    }
    const result = createReservationTeamAllocation({
      teamId: allocation.teamId,
      amount: allocation.kind === "ratio"
        ? Object.freeze({ kind: "ratio", ratio: amount.value as ReservationRatio })
        : Object.freeze({ kind: "fixed-daily", dailyCapacity: amount.value as Capacity }),
    });
    if (!result.ok) {
      errors.push(...result.errors);
      return undefined;
    }
    return result.value;
  });
  if (errors.length > 0 || allocations.some((item) => item === undefined)) {
    return failure(errors);
  }
  const validated = allocations.filter(
    (item): item is NonNullable<typeof item> => item !== undefined,
  );
  const updated = createReservation({
    id: command.reservationId,
    name: command.name,
    startDate: command.startDate,
    endDate: command.endDate,
    teamAllocations: validated,
  });
  if (!updated.ok) return failure(updated.errors);
  const reservations = state.portfolio.reservations.map((reservation, index) =>
    index === reservationIndex ? updated.value : reservation,
  );
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, planning: state.planning }),
  });
}

function updatePlanningSettings(
  state: PlanningSessionState,
  command: UpdatePlanningSettingsCommand,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const horizon = createPlanningHorizon({
    start: command.startDate,
    end: command.endDate,
  });
  if (!horizon.ok) errors.push(...horizon.errors);
  const workingPattern = createWorkingPattern({
    workingWeekdays: command.workingPattern.workingWeekdays,
  });
  if (!workingPattern.ok) errors.push(...workingPattern.errors);
  if (
    workingPattern.ok &&
    workingPattern.value.workingWeekdays.length === 0
  ) {
    errors.push(
      applicationError(
        "EMPTY_WORKING_WEEK",
        "planning.workingWeekdays",
        "At least one working weekday is required.",
      ),
    );
  }
  const maxParallelProjects = createMaxParallelProjects(
    command.maxParallelProjects,
    "planning.maxParallelProjects",
  );
  if (!maxParallelProjects.ok) errors.push(...maxParallelProjects.errors);
  if (!horizon.ok || !workingPattern.ok || !maxParallelProjects.ok || errors.length > 0) {
    return failure(errors);
  }
  return Object.freeze({
    ok: true,
    state: freezeState({
      portfolio: state.portfolio,
      planning: Object.freeze({
        startDate: horizon.value.start,
        endDate: horizon.value.end,
        workingPattern: workingPattern.value,
        maxParallelProjects: maxParallelProjects.value,
      }),
    }),
  });
}

function updateTeamName(
  state: PlanningSessionState,
  command: UpdateTeamNameCommand,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([
      applicationError("EMPTY_TEAM_NAME", "team.name", "Team name must not be empty."),
    ]);
  }
  const teamIndex = state.portfolio.teams.findIndex(
    (team) => team.id === command.teamId,
  );
  if (teamIndex < 0) {
    return failure([
      applicationError(
        "UNKNOWN_TEAM",
        "teamId",
        `Team ${command.teamId} does not exist in the current portfolio.`,
      ),
    ]);
  }
  const currentTeam = state.portfolio.teams[teamIndex]!;
  const updatedTeam = createTeam({
    id: currentTeam.id,
    name,
    capacitySchedule: currentTeam.capacitySchedule,
  });
  if (!updatedTeam.ok) return failure(updatedTeam.errors);
  return replaceTeam(state, teamIndex, updatedTeam.value);
}

function addTeam(
  state: PlanningSessionState,
  command: CreateTeamCommand,
  teamIds: TeamIdGenerator,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([applicationError("EMPTY_TEAM_NAME", "team.name", "Team name must not be empty.")]);
  }
  if (command.capacityPeriods.length === 0) {
    return failure([applicationError("EMPTY_TEAM_CAPACITY_PERIODS", "team.capacityPeriods",
      "A new Team needs at least one capacity period.")]);
  }
  const periodResult = buildTeamCapacityPeriods(command.capacityPeriods);
  if (!periodResult.ok) return failure(periodResult.errors);
  const schedule = createTeamCapacitySchedule({ periods: periodResult.periods, exceptions: [] });
  if (!schedule.ok) return failure(schedule.errors);
  const team = createTeam({ id: teamIds.next(), name, capacitySchedule: schedule.value });
  if (!team.ok) return failure(team.errors);
  const portfolio = createPortfolio({
    teams: [...state.portfolio.teams, team.value],
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ portfolio: portfolio.value, planning: state.planning }) });
}

function removeTeam(
  state: PlanningSessionState,
  command: RemoveTeamCommand,
): PlanningCommandResult {
  if (!state.portfolio.teams.some((team) => team.id === command.teamId)) {
    return failure([applicationError("UNKNOWN_TEAM", "teamId",
      `Team ${command.teamId} does not exist in the current portfolio.`)]);
  }
  const errors: DomainError[] = [];
  state.portfolio.projects.forEach((project, projectIndex) => {
    project.requirements.forEach((requirement, requirementIndex) => {
      if (requirement.teamId === command.teamId) errors.push(applicationError(
        "TEAM_REFERENCED_BY_PROJECT",
        `projects[${projectIndex}].requirements[${requirementIndex}].teamId`,
        `Team ${command.teamId} is used by Project ${project.name}.`,
      ));
    });
  });
  state.portfolio.reservations.forEach((reservation, reservationIndex) => {
    reservation.teamAllocations.forEach((allocation, allocationIndex) => {
      if (allocation.teamId === command.teamId) errors.push(applicationError(
        "TEAM_REFERENCED_BY_RESERVATION",
        `reservations[${reservationIndex}].teamAllocations[${allocationIndex}].teamId`,
        `Team ${command.teamId} is used by Reservation ${reservation.name}.`,
      ));
    });
  });
  if (errors.length > 0) return failure(errors);
  const portfolio = createPortfolio({
    teams: state.portfolio.teams.filter((team) => team.id !== command.teamId),
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ portfolio: portfolio.value, planning: state.planning }) });
}

function buildTeamCapacityPeriods(
  inputs: readonly UpdateTeamCapacityPeriod[],
): Readonly<{ ok: true; periods: readonly CapacityPeriod[] }> | Readonly<{ ok: false; errors: readonly DomainError[] }> {
  const results = inputs.map((period, index) => {
    const path = `team.capacityPeriods[${index}]`;
    const capacity = capacityFromSerialized(serializeQuantity(period.capacity), `${path}.capacity`);
    const unavailability = unavailabilityRatioFromSerialized(
      serializeQuantity(period.unavailability), `${path}.unavailability`);
    if (!capacity.ok || !unavailability.ok) return {
      ok: false as const,
      errors: [...(capacity.ok ? [] : capacity.errors), ...(unavailability.ok ? [] : unavailability.errors)],
    };
    return createCapacityPeriod({ start: period.startDate, end: period.endDate,
      dailyCapacity: capacity.value, unavailabilityRatio: unavailability.value });
  });
  const errors = results.flatMap((result) => result.ok ? [] : result.errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, periods: results.map((result) => {
    if (!result.ok) throw new TypeError("Validated capacity period failed.");
    return result.value;
  }) };
}

function updateTeamCapacityPeriods(
  state: PlanningSessionState,
  command: UpdateTeamCapacityPeriodsCommand,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const teamIndex = state.portfolio.teams.findIndex(
    (team) => team.id === command.teamId,
  );
  if (teamIndex < 0) {
    return failure([
      applicationError("UNKNOWN_TEAM", "teamId", `Team ${command.teamId} does not exist in the current portfolio.`),
    ]);
  }
  if (teamIndex >= 0) {
    const expectedPeriodCount =
      state.portfolio.teams[teamIndex]!.capacitySchedule.periods.length;
    if (command.capacityPeriods.length !== expectedPeriodCount) {
      errors.push(
        applicationError(
          "CAPACITY_PERIOD_COUNT_CHANGED",
          "team.capacityPeriods",
          `Team update must retain exactly ${expectedPeriodCount} capacity periods.`,
        ),
      );
    }
  }
  for (let index = 1; index < command.capacityPeriods.length; index += 1) {
    const previous = command.capacityPeriods[index - 1]!;
    const current = command.capacityPeriods[index]!;
    if (compareCivilDates(previous.startDate, current.startDate) > 0) {
      errors.push(
        applicationError(
          "CAPACITY_PERIOD_ORDER_CHANGED",
          `team.capacityPeriods[${index}]`,
          "Capacity period order cannot change in Phase 7C.",
        ),
      );
    }
  }
  if (
    errors.length > 0
  ) {
    return failure(errors);
  }

  const periodResult = buildTeamCapacityPeriods(command.capacityPeriods);
  if (!periodResult.ok) return failure(periodResult.errors);
  const currentTeam = state.portfolio.teams[teamIndex]!;
  const capacitySchedule = createTeamCapacitySchedule({
    periods: periodResult.periods,
    exceptions: currentTeam.capacitySchedule.exceptions,
  });
  if (!capacitySchedule.ok) return failure(capacitySchedule.errors);
  const updatedTeam = createTeam({
    id: currentTeam.id,
    name: currentTeam.name,
    capacitySchedule: capacitySchedule.value,
  });
  if (!updatedTeam.ok) return failure(updatedTeam.errors);
  return replaceTeam(state, teamIndex, updatedTeam.value);
}

function replaceTeam(
  state: PlanningSessionState,
  teamIndex: number,
  updatedTeam: Team,
): PlanningCommandResult {
  const teams = state.portfolio.teams.map((team, index) =>
    index === teamIndex ? updatedTeam : team,
  );
  const portfolio = createPortfolio({
    teams,
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, planning: state.planning }),
  });
}

function addProject(
  state: PlanningSessionState,
  command: CreateProjectCommand,
  projectIds: ProjectIdGenerator,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([applicationError("EMPTY_PROJECT_LABEL", "project.name", "Project label must not be empty.")]);
  }
  const requirementResults = command.teamRequirements.map((requirement) =>
    createProjectTeamRequirement(requirement));
  const errors = requirementResults.flatMap((result) => result.ok ? [] : result.errors);
  if (errors.length > 0) return failure(errors);
  const requirements = requirementResults.map((result) => {
    if (!result.ok) throw new TypeError("Validated Project requirement failed.");
    return result.value;
  });
  const id = projectIds.next();
  const project = createProject({
    id, name,
    ...(command.programId === undefined ? {} : { programId: command.programId }),
    ...(command.priorityFamilyId === undefined ? {} : { priorityFamilyId: command.priorityFamilyId }),
    ...(command.earliestStartDate === undefined ? {} : { earliestStartDate: command.earliestStartDate }),
    ...(command.objectiveEndDate === undefined ? {} : { objectiveEndDate: command.objectiveEndDate }),
    ...(command.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: command.mandatoryDeadline }),
    requirements,
  });
  if (!project.ok) return failure(project.errors);
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: [...state.portfolio.projects, project.value],
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: [...state.portfolio.priorityOrder, id],
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ portfolio: portfolio.value, planning: state.planning }) });
}

function removeProject(
  state: PlanningSessionState,
  command: RemoveProjectCommand,
): PlanningCommandResult {
  if (!state.portfolio.projects.some((project) => project.id === command.projectId)) {
    return failure([applicationError("UNKNOWN_PROJECT", "projectId",
      `Project ${command.projectId} does not exist in the current portfolio.`)]);
  }
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: state.portfolio.projects.filter((project) => project.id !== command.projectId),
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder.filter((id) => id !== command.projectId),
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ portfolio: portfolio.value, planning: state.planning }) });
}

function updateProject(
  state: PlanningSessionState,
  command: UpdateProjectCommand,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const name = command.name.trim();
  if (name.length === 0) {
    errors.push(
      applicationError(
        "EMPTY_PROJECT_LABEL",
        "project.name",
        "Project label must not be empty.",
      ),
    );
  }
  const projectIndex = state.portfolio.projects.findIndex(
    (project) => project.id === command.projectId,
  );
  if (projectIndex < 0) {
    errors.push(
      applicationError(
        "UNKNOWN_PROJECT",
        "projectId",
        `Project ${command.projectId} does not exist in the current portfolio.`,
      ),
    );
  }
  if (errors.length > 0 || projectIndex < 0) return failure(errors);

  const project = state.portfolio.projects[projectIndex]!;
  const validTeamIds = new Set(state.portfolio.teams.map((team) => team.id));
  const currentRequirementsByTeam = new Map(
    project.requirements.map((requirement) => [requirement.teamId, requirement]),
  );
  const replacements = new Map<TeamId, UpdateProjectTeamRequirement>();
  command.teamRequirements.forEach((requirement, index) => {
    const path = `requirements.${requirement.teamId}`;
    const currentDailyCap = currentRequirementsByTeam.get(requirement.teamId)?.dailyCap;
    if (replacements.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
          path,
          "A project team requirement may appear only once.",
        ),
      );
    } else if (!validTeamIds.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "UNKNOWN_PROJECT_TEAM_REQUIREMENT",
          `teamRequirements[${index}].teamId`,
          "Project requirement Team must exist in the portfolio.",
        ),
      );
    }
    if (
      requirement.dailyCap !== undefined &&
      serializeQuantity(requirement.dailyCap) === "0/1" &&
      (currentDailyCap === undefined || serializeQuantity(currentDailyCap) !== "0/1")
    ) {
      errors.push(
        applicationError(
          "NON_POSITIVE_DAILY_CAP",
          `${path}.dailyCap`,
          "Daily cap must be greater than zero when provided.",
        ),
      );
    }
    replacements.set(requirement.teamId, requirement);
  });
  if (errors.length > 0) return failure(errors);

  const requirementResults = state.portfolio.teams.flatMap((team) => {
    const replacement = replacements.get(team.id);
    if (replacement === undefined) return [];
    const dailyCap = replacement.dailyCap ?? currentRequirementsByTeam.get(team.id)?.dailyCap;
    return [createProjectTeamRequirement({
      teamId: team.id,
      remainingWorkload: replacement.remainingWorkload,
      ...(dailyCap === undefined ? {} : { dailyCap }),
    })];
  });
  const requirementErrors = requirementResults.flatMap((result) =>
    result.ok ? [] : result.errors,
  );
  if (requirementErrors.length > 0) return failure(requirementErrors);
  const requirements = requirementResults.map((result) => {
    if (!result.ok) {
      throw new TypeError("Validated requirement reconstruction failed.");
    }
    return result.value;
  });

  const updatedProject = createProject({
    id: project.id,
    name,
    ...(command.programId === undefined ? {} : { programId: command.programId }),
    ...(command.priorityFamilyId === undefined ? {} : { priorityFamilyId: command.priorityFamilyId }),
    ...(command.earliestStartDate === undefined
      ? {}
      : { earliestStartDate: command.earliestStartDate }),
    ...(command.objectiveEndDate === undefined
      ? {}
      : { objectiveEndDate: command.objectiveEndDate }),
    ...(command.mandatoryDeadline === undefined
      ? {}
      : { mandatoryDeadline: command.mandatoryDeadline }),
    requirements,
  });
  if (!updatedProject.ok) return failure(updatedProject.errors);

  const projects = state.portfolio.projects.map((candidate, index) =>
    index === projectIndex ? updatedProject.value : candidate,
  );
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);

  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, planning: state.planning }),
  });
}

function reorderProject(
  state: PlanningSessionState,
  command: ReorderProjectCommand,
): PlanningCommandResult {
  if (!state.portfolio.projects.some((project) => project.id === command.projectId)) {
    return failure([applicationError("UNKNOWN_PROJECT", "projectId",
      `Project ${command.projectId} does not exist in the current portfolio.`)]);
  }
  const count = state.portfolio.priorityOrder.length;
  if (!Number.isSafeInteger(command.targetPosition) ||
    command.targetPosition < 1 || command.targetPosition > count) {
    return failure([applicationError("PROJECT_PRIORITY_OUT_OF_RANGE", "targetPosition",
      `Priority position must be an integer from 1 to ${count}.`)]);
  }
  if (state.portfolio.priorityOrder[command.targetPosition - 1] === command.projectId) {
    return Object.freeze({ ok: true, state });
  }
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: moveProjectPriority(state.portfolio.priorityOrder, command.projectId, command.targetPosition),
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ portfolio: portfolio.value, planning: state.planning }) });
}

function moveProjectPriority(
  priorityOrder: readonly ProjectId[],
  projectId: ProjectId,
  targetPosition: number,
): readonly ProjectId[] {
  const withoutProject = priorityOrder.filter(
    (candidate) => candidate !== projectId,
  );
  withoutProject.splice(targetPosition - 1, 0, projectId);
  return Object.freeze(withoutProject);
}

function applicationError(
  code: string,
  path: string,
  message: string,
): DomainError {
  return Object.freeze({ code, path, message });
}

function failure(errors: readonly DomainError[]): PlanningCommandResult {
  return Object.freeze({ ok: false, errors: Object.freeze([...errors]) });
}

function freezeState(state: PlanningSessionState): PlanningSessionState {
  return Object.freeze({ portfolio: state.portfolio, planning: state.planning });
}
