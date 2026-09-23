import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ProjectEditViewModel,
  UpdateProjectCommand,
} from "../../application/index.js";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import {
  createCivilDate,
  createProjectId,
  createTeamId,
  type DomainResult,
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
  const projection = Object.freeze({ geometry, viewModel });
  const nextProjection = Object.freeze({
    geometry: { ...geometry, teams: [...geometry.teams] } as TimelineGeometry,
    viewModel: {
      ...viewModel,
      projects: [{ id: projectId, label: "Atlas Updated", priorityIndex: 0 }],
    } as TimelineViewModel,
  });
  const editModel = Object.freeze({
    projectId,
    label: "Project Atlas",
    priorityPosition: 1,
    projectCount: 1,
    requirements: Object.freeze([]),
  }) satisfies ProjectEditViewModel;
  const elements = createElements();
  const lifecycle: string[] = [];
  const viewportInputs: Array<{ initialViewport?: unknown }> = [];
  const cursorInputs: Array<{ initialDate: typeof firstDate }> = [];
  const interactionInputs: Array<{
    initialSelected?: TimelineHit;
    onSelectionChange?: (selected: TimelineHit | undefined) => void;
  }> = [];
  const projectModels: Array<ProjectEditViewModel | undefined> = [];
  let applyProject: ((command: UpdateProjectCommand) => { readonly ok: boolean }) | undefined;
  let generation = 0;
  const dependencies = {
    renderTimeline: () => lifecycle.push("render"),
    renderDiagnostics: () => lifecycle.push("diagnostics"),
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
    createCursorController: (input: { initialDate: typeof firstDate }) => {
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
      const selected = generation === 1 ? allocationHit : input.initialSelected;
      input.onSelectionChange?.(selected);
      lifecycle.push(`interaction-${generation}`);
      const ownGeneration = generation;
      return {
        getState: () => ({ hovered: undefined, selected }),
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
  } as unknown as TimelineUiCoordinatorDependencies;
  return {
    projectId,
    teamId,
    firstDate,
    middleDate,
    allocationHit,
    projection,
    nextProjection,
    editModel,
    elements,
    dependencies,
    lifecycle,
    viewportInputs,
    cursorInputs,
    interactionInputs,
    projectModels,
    getApplyProject: () => applyProject!,
  };
}

describe("TimelineUiCoordinator", () => {
  it("destroys and recreates controllers while preserving compatible UI state", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getProjectEditViewModel: () => input.editModel,
      },
      input.dependencies,
    );
    assert.equal(input.projectModels.at(-1), input.editModel);
    input.getApplyProject()({} as UpdateProjectCommand);

    assert.equal(coordinator.getProjection(), input.nextProjection);
    assert.deepEqual(coordinator.getUiSnapshot(), {
      viewport: { x: 100, width: 800 },
      selectedDate: input.middleDate,
      selected: input.allocationHit,
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
        getProjectEditViewModel: () => input.editModel,
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

  it("disables project editing for team hits and clears a vanished selection", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.nextProjection }),
        getProjectEditViewModel: () => input.editModel,
      },
      input.dependencies,
    );
    input.interactionInputs[0]?.onSelectionChange?.({
      kind: "team",
      teamId: input.teamId,
    });
    assert.equal(input.projectModels.at(-1), undefined);

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
    assert.equal(input.projectModels.at(-1), undefined);
  });
});

function createElements(): AppElements {
  const element = () => new FakeElement();
  return {
    svg: element() as unknown as SVGSVGElement,
    diagnostics: element() as unknown as HTMLElement,
    dateSummary: element() as unknown as HTMLElement,
    cursorControl: element() as unknown as HTMLButtonElement,
    viewportControls: {
      zoomIn: element() as unknown as HTMLButtonElement,
      zoomOut: element() as unknown as HTMLButtonElement,
      reset: element() as unknown as HTMLButtonElement,
    },
    tooltip: element() as unknown as HTMLElement,
    selectionSummary: element() as unknown as HTMLElement,
    projectEditControls: {
      form: element() as unknown as HTMLFormElement,
      fields: element() as unknown as HTMLElement,
      apply: element() as unknown as HTMLButtonElement,
      cancel: element() as unknown as HTMLButtonElement,
      status: element() as unknown as HTMLElement,
    },
    applicationError: element() as unknown as HTMLElement,
  };
}
