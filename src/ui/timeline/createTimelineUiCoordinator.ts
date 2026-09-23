import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type { PlanningCommand } from "../../application/index.js";
import type {
  CivilDate,
  DomainError,
  ProjectId,
} from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
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
}

export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly renderDiagnostics: typeof renderPlanningDiagnostics;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
}

const DEFAULT_DEPENDENCIES: TimelineUiCoordinatorDependencies = Object.freeze({
  renderTimeline: renderTimelineSvg,
  renderDiagnostics: renderPlanningDiagnostics,
  createViewportController: createTimelineViewportController,
  createCursorController: createTimelineCursorController,
  createInteractionController: createTimelineInteractionController,
});

export function createTimelineUiCoordinator(
  input: CreateTimelineUiCoordinatorInput,
  dependencies: TimelineUiCoordinatorDependencies = DEFAULT_DEPENDENCIES,
): TimelineUiCoordinator {
  let projection = input.initialProjection;
  let selectedProjectId: ProjectId | undefined;
  let viewportController: ReturnType<typeof createTimelineViewportController>;
  let cursorController: ReturnType<typeof createTimelineCursorController>;
  let interactionController: ReturnType<typeof createTimelineInteractionController>;
  let mounted = false;

  const updateProjectForm = (selected: TimelineHit | undefined): void => {
    selectedProjectId =
      selected?.kind === "allocation" || selected?.kind === "project-marker"
        ? selected.projectId
        : undefined;
    const project =
      selectedProjectId === undefined
        ? undefined
        : projection.viewModel.projects.find(
            (candidate) => candidate.id === selectedProjectId,
          );
    const enabled = project !== undefined;
    input.elements.projectEditControls.input.disabled = !enabled;
    input.elements.projectEditControls.apply.disabled = !enabled;
    input.elements.projectEditControls.cancel.disabled = !enabled;
    input.elements.projectEditControls.input.value = project?.label ?? "";
    input.elements.projectEditControls.status.textContent = enabled
      ? `Editing ${project.label}`
      : "Select a project allocation or marker to edit.";
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
      onSelectionChange: updateProjectForm,
    });
    mounted = true;
  };

  const renderProjection = (nextProjection: TimelineUiProjection): void => {
    const snapshot = currentSnapshot();
    mountProjection(nextProjection, snapshot);
  };

  const resetProjectInput = (): void => {
    updateProjectForm(interactionController.getState().selected);
  };
  const renderApplicationErrors = (errors: readonly DomainError[]): void => {
    input.elements.applicationError.textContent = errors
      .map((error) => error.message)
      .join(" ");
    input.elements.applicationError.hidden = false;
  };
  const clearApplicationError = (): void => {
    input.elements.applicationError.textContent = "";
    input.elements.applicationError.hidden = true;
  };
  const onProjectSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (selectedProjectId === undefined) return;
    const result = input.dispatch({
      kind: "rename-project",
      projectId: selectedProjectId,
      label: input.elements.projectEditControls.input.value,
    });
    if (!result.ok) {
      renderApplicationErrors(result.errors);
      return;
    }
    clearApplicationError();
    renderProjection(result.projection);
  };

  input.elements.projectEditControls.form.addEventListener(
    "submit",
    onProjectSubmit,
  );
  input.elements.projectEditControls.cancel.addEventListener(
    "click",
    resetProjectInput,
  );
  mountProjection(input.initialProjection, currentSnapshot());

  return Object.freeze({
    getProjection: () => projection,
    getUiSnapshot: currentSnapshot,
    renderProjection,
    destroy: () => {
      input.elements.projectEditControls.form.removeEventListener(
        "submit",
        onProjectSubmit,
      );
      input.elements.projectEditControls.cancel.removeEventListener(
        "click",
        resetProjectInput,
      );
      destroyControllers();
    },
  });
}
