import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  createTeamId,
  type CivilDate,
  type DomainResult,
  type TeamId,
} from "../../domain/index.js";
import type {
  TimelineAllocationGeometry,
  TimelineDayGeometry,
  TimelineGeometry,
  TimelineRectGeometry,
} from "../../adapters/index.js";
import { renderTimelineSvg } from "./renderTimelineSvg.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeDocument {
  createElementNS(namespaceURI: string, tagName: string): FakeSvgElement {
    return new FakeSvgElement(this, namespaceURI, tagName);
  }
}

class FakeSvgElement {
  readonly attributes = new Map<string, string>();
  childNodes: FakeSvgElement[] = [];

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly namespaceURI: string,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeSvgElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: FakeSvgElement[]): void {
    this.childNodes = [...nodes];
  }
}

function createSvg(document = new FakeDocument()): FakeSvgElement {
  return document.createElementNS(SVG_NAMESPACE, "svg");
}

const capacity = (value: string) => must(createCapacity(value));
const date = (value: string) => must(createCivilDate(value));

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
): TimelineRectGeometry {
  return { x, y, width, height };
}

function allocation(
  projectNumber: number,
  teamId: TeamId,
  allocationDate: CivilDate,
  priorityIndex: number,
  geometry: TimelineRectGeometry,
): TimelineAllocationGeometry {
  return {
    projectId: must(createProjectId(`project-${projectNumber}`)),
    teamId,
    date: allocationDate,
    workload: capacity(projectNumber === 1 ? "1" : "0.5"),
    priorityIndex,
    ...geometry,
  };
}

function makeDay(
  currentDate: string,
  cell: TimelineRectGeometry,
  allocations: readonly TimelineAllocationGeometry[] = [],
  overReserved = false,
): TimelineDayGeometry {
  return {
    date: date(currentDate),
    ...cell,
    effectiveCapacity: capacity("2"),
    reservedCapacity: capacity("0.5"),
    projectCapacity: capacity("1.5"),
    overReserved,
    capacityTube: {
      x: cell.x + 2,
      y: cell.y + 2,
      width: cell.width - 4,
      height: cell.height - 4,
      reservedRegion: rect(cell.x + 2, cell.y + 2, cell.width - 4, 6),
      projectRegion: rect(
        cell.x + 2,
        cell.y + 8,
        cell.width - 4,
        cell.height - 10,
      ),
    },
    allocations,
  };
}

function makeGeometry(): TimelineGeometry {
  const firstTeamId = must(createTeamId("team-a"));
  const secondTeamId = must(createTeamId("team-b"));
  const firstDate = date("2025-01-01");
  const allocations = [
    allocation(1, firstTeamId, firstDate, 0, rect(12, 42, 26, 16)),
    allocation(2, firstTeamId, firstDate, 1, rect(12, 34, 26, 8)),
    allocation(3, firstTeamId, firstDate, 2, rect(12, 26, 26, 8)),
  ];

  return {
    width: 300,
    height: 160,
    dayWidth: 100,
    maxEffectiveCapacity: capacity("2"),
    pixelsPerCapacityUnit: 40,
    teams: [
      {
        teamId: firstTeamId,
        x: 0,
        y: 0,
        width: 300,
        height: 80,
        days: [
          makeDay("2025-01-01", rect(10, 20, 30, 40), allocations, true),
          makeDay("2025-01-02", rect(100, 0, 100, 80)),
          makeDay("2025-01-03", rect(200, 0, 100, 80)),
        ],
      },
      {
        teamId: secondTeamId,
        x: 0,
        y: 80,
        width: 300,
        height: 80,
        days: [makeDay("2025-01-01", rect(0, 80, 100, 80))],
      },
    ],
  };
}

function descendants(root: FakeSvgElement): FakeSvgElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

function withClass(root: FakeSvgElement, className: string): FakeSvgElement[] {
  return descendants(root).filter(
    (element) => element.getAttribute("class") === className,
  );
}

function attributes(element: FakeSvgElement): Record<string, string> {
  return Object.fromEntries(element.attributes);
}

function snapshot(element: FakeSvgElement): unknown {
  return {
    tagName: element.tagName,
    namespaceURI: element.namespaceURI,
    attributes: [...element.attributes].sort(([left], [right]) =>
      left.localeCompare(right),
    ),
    children: element.childNodes.map(snapshot),
  };
}

function render(
  svg: FakeSvgElement,
  geometry: TimelineGeometry = makeGeometry(),
): void {
  renderTimelineSvg({
    svg: svg as unknown as SVGSVGElement,
    geometry,
  });
}

