import type { TimelineGeometryViewport } from "../adapters/index.js";
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

const DEMO_GEOMETRY_VIEWPORT: TimelineGeometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

export function createPlanningDemoApplication(
  elements: AppElements,
  scenario: DemoPlanningScenario,
): ReturnType<typeof createTimelineUiCoordinator> {
  const session = createPlanningSession(scenario);
  const projectionDispatcher = createPlanningProjectionDispatcher({
    session,
    geometryViewport: DEMO_GEOMETRY_VIEWPORT,
  });
  return createTimelineUiCoordinator({
    elements,
    initialProjection: projectionDispatcher.getProjection(),
    initialDate: scenario.planning.startDate,
    dispatch: projectionDispatcher.dispatch,
    getProjectEditViewModel: (projectId) =>
      buildProjectEditViewModel(session.getState(), projectId),
    getPlanningSettingsViewModel: () =>
      buildPlanningSettingsViewModel(session.getState()),
    getTeamEditViewModel: (teamId) =>
      buildTeamEditViewModel(session.getState(), teamId),
    getReservationEditViewModel: (reservationId) =>
      buildReservationEditViewModel(session.getState(), reservationId),
    getReservationNavigationItems: () =>
      Object.freeze(
        session.getState().portfolio.reservations.map((reservation) =>
          Object.freeze({ id: reservation.id, name: reservation.name }),
        ),
      ),
  });
}
