import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEOMETRY_EPSILON,
  type TimelineGeometry,
} from "../../adapters/index.js";
import { applyTimelineViewport } from "./applyTimelineViewport.js";
import {
  clampTimelineViewport,
  createFullTimelineViewport,
  panTimelineViewport,
  timelinePointFromClientPoint,
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
    assert.deepEqual(
      timelinePointFromClientPoint({
        ...input,
        clientX: 700,
        clientY: 250,
        svgTop: 50,
        svgHeight: 400,
        geometryHeight: 200,
      }),
      { x: 1050, y: 100 },
    );
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
    assert.deepEqual(
      clampTimelineViewport({
        viewport: { x: 1e-12, width: 500 },
        geometryWidth: 1000,
        minWidth: 100,
      }),
      { x: 0, width: 500 },
    );
  });

  it("remains finite and bounded through long zoom and pan sequences", () => {
    const geometryWidth = 2160;
    const minWidth = 140;
    let viewport = createFullTimelineViewport(geometryWidth);

    for (let index = 0; index < 100; index += 1) {
      viewport = zoomTimelineViewport({
        viewport,
        geometryWidth,
        minWidth,
        anchorX: viewport.x + viewport.width / 2,
        scale: index % 2 === 0 ? 0.8 : 1.25,
      });
      viewport = panTimelineViewport({
        viewport,
        geometryWidth,
        deltaX: index % 3 === 0 ? 17.3 : -9.7,
      });
      assert.equal(Number.isFinite(viewport.x), true);
      assert.equal(Number.isFinite(viewport.width), true);
      assert.ok(viewport.x >= -GEOMETRY_EPSILON);
      assert.ok(
        viewport.x + viewport.width <= geometryWidth + GEOMETRY_EPSILON,
      );
      assert.ok(viewport.width >= minWidth - GEOMETRY_EPSILON);
    }
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

  it("accepts ulp-scale viewBox overflow but rejects a real overflow", () => {
    const attributes = new Map<string, string>();
    const svg = {
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
    } as SVGSVGElement;
    const geometry = { width: 1000, height: 200 } as TimelineGeometry;

    applyTimelineViewport({
      svg,
      geometry,
      viewport: { x: 100, width: 900.0000000000001 },
    });
    assert.ok(attributes.get("viewBox")?.startsWith("99.99999999999989 0"));
    assert.throws(
      () =>
        applyTimelineViewport({
          svg,
          geometry,
          viewport: { x: 100, width: 900.0001 },
        }),
      TypeError,
    );
  });

  it("moves the temporal projection while inversely compensating year/month glyph scaling", () => {
    const attributes = new Map<string, string>();
    const yearAttributes = new Map<string, string>([
      ["data-timeline-label-x", "500"],
      ["data-timeline-label-y", "10"],
      ["data-screen-space-typography", "true"],
    ]);
    const monthAttributes = new Map<string, string>([
      ["data-timeline-label-x", "250"],
      ["data-timeline-label-y", "30"],
      ["data-screen-space-typography", "true"],
    ]);
    const labels = [yearAttributes, monthAttributes].map((values) => ({
      getAttribute(name: string) {
        return values.get(name) ?? null;
      },
      setAttribute(name: string, value: string) {
        values.set(name, value);
      },
    }));
    const svg = {
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
      getBoundingClientRect() {
        return { width: 1000, height: 200 };
      },
      querySelectorAll(selector: string) {
        assert.equal(selector, "[data-screen-space-typography='true']");
        return labels;
      },
    } as unknown as SVGSVGElement;
    const geometry = { width: 1000, height: 200 } as TimelineGeometry;

    applyTimelineViewport({ svg, geometry, viewport: { x: 0, width: 1000 } });
    assert.equal(yearAttributes.get("transform"), "translate(500 10) scale(1 1) translate(-500 -10)");

    applyTimelineViewport({ svg, geometry, viewport: { x: 250, width: 500 } });
    assert.equal(attributes.get("viewBox"), "250 0 500 200");
    assert.equal(yearAttributes.get("transform"), "translate(500 10) scale(0.5 1) translate(-500 -10)");
    assert.equal(monthAttributes.get("transform"), "translate(250 30) scale(0.5 1) translate(-250 -30)");
    assert.equal(yearAttributes.get("data-timeline-label-x"), "500");
  });

  it("derives typography compensation from each horizon projection without a magic zoom factor", () => {
    const label = new Map<string, string>([
      ["data-timeline-label-x", "1000"],
      ["data-timeline-label-y", "10"],
    ]);
    const svg = {
      setAttribute() {},
      getBoundingClientRect() {
        return { width: 1000, height: 200 };
      },
      querySelectorAll() {
        return [{
          getAttribute: (name: string) => label.get(name) ?? null,
          setAttribute: (name: string, value: string) => label.set(name, value),
        }];
      },
    } as unknown as SVGSVGElement;

    applyTimelineViewport({
      svg,
      geometry: { width: 2000, height: 200 } as TimelineGeometry,
      viewport: { x: 0, width: 2000 },
    });
    assert.equal(label.get("transform"), "translate(1000 10) scale(2 1) translate(-1000 -10)");
  });
});
