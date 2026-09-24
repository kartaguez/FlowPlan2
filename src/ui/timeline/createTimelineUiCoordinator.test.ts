import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ProjectEditViewModel,
  ReservationEditViewModel,
  TeamEditViewModel,
  UpdateReservationCommand,
  UpdateProjectCommand,
  UpdateTeamCapacityPeriodsCommand,
  UpdateTeamNameCommand,
} from "../../application/index.js";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import {
  createCivilDate,
  createProjectId,
  createReservationId,
  createTeamId,
  createPlanningHorizon,
  type DomainResult,
  type Portfolio,
  type PlanningResult,
  type ProjectId,
  type ReservationId,
  type TeamId,
} from "../../domain/index.js";
import type { AppElements } from "../renderApp.js";
import {
  createTimelineUiCoordinator,
  type TimelineUiCoordinatorDependencies,
  type TimelineUiProjection,
} from "./createTimelineUiCoordinator.js";
import type { TimelineHit } from "./timelineHitTesting.js";

class FakeElement {
  textContent: string | null = null;
  hidden = false;
}

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function fixture() {
  const projectId = must(createProjectId("project-atlas"));
  const teamId = must(createTeamId("team-alpha"));
  const reservationId = must(createReservationId("reservation-run"));
  const firstDate = must(createCivilDate("2025-01-01"));
  const middleDate = must(createCivilDate("2025-01-02"));
  const allocationHit = Object.freeze({
    kind: "allocation",
    projectId,
    teamId,
    date: middleDate,
  }) satisfies TimelineHit;
  const geometry = {
    width: 1000,
    height: 156,
    dayWidth: 500,
    dates: [
      { date: firstDate, x: 0, width: 500 },
      { date: middleDate, x: 500, width: 500 },
    ],
    teams: [
      {
        teamId,
        x: 0,
        y: 56,
        width: 1000,
        height: 100,
        markers: [],
        days: [
          { date: firstDate, allocations: [] },
          {
            date: middleDate,
            allocations: [
              {
                projectId,
                teamId,
                date: middleDate,
                x: 500,
                y: 100,
                width: 500,
                height: 56,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as TimelineGeometry;
  const viewModel = {
    horizon: { start: firstDate, end: middleDate },
    projects: [{ id: projectId, label: "Project Atlas", priorityIndex: 0 }],
    teams: [{ id: teamId, label: "Team Alpha" }],
    diagnostics: [],
  } as unknown as TimelineViewModel;
  const portfolio = { teams: [], projects: [], programs: [], priorityFamilies: [], priorityOrder: [], reservations: [] } as unknown as Portfolio;
  const planningResult = { teamPlans: [], diagnostics: [] } as PlanningResult;
  const horizon = must(createPlanningHorizon({ start: firstDate, end: middleDate }));
  const projection = Object.freeze({ geometry, viewModel, portfolio, planningResult, horizon });
  const nextPortfolio = { ...portfolio, projects: [{ id: projectId, name: "Atlas Updated", requirements: [] }], priorityOrder: [projectId] } as unknown as Portfolio;
  const nextProjection = Object.freeze({
    portfolio: nextPortfolio,
    planningResult: { teamPlans: [], diagnostics: [] } as PlanningResult,
    horizon: must(createPlanningHorizon({ start: firstDate, end: middleDate })),
    geometry: { ...geometry, teams: [...geometry.teams] } as TimelineGeometry,
    viewModel: {
      ...viewModel,
      projects: [{ id: projectId, label: "Atlas Updated", priorityIndex: 0 }],
    } as TimelineViewModel,
  });
  const editModel = Object.freeze({
    projectId,
    label: "Project Atlas",
    programs: Object.freeze([]),
    priorityFamilies: Object.freeze([]),
    priorityPosition: 1,
    projectCount: 1,
    requirements: Object.freeze([]),
  }) satisfies ProjectEditViewModel;
  const teamEditModel = Object.freeze({
    teamId,
    label: "Team Alpha",
    capacityPeriods: Object.freeze([]),
  }) satisfies TeamEditViewModel;
  const reservationModel = Object.freeze({
    reservationId,
    name: "Run",
    startDate: firstDate,
    endDate: middleDate,
    teamAllocations: Object.freeze([]),
  }) satisfies ReservationEditViewModel;
  const elements = createElements();
  const lifecycle: string[] = [];
  const viewportInputs: Array<{ initialViewport?: unknown }> = [];
  const cursorInputs: Array<{ initialDate: typeof firstDate; isModalOpen: () => boolean; onSelectedDateChange?: (date: typeof firstDate) => void }> = [];
  const renderedProgressViews: string[] = [];
  const renderedProjectCounts: number[] = [];
  let onProgressViewChange: ((view: "projects" | "programs" | "pas") => void) | undefined;
  const interactionInputs: Array<{
    initialSelected?: TimelineHit;
    onSelectionChange?: (selected: TimelineHit | undefined) => void;
  }> = [];
  const projectModels: Array<ProjectEditViewModel | undefined> = [];
  const teamModels: Array<TeamEditViewModel | undefined> = [];
  const reservationModels: Array<ReservationEditViewModel | undefined> = [];
  const shellInputs: Array<{
    onTeamSettings: (teamId: TeamId) => void;
    onProjectSelect: (projectId: ProjectId) => void;
    onReservationSelect: (reservationId: ReservationId) => void;
  }> = [];
  let applyProject: ((command: UpdateProjectCommand) => { readonly ok: boolean }) | undefined;
  let applyTeam: ((command: UpdateTeamNameCommand | UpdateTeamCapacityPeriodsCommand) => { readonly ok: boolean }) | undefined;
  let applyReservations:
    | ((command: UpdateReservationCommand) => { readonly ok: boolean })
    | undefined;
  let currentSelected: TimelineHit | undefined = allocationHit;
  let activePortfolioTab: "projects" | "reservations" = "projects";
  let generation = 0;
  const dependencies = {
    renderTimeline: () => lifecycle.push("render"),
    createDiagnosticsController: () => ({
      setDiagnostics: () => lifecycle.push("diagnostics"),
      destroy: () => lifecycle.push("destroy-diagnostics"),
    }),
    createViewportController: (input: { initialViewport?: unknown }) => {
      generation += 1;
      viewportInputs.push(input);
      const state = generation === 1 ? { x: 100, width: 800 } : input.initialViewport!;
      lifecycle.push(`viewport-${generation}`);
      const ownGeneration = generation;
      return {
        getState: () => state,
        destroy: () => lifecycle.push(`destroy-viewport-${ownGeneration}`),
      };
    },
    createCursorController: (input: { initialDate: typeof firstDate; isModalOpen: () => boolean; onSelectedDateChange?: (date: typeof firstDate) => void }) => {
      cursorInputs.push(input);
      const date = generation === 1 ? middleDate : input.initialDate;
      lifecycle.push(`cursor-${generation}`);
      const ownGeneration = generation;
      return {
        getState: () => ({ selectedDate: date }),
        destroy: () => lifecycle.push(`destroy-cursor-${ownGeneration}`),
      };
    },
    createInteractionController: (input: {
      initialSelected?: TimelineHit;
      onSelectionChange?: (selected: TimelineHit | undefined) => void;
    }) => {
      interactionInputs.push(input);
      currentSelected = generation === 1 ? currentSelected : input.initialSelected;
      input.onSelectionChange?.(currentSelected);
      lifecycle.push(`interaction-${generation}`);
      const ownGeneration = generation;
      return {
        getState: () => ({ hovered: undefined, selected: currentSelected }),
        refreshTooltip: () => {},
        destroy: () => lifecycle.push(`destroy-interaction-${ownGeneration}`),
      };
    },
    createProjectEditController: (input: {
      onApply: (command: UpdateProjectCommand) => { readonly ok: boolean };
    }) => {
      applyProject = input.onApply;
      return {
        setProject: (model: ProjectEditViewModel | undefined) => projectModels.push(model),
        getProjectId: () => projectModels.at(-1)?.projectId,
        destroy: () => lifecycle.push("destroy-project-edit"),
      };
    },
    createTeamEditController: (input: {
      onApplyName: (command: UpdateTeamNameCommand) => { readonly ok: boolean };
      onApplyPeriods: (command: UpdateTeamCapacityPeriodsCommand) => { readonly ok: boolean };
    }) => {
      applyTeam = (command) =>
        command.kind === "update-team-name"
          ? input.onApplyName(command)
          : input.onApplyPeriods(command);
      return {
        setTeam: (model: TeamEditViewModel | undefined) => teamModels.push(model),
        getTeamId: () => teamModels.at(-1)?.teamId,
        destroy: () => lifecycle.push("destroy-team-edit"),
      };
    },
    createReservationEditController: (input: {
      onApply: (command: UpdateReservationCommand) => { readonly ok: boolean };
    }) => {
      applyReservations = input.onApply;
      return {
        setReservation: (model: ReservationEditViewModel | undefined) =>
          reservationModels.push(model),
        getReservationId: () => reservationModels.at(-1)?.reservationId,
        destroy: () => lifecycle.push("destroy-reservation-edit"),
      };
    },
    createPlanningSettingsController: () => ({
      setModel() {},
      destroy: () => lifecycle.push("destroy-planning-settings"),
    }),
    renderShellNavigation: (input: {
      initialTab?: "projects" | "reservations";
      onTeamSettings: (teamId: TeamId) => void;
      onProjectSelect: (projectId: ProjectId) => void;
      onReservationSelect: (reservationId: ReservationId) => void;
    }) => {
      shellInputs.push(input);
      activePortfolioTab = input.initialTab ?? "projects";
      return { teamMetricsContainers: new Map(), getActiveTab: () => activePortfolioTab,
        showEditingCard: () => {}, destroy() {} };
    },
    renderCursorTeamMetrics: () => {},
    createCursorProgressSurface: (_container: HTMLElement, onChange: typeof onProgressViewChange) => {
      onProgressViewChange = onChange;
      return { render: (model: { projects: readonly unknown[] }, view: string) => {
        renderedProgressViews.push(view);
        renderedProjectCounts.push(model.projects.length);
      }, destroy() {} };
    },
  } as unknown as TimelineUiCoordinatorDependencies;
  return {
    projectId,
    reservationId,
    teamId,
    firstDate,
    middleDate,
    allocationHit,
    projection,
    nextProjection,
    editModel,
    teamEditModel,
    reservationModel,
    elements,
    dependencies,
    lifecycle,
    viewportInputs,
    cursorInputs,
    renderedProgressViews,
    renderedProjectCounts,
    changeProgressView: (view: "projects" | "programs" | "pas") => onProgressViewChange?.(view),
    interactionInputs,
    projectModels,
    teamModels,
    reservationModels,
    shellInputs,
    setPortfolioTab: (tab: "projects" | "reservations") => { activePortfolioTab = tab; },
    getApplyProject: () => applyProject!,
    getApplyTeam: () => applyTeam!,
    getApplyReservations: () => applyReservations!,
    select: (selected: TimelineHit | undefined) => {
      currentSelected = selected;
      interactionInputs.at(-1)?.onSelectionChange?.(selected);
    },
  };
}

describe("TimelineUiCoordinator", () => {
  it("keeps the progress view in its snapshot and refreshes cursor metrics without dispatch", () => {
    const input = fixture();
    let dispatchCount = 0;
    const coordinator = createTimelineUiCoordinator({
      elements: input.elements,
      initialProjection: input.projection,
      initialDate: input.firstDate,
      dispatch: () => { dispatchCount += 1; return { ok: true, projection: input.nextProjection }; },
      getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
      getProjectEditViewModel: () => input.editModel,
      getTeamEditViewModel: () => input.teamEditModel,
      getReservationEditViewModel: () => input.reservationModel,
      getProjectNavigationItems: () => [{ id: input.projectId }],
      getReservationNavigationItems: () => [],
    }, input.dependencies);
    assert.deepEqual(input.renderedProgressViews, ["projects"]);
    input.changeProgressView("programs");
    assert.equal(coordinator.getUiSnapshot().activeProgressView, "programs");
    input.cursorInputs.at(-1)!.onSelectedDateChange?.(input.firstDate);
    assert.deepEqual(input.renderedProgressViews, ["projects", "programs", "programs"]);
    assert.equal(dispatchCount, 0);
    input.getApplyProject()({} as UpdateProjectCommand);
    assert.equal(dispatchCount, 1);
    assert.equal(coordinator.getUiSnapshot().activeProgressView, "programs");
    assert.equal(input.renderedProgressViews.at(-1), "programs");
    assert.deepEqual(input.renderedProjectCounts, [0, 0, 0, 1]);
  });

  it("destroys and recreates controllers while preserving compatible UI state", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    input.select(input.allocationHit);
    assert.equal(input.projectModels.at(-1), input.editModel);
    input.getApplyProject()({} as UpdateProjectCommand);

    assert.equal(coordinator.getProjection(), input.nextProjection);
    assert.deepEqual(coordinator.getUiSnapshot(), {
      viewport: { x: 100, width: 800 },
      selectedDate: input.middleDate,
      activeProgressView: "projects",
      activePortfolioTab: "projects",
      selected: input.allocationHit,
      editingContext: { kind: "project", projectId: input.projectId },
    });
    assert.deepEqual(
      input.lifecycle.slice(5, 8),
      ["destroy-interaction-1", "destroy-cursor-1", "destroy-viewport-1"],
    );
    assert.deepEqual(input.viewportInputs[1]?.initialViewport, {
      x: 100,
      width: 800,
    });
    assert.equal(input.cursorInputs[1]?.initialDate, input.middleDate);
    assert.equal(input.interactionInputs[1]?.initialSelected, input.allocationHit);
  });

  it("does not rerender when the application command fails", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({
          ok: false,
          errors: [{ code: "INVALID", path: "project.name", message: "Invalid." }],
        }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    const renderCount = input.lifecycle.filter((entry) => entry === "render").length;
    assert.equal(input.getApplyProject()({} as UpdateProjectCommand).ok, false);
    assert.equal(
      input.lifecycle.filter((entry) => entry === "render").length,
      renderCount,
    );
    assert.equal(coordinator.getProjection(), input.projection);
  });

  it("keeps editing context independent of Team and empty Timeline selections", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    input.select(input.allocationHit);
    assert.equal(input.projectModels.at(-1), input.editModel);
    const teamHit = { kind: "team", teamId: input.teamId } as const;
    input.select(teamHit);
    assert.deepEqual(coordinator.getUiSnapshot().selected, teamHit);
    assert.deepEqual(coordinator.getUiSnapshot().editingContext, { kind: "project", projectId: input.projectId });
    assert.equal(input.projectModels.at(-1), input.editModel);
    assert.equal(input.teamModels.at(-1), undefined);
    assert.equal(input.reservationModels.at(-1), undefined);
    input.select(undefined);
    assert.equal(coordinator.getUiSnapshot().selected, undefined);
    assert.equal(input.projectModels.at(-1), input.editModel);
    input.select(input.allocationHit);

    const withoutAllocation = {
      ...input.nextProjection,
      geometry: {
        ...input.nextProjection.geometry,
        teams: input.nextProjection.geometry.teams.map((team) => ({
          ...team,
          days: team.days.map((day) => ({ ...day, allocations: [] })),
        })),
      } as TimelineGeometry,
    } satisfies TimelineUiProjection;
    coordinator.renderProjection(withoutAllocation);
    assert.equal(coordinator.getUiSnapshot().selected, undefined);
    assert.equal(input.projectModels.at(-1), input.editModel);
    assert.equal(input.teamModels.at(-1), undefined);
  });

  it("preserves a selected team through a successful team update", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    const teamHit = { kind: "team", teamId: input.teamId } as const;
    input.select(teamHit);
    assert.equal(input.teamModels.at(-1), undefined);
    input.shellInputs.at(-1)!.onTeamSettings(input.teamId);
    assert.equal(input.teamModels.at(-1), input.teamEditModel);
    assert.equal(input.reservationModels.at(-1), undefined);
    assert.equal(input.projectModels.at(-1), undefined);
    input.getApplyTeam()({} as UpdateTeamNameCommand);
    assert.deepEqual(coordinator.getUiSnapshot().selected, teamHit);
    assert.equal(input.teamModels.at(-1), input.teamEditModel);
    assert.equal(input.reservationModels.at(-1), undefined);
  });

  it("preserves the chosen Portfolio tab independently of editing context", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator({
      elements: input.elements,
      initialProjection: input.projection,
      initialDate: input.firstDate,
      dispatch: () => ({ ok: true, projection: input.nextProjection }),
      getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
      getProjectEditViewModel: () => input.editModel,
      getTeamEditViewModel: () => input.teamEditModel,
      getReservationEditViewModel: () => input.reservationModel,
      getProjectNavigationItems: () => [{ id: input.projectId }],
      getReservationNavigationItems: () => [],
    }, input.dependencies);
    input.setPortfolioTab("reservations");
    assert.equal(coordinator.getUiSnapshot().activePortfolioTab, "reservations");
    input.getApplyProject()({} as UpdateProjectCommand);
    assert.equal(coordinator.getUiSnapshot().activePortfolioTab, "reservations");
  });

  it("uses one explicit modal check for the three remaining dialog surfaces", () => {
    const input = fixture();
    createTimelineUiCoordinator({
      elements: input.elements,
      initialProjection: input.projection,
      initialDate: input.firstDate,
      dispatch: () => ({ ok: true, projection: input.nextProjection }),
      getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
      getProjectEditViewModel: () => input.editModel,
      getTeamEditViewModel: () => input.teamEditModel,
      getReservationEditViewModel: () => input.reservationModel,
      getProjectNavigationItems: () => [{ id: input.projectId }],
      getReservationNavigationItems: () => [],
    }, input.dependencies);
    const isModalOpen = input.cursorInputs[0]!.isModalOpen;
    assert.equal(isModalOpen(), false);
    for (const modal of [
      input.elements.planningSettingsControls.container,
      input.elements.teamEditControls.container,
      input.elements.diagnosticsControls.dialog,
    ]) {
      modal.hidden = false;
      assert.equal(isModalOpen(), true);
      modal.hidden = true;
    }
    assert.equal(isModalOpen(), false);
  });

  it("preserves the global reservation context through a reservation update", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    input.shellInputs.at(-1)!.onReservationSelect(input.reservationId);
    input.getApplyReservations()({} as UpdateReservationCommand);
    assert.deepEqual(coordinator.getUiSnapshot().editingContext, {
      kind: "reservation",
      reservationId: input.reservationId,
    });
    assert.equal(input.reservationModels.at(-1), input.reservationModel);
    assert.equal(input.projectModels.at(-1), undefined);
  });

  it("opens mutually exclusive team, project, and reservation contexts", () => {
    const input = fixture();
    createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getPlanningSettingsViewModel: () => ({ startDate: input.firstDate, endDate: input.middleDate, workingWeekdays: [1, 2, 3, 4, 5], maxParallelProjects: 2 }),
        getProjectEditViewModel: () => input.editModel,
        getTeamEditViewModel: () => input.teamEditModel,
        getReservationEditViewModel: () => input.reservationModel,
        getProjectNavigationItems: () => [{ id: input.projectId }],
        getReservationNavigationItems: () => [],
      },
      input.dependencies,
    );
    input.shellInputs.at(-1)!.onTeamSettings(input.teamId);
    assert.equal(input.teamModels.at(-1), input.teamEditModel);
    assert.equal(input.reservationModels.at(-1), undefined);
    input.shellInputs.at(-1)!.onReservationSelect(input.reservationId);
    assert.equal(input.reservationModels.at(-1), input.reservationModel);
    assert.equal(input.teamModels.at(-1), undefined);
    assert.equal(input.projectModels.at(-1), undefined);
    input.shellInputs.at(-1)!.onProjectSelect(input.projectId);
    assert.equal(input.projectModels.at(-1), input.editModel);
    const hydrations = input.projectModels.length;
    input.shellInputs.at(-1)!.onProjectSelect(input.projectId);
    assert.equal(input.projectModels.length, hydrations);
    assert.equal(input.teamModels.at(-1), undefined);
    assert.equal(input.reservationModels.at(-1), undefined);
    input.select({ kind: "reservation", reservationId: input.reservationId,
      teamId: input.teamId, date: input.firstDate });
    assert.equal(input.reservationModels.at(-1), input.reservationModel);
  });
});

