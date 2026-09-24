import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
  const selectionLayer = new FakeElement(document, "g");
  selectionLayer.setAttribute("class", "timeline-selection-layer");
  svg.append(selectionLayer);
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
    selectionSummaryContainer: summary as unknown as HTMLElement,
    keyboardControl: keyboard as unknown as HTMLElement,
  });
  return {
    svg,
    selectionLayer,
    tooltip,
    summary,
    keyboard,
    controller,
    projectId,
    teamId,
    date,
  };
}

describe("createTimelineInteractionController", () => {
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
      selectionSummaryContainer: input.summary as unknown as HTMLElement,
      keyboardControl: input.keyboard as unknown as HTMLElement,
      getProjectProgress: () => progress,
    });
    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.match(input.tooltip.textContent ?? "", /Progress: 0%/);
    progress = rationalFromInteger(1n);
    controller.refreshTooltip();
    assert.match(input.tooltip.textContent ?? "", /Progress: 100%/);
    controller.destroy();
  });
  it("restores a compatible initial selection and reports selection changes", () => {
    const input = fixture();
    input.controller.destroy();
    const changes: Array<string | undefined> = [];
    const restored = createTimelineInteractionController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: {
        width: 300,
        height: 156,
        teams: [
          {
            teamId: input.teamId,
            x: 0,
            y: 56,
            width: 300,
            height: 100,
            markers: [],
            days: [],
          },
        ],
      } as unknown as TimelineGeometry,
      viewModel: {
        projects: [],
        teams: [{ id: input.teamId, label: "Team Alpha" }],
      } as unknown as TimelineViewModel,
      getViewport: () => ({ x: 0, width: 300 }),
      tooltipContainer: input.tooltip as unknown as HTMLElement,
      selectionSummaryContainer: input.summary as unknown as HTMLElement,
      keyboardControl: input.keyboard as unknown as HTMLElement,
      initialSelected: { kind: "team", teamId: input.teamId },
      onSelectionChange: (selected) => changes.push(selected?.kind),
    });

    assert.equal(restored.getState().selected?.kind, "team");
    assert.deepEqual(changes, ["team"]);
  });

  it("keeps hover separate and shows business tooltips only for allocations", () => {
    const input = fixture();

    input.svg.dispatch("pointermove", pointer(1, 25, 130));
    assert.equal(input.controller.getState().hovered?.kind, "allocation");
    assert.match(input.tooltip.textContent ?? "", /Charge: 4 MD/);
    input.svg.dispatch("pointermove", pointer(1, 52, 130));
    assert.equal(input.controller.getState().hovered?.kind, "project-marker");
    assert.equal(input.tooltip.hidden, true);
    input.svg.dispatch("pointerleave", pointer(1, 52, 130));
    assert.equal(input.controller.getState().hovered, undefined);
    assert.equal(input.tooltip.hidden, true);
  });

  it("selects allocation, marker, and team hits and clears on the time axis", () => {
    const input = fixture();

    for (const [x, y, kind] of [
      [25, 130, "allocation"],
      [50, 80, "project-marker"],
      [250, 80, "team"],
    ] as const) {
      input.svg.dispatch("pointerdown", pointer(2, x, y));
      input.svg.dispatch("pointerup", pointer(2, x, y));
      assert.equal(input.controller.getState().selected?.kind, kind);
      assert.equal(input.selectionLayer.childNodes.length, 1);
    }
    input.svg.dispatch("pointerdown", pointer(2, 100, 20));
    input.svg.dispatch("pointerup", pointer(2, 100, 20));
    assert.equal(input.controller.getState().selected, undefined);
    assert.equal(input.selectionLayer.childNodes.length, 0);
    assert.equal(input.summary.childNodes[0]?.textContent, "No timeline selection.");
  });

  it("does not select after cursor drag or a Shift pan gesture", () => {
    const input = fixture();
    input.svg.dispatch("pointerdown", pointer(3, 250, 80));
    input.svg.dispatch("pointerup", pointer(3, 250, 80));
    assert.equal(input.controller.getState().selected?.kind, "team");

    input.svg.dispatch("pointerdown", pointer(4, 25, 130));
    input.svg.dispatch("pointermove", pointer(4, 40, 130));
    input.svg.dispatch("pointerup", pointer(4, 40, 130));
    assert.equal(input.controller.getState().selected?.kind, "team");

    input.svg.dispatch("pointerdown", pointer(5, 25, 130, true));
    input.svg.dispatch("pointermove", pointer(5, 100, 130, false));
    input.svg.dispatch("pointerup", pointer(5, 100, 130, false));
    assert.equal(input.controller.getState().selected?.kind, "team");
  });

  it("clears selection with Escape and removes listeners on destroy", () => {
    const input = fixture();
    input.svg.dispatch("pointerdown", pointer(6, 25, 130));
    input.svg.dispatch("pointerup", pointer(6, 25, 130));
    let prevented = false;
    input.keyboard.dispatch("keydown", {
      key: "Escape",
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    assert.equal(input.controller.getState().selected, undefined);

    input.controller.destroy();
    assert.ok([...input.svg.listeners.values()].every((set) => set.size === 0));
    assert.ok([...input.keyboard.listeners.values()].every((set) => set.size === 0));
  });

  it("has no planning, persistence, editing, or JavaScript Date dependency", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/ui/timeline/createTimelineInteractionController.ts",
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /planPortfolio|recomputePlanning|buildTimelineViewModel|buildTimelineGeometry/,
    );
    assert.doesNotMatch(
      source,
      /new Date|Date\.parse|Date\.now|localStorage|indexedDB|drag allocation|resize/,
    );
  });
});
