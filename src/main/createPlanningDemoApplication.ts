import { buildReservationNavigationItems, type TimelineGeometryViewport } from "../adapters/index.js";
import {
  buildProjectEditViewModel,
  buildPlanningSettingsViewModel,
  buildTeamEditViewModel,
  buildReservationEditViewModel,
  createPlanningSession,
} from "../application/index.js";
import type { AppElements } from "../ui/renderApp.js";
import { createTimelineUiCoordinator } from "../ui/timeline/createTimelineUiCoordinator.js";
import type { DemoPlanningScenario } from "./demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "./planning/createPlanningProjectionDispatcher.js";
import { buildPlanningSessionProjection } from "./planning/buildPlanningSessionProjection.js";
import { importPlanningBackup, loadPlanningBackup } from "./planning/planningBackupOperations.js";
import { encodeFlowplanBackupV1 } from "../application/backup/flowplanBackupV1.js";
import type { PlanningBackupStore } from "../infrastructure/backup/localPlanningBackup.js";

const DEMO_GEOMETRY_VIEWPORT: TimelineGeometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  teamHeaderHeight: 112,
  teamProjectionBandHeight: 22,
  timeAxisHeight: 76,
  timeAxisLabelHeight: 20,
  globalMetricsHeight: 100,
  teamCollectionActionsHeight: 42,
});

export function createPlanningDemoApplication(
  elements: AppElements,
  scenario: DemoPlanningScenario,
  backupStore?: PlanningBackupStore,
): ReturnType<typeof createTimelineUiCoordinator> {
  const preflight = (state: DemoPlanningScenario): void => { buildPlanningSessionProjection({ state, geometryViewport: DEMO_GEOMETRY_VIEWPORT }); };
  const loaded = backupStore ? loadPlanningBackup(backupStore, scenario, preflight) : { state: scenario, invalid: false };
  const session = createPlanningSession(loaded.state);
  const projectionDispatcher = createPlanningProjectionDispatcher({
    session,
    geometryViewport: DEMO_GEOMETRY_VIEWPORT,
    ...(backupStore ? { backupStore } : {}),
  });
  return createTimelineUiCoordinator({
    elements,
    initialProjection: projectionDispatcher.getProjection(),
    initialDate: loaded.state.planning.startDate,
    invalidStartupBackup: loaded.invalid,
    onExport: () => encodeFlowplanBackupV1(session.getState()),
    ...(backupStore ? { onImport: (document: string) => importPlanningBackup({
      document, store: backupStore, preflight,
      confirm: () => elements.planningSettingsControls.container.ownerDocument.defaultView?.confirm(
        "Importing this file will replace all current planning data. Continue?",
      ) ?? false,
      reload: () => elements.planningSettingsControls.container.ownerDocument.defaultView?.location.reload(),
    }) } : {}),
    dispatch: projectionDispatcher.dispatch,
    getProjectEditViewModel: (projectId) =>
      buildProjectEditViewModel(session.getState(), projectId),
    getProjectNavigationItems: () => {
      const { portfolio } = session.getState();
      const programs = new Map(portfolio.programs.map((program) => [program.id, program.name]));
      const priorityFamilies = new Map(portfolio.priorityFamilies.map((family) => [family.id, family.name]));
      return Object.freeze(portfolio.projects.map((project) => Object.freeze({
        id: project.id,
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
}
