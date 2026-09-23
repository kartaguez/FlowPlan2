import {
  createPortfolio,
  createProject,
  type DomainError,
  type PlanningHorizon,
  type Portfolio,
  type ProjectId,
} from "../../domain/index.js";

export interface PlanningSessionState {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
}

export type PlanningCommand = Readonly<{
  kind: "rename-project";
  projectId: ProjectId;
  label: string;
}>;

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
    case "rename-project":
      return renameProject(state, command.projectId, command.label);
  }
}

function renameProject(
  state: PlanningSessionState,
  projectId: ProjectId,
  label: string,
): PlanningCommandResult {
  const normalizedLabel = label.trim();
  if (normalizedLabel.length === 0) {
    return failure(
      "EMPTY_PROJECT_LABEL",
      "label",
      "Project label must not be empty.",
    );
  }

  const projectIndex = state.portfolio.projects.findIndex(
    (project) => project.id === projectId,
  );
  if (projectIndex < 0) {
    return failure(
      "UNKNOWN_PROJECT",
      "projectId",
      `Project ${projectId} does not exist in the current portfolio.`,
    );
  }

  const project = state.portfolio.projects[projectIndex]!;
  const renamed = createProject({
    ...project,
    name: normalizedLabel,
  });
  if (!renamed.ok) return Object.freeze({ ok: false, errors: renamed.errors });

  const projects = state.portfolio.projects.map((candidate, index) =>
    index === projectIndex ? renamed.value : candidate,
  );
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) {
    return Object.freeze({ ok: false, errors: portfolio.errors });
  }

  return Object.freeze({
    ok: true,
    state: freezeState({ portfolio: portfolio.value, horizon: state.horizon }),
  });
}

function failure(
  code: string,
  path: string,
  message: string,
): PlanningCommandResult {
  return Object.freeze({
    ok: false,
    errors: Object.freeze([Object.freeze({ code, path, message })]),
  });
}

function freezeState(state: PlanningSessionState): PlanningSessionState {
  return Object.freeze({ portfolio: state.portfolio, horizon: state.horizon });
}
