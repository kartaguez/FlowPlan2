import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  rationalFromInteger,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import { createTimelineInteractionController } from "./createTimelineInteractionController.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

type Listener = (event: unknown) => void;

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<Listener>>();
  readonly style = { left: "", top: "" };
  childNodes: FakeElement[] = [];
  className = "";
  hidden = false;
  textContent: string | null = null;
  bounds = { left: 0, top: 0, width: 300, height: 156 };

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.childNodes = [...nodes];
  }

  querySelector(selector: string): FakeElement | null {
    const className = selector.startsWith(".") ? selector.slice(1) : selector;
    for (const child of this.childNodes) {
      if (child.getAttribute("class")?.split(/\s+/).includes(className)) {
        return child;
      }
      const nested = child.querySelector(selector);
      if (nested !== null) return nested;
    }
    return null;
  }

  getBoundingClientRect(): DOMRect {
    return this.bounds as DOMRect;
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  dispatch(type: string, event: object): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function pointer(
  pointerId: number,
  clientX: number,
  clientY: number,
  shiftKey = false,
): PointerEvent {
  return { pointerId, clientX, clientY, shiftKey } as PointerEvent;
}

function fixture() {
  const document = new FakeDocument();
  const svg = new FakeElement(document, "svg");
  const tooltip = new FakeElement(document, "div");
  const summary = new FakeElement(document, "section");
  const keyboard = new FakeElement(document, "button");
  const teamId = must(createTeamId("team-alpha"));
  const projectId = must(createProjectId("project-atlas"));
  const date = must(createCivilDate("2025-01-01"));
  const geometry = {
    width: 300,
    height: 156,
    teams: [
      {
        teamId,
        x: 0,
        y: 56,
        width: 300,
        height: 100,
        markers: [
          {
            projectId,
            teamId,
            date,
            kind: "mandatory-deadline",
            x: 50,
            y1: 56,
            y2: 156,
          },
        ],
        days: [
          {
            allocations: [
              {
                projectId,
                teamId,
                date,
                x: 0,
                y: 106,
                width: 100,
                height: 50,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as TimelineGeometry;
  const viewModel = {
    projects: [{ id: projectId, label: "Project Atlas", priorityIndex: 0 }],
    teams: [
      {
        id: teamId,
        label: "Team Alpha",
        allocations: [
          {
            projectId,
            teamId,
            date,
            workload: must(createCapacity("1.5")),
          },
        ],
        projectStates: [
          { projectId, teamId, deadlineStatus: "FEASIBLE", initialWorkload: must(createCapacity("4")) },
        ],
      },
    ],
  } as unknown as TimelineViewModel;
  const controller = createTimelineInteractionController({
    svg: svg as unknown as SVGSVGElement,
    geometry,
    viewModel,
    getViewport: () => ({ x: 0, width: 300 }),
    tooltipContainer: tooltip as unknown as HTMLElement,
  });
  return {
    svg,
    tooltip,
    summary,
    keyboard,
    controller,
    geometry,
    viewModel,
    projectId,
    teamId,
    date,
  };
}

describe("createTimelineInteractionController", () => {
  it("opens an Actual tooltip on hover without adding click selection", () => {
    const input = fixture();
    input.controller.destroy();
    const team = input.geometry.teams[0]!;
    const day = team.days[0]!;
    const geometry = { ...input.geometry, teams: [{ ...team, markers: [], days: [{ ...day,
      actualSegments: [{ sourceKind: "project" as const, sourceId: input.projectId,
        teamId: input.teamId, date: input.date, capacity: must(createCapacity("10")),
        x: 0, y: 75, width: 100, height: 30 }],
    }] }] } as TimelineGeometry;
    const controller = createTimelineInteractionController({
      svg: input.svg as unknown as SVGSVGElement, geometry, viewModel: input.viewModel,
      getViewport: () => ({ x: 0, width: 300 }),
      tooltipContainer: input.tooltip as unknown as HTMLElement,
    });
    input.svg.dispatch("pointermove", pointer(1, 25, 90));
    assert.equal(controller.getState().hovered?.kind, "actual");
    assert.equal(input.tooltip.hidden, false);
    assert.match(input.tooltip.textContent ?? "", /Project Atlas[\s\S]*Consumed: 10 MD/);
    input.svg.dispatch("pointerup", pointer(1, 25, 90));
    assert.equal(controller.getState().hovered?.kind, "actual");
    assert.equal(input.svg.listeners.has("pointerup"), false);
    controller.destroy();
  });
  it("hides tooltips only during a range drag and restores the current hit", () => {
    const input = fixture();
    input.controller.destroy();
    let dragging = false;
    const controller = createTimelineInteractionController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry, viewModel: input.viewModel,
      getViewport: () => ({ x: 0, width: 300 }),
      tooltipContainer: input.tooltip as unknown as HTMLElement,
      isRangeDragging: () => dragging,
    });
    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.equal(input.tooltip.hidden, false);
    dragging = true;
    controller.refreshTooltip();
    assert.equal(input.tooltip.hidden, true);
    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.equal(input.tooltip.hidden, true);
    dragging = false;
    controller.refreshTooltip();
    assert.equal(input.tooltip.hidden, false);
    assert.equal(controller.getState().hovered?.kind, "allocation");
    controller.destroy();
  });
  it("refreshes a visible Project tooltip when exact cursor progress changes", () => {
    const input = fixture();
    input.controller.destroy();
    let progress = rationalFromInteger(0n);
    const controller = createTimelineInteractionController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: {
        width: 300, height: 156,
        teams: [{ teamId: input.teamId, x: 0, y: 56, width: 300, height: 100,
          markers: [], days: [{ allocations: [{ projectId: input.projectId, teamId: input.teamId,
            date: input.date, x: 0, y: 106, width: 100, height: 50 }] }] }],
      } as unknown as TimelineGeometry,
      viewModel: { projects: [{ id: input.projectId, label: "Project Atlas", priorityIndex: 0,
        estimatedWithinHorizon: true }], teams: [{ id: input.teamId, label: "Team Alpha", allocations: [],
        projectStates: [{ projectId: input.projectId, teamId: input.teamId,
          initialWorkload: must(createCapacity("4")) }] }] } as unknown as TimelineViewModel,
      getViewport: () => ({ x: 0, width: 300 }),
      tooltipContainer: input.tooltip as unknown as HTMLElement,
      getProjectProgress: () => progress,
    });
    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.match(input.tooltip.textContent ?? "", /Progress: 0%/);
    progress = rationalFromInteger(1n);
    controller.refreshTooltip();
    assert.match(input.tooltip.textContent ?? "", /Progress: 100%/);
    controller.destroy();
  });
  it("never creates selection or changes editing context on pointer click", () => {
    const input = fixture();
    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.equal(input.controller.getState().hovered?.kind, "allocation");
    input.svg.dispatch("pointerup", pointer(1, 25, 130));
    assert.equal(input.controller.getState().hovered?.kind, "allocation");
    assert.equal(input.svg.listeners.has("pointerup"), false);
    input.controller.destroy();
  });
});
