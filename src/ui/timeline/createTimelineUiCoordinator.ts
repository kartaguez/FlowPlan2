import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type {
  PlanningCommand,
  PlanningSettingsViewModel,
  ProjectEditViewModel,
  ReservationEditViewModel,
  TeamEditViewModel,
  UpdateProjectCommand,
  UpdateTeamCapacityPeriodsCommand,
  UpdateTeamNameCommand,
  UpdateReservationCommand,
} from "../../application/index.js";
import type {
  CivilDate,
  DomainError,
  PlanningHorizon,
  PlanningResult,
  Portfolio,
  ProjectId,
  TeamId,
  ReservationId,
} from "../../domain/index.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import type { AppElements } from "../renderApp.js";
import { createProjectEditController } from "../project-edit/createProjectEditController.js";
import { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import { createPlanningSettingsController } from "../planning-settings/createPlanningSettingsController.js";
import { createTimelineCursorController } from "./createTimelineCursorController.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";
import { createPlanningDiagnosticsController } from "./createPlanningDiagnosticsController.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";
import { renderTimelineShellNavigation, type PortfolioTab, type ProjectNavigationItem } from "./renderTimelineShellNavigation.js";
import type { TimelineHit } from "./timelineHitTesting.js";
import { reconcileTimelineHit } from "./timelineSelectionGeometry.js";
import type { TimelineViewportState } from "./timelineViewport.js";
import { buildCursorMetricsViewModel, type CursorMetricsViewModel, type CursorProgressView } from "./buildCursorMetricsViewModel.js";
import { renderCursorTeamMetrics } from "./renderCursorTeamMetrics.js";
import { createCursorProgressSurface } from "./renderCursorProgress.js";

export interface TimelineUiProjection {
  readonly portfolio: Portfolio;
  readonly planningResult: PlanningResult;
  readonly horizon: PlanningHorizon;
  readonly viewModel: TimelineViewModel;
  readonly geometry: TimelineGeometry;
}

export type TimelineProjectionCommandResult =
  | Readonly<{ ok: true; projection: TimelineUiProjection }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface TimelineUiSnapshot {
  readonly viewport: TimelineViewportState;
  readonly selectedDate: CivilDate;
  readonly activeProgressView: CursorProgressView;
  readonly activePortfolioTab: PortfolioTab;
  readonly selected: TimelineHit | undefined;
  readonly editingContext: TimelineEditingContext;
}

export type TimelineEditingContext =
  | Readonly<{ kind: "project"; projectId: ProjectId }>
  | Readonly<{ kind: "team"; teamId: TeamId }>
  | Readonly<{ kind: "reservation"; reservationId: ReservationId }>
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
  readonly getProjectNavigationItems: () => readonly ProjectNavigationItem[];
  readonly getPlanningSettingsViewModel: () => PlanningSettingsViewModel;
  readonly getTeamEditViewModel: (
    teamId: TeamId,
  ) => TeamEditViewModel | undefined;
  readonly getReservationEditViewModel: (
    reservationId: ReservationId,
  ) => ReservationEditViewModel | undefined;
  readonly getReservationNavigationItems: () => readonly Readonly<{
    id: ReservationId;
    name: string;
  }>[];
}

export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly createDiagnosticsController: typeof createPlanningDiagnosticsController;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
  readonly createProjectEditController: typeof createProjectEditController;
  readonly createTeamEditController: typeof createTeamEditController;
  readonly createReservationEditController: typeof createReservationEditController;
  readonly createPlanningSettingsController: typeof createPlanningSettingsController;
  readonly renderShellNavigation: typeof renderTimelineShellNavigation;
  readonly renderCursorTeamMetrics: typeof renderCursorTeamMetrics;
  readonly createCursorProgressSurface: typeof createCursorProgressSurface;
}

