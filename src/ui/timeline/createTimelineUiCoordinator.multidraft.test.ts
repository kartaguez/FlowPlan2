import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlanningSettingsViewModel, buildProjectEditViewModel, buildReservationEditViewModel,
  buildTeamEditViewModel, createPlanningSession, type CreateProjectCommand, type CreateReservationCommand, type UpdateProjectCommand,
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
import { capacityFromSerialized, createCivilDate, reservationRatioFromSerialized, unavailabilityRatioFromSerialized,
  type DomainResult, type ProjectId, type ReservationId, type TeamId } from "../../domain/index.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }

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
  addEventListener(): void {}
  removeEventListener(): void {}
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  focus(): void { this.ownerDocument.activeElement = this; }
  contains(target: FakeElement | undefined): boolean { return !!target &&
    (target === this || this.children.some((child) => child.contains(target))); }
}

function fixture(withUnusedTeam = false) {
  const scenario = createDemoPlanningScenario();
  const session = createPlanningSession(scenario);
  if (withUnusedTeam) {
    const created = session.dispatch({ kind: "create-team", name: "Unused Team", capacityPeriods: [{
      startDate: must(createCivilDate("2025-01-01")), endDate: must(createCivilDate("2025-03-31")),
      capacity: must(capacityFromSerialized("1/1")),
      unavailability: must(unavailabilityRatioFromSerialized("0/1")),
    }] });
    if (!created.ok) throw new Error(JSON.stringify(created.errors));
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
    onReservationSelect: (id: ReservationId) => void; onTeamSettings: (id: TeamId) => void };
  const projectHandles = new Map<ProjectId, Parameters<typeof createProjectEditController>[0]>();
  const reservationHandles = new Map<ReservationId, Parameters<typeof createReservationEditController>[0]>();
  let latestProjectCards: ReturnType<typeof cards>["projectCards"];
  let latestReservationCards: ReturnType<typeof cards>["reservationCards"];
  const reservationNameFields = new Map<ReservationId, FakeElement>();
  const cards = () => {
    const projectCards = new Map(session.getState().portfolio.projects.map((project) => [project.id,
      { button: document.createElement("button"), handle: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
    const reservationCards = new Map(session.getState().portfolio.reservations.map((reservation) => [reservation.id,
      { button: document.createElement("button"), host: document.createElement("div"), item: document.createElement("li") }]));
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
        setCardState() {}, setReorderPreview() {}, showReorderError() {}, destroy() {} };
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
    reservationNameFor: (id: ReservationId) => reservationNameFields.get(id),
    openProject: (id: ProjectId) => shellInput.onProjectSelect(id),
    openReservation: (id: ReservationId) => shellInput.onReservationSelect(id),
    getRenderCount: () => renderCount };
}

describe("coordinator multi-draft rerender", () => {
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
