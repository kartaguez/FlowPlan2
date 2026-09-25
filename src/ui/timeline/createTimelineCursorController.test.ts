import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  type DomainResult,
} from "../../domain/index.js";
import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import {
  createTimelineCursorController,
  timelineXFromClientX,
} from "./createTimelineCursorController.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

type Listener = (event: unknown) => void;

class FakeDocument {
  readonly listeners = new Map<string, Set<Listener>>();
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
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName, "http://www.w3.org/1999/xhtml");
  }

  createElementNS(namespaceURI: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName, namespaceURI);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<Listener>>();
  readonly capturedPointerIds = new Set<number>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;
  bounds = { left: 100, width: 300 };

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
    readonly namespaceURI: string,
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
    const className = selector.startsWith(".") ? selector.slice(1) : undefined;
    for (const child of this.childNodes) {
      if (
        className !== undefined &&
        child.getAttribute("class")?.split(/\s+/).includes(className)
      ) {
        return child;
      }
      const nested = child.querySelector(selector);
      if (nested !== null) return nested;
    }
    return null;
  }

  getBoundingClientRect(): DOMRect {
    return {
      left: this.bounds.left,
      width: this.bounds.width,
    } as DOMRect;
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointerIds.add(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.capturedPointerIds.has(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.capturedPointerIds.delete(pointerId);
  }

  dispatch(type: string, event: object): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function fixture(): {
  svg: FakeElement;
  summary: FakeElement;
  cursorControl: FakeElement;
  geometry: TimelineGeometry;
  viewModel: TimelineViewModel;
} {
  const document = new FakeDocument();
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  const layer = document.createElementNS(SVG_NAMESPACE, "g");
  layer.setAttribute("class", "timeline-cursor-layer");
  svg.append(layer);
  const summary = document.createElement("section");
  const cursorControl = document.createElement("button");
  const dates = ["2025-01-01", "2025-01-02", "2025-01-03"].map((value) =>
    must(createCivilDate(value)),
  );
  const geometry: TimelineGeometry = {
    width: 300,
    height: 256,
    dayWidth: 100,
    teamHeaderHeight: 0,
    dates: dates.map((date, index) => ({ date, x: index * 100, width: 100 })),
    timeAxis: {
      x: 0,
      y: 0,
      width: 300,
      height: 56,
      years: [],
      months: [],
    },
    maxEffectiveCapacity: must(createCapacity("0")),
    pixelsPerCapacityUnit: 0,
    teams: [],
  };
  const viewModel: TimelineViewModel = {
    horizon: { start: dates[0]!, end: dates[2]! },
    projects: [],
    teams: [],
    diagnostics: [],
  };
  return { svg, summary, cursorControl, geometry, viewModel };
}

function pointer(
  pointerId: number,
  clientX: number,
  shiftKey = false,
): PointerEvent {
  return { pointerId, clientX, shiftKey } as PointerEvent;
}

function keyboard(key: string, options: { ctrlKey?: boolean; target?: unknown } = {}): KeyboardEvent & { prevented: boolean } {
  const event = {
    key,
    ctrlKey: options.ctrlKey ?? false,
    target: options.target,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
  return event as KeyboardEvent & { prevented: boolean };
}

describe("createTimelineCursorController", () => {
  it("keeps the Team collection segment aligned through date and viewport changes without adding a label", () => {
    const input = fixture();
    const styles = new Map<string, string>();
    const row = { style: { setProperty: (name: string, value: string) => styles.set(name, value) },
      textContent: "Create Team" } as unknown as HTMLElement;
    let viewport = { x: 0, width: 300 };
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      teamCollectionRow: row,
      initialDate: must(createCivilDate("2025-01-02")),
      getViewport: () => viewport,
      isModalOpen: () => false,
    });
    assert.equal(styles.get("--fp-collection-cursor-x"), "50%");
    input.svg.dispatch("keydown", keyboard("ArrowRight"));
    assert.equal(styles.get("--fp-collection-cursor-x"), `${250 / 300 * 100}%`);
    viewport = { x: 200, width: 100 };
    controller.refresh();
    assert.equal(styles.get("--fp-collection-cursor-x"), "50%");
    assert.equal(row.textContent, "Create Team");
    controller.destroy();
  });
  it("starts at the supplied horizon start and renders the projection date", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    assert.equal(controller.getState().selectedDate, "2025-01-01");
    assert.equal(input.svg.querySelector(".timeline-cursor")?.getAttribute("data-selected-date"), "2025-01-01");
    assert.equal(input.svg.querySelector(".timeline-cursor-date-label")?.textContent, "01/01/2025");
    assert.equal(input.svg.getAttribute("aria-valuetext"), null);
    assert.equal(input.cursorControl.textContent, "Projection date: 2025-01-01");
    assert.equal(
      input.cursorControl.getAttribute("aria-label"),
      "Projection date 2025-01-01",
    );
  });

  it("updates on pointerdown and pointermove only during an active drag", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    input.svg.dispatch("pointermove", pointer(1, 250));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
    input.svg.dispatch("pointerdown", pointer(9, 350, true));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
    assert.equal(input.svg.hasPointerCapture(9), false);
    input.svg.dispatch("pointerdown", pointer(1, 250));
    assert.equal(input.svg.hasPointerCapture(1), true);
    assert.equal(controller.getState().selectedDate, "2025-01-02");
    input.svg.dispatch("pointermove", pointer(1, 350));
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    input.svg.dispatch("pointerup", pointer(1, 350));
    assert.equal(input.svg.hasPointerCapture(1), false);
    input.svg.dispatch("pointermove", pointer(1, 150));
    assert.equal(controller.getState().selectedDate, "2025-01-03");
  });

  it("uses the same x-to-date conversion for axis rows, Team bands, and segments", () => {
    const input = fixture();
    const selected: string[] = [];
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
      onSelectedDateChange: (date) => selected.push(date),
    });
    for (const [index, surface] of ["projection-band", "year-cell", "month-cell",
      "team-projection-band", "project-allocation", "reservation-segment"].entries()) {
      const event = { ...pointer(index + 1, 100 + index * 60),
        target: { className: `timeline-${surface}` }, clientY: index * 50 };
      input.svg.dispatch("pointerdown", event);
      input.svg.dispatch("pointerup", event);
    }
    assert.deepEqual(selected, ["2025-01-02", "2025-01-03"]);
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    input.svg.dispatch("pointerdown", pointer(20, -100));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
    input.svg.dispatch("pointerup", pointer(20, -100));
    input.svg.dispatch("pointerdown", pointer(21, 1000));
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    controller.destroy();
  });

  it("supports arrows, Home, and End without wrapping", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    const leftAtStart = keyboard("ArrowLeft");
    input.svg.dispatch("keydown", keyboard("Home"));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
    input.cursorControl.dispatch("keydown", leftAtStart);
    assert.equal(controller.getState().selectedDate, "2025-01-01");
    assert.equal(leftAtStart.prevented, true);
    input.svg.dispatch("keydown", keyboard("ArrowRight"));
    assert.equal(controller.getState().selectedDate, "2025-01-02");
    input.cursorControl.dispatch("keydown", keyboard("End"));
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    assert.equal(input.svg.querySelector(".timeline-cursor")?.getAttribute("data-selected-date"), "2025-01-03");
    assert.equal(input.svg.querySelector(".timeline-cursor-date-label")?.getAttribute("data-selected-date"), "2025-01-03");
    input.cursorControl.dispatch("keydown", keyboard("ArrowRight"));
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    input.cursorControl.dispatch("keydown", keyboard("Home"));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
  });

  it("moves globally with Ctrl+arrows, including when the control has focus, without duplicate callbacks", () => {
    const input = fixture();
    const notified: string[] = [];
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
      onSelectedDateChange: (date) => notified.push(date),
    });
    const document = input.cursorControl.ownerDocument;
    document.dispatch("keydown", keyboard("ArrowRight", { ctrlKey: true, target: input.svg }));
    assert.equal(controller.getState().selectedDate, "2025-01-02");
    const focused = keyboard("ArrowRight", { ctrlKey: true, target: input.cursorControl });
    input.cursorControl.dispatch("keydown", focused);
    document.dispatch("keydown", focused);
    assert.equal(controller.getState().selectedDate, "2025-01-03");
    assert.deepEqual(notified, ["2025-01-02", "2025-01-03"]);
    document.dispatch("keydown", keyboard("ArrowRight", { ctrlKey: true, target: input.svg }));
    assert.deepEqual(notified, ["2025-01-02", "2025-01-03"]);
    const left = keyboard("ArrowLeft", { ctrlKey: true, target: input.svg });
    document.dispatch("keydown", left);
    assert.equal(left.prevented, true);
    assert.equal(controller.getState().selectedDate, "2025-01-02");
    controller.destroy();
    assert.equal(document.listeners.get("keydown")?.size, 0);
  });

  it("ignores global shortcuts during editing or a modal", () => {
    const input = fixture();
    let modalOpen = false;
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => modalOpen,
    });
    const document = input.cursorControl.ownerDocument;
    for (const tag of ["input", "select", "textarea"]) {
      const event = keyboard("ArrowRight", { ctrlKey: true, target: document.createElement(tag) });
      document.dispatch("keydown", event);
      assert.equal(event.prevented, false);
    }
    const editable = document.createElement("div") as FakeElement & { isContentEditable: boolean };
    editable.isContentEditable = true;
    document.dispatch("keydown", keyboard("ArrowRight", { ctrlKey: true, target: editable }));
    modalOpen = true;
    document.dispatch("keydown", keyboard("ArrowRight", { ctrlKey: true, target: input.svg }));
    assert.equal(controller.getState().selectedDate, "2025-01-01");
  });

  it("notifies once per effective date change and never for the same day", () => {
    const input = fixture();
    const notified: string[] = [];
    createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
      onSelectedDateChange: (date) => notified.push(date),
    });
    assert.deepEqual(notified, []);
    input.cursorControl.dispatch("keydown", keyboard("Home"));
    input.svg.dispatch("pointerdown", pointer(1, 150));
    assert.deepEqual(notified, []);
    input.svg.dispatch("pointermove", pointer(1, 250));
    assert.deepEqual(notified, ["2025-01-02"]);
    input.svg.dispatch("pointermove", pointer(1, 250));
    input.cursorControl.dispatch("keydown", keyboard("ArrowLeft"));
    assert.deepEqual(notified, ["2025-01-02", "2025-01-01"]);
  });

  it("maps client coordinates through the current rendered SVG bounds", () => {
    assert.equal(
      timelineXFromClientX({
        clientX: 50,
        svgLeft: -200,
        svgWidth: 300,
        viewport: { x: 0, width: 300 },
      }),
      250,
    );
    assert.equal(
      timelineXFromClientX({
        clientX: 700,
        svgLeft: 100,
        svgWidth: 1200,
        viewport: { x: 600, width: 900 },
      }),
      1050,
    );
  });

  it("uses the current viewport for pointer date selection", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 100, width: 200 }),
      isModalOpen: () => false,
    });

    input.svg.dispatch("pointerdown", pointer(5, 100));

    assert.equal(controller.getState().selectedDate, "2025-01-02");
  });

  it("releases capture and ends dragging on pointercancel", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    input.svg.dispatch("pointerdown", pointer(7, 250));
    assert.equal(input.svg.hasPointerCapture(7), true);
    input.svg.dispatch("pointercancel", pointer(7, 250));
    assert.equal(input.svg.hasPointerCapture(7), false);
    input.svg.dispatch("pointermove", pointer(7, 350));
    assert.equal(controller.getState().selectedDate, "2025-01-02");
  });

  it("falls back safely when pointer capture APIs are unavailable", () => {
    const input = fixture();
    const svgWithoutCapture = input.svg as FakeElement & {
      setPointerCapture?: undefined;
      hasPointerCapture?: undefined;
      releasePointerCapture?: undefined;
    };
    Object.defineProperties(svgWithoutCapture, {
      setPointerCapture: { value: undefined },
      hasPointerCapture: { value: undefined },
      releasePointerCapture: { value: undefined },
    });
    const controller = createTimelineCursorController({
      svg: svgWithoutCapture as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    input.svg.dispatch("pointerdown", pointer(4, 250));
    input.svg.dispatch("pointerup", pointer(4, 250));
    input.svg.dispatch("pointermove", pointer(4, 350));

    assert.equal(controller.getState().selectedDate, "2025-01-02");
  });

  it("removes every listener and active capture on destroy", () => {
    const input = fixture();
    const controller = createTimelineCursorController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      cursorControl: input.cursorControl as unknown as HTMLButtonElement,
      initialDate: input.viewModel.horizon.start,
      getViewport: () => ({ x: 0, width: 300 }),
      isModalOpen: () => false,
    });

    input.svg.dispatch("pointerdown", pointer(1, 150));
    assert.equal(input.svg.hasPointerCapture(1), true);
    controller.destroy();
    input.svg.dispatch("pointerdown", pointer(2, 350));
    input.cursorControl.dispatch("keydown", keyboard("End"));

    assert.equal(controller.getState().selectedDate, "2025-01-01");
    assert.ok([...input.svg.listeners.values()].every((set) => set.size === 0));
    assert.ok(
      [...input.cursorControl.listeners.values()].every((set) => set.size === 0),
    );
    assert.equal(input.svg.capturedPointerIds.size, 0);
  });

  it("has no planning, persistence, or JavaScript Date dependency", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/ui/timeline/createTimelineCursorController.ts",
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /planPortfolio|recomputePlanning|buildTimelineViewModel|buildTimelineGeometry/,
    );
    assert.doesNotMatch(
      source,
      /new Date|Date\.parse|Date\.now|localStorage|indexedDB/,
    );
  });
});
