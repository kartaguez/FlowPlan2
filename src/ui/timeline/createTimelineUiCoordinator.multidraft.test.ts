import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlanningSettingsViewModel, buildProjectEditViewModel, buildReservationEditViewModel,
  buildProjectSnapshotActualsViewModel, buildReservationSnapshotActualsViewModel,
  buildTeamEditViewModel, createPlanningSession, type CreateProjectCommand, type CreateReservationCommand,
  type UpdateProjectCommand, type UpdateReservationCommand,
} from "../../application/index.js";
import type { createTeamEditController } from "../team-edit/createTeamEditController.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
import type { AppElements } from "../renderApp.js";
import type { createProjectEditController } from "../project-edit/createProjectEditController.js";
import type { createProjectCreateController } from "../project-edit/createProjectCreateController.js";
import type { createProjectReorderController } from "../portfolio/createProjectReorderController.js";
import type { createReservationEditController } from "../reservation-edit/createReservationEditController.js";
import type { createReservationCreateController } from "../reservation-edit/createReservationCreateController.js";
import { createTimelineUiCoordinator, type TimelineUiCoordinatorDependencies } from "./createTimelineUiCoordinator.js";
import { createSnapshotActualsDraftStore } from "../actuals/snapshotActualsDraftStore.js";
import { parseSnapshotActualsCommand } from "../actuals/parseSnapshotActualsCommand.js";
import { capacityFromSerialized, createCivilDate, reservationRatioFromSerialized, unavailabilityRatioFromSerialized,
  remainingWorkloadFromSerialized, type DomainResult, type ProjectId, type ReservationId, type TeamId } from "../../domain/index.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }

class FakeDocument {
  activeElement: FakeElement | undefined;
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
  createTextNode(text: string): FakeElement { const node = new FakeElement(this, "#text"); node.textContent = text; return node; }
}
class FakeElement {
  hidden = false;
  textContent = "";
  value = "";
  checked = false;
  type = "";
  id = "";
  disabled = false;
  className = "";
  readonly style = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, Set<(event: { preventDefault?: () => void }) => void>>();
  readonly classList = { toggle: (_name: string, _force?: boolean) => {} };
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.children.push(...children); }
  replaceChildren(...children: FakeElement[]): void { this.children.splice(0, this.children.length, ...children); }
  addEventListener(type: string, listener: (event: { preventDefault?: () => void }) => void): void {
    const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: (event: { preventDefault?: () => void }) => void): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {} }); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  focus(): void { this.ownerDocument.activeElement = this; }
  contains(target: FakeElement | undefined): boolean { return !!target &&
    (target === this || this.children.some((child) => child.contains(target))); }
}

