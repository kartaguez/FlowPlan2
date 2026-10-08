import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import { civilDatesInclusive, createCivilDate, type CivilDate, type DomainResult } from "../../domain/index.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";

type Listener = (event: unknown) => void;
function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<Listener>>();
  readonly capturedPointerIds = new Set<number>();
  bounds = { left: 0, width: 1000 };

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
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

  dispatch(type: string, event: object = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
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
}

function pointer(
  pointerId: number,
  clientX: number,
  shiftKey: boolean,
): PointerEvent {
  return {
    pointerId,
    clientX,
    shiftKey,
    preventDefault() {},
  } as PointerEvent;
}

function fixture() {
  const svg = new FakeElement();
  const zoomIn = new FakeElement();
  const zoomOut = new FakeElement();
  const reset = new FakeElement();
  const dates = civilDatesInclusive(must(createCivilDate("2025-01-01")), must(createCivilDate("2025-02-19")));
  const geometry = {
    width: 1000,
    height: 200,
    dayWidth: 20,
    dates: dates.map((date, index) => ({ date, x: index * 20, width: 20 })),
  } as unknown as TimelineGeometry;
  let projectionDate: CivilDate = dates[24]!;
  const controller = createTimelineViewportController({
    svg: svg as unknown as SVGSVGElement,
    geometry,
    getProjectionDate: () => projectionDate,
    controls: {
      zoomIn: zoomIn as unknown as HTMLButtonElement,
      zoomOut: zoomOut as unknown as HTMLButtonElement,
      reset: reset as unknown as HTMLButtonElement,
    },
  });
  return { svg, zoomIn, zoomOut, reset, geometry, dates, controller,
    getProjectionDate: () => projectionDate,
    setProjectionDate: (date: CivilDate) => { projectionDate = date; } };
}