function createElements(): AppElements {
  const element = () => new FakeElement();
  const elements: AppElements = {
    svg: element() as unknown as SVGSVGElement,
    diagnosticsControls: {
      summary: element() as unknown as HTMLElement,
      backdrop: element() as unknown as HTMLElement,
      dialog: element() as unknown as HTMLElement,
      title: element() as unknown as HTMLElement,
      list: element() as unknown as HTMLElement,
      close: element() as unknown as HTMLButtonElement,
    },
    cursorProgress: element() as unknown as HTMLElement,
    cursorControl: element() as unknown as HTMLButtonElement,
    viewportControls: {
      zoomIn: element() as unknown as HTMLButtonElement,
      zoomOut: element() as unknown as HTMLButtonElement,
      reset: element() as unknown as HTMLButtonElement,
    },
    planningSettingsButton: element() as unknown as HTMLButtonElement,
    planningSettingsControls: {
      container: element() as unknown as HTMLElement,
      form: element() as unknown as HTMLFormElement,
      fields: element() as unknown as HTMLElement,
      apply: element() as unknown as HTMLButtonElement,
      cancel: element() as unknown as HTMLButtonElement,
      error: element() as unknown as HTMLElement,
    },
    tooltip: element() as unknown as HTMLElement,
    selectionSummary: element() as unknown as HTMLElement,
    projectEditControls: {
      container: element() as unknown as HTMLElement,
      form: element() as unknown as HTMLFormElement,
      fields: element() as unknown as HTMLElement,
      apply: element() as unknown as HTMLButtonElement,
      cancel: element() as unknown as HTMLButtonElement,
      status: element() as unknown as HTMLElement,
    },
    teamEditControls: {
      container: element() as unknown as HTMLElement,
      title: element() as unknown as HTMLElement,
      nameForm: element() as unknown as HTMLFormElement,
      nameFields: element() as unknown as HTMLElement,
      nameApply: element() as unknown as HTMLButtonElement,
      capacityDetails: element() as unknown as HTMLDetailsElement,
      capacityForm: element() as unknown as HTMLFormElement,
      capacityFields: element() as unknown as HTMLElement,
      capacityApply: element() as unknown as HTMLButtonElement,
      capacityCancel: element() as unknown as HTMLButtonElement,
      close: element() as unknown as HTMLButtonElement,
      status: element() as unknown as HTMLElement,
    },
    reservationEditControls: {
      container: element() as unknown as HTMLElement,
      title: element() as unknown as HTMLElement,
      form: element() as unknown as HTMLFormElement,
      fields: element() as unknown as HTMLElement,
      apply: element() as unknown as HTMLButtonElement,
      cancel: element() as unknown as HTMLButtonElement,
      status: element() as unknown as HTMLElement,
    },
    applicationError: element() as unknown as HTMLElement,
    projectEditError: element() as unknown as HTMLElement,
    reservationEditError: element() as unknown as HTMLElement,
    teamPanels: element() as unknown as HTMLElement,
    projectList: element() as unknown as HTMLElement,
    reservationList: element() as unknown as HTMLElement,
    projectTab: element() as unknown as HTMLButtonElement,
    reservationTab: element() as unknown as HTMLButtonElement,
  };
  elements.planningSettingsControls.container.hidden = true;
  elements.teamEditControls.container.hidden = true;
  elements.reservationEditControls.container.hidden = true;
  elements.diagnosticsControls.dialog.hidden = true;
  return elements;
}
