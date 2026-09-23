import {
  capacityFromSerialized,
  compareCivilDates,
  createCapacityPeriod,
  createMaxParallelProjects,
  createPortfolio,
  createProject,
  createProjectTeamRequirement,
  createTeam,
  createTeamCapacitySchedule,
  createWorkingPattern,
  serializeQuantity,
  unavailabilityRatioFromSerialized,
  type Capacity,
  type CivilDate,
  type DailyCap,
  type DomainError,
  type PlanningHorizon,
  type Portfolio,
  type ProjectId,
  type RemainingWorkload,
  type Team,
  type TeamId,
  type UnavailabilityRatio,
  type WorkingPattern,
} from "../../domain/index.js";

export interface PlanningSessionState {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
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
  /** One is the highest user-facing priority. */
  readonly priorityPosition: number;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly teamRequirements: readonly UpdateProjectTeamRequirement[];
}

export interface UpdateTeamCapacityPeriod {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly capacity: Capacity;
  readonly unavailability: UnavailabilityRatio;
}

export interface UpdateTeamCommand {
  readonly kind: "update-team";
  readonly teamId: TeamId;
  readonly name: string;
  readonly maxParallelProjects: number;
  readonly workingPattern: WorkingPattern;
  /** Period #i replaces existing period #i; add/remove/reorder is unsupported. */
  readonly capacityPeriods: readonly UpdateTeamCapacityPeriod[];
}

export type PlanningCommand = UpdateProjectCommand | UpdateTeamCommand;

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
  return Object.freeze({
    getState: () => state,
    dispatch: (command: PlanningCommand): PlanningCommandResult => {
      const candidate = applyCommand(state, command);
      if (!candidate.ok) return candidate;
      state = candidate.state;
      return Object.freeze({ ok: true, state });
    },
  });
}

function applyCommand(
  state: PlanningSessionState,
  command: PlanningCommand,
): PlanningCommandResult {
  switch (command.kind) {
    case "update-project":
      return updateProject(state, command);
    case "update-team":
      return updateTeam(state, command);
  }
}

function updateTeam(
  state: PlanningSessionState,
  command: UpdateTeamCommand,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const name = command.name.trim();
  if (name.length === 0) {
    errors.push(
      applicationError(
        "EMPTY_TEAM_NAME",
        "team.name",
        "Team name must not be empty.",
      ),
    );
  }
  const teamIndex = state.portfolio.teams.findIndex(
    (team) => team.id === command.teamId,
  );
  if (teamIndex < 0) {
    errors.push(
      applicationError(
        "UNKNOWN_TEAM",
        "teamId",
        `Team ${command.teamId} does not exist in the current portfolio.`,
      ),
    );
  }
  const maxParallelProjects = createMaxParallelProjects(
    command.maxParallelProjects,
    "team.maxParallelProjects",
  );
  if (!maxParallelProjects.ok) errors.push(...maxParallelProjects.errors);
  const workingPattern = createWorkingPattern({
    workingWeekdays: command.workingPattern.workingWeekdays,
  });
  if (!workingPattern.ok) errors.push(...workingPattern.errors);
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
    errors.length > 0 ||
    teamIndex < 0 ||
    !maxParallelProjects.ok ||
    !workingPattern.ok
  ) {
    return failure(errors);
  }

  const periodResults = command.capacityPeriods.map((period, index) => {
    const path = `team.capacityPeriods[${index}]`;
    const capacity = capacityFromSerialized(
      serializeQuantity(period.capacity),
      `${path}.capacity`,
    );
    const unavailability = unavailabilityRatioFromSerialized(
      serializeQuantity(period.unavailability),
      `${path}.unavailability`,
    );
    if (!capacity.ok || !unavailability.ok) {
      return {
        ok: false as const,
        errors: [
          ...(capacity.ok ? [] : capacity.errors),
          ...(unavailability.ok ? [] : unavailability.errors),
        ],
      };
    }
    return createCapacityPeriod({
      start: period.startDate,
      end: period.endDate,
      dailyCapacity: capacity.value,
      unavailabilityRatio: unavailability.value,
    });
  });
  const periodErrors = periodResults.flatMap((result) =>
    result.ok ? [] : result.errors,
  );
  if (periodErrors.length > 0) return failure(periodErrors);
  const periods = periodResults.map((result) => {
    if (!result.ok) throw new TypeError("Validated capacity period failed.");
    return result.value;
  });
  const currentTeam = state.portfolio.teams[teamIndex]!;
  const capacitySchedule = createTeamCapacitySchedule({
    workingPattern: workingPattern.value,
    periods,
    exceptions: currentTeam.capacitySchedule.exceptions,
  });
  if (!capacitySchedule.ok) return failure(capacitySchedule.errors);
  const updatedTeam = createTeam({
    id: currentTeam.id,
    name,
    maxParallelProjects: maxParallelProjects.value,
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
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, horizon: state.horizon }),
  });
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
  if (
    !Number.isInteger(command.priorityPosition) ||
    command.priorityPosition < 1 ||
    command.priorityPosition > state.portfolio.projects.length
  ) {
    errors.push(
      applicationError(
        "PROJECT_PRIORITY_OUT_OF_RANGE",
        "project.priority",
        `Priority position must be an integer from 1 to ${state.portfolio.projects.length}.`,
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
  const currentTeamIds = new Set(
    project.requirements.map((requirement) => requirement.teamId),
  );
  const replacements = new Map<TeamId, UpdateProjectTeamRequirement>();
  command.teamRequirements.forEach((requirement, index) => {
    const path = `requirements.${requirement.teamId}`;
    if (replacements.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
          path,
          "A project team requirement may appear only once.",
        ),
      );
    } else if (!currentTeamIds.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "UNKNOWN_PROJECT_TEAM_REQUIREMENT",
          `teamRequirements[${index}].teamId`,
          "Project update cannot add a team requirement.",
        ),
      );
    }
    if (
      requirement.dailyCap !== undefined &&
      serializeQuantity(requirement.dailyCap) === "0/1"
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
  for (const requirement of project.requirements) {
    if (!replacements.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "MISSING_PROJECT_TEAM_REQUIREMENT",
          `requirements.${requirement.teamId}`,
          "Project update must retain every existing team requirement.",
        ),
      );
    }
  }
  if (errors.length > 0) return failure(errors);

  const requirementResults = project.requirements.map((current) => {
    const replacement = replacements.get(current.teamId)!;
    return createProjectTeamRequirement({
      teamId: current.teamId,
      remainingWorkload: replacement.remainingWorkload,
      ...(replacement.dailyCap === undefined
        ? {}
        : { dailyCap: replacement.dailyCap }),
    });
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
  const priorityOrder = moveProjectPriority(
    state.portfolio.priorityOrder,
    command.projectId,
    command.priorityPosition,
  );
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects,
    priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);

  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, horizon: state.horizon }),
  });
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
  return Object.freeze({ portfolio: state.portfolio, horizon: state.horizon });
}
