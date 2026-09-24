import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import type {
  PlanningCommand, PlanningSettingsViewModel, ProjectEditViewModel,
  CreateTeamCommand, ReorderProjectCommand, ReservationEditViewModel, TeamEditViewModel, UpdateProjectCommand,
  UpdateReservationCommand, UpdateTeamCapacityPeriodsCommand, UpdateTeamNameCommand,
} from "../../application/index.js";
import type {
  CivilDate, DomainError, PlanningHorizon, PlanningResult, Portfolio,
  ProjectId, ReservationId, TeamId,
} from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
import { createProjectEditController } from "../project-edit/createProjectEditController.js";
import { createProjectDraftStore } from "../project-edit/projectDraftStore.js";
import { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import { createReservationDraftStore } from "../reservation-edit/reservationDraftStore.js";
import { createProjectCardControls, createReservationCardControls } from "../portfolio/createPortfolioEditControls.js";
import { createProjectReorderController } from "../portfolio/createProjectReorderController.js";
import { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createTeamCreateController } from "../team-edit/createTeamCreateController.js";
import { createPlanningSettingsController } from "../planning-settings/createPlanningSettingsController.js";
import { createTimelineCursorController } from "./createTimelineCursorController.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";
import { createPlanningDiagnosticsController } from "./createPlanningDiagnosticsController.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";
import { renderTimelineShellNavigation, type PortfolioTab, type ProjectNavigationItem } from "./renderTimelineShellNavigation.js";
import type { TimelineViewportState } from "./timelineViewport.js";
import { buildCursorMetricsViewModel, type CursorMetricsViewModel, type CursorProgressView } from "./buildCursorMetricsViewModel.js";
import { renderCursorCapacityMetrics, renderCursorTeamMetrics } from "./renderCursorTeamMetrics.js";
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
  readonly teamEditingId?: TeamId;
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
  readonly dispatch: (command: PlanningCommand) => TimelineProjectionCommandResult;
  readonly getProjectEditViewModel: (id: ProjectId) => ProjectEditViewModel | undefined;
  readonly getProjectNavigationItems: () => readonly ProjectNavigationItem[];
  readonly getPlanningSettingsViewModel: () => PlanningSettingsViewModel;
  readonly getTeamEditViewModel: (id: TeamId) => TeamEditViewModel | undefined;
  readonly getReservationEditViewModel: (id: ReservationId) => ReservationEditViewModel | undefined;
  readonly getReservationNavigationItems: () => readonly Readonly<{ id: ReservationId; name: string }>[];
}
export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly createDiagnosticsController: typeof createPlanningDiagnosticsController;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
  readonly createProjectEditController: typeof createProjectEditController;
  readonly createProjectReorderController: typeof createProjectReorderController;
  readonly createTeamEditController: typeof createTeamEditController;
  readonly createTeamCreateController: typeof createTeamCreateController;
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
  createProjectReorderController,
  createTeamEditController,
  createTeamCreateController,
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
  const projectDrafts = createProjectDraftStore();
  const reservationDrafts = createReservationDraftStore();
  let projection = input.initialProjection;
  let viewportController: ReturnType<typeof createTimelineViewportController>;
  let cursorController: ReturnType<typeof createTimelineCursorController>;
  let interactionController: ReturnType<typeof createTimelineInteractionController>;
  let shellNavigation: ReturnType<typeof renderTimelineShellNavigation>;
  let reorderController: ReturnType<typeof createProjectReorderController>;
  let teamEditingId: TeamId | undefined;
  let mounted = false;
  let activeProgressView: CursorProgressView = "projects";
  let cursorMetricsModel: CursorMetricsViewModel;
  const projectControllers = new Map<ProjectId, ReturnType<typeof createProjectEditController>>();
  const reservationControllers = new Map<ReservationId, ReturnType<typeof createReservationEditController>>();
  const progressSurface = dependencies.createCursorProgressSurface(input.elements.cursorProgress, (view) => {
    if (view === activeProgressView) return;
    activeProgressView = view;
    progressSurface.render(cursorMetricsModel, activeProgressView);
    if (mounted) interactionController.refreshTooltip();
  });
  const isModalOpen = (): boolean => [
    input.elements.planningSettingsControls.container,
    input.elements.teamEditControls.container,
    input.elements.teamCreateControls?.container,
    input.elements.diagnosticsControls.dialog,
  ].some((container) => container !== undefined && !container.hidden);
  const confirmDiscard = (message: string): boolean =>
    input.elements.teamEditControls.container.ownerDocument?.defaultView?.confirm(message) ?? false;
  const diagnosticsController = dependencies.createDiagnosticsController({
    controls: input.elements.diagnosticsControls, isModalOpen,
  });
  const teamEditController = dependencies.createTeamEditController({
    controls: input.elements.teamEditControls,
    errorContainer: input.elements.applicationError,
    onApplyName: (command: UpdateTeamNameCommand) => applyTeamUpdate(command),
    onApplyPeriods: (command: UpdateTeamCapacityPeriodsCommand) => applyTeamUpdate(command),
    onClose: () => { teamEditingId = undefined; },
    confirmDiscard,
    onDelete: (teamId) => {
      const projects = projectDrafts.ids().filter((id) => projectDrafts.isTeamDirty(id, teamId));
      const reservations = reservationDrafts.ids().filter((id) => reservationDrafts.isTeamDirty(id, teamId));
      if (projects.length > 0 || reservations.length > 0) {
        const names = [
          ...projects.map((id) => `Project ${projectDrafts.get(id)?.model.label ?? id}`),
          ...reservations.map((id) => `Reservation ${reservationDrafts.get(id)?.model.name ?? id}`),
        ];
        return { ok: false as const, reason: "draft" as const,
          message: `Unapplied changes concern this Team in ${names.join(", ")}. Apply or cancel those changes before deleting it.` };
      }
      const result = input.dispatch({ kind: "remove-team", teamId });
      if (!result.ok) return { ok: false as const, reason: "application" as const, errors: result.errors };
      teamEditingId = undefined;
      teamEditController.setTeam(undefined);
      rebaseDrafts();
      renderProjection(result.projection);
      input.elements.teamCreateButton?.focus();
      return { ok: true as const };
    },
  });
  const teamCreateController = input.elements.teamCreateControls
    ? dependencies.createTeamCreateController({
      controls: input.elements.teamCreateControls,
      confirmDiscard,
      onCreate: (command: CreateTeamCommand) => {
        const result = input.dispatch(command);
        if (!result.ok) return result;
        rebaseDrafts();
        renderProjection(result.projection);
        return { ok: true as const };
      },
      onClose: () => input.elements.teamCreateButton.focus(),
    }) : undefined;
  const onCreateTeamClick = (): void => {
    if (teamCreateController?.isOpen()) return;
    if (teamEditingId !== undefined && !teamEditController.requestClose()) return;
    teamCreateController?.open();
  };
  input.elements.teamCreateButton?.addEventListener("click", onCreateTeamClick);
  const planningSettingsController = dependencies.createPlanningSettingsController({
    trigger: input.elements.planningSettingsButton,
    controls: input.elements.planningSettingsControls,
    initialModel: input.getPlanningSettingsViewModel(),
    onApply: (command) => {
      const result = input.dispatch(command);
      if (!result.ok) return result;
      rebaseDrafts();
      renderProjection(result.projection);
      return { ok: true as const };
    },
  });

  const renderCursorMetrics = (date: CivilDate): void => {
    cursorMetricsModel = buildCursorMetricsViewModel(projection.portfolio,
      calculateCursorMetrics({ portfolio: projection.portfolio,
        planningResult: projection.planningResult, horizon: projection.horizon, selectedDate: date }),
      projection.viewModel);
    dependencies.renderCursorTeamMetrics(shellNavigation.teamMetricsContainers, cursorMetricsModel.teams);
    if (shellNavigation.globalMetricsContainer) {
      renderCursorCapacityMetrics(shellNavigation.globalMetricsContainer, cursorMetricsModel.global);
    }
    progressSurface.render(cursorMetricsModel, activeProgressView);
  };
  const syncCard = (kind: "project" | "reservation", id: ProjectId | ReservationId): void => {
    if (kind === "project") {
      const draft = projectDrafts.get(id as ProjectId);
      shellNavigation.setCardState("project", id, draft?.expanded ?? false, projectDrafts.isDirty(id as ProjectId));
    } else {
      const draft = reservationDrafts.get(id as ReservationId);
      shellNavigation.setCardState("reservation", id, draft?.expanded ?? false, reservationDrafts.isDirty(id as ReservationId));
    }
  };
  const ensureProjectController = (id: ProjectId): void => {
    if (projectControllers.has(id)) return;
    const card = shellNavigation.projectCards.get(id);
    const model = input.getProjectEditViewModel(id);
    if (!card || !model) return;
    projectDrafts.initialize(id, model);
    const { controls, error } = createProjectCardControls(card.host.ownerDocument, String(id));
    card.host.append(controls.container);
    const controller = dependencies.createProjectEditController({
      controls, errorContainer: error, draftStore: projectDrafts,
      onDraftChange: () => syncCard("project", id),
      onApply: (command: UpdateProjectCommand) => applyProjectUpdate(command),
      onCancel: () => { syncCard("project", id); card.button.focus(); },
    });
    controller.setProject(model);
    projectControllers.set(id, controller);
  };
  const ensureReservationController = (id: ReservationId): void => {
    if (reservationControllers.has(id)) return;
    const card = shellNavigation.reservationCards.get(id);
    const model = input.getReservationEditViewModel(id);
    if (!card || !model) return;
    reservationDrafts.initialize(id, model);
    const { controls, error } = createReservationCardControls(card.host.ownerDocument, String(id));
    card.host.append(controls.container);
    const controller = dependencies.createReservationEditController({
      controls, errorContainer: error, draftStore: reservationDrafts,
      onDraftChange: () => syncCard("reservation", id),
      onApply: (command: UpdateReservationCommand) => applyReservationUpdate(command),
      onCancel: () => { syncCard("reservation", id); card.button.focus(); },
    });
    controller.setReservation(model);
    reservationControllers.set(id, controller);
  };
  const toggleProject = (id: ProjectId): void => {
    const model = input.getProjectEditViewModel(id);
    if (!model) return;
    const current = projectDrafts.initialize(id, model);
    const expanded = !current.expanded;
    projectDrafts.setExpanded(id, expanded);
    if (expanded) ensureProjectController(id);
    syncCard("project", id);
  };
  const toggleReservation = (id: ReservationId): void => {
    const model = input.getReservationEditViewModel(id);
    if (!model) return;
    const current = reservationDrafts.initialize(id, model);
    const expanded = !current.expanded;
    reservationDrafts.setExpanded(id, expanded);
    if (expanded) ensureReservationController(id);
    syncCard("reservation", id);
  };
  const currentSnapshot = (): TimelineUiSnapshot => mounted ? {
    viewport: viewportController.getState(), selectedDate: cursorController.getState().selectedDate,
    activeProgressView, activePortfolioTab: shellNavigation.getActiveTab(),
    ...(teamEditingId === undefined ? {} : { teamEditingId }),
  } : {
    viewport: { x: 0, width: projection.geometry.width }, selectedDate: input.initialDate,
    activeProgressView, activePortfolioTab: "projects",
  };
  const destroyControllers = (): void => {
    if (!mounted) return;
    reorderController.destroy();
    for (const controller of projectControllers.values()) controller.destroy();
    for (const controller of reservationControllers.values()) controller.destroy();
    projectControllers.clear();
    reservationControllers.clear();
    interactionController.destroy(); cursorController.destroy(); viewportController.destroy();
    shellNavigation.destroy();
    mounted = false;
  };
  const mountProjection = (nextProjection: TimelineUiProjection, snapshot: TimelineUiSnapshot): void => {
    destroyControllers();
    projection = nextProjection;
    activeProgressView = snapshot.activeProgressView;
    dependencies.renderTimeline({ svg: input.elements.svg, geometry: projection.geometry });
    diagnosticsController.setDiagnostics(projection.viewModel.diagnostics);
    planningSettingsController.setModel(input.getPlanningSettingsViewModel());
    shellNavigation = dependencies.renderShellNavigation({
      teamContainer: input.elements.teamPanels,
      projectContainer: input.elements.projectList,
      reservationContainer: input.elements.reservationList,
      projectTab: input.elements.projectTab, reservationTab: input.elements.reservationTab,
      reservations: input.getReservationNavigationItems(),
      projectItems: input.getProjectNavigationItems(), initialTab: snapshot.activePortfolioTab,
      viewModel: projection.viewModel, geometry: projection.geometry,
      onTeamSettings: (id) => {
        if (teamCreateController?.isOpen() && !teamCreateController.requestClose()) return;
        if (teamEditingId !== undefined && teamEditingId !== id &&
          !teamEditController.requestClose()) return;
        teamEditingId = id;
        teamEditController.setTeam(input.getTeamEditViewModel(id));
      },
      onProjectSelect: toggleProject,
      onReservationSelect: toggleReservation,
    });
    reorderController = dependencies.createProjectReorderController({
      list: input.elements.projectList,
      order: projection.viewModel.projects.map((project) => project.id),
      cards: shellNavigation.projectCards,
      setPreview: shellNavigation.setReorderPreview,
      onReorder: (projectId, targetPosition) => {
        const command: ReorderProjectCommand = { kind: "reorder-project", projectId, targetPosition };
        const previousProjection = projection;
        const result = input.dispatch(command);
        if (!result.ok) {
          shellNavigation.showReorderError(result.errors.map((error) => error.message).join(" "));
          shellNavigation.projectCards.get(projectId)?.handle.focus();
          return;
        }
        if (result.projection === previousProjection) return;
        rebaseDrafts();
        renderProjection(result.projection);
        shellNavigation.projectCards.get(projectId)?.handle.focus();
      },
    });
    const selectedDate = projection.geometry.dates.some((day) => day.date === snapshot.selectedDate)
      ? snapshot.selectedDate : projection.viewModel.horizon.start;
    viewportController = dependencies.createViewportController({ svg: input.elements.svg,
      geometry: projection.geometry, controls: input.elements.viewportControls,
      initialViewport: snapshot.viewport,
      onViewportChange: () => cursorController?.refresh?.() });
    cursorController = dependencies.createCursorController({ svg: input.elements.svg,
      geometry: projection.geometry, cursorControl: input.elements.cursorControl,
      initialDate: selectedDate, getViewport: viewportController.getState,
      isModalOpen, onSelectedDateChange: renderCursorMetrics });
    renderCursorMetrics(selectedDate);
    interactionController = dependencies.createInteractionController({
      svg: input.elements.svg, geometry: projection.geometry, viewModel: projection.viewModel,
      getViewport: viewportController.getState, tooltipContainer: input.elements.tooltip,
      getProjectProgress: (id) => cursorMetricsModel.projects.find((item) => item.id === id)?.progress,
    });
    for (const id of projectDrafts.ids()) {
      if (projectDrafts.get(id)?.expanded) ensureProjectController(id);
      syncCard("project", id);
    }
    for (const id of reservationDrafts.ids()) {
      if (reservationDrafts.get(id)?.expanded) ensureReservationController(id);
      syncCard("reservation", id);
    }
    teamEditingId = snapshot.teamEditingId;
    if (teamEditingId) {
      const teamModel = input.getTeamEditViewModel(teamEditingId);
      if (teamModel) teamEditController.setTeam(teamModel);
      else { teamEditingId = undefined; teamEditController.setTeam(undefined); }
    }
    mounted = true;
  };
  const rebaseDrafts = (): void => {
    for (const id of projectDrafts.ids()) {
      const model = input.getProjectEditViewModel(id);
      if (model) projectDrafts.rebase(id, model);
    }
    for (const id of reservationDrafts.ids()) {
      const model = input.getReservationEditViewModel(id);
      if (model) reservationDrafts.rebase(id, model);
    }
  };
  const renderProjection = (nextProjection: TimelineUiProjection): void => {
    const snapshot = currentSnapshot();
    mountProjection(nextProjection, snapshot);
  };
  const applyProjectUpdate = (command: UpdateProjectCommand) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    projectDrafts.cancel(command.projectId);
    const model = input.getProjectEditViewModel(command.projectId);
    if (model) {
      projectDrafts.initialize(command.projectId, model);
      projectDrafts.setExpanded(command.projectId, true);
    }
    rebaseDrafts();
    renderProjection(result.projection);
    shellNavigation.projectCards.get(command.projectId)?.button.focus();
    return { ok: true as const };
  };
  const applyReservationUpdate = (command: UpdateReservationCommand) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    reservationDrafts.cancel(command.reservationId);
    const model = input.getReservationEditViewModel(command.reservationId);
    if (model) {
      reservationDrafts.initialize(command.reservationId, model);
      reservationDrafts.setExpanded(command.reservationId, true);
    }
    rebaseDrafts();
    renderProjection(result.projection);
    shellNavigation.reservationCards.get(command.reservationId)?.button.focus();
    return { ok: true as const };
  };
  const applyTeamUpdate = (command: UpdateTeamNameCommand | UpdateTeamCapacityPeriodsCommand) => {
    const result = input.dispatch(command);
    if (!result.ok) return result;
    rebaseDrafts();
    renderProjection(result.projection);
    return { ok: true as const };
  };
  mountProjection(input.initialProjection, currentSnapshot());
  return {
    getProjection: () => projection, getUiSnapshot: currentSnapshot, renderProjection,
    destroy: () => {
      destroyControllers(); teamEditController.destroy(); planningSettingsController.destroy();
      teamCreateController?.destroy();
      input.elements.teamCreateButton?.removeEventListener("click", onCreateTeamClick);
      progressSurface.destroy(); diagnosticsController.destroy();
    },
  };
}
