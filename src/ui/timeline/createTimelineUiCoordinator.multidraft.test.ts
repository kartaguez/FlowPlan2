import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlanningSettingsViewModel, buildProjectEditViewModel, buildReservationEditViewModel,
  buildTeamEditViewModel, createPlanningSession, type UpdateProjectCommand,
} from "../../application/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
import type { AppElements } from "../renderApp.js";
import type { createProjectEditController } from "../project-edit/createProjectEditController.js";
import type { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import { createTimelineUiCoordinator, type TimelineUiCoordinatorDependencies } from "./createTimelineUiCoordinator.js";
import type { ProjectId, ReservationId, TeamId } from "../../domain/index.js";

class FakeDocument {
  activeElement: FakeElement | undefined;
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
}
class FakeElement {
  hidden = false;
  textContent = "";
  id = "";
  type = "";
  disabled = false;
  className = "";
  readonly style = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly classList = { toggle: (_name: string, _force?: boolean) => {} };
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.children.push(...children); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  focus(): void { this.ownerDocument.activeElement = this; }
  contains(target: FakeElement | undefined): boolean { return !!target &&
    (target === this || this.children.some((child) => child.contains(target))); }
}

function fixture() {
  const scenario = createDemoPlanningScenario();
  const session = createPlanningSession(scenario);
  const dispatcher = createPlanningProjectionDispatcher({ session,
    geometryViewport: { width: 1000, teamLaneHeight: 100, teamHeaderHeight: 112, timeAxisHeight: 56 } });
  const document = new FakeDocument();
  const element = document.createElement("div") as unknown as HTMLElement;
  const elements = {
    cursorProgress: element, svg: element, tooltip: element, cursorControl: element,
    teamPanels: element, projectList: element, reservationList: element,
    projectTab: element, reservationTab: element, applicationError: element,
    planningSettingsButton: element, planningSettingsControls: { container: element },
    teamEditControls: { container: element }, diagnosticsControls: { dialog: element },
  } as unknown as AppElements;
  let renderCount = 0;
  let shellInput: { onProjectSelect: (id: ProjectId) => void;
    onReservationSelect: (id: ReservationId) => void; onTeamSettings: (id: TeamId) => void };
  const projectHandles = new Map<ProjectId, Parameters<typeof createProjectEditController>[0]>();
  const reservationHandles = new Map<ReservationId, Parameters<typeof createReservationEditController>[0]>();
  const cards = () => {
    const projectCards = new Map(scenario.portfolio.projects.map((project) => [project.id,
      { button: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
    const reservationCards = new Map(scenario.portfolio.reservations.map((reservation) => [reservation.id,
      { button: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
    return { projectCards, reservationCards };
  };
  const dependencies = {
    renderTimeline: () => { renderCount += 1; },
    createDiagnosticsController: () => ({ setDiagnostics() {}, destroy() {} }),
    createViewportController: (input: { initialViewport?: { x: number; width: number } }) => ({
      getState: () => input.initialViewport ?? { x: 0, width: 1000 }, destroy() {},
    }),
    createCursorController: (input: { initialDate: string }) => ({
      getState: () => ({ selectedDate: input.initialDate }), destroy() {},
    }),
    createInteractionController: () => ({ getState: () => ({ hovered: undefined }), refreshTooltip() {}, destroy() {} }),
    createProjectEditController: (input: Parameters<typeof createProjectEditController>[0]) => ({
      setProject(model: { projectId: ProjectId } | undefined) { if (model) projectHandles.set(model.projectId, input); },
      getProjectId: () => undefined, destroy() {},
    }),
    createReservationEditController: (input: Parameters<typeof createReservationEditController>[0]) => ({
      setReservation(model: { reservationId: ReservationId } | undefined) {
        if (model) reservationHandles.set(model.reservationId, input);
      }, getReservationId: () => undefined, destroy() {},
    }),
    createTeamEditController: () => ({ setTeam() {}, getTeamId: () => undefined, destroy() {} }),
    createPlanningSettingsController: () => ({ setModel() {}, destroy() {} }),
    renderShellNavigation: (input: typeof shellInput) => {
      shellInput = input;
      return { teamMetricsContainers: new Map(), ...cards(), getActiveTab: () => "projects",
        setCardState() {}, destroy() {} };
    },
    renderCursorTeamMetrics: () => {}, createCursorProgressSurface: () => ({ render() {}, destroy() {} }),
  } as unknown as TimelineUiCoordinatorDependencies;
  const coordinator = createTimelineUiCoordinator({
    elements, initialProjection: dispatcher.getProjection(), initialDate: scenario.planning.startDate,
    dispatch: dispatcher.dispatch,
    getProjectEditViewModel: (id) => buildProjectEditViewModel(session.getState(), id),
    getProjectNavigationItems: () => session.getState().portfolio.projects.map((project) => ({ id: project.id })),
    getPlanningSettingsViewModel: () => buildPlanningSettingsViewModel(session.getState()),
    getTeamEditViewModel: (id) => buildTeamEditViewModel(session.getState(), id),
    getReservationEditViewModel: (id) => buildReservationEditViewModel(session.getState(), id),
    getReservationNavigationItems: () => session.getState().portfolio.reservations.map((item) => ({ id: item.id, name: item.name })),
  }, dependencies);
  return { scenario, session, coordinator, projectHandles, reservationHandles,
    openProject: (id: ProjectId) => shellInput.onProjectSelect(id),
    openReservation: (id: ReservationId) => shellInput.onReservationSelect(id),
    getRenderCount: () => renderCount };
}

describe("coordinator multi-draft rerender", () => {
  it("keeps another Project and Reservation dirty and expanded after one Project Apply", () => {
    const app = fixture();
    const [a, b] = app.scenario.portfolio.projects;
    const reservation = app.scenario.portfolio.reservations[0]!;
    app.openProject(a!.id);
    app.openProject(b!.id);
    app.openReservation(reservation.id);
    const bHandle = app.projectHandles.get(b!.id)!;
    const bStore = bHandle.draftStore!;
    const bDraft = bStore.get(b!.id)!;
    bStore.update(b!.id, { ...bDraft.values, name: "B local draft" });
    bHandle.onDraftChange?.();
    const rHandle = app.reservationHandles.get(reservation.id)!;
    const rStore = rHandle.draftStore!;
    const rDraft = rStore.get(reservation.id)!;
    rStore.update(reservation.id, { ...rDraft.values, name: "R local draft" });
    assert.equal(app.getRenderCount(), 1);
    assert.equal(app.session.getState().portfolio.projects.find((item) => item.id === b!.id)?.name, b!.name);
    assert.equal(app.session.getState().portfolio.reservations.find((item) => item.id === reservation.id)?.name,
      reservation.name);
    const command: UpdateProjectCommand = { kind: "update-project", projectId: a!.id,
      name: "A applied", priorityPosition: 4,
      ...(a!.programId === undefined ? {} : { programId: a!.programId }),
      ...(a!.priorityFamilyId === undefined ? {} : { priorityFamilyId: a!.priorityFamilyId }),
      ...(a!.objectiveEndDate === undefined ? {} : { objectiveEndDate: a!.objectiveEndDate }),
      teamRequirements: a!.requirements.map((requirement) => ({ teamId: requirement.teamId,
        remainingWorkload: requirement.remainingWorkload,
        ...(requirement.dailyCap === undefined ? {} : { dailyCap: requirement.dailyCap }) })) };
    assert.equal(app.projectHandles.get(a!.id)!.onApply(command).ok, true);
    assert.equal(app.getRenderCount(), 2);
    assert.equal(bStore.get(b!.id)?.values.name, "B local draft");
    assert.equal(bStore.get(b!.id)?.values.priorityPosition, "1");
    assert.equal(bStore.get(b!.id)?.expanded, true);
    assert.equal(bStore.isDirty(b!.id), true);
    assert.equal(rStore.get(reservation.id)?.values.name, "R local draft");
    assert.equal(rStore.get(reservation.id)?.expanded, true);
    assert.equal(rStore.isDirty(reservation.id), true);
    assert.equal(app.session.getState().portfolio.projects.find((item) => item.id === b!.id)?.name, b!.name);
    app.coordinator.destroy();
  });
});