describe("createTimelineViewportController", () => {
  it("refreshes the shared cursor after zoom, pan, and reset", () => {
    const input = fixture();
    input.controller.destroy();
    let refreshes = 0;
    const controller = createTimelineViewportController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      getProjectionDate: input.getProjectionDate,
      controls: { zoomIn: input.zoomIn as unknown as HTMLButtonElement,
        zoomOut: input.zoomOut as unknown as HTMLButtonElement,
        reset: input.reset as unknown as HTMLButtonElement },
      onViewportChange: () => { refreshes += 1; },
    });
    assert.equal(refreshes, 1);
    input.zoomIn.dispatch("click");
    input.svg.dispatch("pointerdown", pointer(7, 500, true));
    input.svg.dispatch("pointermove", pointer(7, 250, true));
    input.svg.dispatch("pointerup", pointer(7, 250, true));
    input.zoomOut.dispatch("click");
    input.reset.dispatch("click");
    assert.equal(refreshes, 5);
    controller.destroy();
  });

  it("starts with the complete immutable geometry view", () => {
    const input = fixture();

    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
    assert.equal(Object.isFrozen(input.controller.getState()), true);
    assert.equal(input.svg.getAttribute("viewBox"), "0 0 1000 200");
  });

  it("restores and clamps an injected viewport state", () => {
    const input = fixture();
    input.controller.destroy();
    const restored = createTimelineViewportController({
      svg: input.svg as unknown as SVGSVGElement,
      geometry: input.geometry,
      getProjectionDate: input.getProjectionDate,
      controls: {
        zoomIn: input.zoomIn as unknown as HTMLButtonElement,
        zoomOut: input.zoomOut as unknown as HTMLButtonElement,
        reset: input.reset as unknown as HTMLButtonElement,
      },
      initialViewport: { x: 900, width: 800 },
    });

    assert.deepEqual(restored.getState(), { x: 200, width: 800 });
    assert.equal(input.svg.getAttribute("viewBox"), "200 0 800 200");
  });

  it("zooms in and out around the Projection date without changing it", () => {
    const input = fixture();

    input.zoomIn.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 98, width: 800 });
    assert.equal(input.svg.getAttribute("viewBox"), "98 0 800 200");
    input.zoomOut.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
    assert.equal(input.getProjectionDate(), input.dates[24]);
    input.zoomIn.dispatch("click");
    input.reset.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
  });

  it("preserves a non-centered visible Projection date through both zoom directions", () => {
    const input = fixture();
    input.setProjectionDate(input.dates[9]!);
    input.controller.setVisibleDateRange(input.dates[5]!, input.dates[34]!);
    const before = input.controller.getState();
    const anchorX = 190;
    const ratio = (anchorX - before.x) / before.width;
    input.zoomIn.dispatch("click");
    const zoomed = input.controller.getState();
    assert.ok(Math.abs((anchorX - zoomed.x) / zoomed.width - ratio) < 1e-10);
    input.zoomOut.dispatch("click");
    const restored = input.controller.getState();
    assert.ok(Math.abs((anchorX - restored.x) / restored.width - ratio) < 1e-10);
    assert.equal(input.getProjectionDate(), input.dates[9]);
  });

  it("anchors at the nearest viewport edge when the Projection date is outside", () => {
    const input = fixture();
    input.setProjectionDate(input.dates[0]!);
    input.controller.setVisibleDateRange(input.dates[20]!, input.dates[39]!);
    assert.deepEqual(input.controller.getState(), { x: 400, width: 400 });
    input.zoomIn.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 400, width: 320 });
    input.setProjectionDate(input.dates[49]!);
    input.zoomIn.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 464, width: 256 });
    assert.equal(input.getProjectionDate(), input.dates[49]);
  });

  it("expands short inclusive ranges to seven days and clamps at horizon edges", () => {
    const input = fixture();
    input.controller.setVisibleDateRange(input.dates[10]!, input.dates[12]!);
    assert.deepEqual(input.controller.getState(), { x: 160, width: 140 });
    input.controller.setVisibleDateRange(input.dates[1]!, input.dates[0]!);
    assert.deepEqual(input.controller.getState(), { x: 0, width: 140 });
    input.controller.setVisibleDateRange(input.dates[49]!, input.dates[48]!);
    assert.deepEqual(input.controller.getState(), { x: 860, width: 140 });
    input.controller.setVisibleDateRange(input.dates[8]!, input.dates[16]!);
    assert.deepEqual(input.controller.getState(), { x: 160, width: 180 });
  });

  it("stops zooming at seven visible days", () => {
    const input = fixture();

    for (let index = 0; index < 20; index += 1) {
      input.zoomIn.dispatch("click");
    }

    assert.equal(input.controller.getState().width, 140);
    assert.ok(Math.abs(input.controller.getState().x - 421.4) < 1e-9);
  });

  it("resets exactly after a long floating-point interaction sequence", () => {
    const input = fixture();
    for (let index = 0; index < 50; index += 1) {
      input.zoomIn.dispatch("click");
      input.zoomOut.dispatch("click");
    }
    input.zoomIn.dispatch("click");
    input.svg.dispatch("pointerdown", pointer(8, 500, true));
    input.svg.dispatch("pointermove", pointer(8, 173, false));
    input.svg.dispatch("pointerup", pointer(8, 173, false));

    input.reset.dispatch("click");

    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
    assert.equal(input.svg.getAttribute("viewBox"), "0 0 1000 200");
  });

  it("uses only Shift plus pointer drag for captured horizontal pan", () => {
    const input = fixture();
    input.zoomIn.dispatch("click");

    input.svg.dispatch("pointerdown", pointer(1, 500, false));
    input.svg.dispatch("pointermove", pointer(1, 250, false));
    assert.deepEqual(input.controller.getState(), { x: 98, width: 800 });
    assert.equal(input.svg.hasPointerCapture(1), false);

    input.svg.dispatch("pointerdown", pointer(2, 500, true));
    assert.equal(input.svg.hasPointerCapture(2), true);
    input.svg.dispatch("pointermove", pointer(2, 250, false));
    assert.deepEqual(input.controller.getState(), { x: 200, width: 800 });
    input.svg.dispatch("pointerup", pointer(2, 250, false));
    assert.equal(input.svg.hasPointerCapture(2), false);
  });

  it("releases pan capture on pointercancel", () => {
    const input = fixture();

    input.svg.dispatch("pointerdown", pointer(4, 500, true));
    assert.equal(input.svg.hasPointerCapture(4), true);
    input.svg.dispatch("pointercancel", pointer(4, 500, false));
    assert.equal(input.svg.hasPointerCapture(4), false);
    input.svg.dispatch("pointermove", pointer(4, 0, false));
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
  });

  it("releases active capture and every listener on destroy", () => {
    const input = fixture();
    input.svg.dispatch("pointerdown", pointer(3, 500, true));
    assert.equal(input.svg.hasPointerCapture(3), true);

    input.controller.destroy();
    input.zoomIn.dispatch("click");
    input.svg.dispatch("pointermove", pointer(3, 0, false));

    assert.equal(input.svg.hasPointerCapture(3), false);
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
    assert.ok([...input.svg.listeners.values()].every((set) => set.size === 0));
    for (const button of [input.zoomIn, input.zoomOut, input.reset]) {
      assert.ok([...button.listeners.values()].every((set) => set.size === 0));
    }
  });

  it("has no planning, persistence, selection, or JavaScript Date dependency", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/ui/timeline/createTimelineViewportController.ts",
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /planPortfolio|recomputePlanning|buildTimelineViewModel|buildTimelineGeometry/,
    );
    assert.doesNotMatch(
      source,
      /new Date|Date\.parse|Date\.now|localStorage|indexedDB|selectedProject|tooltip/,
    );
  });
});