const DEFAULT_DEPENDENCIES: TimelineUiCoordinatorDependencies = Object.freeze({
  renderTimeline: renderTimelineSvg,
  createDiagnosticsController: createPlanningDiagnosticsController,
  createViewportController: createTimelineViewportController,
  createCursorController: createTimelineCursorController,
  createInteractionController: createTimelineInteractionController,
  createProjectEditController,
  createTeamEditController,
  createReservationEditController,
  createPlanningSettingsController,
  renderShellNavigation: renderTimelineShellNavigation,
  renderCursorTeamMetrics,
  createCursorProgressSurface,
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
  let mounted = false;
  let activeProgressView: CursorProgressView = "projects";
  let cursorMetricsModel: CursorMetricsViewModel;
  const progressSurface = dependencies.createCursorProgressSurface(input.elements.cursorProgress, (view) => {
    if (view === activeProgressView) return;
    activeProgressView = view;
    progressSurface.render(cursorMetricsModel, activeProgressView);
  });
  const isModalOpen = (): boolean => [
    input.elements.planningSettingsControls.container,
    input.elements.teamEditControls.container,
    input.elements.reservationEditControls.container,
    input.elements.diagnosticsControls.dialog,
  ].some((container) => !container.hidden);
  const diagnosticsController = dependencies.createDiagnosticsController({
    controls: input.elements.diagnosticsControls,
    isModalOpen,
  });

  const renderCursorMetrics = (selectedDate: CivilDate): void => {
    cursorMetricsModel = buildCursorMetricsViewModel(
      projection.portfolio,
      calculateCursorMetrics({
        portfolio: projection.portfolio,
        planningResult: projection.planningResult,
        horizon: projection.horizon,
        selectedDate,
      }),
    );
    dependencies.renderCursorTeamMetrics(shellNavigation.teamMetricsContainers, cursorMetricsModel.teams);
    progressSurface.render(cursorMetricsModel, activeProgressView);
  };

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
    reservationEditController.setReservation(
      context?.kind === "reservation"
        ? input.getReservationEditViewModel(context.reservationId)
        : undefined,
    );
  };

  const setEditingContext = (context: TimelineEditingContext): void => {
    editingContext = context;
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
        activeProgressView,
        activePortfolioTab: "projects",
        selected: undefined,
        editingContext: undefined,
      });
    }
    return Object.freeze({
      viewport: viewportController.getState(),
      selectedDate: cursorController.getState().selectedDate,
      activeProgressView,
      activePortfolioTab: shellNavigation.getActiveTab(),
      selected: interactionController.getState().selected,
      editingContext,
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
    activeProgressView = snapshot.activeProgressView;
    dependencies.renderTimeline({
      svg: input.elements.svg,
      geometry: projection.geometry,
    });
    diagnosticsController.setDiagnostics(projection.viewModel.diagnostics);
    planningSettingsController.setModel(input.getPlanningSettingsViewModel());
    shellNavigation = dependencies.renderShellNavigation({
      teamContainer: input.elements.teamPanels,
      projectContainer: input.elements.projectList,
      reservationContainer: input.elements.reservationList,
      projectTab: input.elements.projectTab,
      reservationTab: input.elements.reservationTab,
      reservations: input.getReservationNavigationItems(),
      projectItems: input.getProjectNavigationItems(),
      initialTab: snapshot.activePortfolioTab,
      viewModel: projection.viewModel,
      geometry: projection.geometry,
      onTeamSettings: (teamId) =>
        setEditingContext(Object.freeze({ kind: "team", teamId })),
      onProjectSelect: (projectId) =>
        setEditingContext(Object.freeze({ kind: "project", projectId })),
      onReservationSelect: (reservationId) =>
        setEditingContext(Object.freeze({ kind: "reservation", reservationId })),
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
      cursorControl: input.elements.cursorControl,
      initialDate: selectedDate,
      getViewport: viewportController.getState,
      isModalOpen,
      onSelectedDateChange: renderCursorMetrics,
    });
    renderCursorMetrics(selectedDate);
    let restoringSelection = true;
    interactionController = dependencies.createInteractionController({
      svg: input.elements.svg,
      geometry: projection.geometry,
      viewModel: projection.viewModel,
      getViewport: viewportController.getState,
      tooltipContainer: input.elements.tooltip,
      selectionSummaryContainer: input.elements.selectionSummary,
      keyboardControl: input.elements.cursorControl,
      ...(selected === undefined ? {} : { initialSelected: selected }),
      onSelectionChange: (hit) => {
        if (restoringSelection) return;
        if (hit?.kind === "allocation" || hit?.kind === "project-marker") {
          setEditingContext(Object.freeze({ kind: "project", projectId: hit.projectId }));
        }
      },
    });
    restoringSelection = false;
    setEditingContext(reconcileEditingContext(snapshot.editingContext));
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
    if (context?.kind === "reservation") {
      return input.getReservationEditViewModel(context.reservationId) === undefined
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
  const applyReservationUpdate = (command: UpdateReservationCommand) => {
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
      progressSurface.destroy();
      diagnosticsController.destroy();
    },
  });
}
