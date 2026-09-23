import {
  createPortfolio,
  createProject,
  createProjectTeamRequirement,
  serializeQuantity,
  type CivilDate,
  type DailyCap,
  type DomainError,
  type PlanningHorizon,
  type Portfolio,
  type ProjectId,
  type RemainingWorkload,
  type TeamId,
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

export type PlanningCommand = UpdateProjectCommand;

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
  }
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
