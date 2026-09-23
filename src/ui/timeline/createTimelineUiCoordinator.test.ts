import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
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

type Listener = (event: unknown) => void;

class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  textContent: string | null = null;
  value = "";
  disabled = false;
  hidden = false;

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  dispatch(type: string, event: object = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
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
  const renamedProjection = Object.freeze({
    geometry: { ...geometry, teams: [...geometry.teams] } as TimelineGeometry,
    viewModel: {
      ...viewModel,
      projects: [{ id: projectId, label: "Atlas Renamed", priorityIndex: 0 }],
    } as TimelineViewModel,
  });
  const elements = createElements();
  const lifecycle: string[] = [];
  const viewportInputs: unknown[] = [];
  const cursorInputs: unknown[] = [];
  const interactionInputs: Array<{
    initialSelected?: TimelineHit;
    onSelectionChange?: (selected: TimelineHit | undefined) => void;
  }> = [];
  let generation = 0;
  const dependencies = {
    renderTimeline: () => lifecycle.push("render"),
    renderDiagnostics: () => lifecycle.push("diagnostics"),
    createViewportController: (input: { initialViewport?: unknown }) => {
      generation += 1;
      viewportInputs.push(input);
      const state =
        generation === 1 ? { x: 100, width: 800 } : input.initialViewport!;
      lifecycle.push(`viewport-${generation}`);
      return {
        getState: () => state,
        destroy: () => lifecycle.push(`destroy-viewport-${generation}`),
      };
    },
    createCursorController: (input: { initialDate: typeof firstDate }) => {
      cursorInputs.push(input);
      const date = generation === 1 ? middleDate : input.initialDate;
      lifecycle.push(`cursor-${generation}`);
      return {
        getState: () => ({ selectedDate: date }),
        destroy: () => lifecycle.push(`destroy-cursor-${generation}`),
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
      return {
        getState: () => ({ hovered: undefined, selected }),
        destroy: () => lifecycle.push(`destroy-interaction-${generation}`),
      };
    },
  } as unknown as TimelineUiCoordinatorDependencies;

  return {
    projectId,
    firstDate,
    middleDate,
    allocationHit,
    projection,
    renamedProjection,
    elements,
    dependencies,
    lifecycle,
    viewportInputs,
    cursorInputs,
    interactionInputs,
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
        dispatch: () => ({ ok: true, projection: input.renamedProjection }),
      },
      input.dependencies,
    );
    assert.equal(input.elements.projectEditControls.input.disabled, false);
    assert.equal(input.elements.projectEditControls.input.value, "Project Atlas");

    input.elements.projectEditControls.input.value = "Unsaved label";
    (
      input.elements.projectEditControls.cancel as unknown as FakeElement
    ).dispatch("click");
    assert.equal(input.elements.projectEditControls.input.value, "Project Atlas");

    input.elements.projectEditControls.input.value = "Atlas Renamed";
    input.elements.projectEditControls.form.dispatch("submit", {
      preventDefault() {},
    });

    assert.equal(coordinator.getProjection(), input.renamedProjection);
    assert.deepEqual(coordinator.getUiSnapshot(), {
      viewport: { x: 100, width: 800 },
      selectedDate: input.middleDate,
      selected: input.allocationHit,
    });
    assert.equal(input.elements.projectEditControls.input.value, "Atlas Renamed");
    assert.equal(input.elements.applicationError.hidden, true);
    assert.deepEqual(
      input.lifecycle.slice(5, 8),
      ["destroy-interaction-1", "destroy-cursor-1", "destroy-viewport-1"],
    );
    assert.deepEqual(
      (input.viewportInputs[1] as { initialViewport: unknown }).initialViewport,
      { x: 100, width: 800 },
    );
    assert.equal(
      (input.cursorInputs[1] as { initialDate: unknown }).initialDate,
      input.middleDate,
    );
    assert.equal(input.interactionInputs[1]?.initialSelected, input.allocationHit);
    assert.equal(coordinator.getUiSnapshot().selected, input.allocationHit);
    assert.equal(
      (input.interactionInputs[1] as { initialSelected?: TimelineHit }).initialSelected,
      input.allocationHit,
    );
  });

  it("shows command errors without rerendering and clears them on later success", () => {
    const input = fixture();
    let valid = false;
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () =>
          valid
            ? { ok: true, projection: input.renamedProjection }
            : {
                ok: false,
                errors: [
                  { code: "EMPTY_PROJECT_LABEL", path: "label", message: "Invalid label." },
                ],
              },
      },
      input.dependencies,
    );
    const rendersBefore = input.lifecycle.filter((entry) => entry === "render").length;
    input.elements.projectEditControls.form.dispatch("submit", {
      preventDefault() {},
    });
    assert.equal(input.elements.applicationError.hidden, false);
    assert.equal(input.elements.applicationError.textContent, "Invalid label.");
    assert.equal(
      input.lifecycle.filter((entry) => entry === "render").length,
      rendersBefore,
    );
    assert.equal(coordinator.getProjection(), input.projection);

    valid = true;
    input.elements.projectEditControls.form.dispatch("submit", {
      preventDefault() {},
    });
    assert.equal(input.elements.applicationError.hidden, true);
    assert.equal(input.elements.applicationError.textContent, "");
  });

  it("disables project editing for a team selection and clears incompatible selection", () => {
    const input = fixture();
    const coordinator = createTimelineUiCoordinator(
      {
        elements: input.elements,
        initialProjection: input.projection,
        initialDate: input.firstDate,
        dispatch: () => ({ ok: true, projection: input.renamedProjection }),
      },
      input.dependencies,
    );
    input.interactionInputs[0]?.onSelectionChange?.({
      kind: "team",
      teamId: input.allocationHit.teamId,
    });
    assert.equal(input.elements.projectEditControls.input.disabled, true);
    assert.match(
      input.elements.projectEditControls.status.textContent ?? "",
      /Select a project/,
    );

    const projectionWithoutAllocation = {
      ...input.renamedProjection,
      geometry: {
        ...input.renamedProjection.geometry,
        teams: input.renamedProjection.geometry.teams.map((team) => ({
          ...team,
          days: team.days.map((day) => ({ ...day, allocations: [] })),
        })),
      } as TimelineGeometry,
    } satisfies TimelineUiProjection;
    coordinator.renderProjection(projectionWithoutAllocation);
    assert.equal(coordinator.getUiSnapshot().selected, undefined);
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
      input: element() as unknown as HTMLInputElement,
      apply: element() as unknown as HTMLButtonElement,
      cancel: element() as unknown as HTMLButtonElement,
      status: element() as unknown as HTMLElement,
    },
    applicationError: element() as unknown as HTMLElement,
  };
}
