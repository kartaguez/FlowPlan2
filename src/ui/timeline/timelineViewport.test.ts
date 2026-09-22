import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import { applyTimelineViewport } from "./applyTimelineViewport.js";
import {
  clampTimelineViewport,
  createFullTimelineViewport,
  panTimelineViewport,
  timelineXFromClientX,
  zoomTimelineViewport,
} from "./timelineViewport.js";

describe("TimelineViewport", () => {
  it("creates an immutable full-horizon initial viewport", () => {
    const viewport = createFullTimelineViewport(2160);

    assert.deepEqual(viewport, { x: 0, width: 2160 });
    assert.equal(Object.isFrozen(viewport), true);
  });

  it("zooms in around the center while preserving its anchor", () => {
    assert.deepEqual(
      zoomTimelineViewport({
        viewport: { x: 0, width: 1000 },
        geometryWidth: 1000,
        minWidth: 100,
        anchorX: 500,
        scale: 0.8,
      }),
      { x: 100, width: 800 },
    );
  });

  it("zooms out without exceeding the complete geometry", () => {
    assert.deepEqual(
      zoomTimelineViewport({
        viewport: { x: 100, width: 800 },
        geometryWidth: 1000,
        minWidth: 100,
        anchorX: 500,
        scale: 1.25,
      }),
      { x: 0, width: 1000 },
    );
  });

  it("clamps zoom anchors near both horizon edges", () => {
    assert.deepEqual(
      zoomTimelineViewport({
        viewport: { x: 0, width: 500 },
        geometryWidth: 1000,
        minWidth: 100,
        anchorX: 0,
        scale: 0.8,
      }),
      { x: 0, width: 400 },
    );
    assert.deepEqual(
      zoomTimelineViewport({
        viewport: { x: 500, width: 500 },
        geometryWidth: 1000,
        minWidth: 100,
        anchorX: 1000,
        scale: 0.8,
      }),
      { x: 600, width: 400 },
    );
  });

  it("never zooms below the configured minimum width", () => {
    assert.deepEqual(
      zoomTimelineViewport({
        viewport: { x: 450, width: 100 },
        geometryWidth: 1000,
        minWidth: 100,
        anchorX: 500,
        scale: 0.8,
      }),
      { x: 450, width: 100 },
    );
  });

  it("pans and clamps at both geometry boundaries", () => {
    assert.deepEqual(
      panTimelineViewport({
        viewport: { x: 200, width: 400 },
        geometryWidth: 1000,
        deltaX: 150,
      }),
      { x: 350, width: 400 },
    );
    assert.deepEqual(
      panTimelineViewport({
        viewport: { x: 200, width: 400 },
        geometryWidth: 1000,
        deltaX: -500,
      }),
      { x: 0, width: 400 },
    );
    assert.deepEqual(
      panTimelineViewport({
        viewport: { x: 200, width: 400 },
        geometryWidth: 1000,
        deltaX: 900,
      }),
      { x: 600, width: 400 },
    );
  });

  it("maps displayed pointer coordinates through the current viewport", () => {
    const input = {
      svgLeft: 100,
      svgWidth: 1200,
      viewport: { x: 600, width: 900 },
    };

    assert.equal(timelineXFromClientX({ ...input, clientX: 100 }), 600);
    assert.equal(timelineXFromClientX({ ...input, clientX: 700 }), 1050);
    assert.equal(timelineXFromClientX({ ...input, clientX: 1300 }), 1500);
  });

  it("clamps arbitrary viewport state to its invariants", () => {
    assert.deepEqual(
      clampTimelineViewport({
        viewport: { x: -20, width: 50 },
        geometryWidth: 1000,
        minWidth: 100,
      }),
      { x: 0, width: 100 },
    );
  });

  it("applies only the visible horizontal window to the SVG viewBox", () => {
    const attributes = new Map<string, string>();
    const svg = {
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
    } as SVGSVGElement;
    const geometry = { width: 2160, height: 356 } as TimelineGeometry;

    applyTimelineViewport({
      svg,
      geometry,
      viewport: { x: 600, width: 900 },
    });

    assert.equal(attributes.get("viewBox"), "600 0 900 356");
    assert.equal(geometry.width, 2160);
    assert.throws(
      () =>
        applyTimelineViewport({
          svg,
          geometry,
          viewport: { x: 2000, width: 900 },
        }),
      TypeError,
    );
  });
});