it("suspends pan and zoom idempotently without resetting viewport or duplicating listeners", () => {
  const app = fixture(); app.zoomIn.dispatch("click");
  const before = app.controller.getState();
  app.svg.dispatch("pointerdown", pointer(11, 500, true));
  app.controller.suspend(); app.controller.suspend();
  assert.equal(app.svg.capturedPointerIds.size, 0);
  for (let n = 0; n < 8; n++) {
    app.zoomIn.dispatch("click"); assert.strictEqual(app.controller.getState(), before);
    app.controller.resume(); app.controller.resume();
    assert.equal(app.zoomIn.listeners.get("click")!.size, 1);
    app.controller.suspend();
  }
  app.controller.resume(); assert.strictEqual(app.controller.getState(), before);
  app.controller.destroy(); app.controller.resume();
  assert.equal(app.zoomIn.listeners.get("click")!.size, 0);
});

it("reports viewport causes and effective clamped widths without changing the legacy anchor", () => {
  const app = fixture(); app.controller.destroy(); const changes: { cause: string; previous: { x: number; width: number }; next: { x: number; width: number } }[] = [];
  const controller = createTimelineViewportController({ svg: app.svg as any, geometry: app.geometry,
    getProjectionDate: app.getProjectionDate, controls: { zoomIn: app.zoomIn as any, zoomOut: app.zoomOut as any, reset: app.reset as any }, onViewportChange: (change) => changes.push(change) });
  assert.equal(changes[0]!.cause, "initial");
  app.zoomIn.dispatch("click"); assert.equal(changes[1]!.cause, "zoom-button");
  assert.equal(changes[1]!.previous.width, 1000); assert.equal(changes[1]!.next.width, 800);
  controller.setVisibleDateRange(app.dates[0]!, app.dates[0]!);
  assert.equal(changes.at(-1)!.cause, "range-zoom"); assert.equal(changes.at(-1)!.next.width, 140);
  app.zoomIn.dispatch("click"); assert.equal(changes.at(-1)!.previous.width, changes.at(-1)!.next.width);
  app.reset.dispatch("click"); assert.equal(changes.at(-1)!.cause, "reset"); controller.destroy();
});
