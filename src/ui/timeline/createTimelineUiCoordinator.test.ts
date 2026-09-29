import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import type { AppElements } from "../renderApp.js";
import { createTimelineUiCoordinator, type TimelineUiCoordinatorDependencies } from "./createTimelineUiCoordinator.js";
import type { CreateTimelineCursorControllerInput } from "./createTimelineCursorController.js";
import type { CreateTimelineViewportControllerInput } from "./createTimelineViewportController.js";

function fixture() {
  const scenario = createDemoPlanningScenario();
  const projection = buildPlanningSessionProjection({ state: scenario,
    geometryViewport: { width: 1000, teamLaneHeight: 100, teamHeaderHeight: 112, timeAxisHeight: 56 } });
  const element = { hidden: true } as HTMLElement;
  const elements = {
    cursorProgress: element, svg: element, tooltip: element, cursorControl: element,
    teamPanels: element, projectList: element, reservationList: element,
    projectTab: element, reservationTab: element, applicationError: element,
    planningSettingsButton: element,
    planningSettingsControls: { container: element },
    teamEditControls: { container: element },
    diagnosticsControls: { dialog: element },
  } as unknown as AppElements;
  let renderCount = 0;
  let cursorOptions: CreateTimelineCursorControllerInput | undefined;
  let viewportOptions: CreateTimelineViewportControllerInput | undefined;
  const requestedRanges: string[] = [];
  const dependencies = {
    renderTimeline: () => { renderCount += 1; },
    createDiagnosticsController: () => ({ setDiagnostics() {}, destroy() {} }),
    createViewportController: (input: CreateTimelineViewportControllerInput) => { viewportOptions = input; return ({
      getState: () => input.initialViewport ?? { x: 0, width: 1000 },
      setVisibleDateRange: (start: string, end: string) => requestedRanges.push(`${start}/${end}`),
      destroy() {},
    }); },
    createCursorController: (input: CreateTimelineCursorControllerInput) => { cursorOptions = input; return ({
      getState: () => ({ selectedDate: input.initialDate }), destroy() {},
    }); },
    createInteractionController: () => ({ getState: () => ({ hovered: undefined }), refreshTooltip() {}, destroy() {} }),
    createProjectEditController: () => ({ setProject() {}, getProjectId: () => undefined, destroy() {} }),
    createProjectReorderController: () => ({ destroy() {} }),
    createReservationEditController: () => ({ setReservation() {}, getReservationId: () => undefined, destroy() {} }),
    createTeamEditController: () => ({ setTeam() {}, getTeamId: () => undefined, destroy() {} }),
    createPlanningSettingsController: () => ({ setModel() {}, destroy() {} }),
    renderShellNavigation: () => ({ teamMetricsContainers: new Map(), projectCards: new Map(), reservationCards: new Map(),
      getActiveTab: () => "projects", setCardState() {}, destroy() {} }),
    renderCursorTeamMetrics: () => {},
    createCursorProgressSurface: () => ({ render() {}, destroy() {} }),
  } as unknown as TimelineUiCoordinatorDependencies;
  const coordinator = createTimelineUiCoordinator({
    elements, initialProjection: projection, initialDate: scenario.planning.startDate,
    dispatch: () => { throw new Error("No planning dispatch expected"); },
    getProjectEditViewModel: () => undefined,
    getProjectNavigationItems: () => [],
    getPlanningSettingsViewModel: () => ({}) as never,
    getTeamEditViewModel: () => undefined,
    getReservationEditViewModel: () => undefined,
    getReservationNavigationItems: () => [],
  }, dependencies);
  return { coordinator, projection, getRenderCount: () => renderCount,
    getCursorOptions: () => cursorOptions, getViewportOptions: () => viewportOptions,
    requestedRanges };
}

describe("Timeline UI coordinator", () => {
  it("preserves projection date and viewport through a rerender without selected state", () => {
    const input = fixture();
    const before = input.coordinator.getUiSnapshot();
    assert.equal("selected" in before, false);
    assert.equal("editingContext" in before, false);
    input.coordinator.renderProjection(input.projection);
    assert.equal(input.getRenderCount(), 2);
    assert.deepEqual(input.coordinator.getUiSnapshot(), before);
    input.coordinator.destroy();
  });

  it("routes selected ranges to the sole viewport controller and exposes the current anchor date", () => {
    const input = fixture();
    const date = input.projection.geometry.dates;
    assert.equal(input.getViewportOptions()?.getProjectionDate(), input.coordinator.getUiSnapshot().selectedDate);
    input.getCursorOptions()?.onVisibleDateRange?.(date[2]!.date, date[8]!.date);
    assert.deepEqual(input.requestedRanges, [`${date[2]!.date}/${date[8]!.date}`]);
    input.coordinator.destroy();
  });
});
