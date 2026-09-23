import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import {
  createCivilDate,
  createProjectId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import { renderTimelineSelection } from "./renderTimelineSelection.js";
import { applyTimelineViewport } from "./applyTimelineViewport.js";
import {
  buildTimelineSelectionGeometry,
  reconcileTimelineHit,
} from "./timelineSelectionGeometry.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeDocument {
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  childNodes: FakeElement[] = [];

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

  replaceChildren(...nodes: FakeElement[]): void {
    this.childNodes = [...nodes];
  }

  querySelector(selector: string): FakeElement | null {
    return selector === ".timeline-selection-layer" ? this.childNodes[0] ?? null : null;
  }
}

const teamId = must(createTeamId("team-alpha"));
const projectId = must(createProjectId("project-atlas"));
const date = must(createCivilDate("2025-01-01"));

function geometry(): TimelineGeometry {
  return {
    width: 300,
    height: 150,
    teams: [
      {
        teamId,
        x: 0,
        y: 50,
        width: 300,
        height: 100,
        markers: [
          {
            projectId,
            teamId,
            date,
            kind: "mandatory-deadline",
            x: 120,
            y1: 50,
            y2: 150,
          },
        ],
        days: [
          {
            allocations: [
              {
                projectId,
                teamId,
                date,
                x: 10,
                y: 100,
                width: 40,
                height: 20,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as TimelineGeometry;
}

describe("timeline selection geometry and renderer", () => {
  it("projects allocation, marker, and team hits without layout recalculation", () => {
    const timeline = geometry();

    assert.deepEqual(
      buildTimelineSelectionGeometry(timeline, {
        kind: "allocation",
        projectId,
        teamId,
        date,
      }),
      { kind: "allocation", x: 10, y: 100, width: 40, height: 20 },
    );
    assert.deepEqual(
      buildTimelineSelectionGeometry(timeline, {
        kind: "project-marker",
        projectId,
        teamId,
        date,
        markerKind: "mandatory-deadline",
      }),
      { kind: "project-marker", x: 120, y1: 50, y2: 150 },
    );
    assert.deepEqual(
      buildTimelineSelectionGeometry(timeline, { kind: "team", teamId }),
      { kind: "team", x: 0, y: 50, width: 300, height: 100 },
    );
  });

  it("renders and clears rectangle and line overlays in the dedicated layer", () => {
    const document = new FakeDocument();
    const svg = new FakeElement(document, "svg");
    const layer = new FakeElement(document, "g");
    svg.childNodes = [layer];

    renderTimelineSelection({
      svg: svg as unknown as SVGSVGElement,
      selection: { kind: "allocation", x: 10, y: 20, width: 30, height: 40 },
    });
    assert.equal(layer.childNodes[0]?.tagName, "rect");
    assert.equal(layer.childNodes[0]?.getAttribute("x"), "10");
    assert.equal(
      layer.childNodes[0]?.getAttribute("class"),
      "timeline-selection timeline-selection--allocation",
    );

    renderTimelineSelection({
      svg: svg as unknown as SVGSVGElement,
      selection: { kind: "project-marker", x: 15, y1: 50, y2: 150 },
    });
    assert.equal(layer.childNodes[0]?.tagName, "line");
    assert.equal(layer.childNodes[0]?.getAttribute("x1"), "15");

    renderTimelineSelection({
      svg: svg as unknown as SVGSVGElement,
      selection: undefined,
    });
    assert.equal(layer.childNodes.length, 0);
  });

  it("keeps full-geometry selection coordinates through viewport changes", () => {
    const document = new FakeDocument();
    const svg = new FakeElement(document, "svg");
    const layer = new FakeElement(document, "g");
    svg.childNodes = [layer];
    const timeline = geometry();
    const selection = buildTimelineSelectionGeometry(timeline, {
      kind: "allocation",
      projectId,
      teamId,
      date,
    });
    renderTimelineSelection({
      svg: svg as unknown as SVGSVGElement,
      selection,
    });

    applyTimelineViewport({
      svg: svg as unknown as SVGSVGElement,
      geometry: timeline,
      viewport: { x: 100, width: 100 },
    });

    assert.equal(svg.getAttribute("viewBox"), "100 0 100 150");
    assert.equal(layer.childNodes[0]?.getAttribute("x"), "10");
    assert.equal(layer.childNodes[0]?.getAttribute("width"), "40");
  });

  it("preserves existing hits and clears references absent from new geometry", () => {
    const timeline = geometry();
    const existing = { kind: "allocation", projectId, teamId, date } as const;
    const missing = {
      kind: "project-marker",
      projectId,
      teamId,
      date,
      markerKind: "objective-end",
    } as const;

    assert.equal(reconcileTimelineHit(timeline, existing), existing);
    assert.equal(reconcileTimelineHit(timeline, missing), undefined);
    assert.equal(reconcileTimelineHit(timeline, undefined), undefined);
  });
});
