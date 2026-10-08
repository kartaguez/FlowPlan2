import { createInteractionLifecycle } from "../interactionLifecycle.js";
import { createPortfolioSnapshotsController } from "../portfolio-snapshots/createPortfolioSnapshotsController.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import type { ReservationNavigationItem } from "../../adapters/index.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import type {
  PlanningCommand, PlanningSettingsViewModel, ProjectEditViewModel,
  SnapshotActualsViewModel,
  CreateProjectCommand, CreateReservationCommand, CreateTeamCommand, ReorderProjectCommand, ReservationEditViewModel, TeamEditViewModel, UpdateProjectCommand,
  UpdateReservationCommand, UpdateTeamCapacityPeriodsCommand, UpdateTeamNameCommand,
} from "../../application/index.js";
import { parseExactQuantityInput } from "../../application/index.js";
import type {
  CivilDate, DomainError, PlanningHorizon, PlanningResult, Portfolio,
  ProjectId, ReservationId, TeamId, WorkingPattern,
} from "../../domain/index.js";
import { effectiveColor, serializeQuantity } from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
import { createProjectEditController } from "../project-edit/createProjectEditController.js";
import { createProjectCreateController } from "../project-edit/createProjectCreateController.js";
import { createProjectDraftStore } from "../project-edit/projectDraftStore.js";
import { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import { createReservationCreateController } from "../reservation-edit/createReservationCreateController.js";
import { createReservationDraftStore } from "../reservation-edit/reservationDraftStore.js";
import { createProjectCardControls, createReservationCardControls } from "../portfolio/createPortfolioEditControls.js";
import { createSnapshotActualsDraftStore } from "../actuals/snapshotActualsDraftStore.js";
import { createSnapshotActualsCardController } from "../actuals/createSnapshotActualsCardController.js";
import { actualsForecastConflict } from "../actuals/actualsForecastConflict.js";
import { createProjectReorderController } from "../portfolio/createProjectReorderController.js";
import { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createTeamCreateController } from "../team-edit/createTeamCreateController.js";
import { createPlanningSettingsController } from "../planning-settings/createPlanningSettingsController.js";
import { createTimelineCursorController } from "./createTimelineCursorController.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";
import { createPlanningDiagnosticsController } from "./createPlanningDiagnosticsController.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";
import { renderTimelineRangeSelection, type TimelineRangeSelection } from "./renderTimelineRangeSelection.js";
import { renderTimelineShellNavigation, type PortfolioTab, type ProjectNavigationItem } from "./renderTimelineShellNavigation.js";
import type { TimelineViewportState } from "./timelineViewport.js";
import { buildCursorMetricsViewModel, type CursorMetricsViewModel, type CursorProgressView } from "./buildCursorMetricsViewModel.js";
import { renderCursorCapacityMetrics, renderCursorTeamMetrics } from "./renderCursorTeamMetrics.js";
import { createCursorProgressSurface } from "./renderCursorProgress.js";

export interface TimelineUiProjection {
  readonly portfolio: Portfolio;
  readonly workingPattern?: WorkingPattern;
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
  readonly hasUnappliedChanges: () => boolean;
  readonly getProjection: () => TimelineUiProjection;
  readonly getUiSnapshot: () => TimelineUiSnapshot;
  readonly renderProjection: (projection: TimelineUiProjection) => void;
  readonly isModalOpen: () => boolean;
  readonly suspend: () => boolean;
  readonly resume: () => void;
  readonly destroy: () => void;
}
export interface CreateTimelineUiCoordinatorInput {
  readonly elements: AppElements;
  readonly initialProjection: TimelineUiProjection;
  readonly initialDate: CivilDate;
  readonly dispatch: (command: PlanningCommand) => TimelineProjectionCommandResult;
  readonly getProjectEditViewModel: (id: ProjectId) => ProjectEditViewModel | undefined;
  readonly getProjectSnapshotActualsViewModel?: (id: ProjectId) => SnapshotActualsViewModel | undefined;
  readonly getReservationSnapshotActualsViewModel?: (id: ReservationId) => SnapshotActualsViewModel | undefined;
  readonly getProjectNavigationItems: () => readonly ProjectNavigationItem[];
  readonly getPlanningSettingsViewModel: () => PlanningSettingsViewModel;
  readonly getTeamEditViewModel: (id: TeamId) => TeamEditViewModel | undefined;
  readonly getReservationEditViewModel: (id: ReservationId) => ReservationEditViewModel | undefined;
  readonly getReservationNavigationItems: () => readonly ReservationNavigationItem[];
  readonly onImport?: (document: string) => "imported" | "cancelled" | "failed";
  readonly onExport?: () => string;
  readonly invalidStartupBackup?: boolean;
  readonly getPortfolioSnapshots?: () => readonly PortfolioSnapshot[];
  readonly onSavePortfolioSnapshot?: () => TimelineProjectionCommandResult;
  readonly onDeletePortfolioSnapshot?: (id: string) => TimelineProjectionCommandResult;
}
export interface TimelineUiCoordinatorDependencies {
  readonly renderTimeline: typeof renderTimelineSvg;
  readonly createDiagnosticsController: typeof createPlanningDiagnosticsController;
  readonly createViewportController: typeof createTimelineViewportController;
  readonly createCursorController: typeof createTimelineCursorController;
  readonly createInteractionController: typeof createTimelineInteractionController;
  readonly createProjectEditController: typeof createProjectEditController;
  readonly createProjectCreateController: typeof createProjectCreateController;
  readonly createProjectReorderController: typeof createProjectReorderController;
  readonly createTeamEditController: typeof createTeamEditController;
  readonly createTeamCreateController: typeof createTeamCreateController;
  readonly createReservationEditController: typeof createReservationEditController;
  readonly createReservationCreateController: typeof createReservationCreateController;
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
  createProjectCreateController,
  createProjectReorderController,
  createTeamEditController,
  createTeamCreateController,
  createReservationEditController,
  createReservationCreateController,
  createPlanningSettingsController,
  renderShellNavigation: renderTimelineShellNavigation,
  renderCursorTeamMetrics,
  createCursorProgressSurface,
});

