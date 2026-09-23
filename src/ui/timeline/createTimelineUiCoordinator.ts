import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type {
  PlanningCommand,
  ProjectEditViewModel,
  TeamEditViewModel,
  UpdateProjectCommand,
  UpdateTeamCommand,
} from "../../application/index.js";
import type {
  CivilDate,
  DomainError,
  ProjectId,
  TeamId,
} from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
import { createProjectEditController } from "../project-edit/createProjectEditController.js";
import { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createTimelineCursorController } from "./createTimelineCursorController.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";
import { renderPlanningDiagnostics } from "./renderPlanningDiagnostics.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";
import type { TimelineHit } from "./timelineHitTesting.js";
import { reconcileTimelineHit } from "./timelineSelectionGeometry.js";
import type { TimelineViewportState } from "./timelineViewport.js";

export interface TimelineUiProjection {
  readonly viewModel: TimelineViewModel;
  readonly geometry: TimelineGeometry;
}

export type TimelineProjectionCommandResult =
  | Readonly<{ ok: true; projection: TimelineUiProjection }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface TimelineUiSnapshot {
  readonly viewport: TimelineViewportState;
  readonly selectedDate: CivilDate;
  readonly selected: TimelineHit | undefined;
}

export interface TimelineUiCoordinator {
  readonly getProjection: () => TimelineUiProjection;
  readonly getUiSnapshot: () => TimelineUiSnapshot;
  readonly renderProjection: (projection: TimelineUiProjection) => void;
  readonly destroy: () => void;
}

export interface CreateTimelineUiCoordinatorInput {
  readonly elements: AppElements;
  readonly initialProjection: TimelineUiProjection;
  readonly initialDate: CivilDate;
  readonly dispatch: (
    command: PlanningCommand,
  ) => TimelineProjectionCommandResult;
  readonly getProjectEditViewModel: (
    projectId: ProjectId,
  ) => ProjectEditViewModel | undefined;
  readonly getTeamEditViewModel: (
    teamId: TeamId,
  ) => TeamEditViewModel | undefined;
}

export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly renderDiagnostics: typeof renderPlanningDiagnostics;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
  readonly createProjectEditController: typeof createProjectEditController;
  readonly createTeamEditController: typeof createTeamEditController;
}

const DEFAULT_DEPENDENCIES: TimelineUiCoordinatorDependencies = Object.freeze({
  renderTimeline: renderTimelineSvg,
  renderDiagnostics: renderPlanningDiagnostics,
  createViewportController: createTimelineViewportController,
  createCursorController: createTimelineCursorController,
  createInteractionController: createTimelineInteractionController,
  createProjectEditController,
  createTeamEditController,
});

export function createTimelineUiCoordinator(
  input: CreateTimelineUiCoordinatorInput,
  dependencies: TimelineUiCoordinatorDependencies = DEFAULT_DEPENDENCIES,
): TimelineUiCoordinator {
  let projection = input.initialProjection;
  let viewportController: ReturnType<typeof createTimelineViewportController>;
  let cursorController: ReturnType<typeof createTimelineCursorController>;
  let interactionController: ReturnType<typeof createTimelineInteractionController>;
  let projectEditController: ReturnType<typeof createProjectEditController>;
  let teamEditController: ReturnType<typeof createTeamEditController>;
  let mounted = false;

  const updateEditForms = (selected: TimelineHit | undefined): void => {
    const selectedProjectId =
      selected?.kind === "allocation" || selected?.kind === "project-marker"
        ? selected.projectId
        : undefined;
    const editViewModel =
      selectedProjectId === undefined
        ? undefined
        : input.getProjectEditViewModel(selectedProjectId);
    projectEditController.setProject(editViewModel);
    const teamEditViewModel =
      selected?.kind === "team"
        ? input.getTeamEditViewModel(selected.teamId)
        : undefined;
    teamEditController.setTeam(teamEditViewModel);
  };

  const currentSnapshot = (): TimelineUiSnapshot => {
    if (!mounted) {
      return Object.freeze({
        viewport: Object.freeze({
          x: 0,
          width: projection.geometry.width,
        }),
        selectedDate: input.initialDate,
        selected: undefined,
      });
    }
    return Object.freeze({
      viewport: viewportController.getState(),
      selectedDate: cursorController.getState().selectedDate,
      selected: interactionController.getState().selected,
    });
  };

  const destroyControllers = (): void => {
    if (!mounted) return;
    interactionController.destroy();
    cursorController.destroy();
    viewportController.destroy();
    mounted = false;
  };

  const mountProjection = (
    nextProjection: TimelineUiProjection,
    snapshot: TimelineUiSnapshot,
  ): void => {
    destroyControllers();
    projection = nextProjection;
    dependencies.renderTimeline({
      svg: input.elements.svg,
      geometry: projection.geometry,
    });
    dependencies.renderDiagnostics({
      container: input.elements.diagnostics,
      viewModel: projection.viewModel,
    });

    const selectedDate = projection.geometry.dates.some(
      (candidate) => candidate.date === snapshot.selectedDate,
    )
      ? snapshot.selectedDate
      : projection.viewModel.horizon.start;
    const selected = reconcileTimelineHit(
      projection.geometry,
      snapshot.selected,
    );
    viewportController = dependencies.createViewportController({
      svg: input.elements.svg,
      geometry: projection.geometry,
      controls: input.elements.viewportControls,
      initialViewport: snapshot.viewport,
    });
    cursorController = dependencies.createCursorController({
      svg: input.elements.svg,
      geometry: projection.geometry,
      viewModel: projection.viewModel,
      summaryContainer: input.elements.dateSummary,
      cursorControl: input.elements.cursorControl,
      initialDate: selectedDate,
      getViewport: viewportController.getState,
    });
    interactionController = dependencies.createInteractionController({
      svg: input.elements.svg,
      geometry: projection.geometry,
      viewModel: projection.viewModel,
      getViewport: viewportController.getState,
      tooltipContainer: input.elements.tooltip,
      selectionSummaryContainer: input.elements.selectionSummary,
      keyboardControl: input.elements.cursorControl,
      ...(selected === undefined ? {} : { initialSelected: selected }),
      onSelectionChange: updateEditForms,
    });
    mounted = true;
  };

  const renderProjection = (nextProjection: TimelineUiProjection): void => {
    const snapshot = currentSnapshot();
    mountProjection(nextProjection, snapshot);
  };

  const applyProjectUpdate = (command: UpdateProjectCommand) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    renderProjection(result.projection);
    return Object.freeze({ ok: true as const });
  };
  const applyTeamUpdate = (command: UpdateTeamCommand) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    renderProjection(result.projection);
    return Object.freeze({ ok: true as const });
  };

  projectEditController = dependencies.createProjectEditController({
    controls: input.elements.projectEditControls,
    errorContainer: input.elements.applicationError,
    onApply: applyProjectUpdate,
  });
  teamEditController = dependencies.createTeamEditController({
    controls: input.elements.teamEditControls,
    errorContainer: input.elements.applicationError,
    onApply: applyTeamUpdate,
  });
  mountProjection(input.initialProjection, currentSnapshot());

  return Object.freeze({
    getProjection: () => projection,
    getUiSnapshot: currentSnapshot,
    renderProjection,
    destroy: () => {
      projectEditController.destroy();
      teamEditController.destroy();
      destroyControllers();
    },
  });
}