describe("renderTimelineSvg", () => {
  it("clears existing SVG children before rebuilding", () => {
    const svg = createSvg();
    const obsolete = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
    obsolete.setAttribute("class", "obsolete");
    svg.append(obsolete);

    render(svg);

    assert.equal(withClass(svg, "obsolete").length, 0);
    assert.equal(svg.childNodes.length, 1);
    assert.equal(svg.childNodes[0]?.getAttribute("class"), "timeline-root");
  });

  it("sets viewBox directly from geometry dimensions", () => {
    const svg = createSvg();
    render(svg);

    assert.equal(svg.getAttribute("viewBox"), "0 0 300 160");
    assert.equal(svg.getAttribute("role"), "img");
  });

  it("renders one semantic group per team with its domain identifier", () => {
    const svg = createSvg();
    render(svg);
    const teams = withClass(svg, "timeline-team");

    assert.equal(teams.length, 2);
    assert.deepEqual(
      teams.map((team) => team.getAttribute("data-team-id")),
      ["team-a", "team-b"],
    );
    assert.equal(withClass(svg, "timeline-team-lane").length, 2);
  });

  it("renders daily cells and their exact date metadata", () => {
    const svg = createSvg();
    render(svg);
    const firstTeam = withClass(svg, "timeline-team")[0]!;
    const days = withClass(firstTeam, "timeline-day");

    assert.equal(days.length, 3);
    assert.deepEqual(
      days.map((day) => day.getAttribute("data-date")),
      ["2025-01-01", "2025-01-02", "2025-01-03"],
    );
  });

  it("copies rectangle coordinates without layout calculation", () => {
    const svg = createSvg();
    render(svg);
    const cell = withClass(svg, "timeline-day-cell")[0]!;

    assert.deepEqual(attributes(cell), {
      class: "timeline-day-cell",
      x: "10",
      y: "20",
      width: "30",
      height: "40",
    });
  });

  it("renders capacity tube geometry exactly", () => {
    const svg = createSvg();
    render(svg);
    const tube = withClass(svg, "timeline-capacity-tube")[0]!;

    assert.deepEqual(attributes(tube), {
      class: "timeline-capacity-tube",
      x: "12",
      y: "22",
      width: "26",
      height: "36",
    });
  });

  it("renders the reserved region from its supplied rectangle", () => {
    const svg = createSvg();
    render(svg);
    const reserved = withClass(svg, "timeline-reserved-region")[0]!;

    assert.deepEqual(attributes(reserved), {
      class: "timeline-reserved-region",
      x: "12",
      y: "22",
      width: "26",
      height: "6",
    });
  });

  it("renders the project region from its supplied rectangle", () => {
    const svg = createSvg();
    render(svg);
    const project = withClass(svg, "timeline-project-region")[0]!;

    assert.deepEqual(attributes(project), {
      class: "timeline-project-region",
      x: "12",
      y: "28",
      width: "26",
      height: "30",
    });
  });

  it("renders allocation rectangles with semantic data attributes", () => {
    const svg = createSvg();
    render(svg);
    const allocations = withClass(svg, "timeline-project-allocation");

    assert.equal(allocations.length, 3);
    assert.deepEqual(attributes(allocations[0]!), {
      class: "timeline-project-allocation",
      x: "12",
      y: "42",
      width: "26",
      height: "16",
      "data-project-id": "project-1",
      "data-team-id": "team-a",
      "data-date": "2025-01-01",
      "data-priority-index": "0",
    });
  });

  it("preserves the supplied allocation order in the SVG tree", () => {
    const svg = createSvg();
    render(svg);

    assert.deepEqual(
      withClass(svg, "timeline-project-allocation").map((allocation) =>
        allocation.getAttribute("data-project-id"),
      ),
      ["project-1", "project-2", "project-3"],
    );
  });

  it("exposes over-reservation as metadata without visual semantics", () => {
    const svg = createSvg();
    render(svg);

    assert.equal(
      withClass(svg, "timeline-day")[0]?.getAttribute("data-over-reserved"),
      "true",
    );
  });

  it("creates no text, path, polygon, or interaction elements", () => {
    const svg = createSvg();
    render(svg);
    const tagNames = descendants(svg).map((element) => element.tagName);

    assert.equal(tagNames.includes("text"), false);
    assert.equal(tagNames.includes("path"), false);
    assert.equal(tagNames.includes("polygon"), false);
    assert.ok(
      descendants(svg).every(
        (element) => element.namespaceURI === SVG_NAMESPACE,
      ),
    );
  });

  it("renders an empty-team geometry as a valid empty SVG", () => {
    const svg = createSvg();
    const geometry: TimelineGeometry = {
      width: 300,
      height: 0,
      dayWidth: 100,
      maxEffectiveCapacity: capacity("0"),
      pixelsPerCapacityUnit: 0,
      teams: [],
    };

    render(svg, geometry);

    assert.equal(svg.getAttribute("viewBox"), "0 0 300 0");
    assert.equal(withClass(svg, "timeline-team").length, 0);
    assert.equal(svg.childNodes.length, 1);
  });

  it("is idempotent through complete reconstruction", () => {
    const svg = createSvg();
    render(svg);
    const first = snapshot(svg);

    render(svg);

    assert.deepEqual(snapshot(svg), first);
    assert.equal(withClass(svg, "timeline-root").length, 1);
    assert.equal(withClass(svg, "timeline-team").length, 2);
  });

  it("contains no geometry builders, business calls, or event listeners", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/ui/timeline/renderTimelineSvg.ts"),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /dateToX|pixelsPerCapacityUnit|capacityToHeight|buildTimelineGeometry|planPortfolio|recomputePlanning/,
    );
    assert.doesNotMatch(
      source,
      /addEventListener|onclick|onpointer|ondrag|innerHTML/,
    );
  });
});
