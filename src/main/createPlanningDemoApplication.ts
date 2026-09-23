import type { TimelineGeometryViewport } from "../adapters/index.js";
import {
  buildProjectEditViewModel,
  buildTeamEditViewModel,
  buildTeamReservationsEditViewModel,
  createReservationIdGenerator,
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
  const reservationIdGenerator = createReservationIdGenerator(() =>
    session.getState().portfolio.reservations.map((reservation) => reservation.id),
  );
  return createTimelineUiCoordinator({
    elements,
    initialProjection: projectionDispatcher.getProjection(),
    initialDate: scenario.horizon.start,
    dispatch: projectionDispatcher.dispatch,
    getProjectEditViewModel: (projectId) =>
      buildProjectEditViewModel(session.getState(), projectId),
    getTeamEditViewModel: (teamId) =>
      buildTeamEditViewModel(session.getState(), teamId),
    getTeamReservationsEditViewModel: (teamId) =>
      buildTeamReservationsEditViewModel(session.getState(), teamId),
    nextReservationId: reservationIdGenerator.next,
  });
}
