import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import { createTimelineViewportController } from "./createTimelineViewportController.js";

type Listener = (event: unknown) => void;

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
  const geometry = {
    width: 1000,
    height: 200,
    dayWidth: 20,
  } as TimelineGeometry;
  const controller = createTimelineViewportController({
    svg: svg as unknown as SVGSVGElement,
    geometry,
    controls: {
      zoomIn: zoomIn as unknown as HTMLButtonElement,
      zoomOut: zoomOut as unknown as HTMLButtonElement,
      reset: reset as unknown as HTMLButtonElement,
    },
  });
  return { svg, zoomIn, zoomOut, reset, geometry, controller };
}

describe("createTimelineViewportController", () => {
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

  it("zooms in, zooms out, and resets around the viewport center", () => {
    const input = fixture();

    input.zoomIn.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 100, width: 800 });
    assert.equal(input.svg.getAttribute("viewBox"), "100 0 800 200");
    input.zoomOut.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
    input.zoomIn.dispatch("click");
    input.reset.dispatch("click");
    assert.deepEqual(input.controller.getState(), { x: 0, width: 1000 });
  });

  it("stops zooming at seven visible days", () => {
    const input = fixture();

    for (let index = 0; index < 20; index += 1) {
      input.zoomIn.dispatch("click");
    }

    assert.equal(input.controller.getState().width, 140);
    assert.ok(Math.abs(input.controller.getState().x - 430) < 1e-9);
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
    assert.deepEqual(input.controller.getState(), { x: 100, width: 800 });
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