function fixture(withUnusedTeam = false, rejectActivation = false, withActuals = false, initialSnapshot = false) {
  const scenario = createDemoPlanningScenario();
  const session = createPlanningSession(scenario, { today: () => must(createCivilDate("2025-01-06")) });
  if (withUnusedTeam) {
    const created = session.dispatch({ kind: "create-team", name: "Unused Team", capacityPeriods: [{
      startDate: must(createCivilDate("2025-01-01")), endDate: must(createCivilDate("2025-03-31")),
      capacity: must(capacityFromSerialized("1/1")),
      unavailability: must(unavailabilityRatioFromSerialized("0/1")),
    }] });
    if (!created.ok) throw new Error(JSON.stringify(created.errors));
  }
  if (initialSnapshot) {
    const id = session.getState().portfolio.projects[0]!.id;
    const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
    const base = createSnapshotActualsDraftStore().initialize(model);
    const parsed = parseSnapshotActualsCommand(model, { ...base,
      teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row),
      periods: [{ from: "2025-01-04", through: "2025-01-04", values: base.teams.filter((row) => row.enabled)
        .map((row) => ({ teamId: row.teamId, text: "0", provenance: "user-entered" as const })) }] });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(session.dispatch(parsed.command).ok, true);
    const reservationId = session.getState().portfolio.reservations[0]!.id;
    const reservationModel = buildReservationSnapshotActualsViewModel(session.getState(), reservationId)!;
    const reservationBase = createSnapshotActualsDraftStore().initialize(reservationModel);
    const reservationParsed = parseSnapshotActualsCommand(reservationModel, { ...reservationBase,
      periods: [{ from: "2025-01-04", through: "2025-01-04", values: reservationBase.teams.filter((row) => row.enabled)
        .map((row) => ({ teamId: row.teamId, text: "0", provenance: "user-entered" as const })) }] });
    assert.equal(reservationParsed.ok, true);
    if (reservationParsed.ok) assert.equal(session.dispatch(reservationParsed.command).ok, true);
  }
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
    projectCreateControls: { container: element }, projectCreateButton: document.createElement("button"),
    projectCreateSection: element,
    reservationCreateControls: { container: element }, reservationCreateButton: document.createElement("button"),
    reservationCreateSection: element,
  } as unknown as AppElements;
  let renderCount = 0;
  let reorderInput: Parameters<typeof createProjectReorderController>[0];
  let teamEditInput: Parameters<typeof createTeamEditController>[0];
  let projectCreateInput: Parameters<typeof createProjectCreateController>[0];
  let reservationCreateInput: Parameters<typeof createReservationCreateController>[0];
  const createEnabledTeams = new Set<TeamId>();
  const createReservationEnabledTeams = new Set<TeamId>();
  let shellInput: { onProjectSelect: (id: ProjectId) => void;
    onReservationSelect: (id: ReservationId) => void; onTeamSettings: (id: TeamId) => void;
    onProjectActiveChange: (id: ProjectId, isActive: boolean) => void;
    onReservationActiveChange: (id: ReservationId, isActive: boolean) => void };
  const projectHandles = new Map<ProjectId, Parameters<typeof createProjectEditController>[0]>();
  const reservationHandles = new Map<ReservationId, Parameters<typeof createReservationEditController>[0]>();
  let latestProjectCards: ReturnType<typeof cards>["projectCards"];
  let latestReservationCards: ReturnType<typeof cards>["reservationCards"];
  const reservationNameFields = new Map<ReservationId, FakeElement>();
  const activationErrors: string[] = [];
  const cardStates = new Map<string, { expanded: boolean; dirty: boolean }>();
  const cards = () => {
    const projectCards = new Map(session.getState().portfolio.projects.map((project) => [project.id,
      { button: document.createElement("button"), handle: document.createElement("button"), activeButton: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
    const reservationCards = new Map(session.getState().portfolio.reservations.map((reservation) => [reservation.id,
      { button: document.createElement("button"), activeButton: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
    latestProjectCards = projectCards;
    latestReservationCards = reservationCards;
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
    createProjectCreateController: (input: Parameters<typeof createProjectCreateController>[0]) => {
      projectCreateInput = input;
      return { open() {}, requestClose: () => true, isOpen: () => false,
        isTeamEnabled: (id: TeamId) => createEnabledTeams.has(id),
        setPortfolio() {}, destroy() {} };
    },
    createReservationCreateController: (input: Parameters<typeof createReservationCreateController>[0]) => {
      reservationCreateInput = input;
      return { open() {}, requestClose: () => true, isOpen: () => false,
        isTeamEnabled: (id: TeamId) => createReservationEnabledTeams.has(id),
        setContext() {}, destroy() {} };
    },
    createProjectReorderController: (input: Parameters<typeof createProjectReorderController>[0]) => {
      reorderInput = input; return { destroy() {} };
    },
    createReservationEditController: (input: Parameters<typeof createReservationEditController>[0]) => {
      let activeId: ReservationId | undefined;
      return {
      setReservation(model: { reservationId: ReservationId } | undefined) {
        if (model) {
          activeId = model.reservationId;
          reservationHandles.set(model.reservationId, input);
          reservationNameFields.set(model.reservationId, document.createElement("input"));
        }
      }, getReservationId: () => activeId,
      focusName: () => { if (activeId) reservationNameFields.get(activeId)?.focus(); },
      destroy() {},
    }; },
    createTeamEditController: (input: Parameters<typeof createTeamEditController>[0]) => {
      teamEditInput = input;
      return { setTeam() {}, getTeamId: () => undefined, requestClose: () => true,
        hasUnappliedChanges: () => false, destroy() {} };
    },
    createPlanningSettingsController: () => ({ setModel() {}, destroy() {} }),
    renderShellNavigation: (input: typeof shellInput) => {
      shellInput = input;
      return { teamMetricsContainers: new Map(), ...cards(), getActiveTab: () => "projects",
        setCardState(kind: string, id: string, expanded: boolean, dirty: boolean) {
          cardStates.set(`${kind}:${id}`, { expanded, dirty });
        }, setReorderPreview() {}, showReorderError() {},
        showActivationError(_kind: string, message: string) { activationErrors.push(message); }, destroy() {} };
    },
    renderCursorTeamMetrics: () => {}, createCursorProgressSurface: () => ({ render() {}, destroy() {} }),
  } as unknown as TimelineUiCoordinatorDependencies;
  const coordinator = createTimelineUiCoordinator({
    elements, initialProjection: dispatcher.getProjection(), initialDate: scenario.planning.startDate,
    dispatch: (command) => rejectActivation &&
      (command.kind === "set-project-active" || command.kind === "set-reservation-active")
      ? { ok: false as const, errors: [{ code: "COMMIT_FAILED", path: "planning", message: "Planning change could not be saved." }] }
      : dispatcher.dispatch(command),
    getProjectEditViewModel: (id) => buildProjectEditViewModel(session.getState(), id),
    ...(withActuals ? { getProjectSnapshotActualsViewModel: (id: ProjectId) => buildProjectSnapshotActualsViewModel(session.getState(), id),
      getReservationSnapshotActualsViewModel: (id: ReservationId) => buildReservationSnapshotActualsViewModel(session.getState(), id) } : {}),
    getProjectNavigationItems: () => session.getState().portfolio.projects.map((project) => ({ id: project.id, isActive: project.isActive })),
    getPlanningSettingsViewModel: () => buildPlanningSettingsViewModel(session.getState()),
    getTeamEditViewModel: (id) => buildTeamEditViewModel(session.getState(), id),
    getReservationEditViewModel: (id) => buildReservationEditViewModel(session.getState(), id),
    getReservationNavigationItems: () => session.getState().portfolio.reservations.map((item) => ({ id: item.id, name: item.name, isActive: item.isActive })),
  }, dependencies);
  return { scenario, session, coordinator, projectHandles, reservationHandles,
    cardStateFor: (kind: "project" | "reservation", id: ProjectId | ReservationId) => cardStates.get(`${kind}:${id}`),
    projectCardHost: (id: ProjectId) => latestProjectCards.get(id)?.host,
    reservationCardHost: (id: ReservationId) => latestReservationCards.get(id)?.host,
    activationErrors,
    createProject: (command: CreateProjectCommand) => projectCreateInput.onCreate(command),
    createReservation: (command: CreateReservationCommand) => reservationCreateInput.onCreate(command),
    deleteReservation: (id: ReservationId) => reservationHandles.get(id)!.onDelete!(id),
    enableTeamInCreateReservation: (id: TeamId) => createReservationEnabledTeams.add(id),
    disableTeamInCreateReservation: (id: TeamId) => createReservationEnabledTeams.delete(id),
    deleteProject: (id: ProjectId) => projectHandles.get(id)!.onDelete!(id),
    enableTeamInCreate: (id: TeamId) => createEnabledTeams.add(id),
    disableTeamInCreate: (id: TeamId) => createEnabledTeams.delete(id),
    deleteTeam: (id: TeamId) => teamEditInput.onDelete!(id),
    unusedTeamId: withUnusedTeam ? session.getState().portfolio.teams.at(-1)!.id : undefined,
    reorder: (id: ProjectId, position: number) => reorderInput.onReorder(id, position),
    focused: () => document.activeElement,
    handleFor: (id: ProjectId) => latestProjectCards.get(id)?.handle,
    buttonFor: (id: ProjectId) => latestProjectCards.get(id)?.button,
    reservationButtonFor: (id: ReservationId) => latestReservationCards.get(id)?.button,
    projectActiveButtonFor: (id: ProjectId) => latestProjectCards.get(id)?.activeButton,
    reservationActiveButtonFor: (id: ReservationId) => latestReservationCards.get(id)?.activeButton,
    reservationNameFor: (id: ReservationId) => reservationNameFields.get(id),
    openProject: (id: ProjectId) => shellInput.onProjectSelect(id),
    openReservation: (id: ReservationId) => shellInput.onReservationSelect(id),
    setProjectActive: (id: ProjectId, isActive: boolean) => shellInput.onProjectActiveChange(id, isActive),
    setReservationActive: (id: ReservationId, isActive: boolean) => shellInput.onReservationActiveChange(id, isActive),
    getRenderCount: () => renderCount };
}

describe("coordinator multi-draft rerender", () => {
  const all = (root: FakeElement): FakeElement[] => [root, ...root.children.flatMap(all)];
  const labelInput = (host: FakeElement, text: string): FakeElement => {
    const label = all(host).find((item) => item.tagName === "label" &&
      (item.textContent === text || item.children.some((child) => child.textContent === text)));
    assert.ok(label, `Missing label ${text}`);
    return label.children[0]!;
  };
  const setField = (host: FakeElement, text: string, value: string): void => {
    const field = labelInput(host, text); field.value = value; field.emit("input");
  };
  const prepareOneDay = (host: FakeElement, kind: "project" | "reservation", teamIds: readonly TeamId[]): void => {
    all(host).find((item) => item.textContent === "Next")!.emit("click");
    setField(host, "From", "2025-01-04"); setField(host, "Through", "2025-01-04");
    for (const id of teamIds) setField(host, `${id} consumed`, "0");
    if (kind === "project") {
      all(host).find((item) => item.textContent === "Next")!.emit("click");
      for (const label of all(host).filter((item) => item.tagName === "label" && item.textContent.includes(" RAF (exact)"))) {
        label.children[0]!.value = "1"; label.children[0]!.emit("input");
      }
    }
  };
  it("keeps Project and Reservation cards pristine on Actuals open/collapse and resets on Cancel", () => {
    for (const kind of ["project", "reservation"] as const) {
      const app = fixture(false, false, true);
      const id = kind === "project" ? app.scenario.portfolio.projects[0]!.id :
        app.scenario.portfolio.reservations[0]!.id;
      const open = () => kind === "project" ? app.openProject(id as ProjectId) : app.openReservation(id as ReservationId);
      const host = () => kind === "project" ? app.projectCardHost(id as ProjectId)! :
        app.reservationCardHost(id as ReservationId)!;
      open();
      all(host()).find((item) => item.textContent === "Update actuals")!.emit("click");
      assert.equal(app.cardStateFor(kind, id)?.dirty, false);
      open();
      assert.equal(app.cardStateFor(kind, id)?.expanded, false);
      assert.equal(app.cardStateFor(kind, id)?.dirty, false);
      open();
      assert.equal(app.cardStateFor(kind, id)?.expanded, true);
      assert.equal(app.cardStateFor(kind, id)?.dirty, false);
      all(host()).find((item) => item.textContent === "Next")!.emit("click");
      assert.equal(app.cardStateFor(kind, id)?.dirty, true);
      all(host()).find((item) => item.textContent === "Cancel Actuals")!.emit("click");
      assert.equal(app.cardStateFor(kind, id)?.dirty, false);
      all(host()).find((item) => item.textContent === "Update actuals")!.emit("click");
      const teams = kind === "project" ? app.scenario.portfolio.projects[0]!.requirements.map((row) => row.teamId)
        : app.scenario.portfolio.reservations[0]!.teamAllocations.map((row) => row.teamId);
      prepareOneDay(host(), kind, teams);
      all(host()).find((item) => item.className.includes("card-actuals-form"))!.emit("submit");
      assert.equal(app.cardStateFor(kind, id)?.dirty, false);
      const saved = kind === "project" ? app.session.getState().portfolio.projects[0]?.snapshots :
        app.session.getState().portfolio.reservations[0]?.snapshots;
      assert.equal(saved?.length, 1);
      app.coordinator.destroy();
    }
  });
  it("keeps independent Actuals and Forecast drafts across a Project Actuals Apply", () => {
    const app = fixture(false, false, true);
    const project = app.scenario.portfolio.projects[0]!;
    const reservation = app.scenario.portfolio.reservations[0]!;
    const otherProject = app.scenario.portfolio.projects[1]!;
    app.openProject(project.id);
    app.openProject(otherProject.id);
    app.openReservation(reservation.id);
    assert.equal(app.cardStateFor("project", project.id)?.dirty, false);
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, false);
    const otherForecast = app.projectHandles.get(otherProject.id)!.draftStore!;
    otherForecast.update(otherProject.id, { ...otherForecast.get(otherProject.id)!.values, name: "Other local" });
    const reservationForecast = app.reservationHandles.get(reservation.id)!.draftStore!;
    const reservationHost = app.reservationCardHost(reservation.id)!;
    all(reservationHost).find((item) => item.textContent === "Update actuals")!.emit("click");
    assert.equal(all(reservationHost).find((item) => item.className.includes("card-actuals-modal"))?.hidden, false);
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, false);
    all(reservationHost).find((item) => item.textContent === "Next")!.emit("click");
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, true);
    reservationForecast.update(reservation.id, { ...reservationForecast.get(reservation.id)!.values, name: "Reservation local" });
    const projectHost = app.projectCardHost(project.id)!;
    all(projectHost).find((item) => item.textContent === "Update actuals")!.emit("click");
    assert.equal(app.cardStateFor("project", project.id)?.dirty, false);
    prepareOneDay(projectHost, "project", project.requirements.map((row) => row.teamId));
    assert.equal(app.cardStateFor("project", project.id)?.dirty, true);
    const before = app.getRenderCount();
    assert.equal(app.session.getState().portfolio.projects[0]?.snapshots, undefined);
    const actualsForm = all(projectHost).find((item) => item.className.includes("card-actuals-form"))!;
    actualsForm.emit("submit");
    assert.equal(app.session.getState().portfolio.projects[0]?.snapshots?.length, 1);
    assert.equal(app.getRenderCount(), before + 1);
    assert.equal(app.cardStateFor("project", project.id)?.dirty, false);
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, true);
    assert.equal(otherForecast.get(otherProject.id)?.values.name, "Other local");
    assert.equal(reservationForecast.get(reservation.id)?.values.name, "Reservation local");
    assert.equal(all(app.reservationCardHost(reservation.id)!).find((item) => item.className.includes("card-actuals-modal"))?.hidden, false);
    app.openReservation(reservation.id);
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, true);
    app.openReservation(reservation.id);
    assert.equal(app.cardStateFor("reservation", reservation.id)?.dirty, true);
    app.coordinator.destroy();
  });
  it("hands a Project membership addition to one Actuals transaction and preserves Forecast on Cancel", () => {
    const app = fixture(true, false, true, true);
    const id = app.session.getState().portfolio.projects[0]!.id;
    const newTeam = app.unusedTeamId!;
    app.openProject(id);
    const forecast = app.projectHandles.get(id)!.draftStore!;
    const before = forecast.get(id)!;
    forecast.update(id, { ...before.values, teams: before.values.teams.map((row) =>
      row.teamId === newTeam ? { ...row, enabled: true } : row) });
    const project = app.session.getState().portfolio.projects[0]!;
    const command: UpdateProjectCommand = { kind: "update-project", projectId: id, name: project.name,
      teamRequirements: [...project.requirements.map((row) => ({ teamId: row.teamId,
        remainingWorkload: row.remainingWorkload, ...(row.dailyCap ? { dailyCap: row.dailyCap } : {}) })),
      { teamId: newTeam, remainingWorkload: must(remainingWorkloadFromSerialized("1/1")) }] };
    const first = app.projectHandles.get(id)!.onApply(command);
    assert.equal(first.ok, false);
    if (!first.ok) assert.ok(first.errors.some((item) => item.code === "ACTUALS_HANDOFF"));
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 1);
    assert.equal(forecast.isDirty(id), true);
    let host = app.projectCardHost(id)!;
    assert.equal(all(host).find((item) => item.className === "card-actuals-modal")?.hidden, false);
    all(host).find((item) => item.textContent === "Cancel Actuals")!.emit("click");
    assert.equal(forecast.isDirty(id), true);
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 1);
    assert.equal(app.projectHandles.get(id)!.onApply(command).ok, false);
    host = app.projectCardHost(id)!;
    all(host).find((item) => item.textContent === "Next")!.emit("click");
    all(host).find((item) => item.textContent === "Next")!.emit("click");
    all(host).find((item) => item.className.includes("card-actuals-form"))!.emit("submit");
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 1);
    assert.equal(forecast.isDirty(id), true);
    all(host).find((item) => item.textContent === "Back")!.emit("click");
    setField(host, `${newTeam} consumed`, "0");
    all(host).find((item) => item.textContent === "Next")!.emit("click");
    const teamLabel = app.session.getState().portfolio.teams.find((team) => team.id === newTeam)!.name;
    const confirmation = labelInput(host, "Confirm " + teamLabel + " RAF (required)");
    confirmation.checked = true; confirmation.emit("change");
    const form = all(host).find((item) => item.className.includes("card-actuals-form"))!;
    form.emit("submit");
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 2);
    assert.ok(app.session.getState().portfolio.projects[0]!.requirements.some((row) => row.teamId === newTeam));
    assert.equal(forecast.isDirty(id), false);
    app.coordinator.destroy();
  });
  it("hands a Reservation membership addition to the two-step Actuals dialog", () => {
    const app = fixture(true, false, true, true);
    const reservation = app.session.getState().portfolio.reservations[0]!;
    const id = reservation.id;
    const newTeam = app.unusedTeamId!;
    app.openReservation(id);
    const forecast = app.reservationHandles.get(id)!.draftStore!;
    const before = forecast.get(id)!;
    forecast.update(id, { ...before.values, teams: before.values.teams.map((row) =>
      row.teamId === newTeam ? { ...row, enabled: true } : row) });
    const command: UpdateReservationCommand = { kind: "update-reservation", reservationId: id,
      name: reservation.name, startDate: reservation.startDate, endDate: reservation.endDate,
      teamAllocations: [...reservation.teamAllocations.map((row) => ({ teamId: row.teamId, ...row.amount })),
        { teamId: newTeam, kind: "ratio" as const, ratio: must(reservationRatioFromSerialized("1/2")) }] };
    const result = app.reservationHandles.get(id)!.onApply(command);
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.some((item) => item.code === "ACTUALS_HANDOFF"));
    assert.equal(app.session.getState().portfolio.reservations[0]!.snapshots!.length, 1);
    const host = app.reservationCardHost(id)!;
    all(host).find((item) => item.textContent === "Next")!.emit("click");
    setField(host, `${newTeam} consumed`, "0");
    assert.equal(all(host).some((item) => item.textContent.includes(" RAF (exact)")), false);
    all(host).find((item) => item.className.includes("card-actuals-form"))!.emit("submit");
    assert.equal(app.session.getState().portfolio.reservations[0]!.snapshots!.length, 2);
    assert.ok(app.session.getState().portfolio.reservations[0]!.teamAllocations.some((row) => row.teamId === newTeam));
    assert.equal(forecast.isDirty(id), false);
    app.coordinator.destroy();
  });
  it("applies autonomous Forecast membership without creating an Actuals snapshot", () => {
    const app = fixture(true, false, true);
    const project = app.session.getState().portfolio.projects[0]!;
    const newTeam = app.unusedTeamId!;
    app.openProject(project.id);
    const command: UpdateProjectCommand = { kind: "update-project", projectId: project.id, name: project.name,
      teamRequirements: [...project.requirements.map((row) => ({ teamId: row.teamId,
        remainingWorkload: row.remainingWorkload, ...(row.dailyCap ? { dailyCap: row.dailyCap } : {}) })),
      { teamId: newTeam, remainingWorkload: must(remainingWorkloadFromSerialized("1/1")) }] };
    assert.equal(app.projectHandles.get(project.id)!.onApply(command).ok, true);
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots, undefined);
    assert.ok(app.session.getState().portfolio.projects[0]!.requirements.some((row) => row.teamId === newTeam));
    app.coordinator.destroy();
  });
  it("blocks a handoff while unrelated Forecast fields are dirty", () => {
    const app = fixture(true, false, true, true);
    const project = app.session.getState().portfolio.projects[0]!;
    const newTeam = app.unusedTeamId!;
    app.openProject(project.id);
    const forecast = app.projectHandles.get(project.id)!.draftStore!;
    const original = forecast.get(project.id)!;
    forecast.update(project.id, { ...original.values, name: "Uncommitted name",
      teams: original.values.teams.map((row) => row.teamId === newTeam ? { ...row, enabled: true } : row) });
    const command: UpdateProjectCommand = { kind: "update-project", projectId: project.id, name: "Uncommitted name",
      teamRequirements: [...project.requirements.map((row) => ({ teamId: row.teamId,
        remainingWorkload: row.remainingWorkload })),
      { teamId: newTeam, remainingWorkload: must(remainingWorkloadFromSerialized("1/1")) }] };
    const result = app.projectHandles.get(project.id)!.onApply(command);
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.some((item) => item.code === "ACTUALS_HANDOFF_FORECAST_FIELDS"));
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 1);
    assert.equal(forecast.get(project.id)?.values.name, "Uncommitted name");
    app.coordinator.destroy();
  });
  it("refuses to drop a card RAF draft when Forecast removes its Team", () => {
    const app = fixture(false, false, true, true);
    const project = app.session.getState().portfolio.projects[0]!;
    app.openProject(project.id);
    const host = app.projectCardHost(project.id)!;
    const removed = project.requirements[0]!.teamId;
    const field = all(host).find((item) => item.attributes.get("data-raf-team") === removed)!;
    field.value = "2"; field.emit("input");
    const command: UpdateProjectCommand = { kind: "update-project", projectId: project.id, name: project.name,
      teamRequirements: project.requirements.slice(1).map((row) => ({ teamId: row.teamId,
        remainingWorkload: row.remainingWorkload })) };
    const result = app.projectHandles.get(project.id)!.onApply(command);
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.some((item) => item.code === "ACTUALS_HANDOFF_RAF_CONFLICT"));
    assert.equal(app.session.getState().portfolio.projects[0]!.snapshots!.length, 1);
    app.coordinator.destroy();
  });
  it("preserves state, projection, drafts and focus on failed activation commands", () => {
    const app = fixture(false, true);
    const project = app.scenario.portfolio.projects[0]!;
    const reservation = app.scenario.portfolio.reservations[0]!;
    app.openProject(project.id);
    app.openReservation(reservation.id);
    const projectStore = app.projectHandles.get(project.id)!.draftStore!;
    const reservationStore = app.reservationHandles.get(reservation.id)!.draftStore!;
    projectStore.update(project.id, { ...projectStore.get(project.id)!.values, name: "Local project" });
    reservationStore.update(reservation.id, { ...reservationStore.get(reservation.id)!.values, name: "Local reservation" });
    const state = app.session.getState();
    const projection = app.coordinator.getProjection();
    const snapshot = app.coordinator.getUiSnapshot();
    app.setProjectActive(project.id, false);
    assert.equal(app.focused(), app.projectActiveButtonFor(project.id));
    app.setReservationActive(reservation.id, false);
    assert.equal(app.focused(), app.reservationActiveButtonFor(reservation.id));
    assert.strictEqual(app.session.getState(), state);
    assert.strictEqual(app.coordinator.getProjection(), projection);
    assert.deepEqual(app.coordinator.getUiSnapshot(), snapshot);
    assert.equal(app.getRenderCount(), 1);
    assert.equal(projectStore.get(project.id)?.values.name, "Local project");
    assert.equal(reservationStore.get(reservation.id)?.values.name, "Local reservation");
    assert.equal(app.activationErrors.length, 2);
    app.coordinator.destroy();
  });

  it("keeps independent drafts and activation outside Apply for both entity types", () => {
    for (const finalActive of [false, true]) {
      const app = fixture();
      const [project, otherProject] = app.scenario.portfolio.projects;
      const [reservation, otherReservation] = app.scenario.portfolio.reservations;
      app.openProject(project!.id);
      app.openProject(otherProject!.id);
      app.openReservation(reservation!.id);
      app.openReservation(otherReservation!.id);
      const projectStore = app.projectHandles.get(project!.id)!.draftStore!;
      const otherProjectStore = app.projectHandles.get(otherProject!.id)!.draftStore!;
      const reservationStore = app.reservationHandles.get(reservation!.id)!.draftStore!;
      const otherReservationStore = app.reservationHandles.get(otherReservation!.id)!.draftStore!;
      projectStore.update(project!.id, { ...projectStore.get(project!.id)!.values, name: "Project draft" });
      otherProjectStore.update(otherProject!.id, { ...otherProjectStore.get(otherProject!.id)!.values, name: "Other project draft" });
      reservationStore.update(reservation!.id, { ...reservationStore.get(reservation!.id)!.values, name: "Reservation draft" });
      otherReservationStore.update(otherReservation!.id, { ...otherReservationStore.get(otherReservation!.id)!.values, name: "Other reservation draft" });
      const snapshot = app.coordinator.getUiSnapshot();
      app.setProjectActive(project!.id, false);
      app.setReservationActive(reservation!.id, false);
      if (finalActive) {
        app.setProjectActive(project!.id, true);
        app.setReservationActive(reservation!.id, true);
      }
      assert.equal(app.session.getState().portfolio.projects[0]!.isActive, finalActive);
      assert.equal(app.session.getState().portfolio.reservations[0]!.isActive, finalActive);
      assert.equal(projectStore.get(project!.id)?.values.name, "Project draft");
      assert.equal(reservationStore.get(reservation!.id)?.values.name, "Reservation draft");
      assert.equal(otherProjectStore.get(otherProject!.id)?.values.name, "Other project draft");
      assert.equal(otherReservationStore.get(otherReservation!.id)?.values.name, "Other reservation draft");
      assert.deepEqual(app.coordinator.getUiSnapshot(), snapshot);
      assert.equal(app.focused(), app.reservationActiveButtonFor(reservation!.id));
      const projectApply: UpdateProjectCommand = { kind: "update-project", projectId: project!.id,
        name: projectStore.get(project!.id)!.values.name,
        ...(project!.programId === undefined ? {} : { programId: project!.programId }),
        ...(project!.priorityFamilyId === undefined ? {} : { priorityFamilyId: project!.priorityFamilyId }),
        ...(project!.objectiveEndDate === undefined ? {} : { objectiveEndDate: project!.objectiveEndDate }),
        teamRequirements: project!.requirements.map((requirement) => ({ teamId: requirement.teamId,
          remainingWorkload: requirement.remainingWorkload,
          ...(requirement.dailyCap === undefined ? {} : { dailyCap: requirement.dailyCap }) })) };
      assert.equal(app.projectHandles.get(project!.id)!.onApply(projectApply).ok, true);
      const reservationApply = { kind: "update-reservation" as const, reservationId: reservation!.id,
        name: reservationStore.get(reservation!.id)!.values.name,
        startDate: reservation!.startDate, endDate: reservation!.endDate,
        teamAllocations: reservation!.teamAllocations.map((allocation) => ({ teamId: allocation.teamId,
          ...(allocation.amount.kind === "ratio"
            ? { kind: "ratio" as const, ratio: allocation.amount.ratio }
            : { kind: "fixed-daily" as const, dailyCapacity: allocation.amount.dailyCapacity }) })) };
      assert.equal(app.reservationHandles.get(reservation!.id)!.onApply(reservationApply).ok, true);
      assert.equal(app.session.getState().portfolio.projects[0]!.name, "Project draft");
      assert.equal(app.session.getState().portfolio.projects[0]!.isActive, finalActive);
      assert.equal(app.session.getState().portfolio.reservations[0]!.name, "Reservation draft");
      assert.equal(app.session.getState().portfolio.reservations[0]!.isActive, finalActive);
      assert.equal(otherProjectStore.get(otherProject!.id)?.values.name, "Other project draft");
      assert.equal(otherReservationStore.get(otherReservation!.id)?.values.name, "Other reservation draft");
      app.coordinator.destroy();
    }
  });

  it("creates and deletes a Reservation while retaining independent dirty drafts and focus", () => {
    const app = fixture();
    const project = app.scenario.portfolio.projects[0]!;
    const other = app.scenario.portfolio.reservations[0]!;
    app.openProject(project.id);
    app.openReservation(other.id);
    const projectStore = app.projectHandles.get(project.id)!.draftStore!;
    projectStore.update(project.id, { ...projectStore.get(project.id)!.values, name: "Project local" });
    const reservationStore = app.reservationHandles.get(other.id)!.draftStore!;
    reservationStore.update(other.id, { ...reservationStore.get(other.id)!.values, name: "Reservation local" });
    const snapshot = app.coordinator.getUiSnapshot();
    assert.equal(app.createReservation({ kind: "create-reservation", name: "Fresh",
      startDate: app.scenario.planning.startDate, endDate: app.scenario.planning.endDate,
      teamAllocations: [] }).ok, true);
    const created = app.session.getState().portfolio.reservations.at(-1)!.id;
    assert.equal(app.reservationHandles.get(created)!.draftStore!.get(created)?.expanded, true);
    assert.equal(app.focused(), app.reservationNameFor(created));
    assert.equal(app.deleteReservation(created).ok, true);
    assert.equal(app.session.getState().portfolio.reservations.some((item) => item.id === created), false);
    assert.equal(reservationStore.get(created), undefined);
    assert.equal(reservationStore.get(other.id)?.values.name, "Reservation local");
    assert.equal(projectStore.get(project.id)?.values.name, "Project local");
    assert.deepEqual(app.coordinator.getUiSnapshot(), snapshot);
    assert.equal(app.focused(), app.reservationButtonFor(app.scenario.portfolio.reservations.at(-1)!.id));
    assert.equal(app.getRenderCount(), 3);
    app.coordinator.destroy();
  });

  it("protects a Team enabled in Create Reservation and its persisted allocation", () => {
    const app = fixture(true);
    const id = app.unusedTeamId!;
    app.enableTeamInCreateReservation(id);
    const before = app.session.getState();
    const blocked = app.deleteTeam(id);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.reason, "draft");
    assert.equal(app.session.getState(), before);
    assert.equal(app.getRenderCount(), 1);
    app.disableTeamInCreateReservation(id);
    assert.equal(app.createReservation({ kind: "create-reservation", name: "Uses Team",
      startDate: app.scenario.planning.startDate, endDate: app.scenario.planning.endDate,
      teamAllocations: [{ teamId: id, kind: "ratio",
        ratio: must(reservationRatioFromSerialized("1/3")) }] }).ok, true);
    const persisted = app.deleteTeam(id);
    assert.equal(persisted.ok, false);
    if (!persisted.ok) assert.equal(persisted.reason, "application");
    app.coordinator.destroy();
  });

  it("creates, reorders and deletes a Project while preserving independent dirty drafts and focus", () => {
    const app = fixture();
    const [first, second] = app.scenario.portfolio.projects;
    const reservation = app.scenario.portfolio.reservations[0]!;
    app.openProject(first!.id);
    app.openProject(second!.id);
    app.openReservation(reservation.id);
    const secondStore = app.projectHandles.get(second!.id)!.draftStore!;
    const secondDraft = secondStore.get(second!.id)!;
    secondStore.update(second!.id, { ...secondDraft.values, name: "Second local" });
    const reservationStore = app.reservationHandles.get(reservation.id)!.draftStore!;
    const reservationDraft = reservationStore.get(reservation.id)!;
    reservationStore.update(reservation.id, { ...reservationDraft.values, name: "Reservation local" });
    const snapshot = app.coordinator.getUiSnapshot();
    const created = app.createProject({ kind: "create-project", name: "Fresh",
      teamRequirements: [{ teamId: first!.requirements[0]!.teamId,
        remainingWorkload: first!.requirements[0]!.remainingWorkload }] });
    assert.equal(created.ok, true);
    const id = app.session.getState().portfolio.priorityOrder.at(-1)!;
    assert.strictEqual(app.focused(), app.buttonFor(id));
    assert.equal(app.projectHandles.get(id)!.draftStore!.get(id)?.expanded, true);
    app.reorder(id, 1);
    assert.equal(app.session.getState().portfolio.priorityOrder[0], id);
    assert.equal(app.deleteProject(id).ok, true);
    assert.equal(app.session.getState().portfolio.projects.some((project) => project.id === id), false);
    assert.equal(app.projectHandles.get(id)!.draftStore!.get(id), undefined);
    assert.equal(secondStore.get(second!.id)?.values.name, "Second local");
    assert.equal(secondStore.isDirty(second!.id), true);
    assert.equal(reservationStore.get(reservation.id)?.values.name, "Reservation local");
    assert.equal(reservationStore.isDirty(reservation.id), true);
    assert.deepEqual(app.coordinator.getUiSnapshot(), snapshot);
    assert.strictEqual(app.focused(), app.buttonFor(first!.id));
    assert.equal(app.getRenderCount(), 4);
    app.coordinator.destroy();
  });

  it("guards a Create Project draft Team, then uses persisted references after creation", () => {
    const app = fixture(true);
    const id = app.unusedTeamId!;
    app.enableTeamInCreate(id);
    const blockedDraft = app.deleteTeam(id);
    assert.equal(blockedDraft.ok, false);
    if (!blockedDraft.ok) assert.equal(blockedDraft.reason, "draft");
    assert.equal(app.getRenderCount(), 1);
    app.disableTeamInCreate(id);
    const raf = app.scenario.portfolio.projects[0]!.requirements[0]!.remainingWorkload;
    assert.equal(app.createProject({ kind: "create-project", name: "Uses Team",
      teamRequirements: [{ teamId: id, remainingWorkload: raf }] }).ok, true);
    const projectId = app.session.getState().portfolio.priorityOrder.at(-1)!;
    const blockedPersisted = app.deleteTeam(id);
    assert.equal(blockedPersisted.ok, false);
    if (!blockedPersisted.ok) assert.equal(blockedPersisted.reason, "application");
    assert.equal(app.deleteProject(projectId).ok, true);
    assert.equal(app.deleteTeam(id).ok, true);
    app.coordinator.destroy();
  });
  it("deletes an unused Team while independent Project and Reservation drafts stay dirty", () => {
    const app = fixture(true);
    const teamId = app.unusedTeamId!;
    const projectId = app.scenario.portfolio.projects[0]!.id;
    const reservationId = app.scenario.portfolio.reservations[0]!.id;
    app.openProject(projectId);
    app.openReservation(reservationId);
    const projectStore = app.projectHandles.get(projectId)!.draftStore!;
    const reservationStore = app.reservationHandles.get(reservationId)!.draftStore!;
    const project = projectStore.get(projectId)!;
    const reservation = reservationStore.get(reservationId)!;
    projectStore.update(projectId, { ...project.values, name: "Local Project" });
    reservationStore.update(reservationId, { ...reservation.values, name: "Local Reservation" });
    assert.equal(projectStore.isTeamDirty(projectId, teamId), false);
    assert.equal(reservationStore.isTeamDirty(reservationId, teamId), false);
    const before = app.coordinator.getUiSnapshot();
    assert.equal(app.deleteTeam(teamId).ok, true);
    assert.equal(app.getRenderCount(), 2);
    assert.equal(app.session.getState().portfolio.teams.some((team) => team.id === teamId), false);
    assert.deepEqual(app.coordinator.getUiSnapshot(), before);
    assert.equal(projectStore.get(projectId)?.values.name, "Local Project");
    assert.equal(reservationStore.get(reservationId)?.values.name, "Local Reservation");
    assert.equal(projectStore.isDirty(projectId), true);
    assert.equal(reservationStore.isDirty(reservationId), true);
    assert.equal(projectStore.get(projectId)?.values.teams.some((team) => team.teamId === teamId), false);
    assert.equal(reservationStore.get(reservationId)?.values.teams.some((team) => team.teamId === teamId), false);
    app.coordinator.destroy();
  });

  it("protects a local Project Team activation without dispatching deletion", () => {
    const app = fixture(true);
    const teamId = app.unusedTeamId!;
    const projectId = app.scenario.portfolio.projects[0]!.id;
    app.openProject(projectId);
    const store = app.projectHandles.get(projectId)!.draftStore!;
    const initial = store.get(projectId)!;
    store.update(projectId, { ...initial.values, teams: initial.values.teams.map((team) =>
      team.teamId === teamId ? { ...team, enabled: true, remainingWorkload: "5" } : team) });
    const previous = app.session.getState();
    const result = app.deleteTeam(teamId);
    assert.deepEqual(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "draft");
    assert.equal(app.session.getState(), previous);
    assert.equal(app.getRenderCount(), 1);
    assert.equal(store.get(projectId)?.values.teams.find((team) => team.teamId === teamId)?.remainingWorkload, "5");
    app.coordinator.destroy();
  });

  it("protects a local Reservation Team value change even when inactive", () => {
    const app = fixture(true);
    const teamId = app.unusedTeamId!;
    const reservationId = app.scenario.portfolio.reservations[0]!.id;
    app.openReservation(reservationId);
    const store = app.reservationHandles.get(reservationId)!.draftStore!;
    const initial = store.get(reservationId)!;
    store.update(reservationId, { ...initial.values, teams: initial.values.teams.map((team) =>
      team.teamId === teamId ? { ...team, value: "25" } : team) });
    const previous = app.session.getState();
    const result = app.deleteTeam(teamId);
    assert.deepEqual(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "draft");
    assert.equal(app.session.getState(), previous);
    assert.equal(app.getRenderCount(), 1);
    assert.equal(store.get(reservationId)?.values.teams.find((team) => team.teamId === teamId)?.value, "25");
    app.coordinator.destroy();
  });

  it("returns persisted-reference errors from Application without a rerender", () => {
    const app = fixture();
    const teamId = app.scenario.portfolio.teams[0]!.id;
    const previous = app.session.getState();
    const result = app.deleteTeam(teamId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "application");
      if (result.reason === "application") {
        assert.ok(result.errors.some((error) => error.code === "TEAM_REFERENCED_BY_PROJECT"));
        assert.ok(result.errors.some((error) => error.code === "TEAM_REFERENCED_BY_RESERVATION"));
      }
    }
    assert.equal(app.session.getState(), previous);
    assert.equal(app.getRenderCount(), 1);
    app.coordinator.destroy();
  });
  it("preserves several dirty Project and Reservation drafts, open cards and focus across reorder", () => {
    const app = fixture();
    const projects = app.scenario.portfolio.projects;
    const reservations = app.scenario.portfolio.reservations;
    for (const project of projects.slice(0, 3)) app.openProject(project!.id);
    for (const reservation of reservations) app.openReservation(reservation.id);
    for (const project of projects.slice(0, 3)) {
      const input = app.projectHandles.get(project!.id)!;
      const draft = input.draftStore!.get(project!.id)!;
      input.draftStore!.update(project!.id, { ...draft.values, name: `${project!.name} local` });
    }
    for (const reservation of reservations) {
      const input = app.reservationHandles.get(reservation.id)!;
      const draft = input.draftStore!.get(reservation.id)!;
      input.draftStore!.update(reservation.id, { ...draft.values, name: `${reservation.name} local` });
    }
    const before = app.coordinator.getUiSnapshot();
    const moved = projects[1]!.id;
    app.reorder(moved, 4);
    assert.equal(app.getRenderCount(), 2);
    assert.deepEqual(app.coordinator.getUiSnapshot(), before);
    assert.equal(app.session.getState().portfolio.priorityOrder[3], moved);
    for (const project of projects.slice(0, 3)) {
      const store = app.projectHandles.get(project!.id)!.draftStore!;
      assert.equal(store.get(project!.id)?.values.name, `${project!.name} local`);
      assert.equal(store.get(project!.id)?.expanded, true);
      assert.equal(store.isDirty(project!.id), true);
    }
    for (const reservation of reservations) {
      const store = app.reservationHandles.get(reservation.id)!.draftStore!;
      assert.equal(store.get(reservation.id)?.values.name, `${reservation.name} local`);
      assert.equal(store.get(reservation.id)?.expanded, true);
      assert.equal(store.isDirty(reservation.id), true);
    }
    assert.strictEqual(app.focused(), app.handleFor(moved));
    app.reorder(moved, 4);
    assert.equal(app.getRenderCount(), 2);
    app.coordinator.destroy();
  });

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
      name: "A applied",
      ...(a!.programId === undefined ? {} : { programId: a!.programId }),
      ...(a!.priorityFamilyId === undefined ? {} : { priorityFamilyId: a!.priorityFamilyId }),
      ...(a!.objectiveEndDate === undefined ? {} : { objectiveEndDate: a!.objectiveEndDate }),
      teamRequirements: a!.requirements.map((requirement) => ({ teamId: requirement.teamId,
        remainingWorkload: requirement.remainingWorkload,
        ...(requirement.dailyCap === undefined ? {} : { dailyCap: requirement.dailyCap }) })) };
    assert.equal(app.projectHandles.get(a!.id)!.onApply(command).ok, true);
    assert.equal(app.getRenderCount(), 2);
    assert.equal(bStore.get(b!.id)?.values.name, "B local draft");
    assert.equal(bStore.get(b!.id)?.expanded, true);
    assert.equal(bStore.isDirty(b!.id), true);
    assert.equal(rStore.get(reservation.id)?.values.name, "R local draft");
    assert.equal(rStore.get(reservation.id)?.expanded, true);
    assert.equal(rStore.isDirty(reservation.id), true);
    assert.equal(app.session.getState().portfolio.projects.find((item) => item.id === b!.id)?.name, b!.name);
    app.coordinator.destroy();
  });
});
