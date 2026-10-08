import { createWorkspaceModeController } from "../ui/createWorkspaceModeController.js";
import { buildReservationNavigationItems, type TimelineGeometryViewport } from "../adapters/index.js";
import {
  buildProjectEditViewModel,
  buildProjectSnapshotActualsViewModel,
  buildReservationSnapshotActualsViewModel,
  buildPlanningSettingsViewModel,
  buildTeamEditViewModel,
  buildReservationEditViewModel,
} from "../application/index.js";
import type { AppElements } from "../ui/renderApp.js";
import { createTimelineUiCoordinator } from "../ui/timeline/createTimelineUiCoordinator.js";
import type { PlanningSessionState } from "../application/session/planningSession.js";

export const PLANNING_GEOMETRY_VIEWPORT: TimelineGeometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  teamHeaderHeight: 152,
  teamProjectionBandHeight: 22,
  timeAxisHeight: 76,
  timeAxisLabelHeight: 20,
  globalMetricsHeight: 132,
  teamCollectionActionsHeight: 42,
});

export interface ApplicationDispatcher {
  readonly getProjection: () => import("./planning/buildPlanningSessionProjection.js").PlanningSessionProjection;
  readonly dispatch: import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["dispatch"];
  readonly getSnapshotMetadata: () => readonly Pick<import("../domain/portfolioSnapshots/portfolioSnapshot.js").PortfolioSnapshot, "snapshotId" | "createdAt">[];
  readonly savePortfolioSnapshot: NonNullable<import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["onSavePortfolioSnapshot"]>;
  readonly deletePortfolioSnapshot: NonNullable<import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["onDeletePortfolioSnapshot"]>;
}
export function mountPlanningApplication(input: {
  elements: AppElements; session: import("../application/index.js").PlanningSession; state: PlanningSessionState;
  dispatcher: ApplicationDispatcher;
  onExport: NonNullable<import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["onExport"]>;
  onImportFile?: NonNullable<import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["onImportFile"]>;
  onImport?: NonNullable<import("../ui/timeline/createTimelineUiCoordinator.js").CreateTimelineUiCoordinatorInput["onImport"]>;
  invalidStartupBackup?: boolean;
  createHistory: (container: HTMLElement) => { resume(): void; suspend(): void; destroy(): void };
  onMounted?: (coordinator: ReturnType<typeof createTimelineUiCoordinator>) => void;
}): ReturnType<typeof createTimelineUiCoordinator> {
  const { elements, session, dispatcher: projectionDispatcher } = input;
  const coordinator = createTimelineUiCoordinator({

    getSnapshotMetadata: projectionDispatcher.getSnapshotMetadata,
    onSavePortfolioSnapshot: projectionDispatcher.savePortfolioSnapshot,
    onDeletePortfolioSnapshot: projectionDispatcher.deletePortfolioSnapshot,
    elements,
    initialProjection: projectionDispatcher.getProjection(),
    initialDate: input.state.planning.startDate,
    invalidStartupBackup: input.invalidStartupBackup ?? false,
    onExport: input.onExport,
    ...(input.onImport ? { onImport: input.onImport } : {}),
    ...(input.onImportFile ? { onImportFile: input.onImportFile } : {}),
    dispatch: projectionDispatcher.dispatch,
    getProjectEditViewModel: (projectId) =>
      buildProjectEditViewModel(session.getState(), projectId),
    getProjectSnapshotActualsViewModel: (projectId) => buildProjectSnapshotActualsViewModel(session.getState(), projectId),
    getReservationSnapshotActualsViewModel: (reservationId) => buildReservationSnapshotActualsViewModel(session.getState(), reservationId),
    getProjectNavigationItems: () => {
      const { portfolio } = session.getState();
      const programs = new Map(portfolio.programs.map((program) => [program.id, program.name]));
      const priorityFamilies = new Map(portfolio.priorityFamilies.map((family) => [family.id, family.name]));
      return Object.freeze(portfolio.projects.map((project) => Object.freeze({
        id: project.id,
        isActive: project.isActive,
        ...(project.programId === undefined ? {} : { programName: programs.get(project.programId)! }),
        ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyName: priorityFamilies.get(project.priorityFamilyId)! }),
      })));
    },
    getPlanningSettingsViewModel: () =>
      buildPlanningSettingsViewModel(session.getState()),
    getTeamEditViewModel: (teamId) =>
      buildTeamEditViewModel(session.getState(), teamId),
    getReservationEditViewModel: (reservationId) =>
      buildReservationEditViewModel(session.getState(), reservationId),
    getReservationNavigationItems: () => {
      const state = session.getState();
      return buildReservationNavigationItems(state.portfolio, state.planning.workingPattern);
    },
  });
  input.onMounted?.(coordinator);
  if (elements.modeControls) {
    const history = input.createHistory(elements.modeControls.historySurface);
    const modes = createWorkspaceModeController({ controls: elements.modeControls, planning: coordinator, history });
    const planning = coordinator;
    return { ...planning, destroy: () => { modes.destroy(); planning.destroy(); } };
  }
  return coordinator;
}