export function createTimelineUiCoordinator(
  input: CreateTimelineUiCoordinatorInput,
  dependencies: TimelineUiCoordinatorDependencies = DEFAULT_DEPENDENCIES,
): TimelineUiCoordinator {
  let refreshSnapshotDirty = () => {};
  let suspended = false, destroyed = false;
  const projectDrafts = createProjectDraftStore();
  const reservationDrafts = createReservationDraftStore();
  const projectSnapshotDrafts = createSnapshotActualsDraftStore();
  const reservationSnapshotDrafts = createSnapshotActualsDraftStore();
  let projectCreateController: ReturnType<typeof createProjectCreateController> | undefined;
  let reservationCreateController: ReturnType<typeof createReservationCreateController> | undefined;
  let projection = input.initialProjection;
  let viewportController: ReturnType<typeof createTimelineViewportController>;
  let cursorController: ReturnType<typeof createTimelineCursorController>;
  let interactionController: ReturnType<typeof createTimelineInteractionController>;
  let rangeDragging = false;
  let shellNavigation: ReturnType<typeof renderTimelineShellNavigation>;
  let reorderController: ReturnType<typeof createProjectReorderController>;
  let teamEditingId: TeamId | undefined;
  let mounted = false;
  let activeProgressView: CursorProgressView = "projects";
  let cursorMetricsModel: CursorMetricsViewModel;
  const projectControllers = new Map<ProjectId, ReturnType<typeof createProjectEditController>>();
  const reservationControllers = new Map<ReservationId, ReturnType<typeof createReservationEditController>>();
  const projectActualsControllers = new Map<ProjectId, ReturnType<typeof createSnapshotActualsCardController>>();
  const reservationActualsControllers = new Map<ReservationId, ReturnType<typeof createSnapshotActualsCardController>>();
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
  ].some((container) => container !== undefined && !container.hidden) ||
    [...(input.elements.planningSettingsControls.container.ownerDocument.querySelectorAll?.<HTMLElement>(".card-actuals-modal") ?? [])]
      .some((container) => !container.hidden);
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
      const snapshotActuals = [...projectSnapshotDrafts.ids(), ...reservationSnapshotDrafts.ids()].filter((id) =>
        (projectSnapshotDrafts.get(id) ?? reservationSnapshotDrafts.get(id))?.open &&
        (projectSnapshotDrafts.get(id) ?? reservationSnapshotDrafts.get(id))?.teams.some((team) => team.teamId === teamId));
      if (projects.length > 0 || reservations.length > 0 || snapshotActuals.length > 0 || projectCreateController?.isTeamEnabled(teamId) ||
        reservationCreateController?.isTeamEnabled(teamId)) {
        const names = [
          ...projects.map((id) => `Project ${projectDrafts.get(id)?.model.label ?? id}`),
          ...reservations.map((id) => `Reservation ${reservationDrafts.get(id)?.model.name ?? id}`),
          ...snapshotActuals.map((id) => `Actuals ${id}`),
          ...(projectCreateController?.isTeamEnabled(teamId) ? ["Create Project"] : []),
          ...(reservationCreateController?.isTeamEnabled(teamId) ? ["Create Reservation"] : []),
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
  projectCreateController = input.elements.projectCreateControls
    ? dependencies.createProjectCreateController({
      controls: input.elements.projectCreateControls,
      portfolio: projection.portfolio,
      confirmDiscard,
      onClose: () => input.elements.projectCreateButton?.focus(),
      onCreate: (command: CreateProjectCommand) => {
        const result = input.dispatch(command);
        if (!result.ok) return result;
        const id = result.projection.portfolio.priorityOrder.at(-1)!;
        const model = input.getProjectEditViewModel(id);
        if (model) {
          projectDrafts.initialize(id, model);
          projectDrafts.setExpanded(id, true);
        }
        rebaseDrafts();
        renderProjection(result.projection);
        shellNavigation.projectCards.get(id)?.button.focus();
        return { ok: true as const };
      },
    }) : undefined;
  reservationCreateController = input.elements.reservationCreateControls
    ? dependencies.createReservationCreateController({
      controls: input.elements.reservationCreateControls,
      portfolio: projection.portfolio,
      horizon: projection.horizon,
      confirmDiscard,
      onClose: () => input.elements.reservationCreateButton?.focus(),
      onCreate: (command: CreateReservationCommand) => {
        const result = input.dispatch(command);
        if (!result.ok) return result;
        const id = result.projection.portfolio.reservations.at(-1)!.id;
        const model = input.getReservationEditViewModel(id);
        if (model) {
          reservationDrafts.initialize(id, model);
          reservationDrafts.setExpanded(id, true);
        }
        rebaseDrafts();
        renderProjection(result.projection);
        reservationControllers.get(id)?.focusName?.();
        return { ok: true as const };
      },
    }) : undefined;
  const onCreateProjectClick = (): void => {
    if (!projectCreateController?.isOpen()) projectCreateController?.open();
  };
  input.elements.projectCreateButton?.addEventListener("click", onCreateProjectClick);
  const onCreateReservationClick = (): void => {
    if (!reservationCreateController?.isOpen()) reservationCreateController?.open();
  };
  input.elements.reservationCreateButton?.addEventListener("click", onCreateReservationClick);
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
    ...(input.onImport ? { onImport: input.onImport } : {}),
    ...(input.onExport ? { onExport: input.onExport } : {}),
    onApply: (command) => {
      const result = input.dispatch(command);
      if (!result.ok) return result;
      rebaseDrafts();
      renderProjection(result.projection);
      return { ok: true as const };
    },
  });

  const hasUnappliedChanges = () =>
    projectDrafts.ids().some((id) => projectDrafts.isDirty(id)) ||
    reservationDrafts.ids().some((id) => reservationDrafts.isDirty(id)) ||
    projectSnapshotDrafts.ids().some((id) => projectSnapshotDrafts.isDirty(id)) ||
    reservationSnapshotDrafts.ids().some((id) => reservationSnapshotDrafts.isDirty(id)) ||
    (teamEditController.hasUnappliedChanges?.() ?? false) ||
    (projectCreateController?.hasUnappliedChanges?.() ?? false) ||
    (reservationCreateController?.hasUnappliedChanges?.() ?? false) ||
    (teamCreateController?.hasUnappliedChanges?.() ?? false) ||
    (planningSettingsController.hasUnappliedChanges?.() ?? false);
  const snapshotController = input.elements.portfolioSnapshotControls && input.getPortfolioSnapshots && input.onSavePortfolioSnapshot && input.onDeletePortfolioSnapshot
    ? createPortfolioSnapshotsController({ controls: input.elements.portfolioSnapshotControls, isDirty: hasUnappliedChanges,
      getSnapshots: input.getPortfolioSnapshots, save: input.onSavePortfolioSnapshot, remove: input.onDeletePortfolioSnapshot,
      confirm: (message) => input.elements.planningSettingsControls.container.ownerDocument.defaultView?.confirm(message) ?? false }) : undefined;
  refreshSnapshotDirty = () => snapshotController?.refreshDirty();
  // Delegated notifications run after the owning controller has processed each edit.
  const dirtyDocument = input.elements.planningSettingsControls.container.ownerDocument;
  const notifyDirty = () => queueMicrotask(() => { if (!suspended && !destroyed) refreshSnapshotDirty(); });
  const dirtyLifecycle = createInteractionLifecycle();
  for (const event of ["input", "change", "click", "submit"]) dirtyLifecycle.listen(dirtyDocument, event, notifyDirty);

  const renderCursorMetrics = (date: CivilDate): void => {
    cursorMetricsModel = buildCursorMetricsViewModel(projection.portfolio,
      calculateCursorMetrics({ portfolio: projection.portfolio,
        planningResult: projection.planningResult, horizon: projection.horizon, selectedDate: date,
        ...(projection.workingPattern ? { workingPattern: projection.workingPattern } : {}) }),
      projection.viewModel);
    dependencies.renderCursorTeamMetrics(shellNavigation.teamMetricsContainers, cursorMetricsModel.teams);
    if (shellNavigation.globalMetricsContainer) {
      renderCursorCapacityMetrics(shellNavigation.globalMetricsContainer, cursorMetricsModel.global);
    }
    progressSurface.render(cursorMetricsModel, activeProgressView);
  };
  const syncCard = (kind: "project" | "reservation", id: ProjectId | ReservationId): void => {
    refreshSnapshotDirty();
    if (kind === "project") {
      const draft = projectDrafts.get(id as ProjectId);
      shellNavigation.setCardState("project", id, draft?.expanded ?? false,
        projectDrafts.isDirty(id as ProjectId) || projectSnapshotDrafts.isDirty(id));
    } else {
      const draft = reservationDrafts.get(id as ReservationId);
      shellNavigation.setCardState("reservation", id, draft?.expanded ?? false,
        reservationDrafts.isDirty(id as ReservationId) || reservationSnapshotDrafts.isDirty(id));
    }
  };
  const actualsConflict = (kind: "project" | "reservation", id: ProjectId | ReservationId): string | undefined => {
    const snapshot = kind === "project" ? projectSnapshotDrafts.get(id)?.modal : reservationSnapshotDrafts.get(id)?.modal;
    if (snapshot?.handoff) return undefined;
    const draft = kind === "project" ? projectDrafts.get(id as ProjectId) : reservationDrafts.get(id as ReservationId);
    return actualsForecastConflict(draft);
  };
  const ensureActualsController = (kind: "project" | "reservation", id: ProjectId | ReservationId, host: HTMLElement): void => {
    const snapshotModel = kind === "project" ? input.getProjectSnapshotActualsViewModel?.(id as ProjectId) :
      input.getReservationSnapshotActualsViewModel?.(id as ReservationId);
    if (snapshotModel) {
      const store = kind === "project" ? projectSnapshotDrafts : reservationSnapshotDrafts;
      const controller = createSnapshotActualsCardController({ host, model: snapshotModel, store,
        onDraftChange: () => syncCard(kind, id), conflict: () => actualsConflict(kind, id),
        onCardRafChange: (teamId, value) => projectControllers.get(id as ProjectId)?.setActualsRaf?.(teamId, value),
        onApply: (command) => {
          const handoff = store.get(String(id))?.modal?.handoff;
          const result = input.dispatch(command);
          if (!result.ok) return result;
          if (handoff?.kind === "update-project") projectDrafts.cancel(handoff.projectId);
          if (handoff?.kind === "update-reservation") reservationDrafts.cancel(handoff.reservationId);
          store.cancel(String(id));
          rebaseDrafts(); renderProjection(result.projection);
          if (kind === "project") {
            const card = shellNavigation.projectCards.get(id as ProjectId);
            card?.host.querySelector?.<HTMLButtonElement>(".card-actuals > button")?.focus();
            if (card?.host.ownerDocument.activeElement !== card?.host.querySelector?.(".card-actuals > button")) card?.button.focus();
          } else {
            const card = shellNavigation.reservationCards.get(id as ReservationId);
            card?.host.querySelector?.<HTMLButtonElement>(".card-actuals > button")?.focus();
            if (card?.host.ownerDocument.activeElement !== card?.host.querySelector?.(".card-actuals > button")) card?.button.focus();
          }
          return { ok: true as const };
        },
      });
      if (kind === "project") projectActualsControllers.set(id as ProjectId, controller);
      else reservationActualsControllers.set(id as ReservationId, controller);
      return;
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
      getActualsRaf: (teamId) => {
        const snapshotModel = input.getProjectSnapshotActualsViewModel?.(id);
        return snapshotModel ? projectSnapshotDrafts.initialize(snapshotModel).teams.find((row) => row.teamId === teamId)?.raf : undefined;
      },
      onActualsRafInput: (teamId, value) => projectActualsControllers.get(id)?.setCardRaf(teamId, value),
      onApply: (command: UpdateProjectCommand) => applyProjectUpdate(command),
      onDelete: (projectId) => {
        const order = projection.viewModel.projects.map((project) => project.id);
        const index = order.indexOf(projectId);
        const focusId = order[index + 1] ?? order[index - 1];
        const result = input.dispatch({ kind: "remove-project", projectId });
        if (!result.ok) return result;
        projectDrafts.cancel(projectId);
        projectSnapshotDrafts.cancel(String(projectId));
        rebaseDrafts();
        renderProjection(result.projection);
        if (focusId) shellNavigation.projectCards.get(focusId)?.button.focus();
        else input.elements.projectCreateButton?.focus();
        return { ok: true as const };
      },
      confirmDiscard,
      onCancel: () => { projectActualsControllers.get(id)?.cancelCardRaf(); syncCard("project", id); card.button.focus(); },
    });
    controller.setProject(model);
    projectControllers.set(id, controller);
    ensureActualsController("project", id, card.host);
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
      onDelete: (reservationId) => {
        const order = input.getReservationNavigationItems().map((item) => item.id);
        const index = order.indexOf(reservationId);
        const focusId = order[index + 1] ?? order[index - 1];
        const result = input.dispatch({ kind: "remove-reservation", reservationId });
        if (!result.ok) return result;
        reservationDrafts.cancel(reservationId);
        reservationSnapshotDrafts.cancel(String(reservationId));
        rebaseDrafts();
        renderProjection(result.projection);
        if (focusId) shellNavigation.reservationCards.get(focusId)?.button.focus();
        else input.elements.reservationCreateButton?.focus();
        return { ok: true as const };
      },
      confirmDiscard,
      onCancel: () => { syncCard("reservation", id); card.button.focus(); },
    });
    controller.setReservation(model);
    reservationControllers.set(id, controller);
    ensureActualsController("reservation", id, card.host);
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
    for (const controller of projectActualsControllers.values()) controller.destroy();
    for (const controller of reservationActualsControllers.values()) controller.destroy();
    projectControllers.clear();
    reservationControllers.clear();
    projectActualsControllers.clear();
    reservationActualsControllers.clear();
    cursorController.destroy(); interactionController.destroy(); viewportController.destroy();
    rangeDragging = false;
    shellNavigation.destroy();
    mounted = false;
  };
  const mountProjection = (nextProjection: TimelineUiProjection, snapshot: TimelineUiSnapshot): void => {
    destroyControllers();
    projection = nextProjection;
    activeProgressView = snapshot.activeProgressView;
    const colors = new Map<string, string>([
      ...projection.portfolio.projects.map((project) => [project.id, effectiveColor(projection.portfolio, project)] as const),
      ...projection.portfolio.reservations.map((reservation) => [reservation.id, effectiveColor(projection.portfolio, reservation)] as const),
    ]);
    dependencies.renderTimeline({ svg: input.elements.svg, geometry: projection.geometry, colors });
    diagnosticsController.setDiagnostics(projection.viewModel.diagnostics);
    planningSettingsController.setModel(input.getPlanningSettingsViewModel());
    refreshSnapshotDirty();
    projectCreateController?.setPortfolio(projection.portfolio);
    reservationCreateController?.setContext(projection.portfolio, projection.horizon);
    shellNavigation = dependencies.renderShellNavigation({
      colors,
      teamContainer: input.elements.teamPanels,
      teamCreateButton: input.elements.teamCreateButton,
      projectContainer: input.elements.projectList,
      projectCreateSection: input.elements.projectCreateSection,
      reservationCreateSection: input.elements.reservationCreateSection,
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
      onProjectActiveChange: (projectId, isActive) => {
        const previousProjection = projection;
        const result = input.dispatch({ kind: "set-project-active", projectId, isActive });
        if (!result.ok) {
          shellNavigation.showActivationError("project", result.errors.map((error) => error.message).join(" "));
          shellNavigation.projectCards.get(projectId)?.activeButton?.focus();
          return;
        }
        if (result.projection === previousProjection) return;
        rebaseDrafts();
        renderProjection(result.projection);
        shellNavigation.projectCards.get(projectId)?.activeButton?.focus();
      },
      onReservationActiveChange: (reservationId, isActive) => {
        const previousProjection = projection;
        const result = input.dispatch({ kind: "set-reservation-active", reservationId, isActive });
        if (!result.ok) {
          shellNavigation.showActivationError("reservation", result.errors.map((error) => error.message).join(" "));
          shellNavigation.reservationCards.get(reservationId)?.activeButton?.focus();
          return;
        }
        if (result.projection === previousProjection) return;
        rebaseDrafts();
        renderProjection(result.projection);
        shellNavigation.reservationCards.get(reservationId)?.activeButton?.focus();
      },
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
    rangeDragging = false;
    viewportController = dependencies.createViewportController({ svg: input.elements.svg,
      geometry: projection.geometry, controls: input.elements.viewportControls,
      initialViewport: snapshot.viewport,
      getProjectionDate: () => cursorController.getState().selectedDate,
      onViewportChange: () => cursorController?.refresh?.() });
    const teamCollectionRow = input.elements.teamCreateButton?.parentElement;
    cursorController = dependencies.createCursorController({ svg: input.elements.svg,
      geometry: projection.geometry,
      ...(teamCollectionRow ? { teamCollectionRow } : {}),
      initialDate: selectedDate, getViewport: viewportController.getState,
      isModalOpen, onSelectedDateChange: renderCursorMetrics,
      onVisibleDateRange: (startDate, endDate) => viewportController.setVisibleDateRange(startDate, endDate),
      onRangePreviewChange: (selection: TimelineRangeSelection | undefined) => {
        rangeDragging = selection !== undefined;
        renderTimelineRangeSelection({ svg: input.elements.svg, geometry: projection.geometry,
          viewport: viewportController.getState(), selection });
        interactionController?.refreshTooltip();
      } });
    renderCursorMetrics(selectedDate);
    interactionController = dependencies.createInteractionController({
      svg: input.elements.svg, geometry: projection.geometry, viewModel: projection.viewModel,
      getViewport: viewportController.getState, tooltipContainer: input.elements.tooltip,
      isRangeDragging: () => rangeDragging,
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
    for (const id of projectSnapshotDrafts.ids()) {
      const model = input.getProjectSnapshotActualsViewModel?.(id as ProjectId);
      if (model) projectSnapshotDrafts.rebase(model);
    }
    for (const id of reservationSnapshotDrafts.ids()) {
      const model = input.getReservationSnapshotActualsViewModel?.(id as ReservationId);
      if (model) reservationSnapshotDrafts.rebase(model);
    }
  };
  const renderProjection = (nextProjection: TimelineUiProjection): void => {
    const snapshot = currentSnapshot();
    mountProjection(nextProjection, snapshot);
  };
  const applyProjectUpdate = (command: UpdateProjectCommand) => {
    const actualsModel = input.getProjectSnapshotActualsViewModel?.(command.projectId);
    const actualsDraft = projectSnapshotDrafts.get(String(command.projectId));
    const cardRafDirty = actualsDraft !== undefined && projectSnapshotDrafts.isDirty(String(command.projectId));
    const target = command.teamRequirements.map((row) => row.teamId);
    const current = actualsModel?.teams.filter((row) => row.participating).map((row) => row.teamId) ?? [];
    const membershipChanged = target.length !== current.length || target.some((id, index) => id !== current[index]);
    if (actualsModel && (actualsModel.snapshots.length || actualsModel.legacyV4Actuals || cardRafDirty) &&
      membershipChanged) {
      const forecast = projectDrafts.get(command.projectId);
      if (forecast) {
        const { teams: _localTeams, ...localFields } = forecast.values;
        const { teams: _referenceTeams, ...referenceFields } = forecast.reference;
        void _localTeams; void _referenceTeams;
        if (JSON.stringify(localFields) !== JSON.stringify(referenceFields)) return { ok: false as const,
          errors: [{ code: "ACTUALS_HANDOFF_FORECAST_FIELDS", path: "forecast",
            message: "Apply or revert other Forecast field changes before continuing with Actuals." }] };
      }
      const snapshot = projectSnapshotDrafts.initialize(actualsModel);
      const removed = snapshot.teams.filter((row) => row.enabled && !target.includes(row.teamId));
      const dirtyRemoved = removed.some((row) => {
        const before = actualsModel.snapshots.at(-1);
        const raf = before && "raf" in before ? before.raf.find((item) => item.teamId === row.teamId) : undefined;
        return raf && parseExactQuantityInput(row.raf) !== serializeQuantity(raf.amount);
      });
      if (dirtyRemoved) return { ok: false as const,
        errors: [{ code: "ACTUALS_HANDOFF_RAF_CONFLICT", path: "raf",
          message: "A Team being removed has a card RAF draft. Revert or resolve it before continuing." }] };
      const oldRaf = actualsModel.snapshots.at(-1);
      if (oldRaf && "raf" in oldRaf && command.teamRequirements.some((requirement) => {
        const prior = oldRaf.raf.find((row) => row.teamId === requirement.teamId);
        const quick = snapshot.teams.find((row) => row.teamId === requirement.teamId);
        if (!prior || !quick) return false;
        const before = serializeQuantity(prior.amount);
        const card = parseExactQuantityInput(quick.raf);
        const forecastRaf = serializeQuantity(requirement.remainingWorkload);
        return card !== before && forecastRaf !== before && card !== forecastRaf;
      })) return { ok: false as const,
        errors: [{ code: "ACTUALS_HANDOFF_RAF_CONFLICT", path: "raf",
          message: "Forecast and the card changed the same RAF differently. Resolve the conflict before continuing." }] };
      projectActualsControllers.get(command.projectId)?.openHandoff(command);
      return { ok: false as const, errors: [{ code: "ACTUALS_HANDOFF", path: "actuals",
        message: "Complete the Actuals dialog to apply this Team change together with its knowledge." }] };
    }
    if (cardRafDirty) {
      if (projectDrafts.isDirty(command.projectId)) return { ok: false as const,
        errors: [{ code: "ACTUALS_FORECAST_SEPARATION", path: "raf",
          message: "Apply or Cancel the other Project edits before applying RAF; these changes need separate transactions." }] };
      return projectActualsControllers.get(command.projectId)?.applyCardRaf() ?? { ok: false as const,
        errors: [{ code: "ACTUALS_CARD_UNAVAILABLE", path: "raf", message: "Actuals card is unavailable." }] };
    }
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
    const actualsModel = input.getReservationSnapshotActualsViewModel?.(command.reservationId);
    const target = command.teamAllocations.map((row) => row.teamId);
    const current = actualsModel?.teams.filter((row) => row.participating).map((row) => row.teamId) ?? [];
    if (actualsModel && (actualsModel.snapshots.length || actualsModel.legacyV4Actuals) &&
      (target.length !== current.length || target.some((id, index) => id !== current[index]))) {
      const forecast = reservationDrafts.get(command.reservationId);
      if (forecast) {
        const { teams: _localTeams, ...localFields } = forecast.values;
        const { teams: _referenceTeams, ...referenceFields } = forecast.reference;
        void _localTeams; void _referenceTeams;
        if (JSON.stringify(localFields) !== JSON.stringify(referenceFields)) return { ok: false as const,
          errors: [{ code: "ACTUALS_HANDOFF_FORECAST_FIELDS", path: "forecast",
            message: "Apply or revert other Forecast field changes before continuing with Actuals." }] };
      }
      reservationSnapshotDrafts.initialize(actualsModel);
      reservationActualsControllers.get(command.reservationId)?.openHandoff(command);
      return { ok: false as const, errors: [{ code: "ACTUALS_HANDOFF", path: "actuals",
        message: "Complete the Actuals dialog to apply this Team change together with its knowledge." }] };
    }
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
  if (input.invalidStartupBackup) planningSettingsController.showStartupError();
  refreshSnapshotDirty();
  const interactionOwners = () => [cursorController, viewportController, interactionController, reorderController,
    diagnosticsController, ...projectActualsControllers.values(), ...reservationActualsControllers.values()];
  return {
    isModalOpen,
    suspend: () => {
      if (destroyed) return false;
      if (suspended) return true;
      if (isModalOpen()) return false;
      suspended = true;
      for (const owner of interactionOwners()) owner.suspend?.();
      dirtyLifecycle.suspend();
      return true;
    },
    resume: () => {
      if (!suspended || destroyed) return;
      suspended = false;
      for (const owner of interactionOwners()) owner.resume?.();
      dirtyLifecycle.resume();
      refreshSnapshotDirty();
    },
    hasUnappliedChanges,
    getProjection: () => projection, getUiSnapshot: currentSnapshot, renderProjection,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      dirtyLifecycle.destroy();
      snapshotController?.destroy();
      for (const event of ["input", "change", "click", "submit"]) dirtyDocument?.removeEventListener?.(event, notifyDirty);
      destroyControllers(); teamEditController.destroy(); planningSettingsController.destroy();
      teamCreateController?.destroy();
      projectCreateController?.destroy();
      reservationCreateController?.destroy();
      input.elements.teamCreateButton?.removeEventListener("click", onCreateTeamClick);
      input.elements.projectCreateButton?.removeEventListener("click", onCreateProjectClick);
      input.elements.reservationCreateButton?.removeEventListener("click", onCreateReservationClick);
      progressSurface.destroy(); diagnosticsController.destroy();
    },
  };
}
