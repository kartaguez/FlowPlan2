import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type {
  PlanningCommand,
  PlanningSettingsViewModel,
  ProjectEditViewModel,
  TeamEditViewModel,
  TeamReservationsEditViewModel,
  UpdateProjectCommand,
  UpdateTeamCapacityPeriodsCommand,
  UpdateTeamNameCommand,
  ReplaceTeamReservationsCommand,
} from "../../application/index.js";
import type {
  CivilDate,
  DomainError,
  ProjectId,
  TeamId,
  ReservationId,
} from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
import { createProjectEditController } from "../project-edit/createProjectEditController.js";
import { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import { createPlanningSettingsController } from "../planning-settings/createPlanningSettingsController.js";
import { createTimelineCursorController } from "./createTimelineCursorController.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";
import { renderPlanningDiagnostics } from "./renderPlanningDiagnostics.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";
import { renderTimelineShellNavigation } from "./renderTimelineShellNavigation.js";
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
  readonly editingContext: TimelineEditingContext;
  readonly editingContextSource: "timeline" | "shell" | undefined;
}

export type TimelineEditingContext =
  | Readonly<{ kind: "project"; projectId: ProjectId }>
  | Readonly<{ kind: "team"; teamId: TeamId }>
  | undefined;

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
  readonly getPlanningSettingsViewModel: () => PlanningSettingsViewModel;
  readonly getTeamEditViewModel: (
    teamId: TeamId,
  ) => TeamEditViewModel | undefined;
  readonly getTeamReservationsEditViewModel: (
    teamId: TeamId,
  ) => TeamReservationsEditViewModel | undefined;
  readonly nextReservationId: () => ReservationId;
}

export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly renderDiagnostics: typeof renderPlanningDiagnostics;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
  readonly createProjectEditController: typeof createProjectEditController;
  readonly createTeamEditController: typeof createTeamEditController;
  readonly createReservationEditController: typeof createReservationEditController;
  readonly createPlanningSettingsController: typeof createPlanningSettingsController;
  readonly renderShellNavigation: typeof renderTimelineShellNavigation;
}

const DEFAULT_DEPENDENCIES: TimelineUiCoordinatorDependencies = Object.freeze({
  renderTimeline: renderTimelineSvg,
  renderDiagnostics: renderPlanningDiagnostics,
  createViewportController: createTimelineViewportController,
  createCursorController: createTimelineCursorController,
  createInteractionController: createTimelineInteractionController,
  createProjectEditController,
  createTeamEditController,
  createReservationEditController,
  createPlanningSettingsController,
  renderShellNavigation: renderTimelineShellNavigation,
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
  let reservationEditController: ReturnType<typeof createReservationEditController>;
  let planningSettingsController: ReturnType<typeof createPlanningSettingsController>;
  let shellNavigation: ReturnType<typeof renderTimelineShellNavigation>;
  let editingContext: TimelineEditingContext;
  let editingContextSource: "timeline" | "shell" | undefined;
  let mounted = false;

  const updateEditForms = (context: TimelineEditingContext): void => {
    const selectedProjectId = context?.kind === "project" ? context.projectId : undefined;
    const editViewModel =
      selectedProjectId === undefined
        ? undefined
        : input.getProjectEditViewModel(selectedProjectId);
    projectEditController.setProject(editViewModel);
    const teamEditViewModel =
      context?.kind === "team"
        ? input.getTeamEditViewModel(context.teamId)
        : undefined;
    teamEditController.setTeam(teamEditViewModel);
    reservationEditController.setTeam(undefined);
  };

  const contextFromHit = (selected: TimelineHit | undefined): TimelineEditingContext =>
    selected?.kind === "allocation" || selected?.kind === "project-marker"
      ? Object.freeze({ kind: "project", projectId: selected.projectId })
      : selected?.kind === "team"
        ? Object.freeze({ kind: "team", teamId: selected.teamId })
        : undefined;

  const setEditingContext = (
    context: TimelineEditingContext,
    source: "timeline" | "shell" | undefined,
  ): void => {
    editingContext = context;
    editingContextSource = context === undefined ? undefined : source;
    updateEditForms(context);
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
        editingContext: undefined,
        editingContextSource: undefined,
      });
    }
    return Object.freeze({
      viewport: viewportController.getState(),
      selectedDate: cursorController.getState().selectedDate,
      selected: interactionController.getState().selected,
      editingContext,
      editingContextSource,
    });
  };

  const destroyControllers = (): void => {
    if (!mounted) return;
    interactionController.destroy();
    cursorController.destroy();
    viewportController.destroy();
    shellNavigation.destroy();
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
    planningSettingsController.setModel(input.getPlanningSettingsViewModel());
    shellNavigation = dependencies.renderShellNavigation({
      teamContainer: input.elements.teamSections,
      projectContainer: input.elements.projectList,
      viewModel: projection.viewModel,
      geometry: projection.geometry,
      onTeamSettings: (teamId) =>
        setEditingContext(Object.freeze({ kind: "team", teamId }), "shell"),
      onProjectSelect: (projectId) =>
        setEditingContext(Object.freeze({ kind: "project", projectId }), "shell"),
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
      onSelectionChange: (hit) => setEditingContext(contextFromHit(hit), "timeline"),
    });
    const restoredContext =
      snapshot.editingContextSource === "shell"
        ? reconcileEditingContext(snapshot.editingContext)
        : contextFromHit(interactionController.getState().selected);
    setEditingContext(
      restoredContext,
      restoredContext === undefined
        ? undefined
        : (snapshot.editingContextSource ?? "timeline"),
    );
    mounted = true;
  };

  const reconcileEditingContext = (
    context: TimelineEditingContext,
  ): TimelineEditingContext => {
    if (context?.kind === "project") {
      return input.getProjectEditViewModel(context.projectId) === undefined
        ? undefined
        : context;
    }
    if (context?.kind === "team") {
      return input.getTeamEditViewModel(context.teamId) === undefined
        ? undefined
        : context;
    }
    return undefined;
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
  const applyTeamUpdate = (
    command: UpdateTeamNameCommand | UpdateTeamCapacityPeriodsCommand,
  ) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    renderProjection(result.projection);
    return Object.freeze({ ok: true as const });
  };
  const applyReservationUpdate = (command: ReplaceTeamReservationsCommand) => {
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
    onApplyName: applyTeamUpdate,
    onApplyPeriods: applyTeamUpdate,
  });
  reservationEditController = dependencies.createReservationEditController({
    controls: input.elements.reservationEditControls,
    errorContainer: input.elements.reservationEditError,
    nextReservationId: input.nextReservationId,
    onApply: applyReservationUpdate,
  });
  planningSettingsController = dependencies.createPlanningSettingsController({
    trigger: input.elements.planningSettingsButton,
    controls: input.elements.planningSettingsControls,
    initialModel: input.getPlanningSettingsViewModel(),
    onApply: (command) => {
      const result = input.dispatch(command);
      if (!result.ok) return result;
      renderProjection(result.projection);
      return Object.freeze({ ok: true as const });
    },
  });
  mountProjection(input.initialProjection, currentSnapshot());

  return Object.freeze({
    getProjection: () => projection,
    getUiSnapshot: currentSnapshot,
    renderProjection,
    destroy: () => {
      projectEditController.destroy();
      teamEditController.destroy();
      reservationEditController.destroy();
      planningSettingsController.destroy();
      destroyControllers();
    },
  });
}
