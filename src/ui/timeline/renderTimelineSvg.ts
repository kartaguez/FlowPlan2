import type {
  TimelineAllocationGeometry,
  TimelineDayGeometry,
  TimelineGeometry,
  TimelineRectGeometry,
  TimelineTeamGeometry,
} from "../../adapters/index.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface RenderTimelineSvgInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
}

export function renderTimelineSvg(input: RenderTimelineSvgInput): void {
  input.svg.setAttribute(
    "viewBox",
    `0 0 ${input.geometry.width} ${input.geometry.height}`,
  );
  input.svg.setAttribute("role", "img");

  const document = input.svg.ownerDocument;
  const root = createSvgElement(document, "g");
  root.setAttribute("class", "timeline-root");

  for (const team of input.geometry.teams) {
    root.append(renderTeam(document, team));
  }

  input.svg.replaceChildren(root);
}

function renderTeam(
  document: Document,
  team: TimelineTeamGeometry,
): SVGElement {
  const group = createSvgElement(document, "g");
  group.setAttribute("class", "timeline-team");
  group.setAttribute("data-team-id", team.teamId);

  const lane = createRect(document, "timeline-team-lane", team);
  const days = createSvgElement(document, "g");
  days.setAttribute("class", "timeline-days");
  for (const day of team.days) {
    days.append(renderDay(document, day));
  }
  group.append(lane, days);
  return group;
}

function renderDay(document: Document, day: TimelineDayGeometry): SVGElement {
  const group = createSvgElement(document, "g");
  group.setAttribute("class", "timeline-day");
  group.setAttribute("data-date", day.date);
  group.setAttribute("data-over-reserved", String(day.overReserved));

  const cell = createRect(document, "timeline-day-cell", day);
  const tube = createRect(
    document,
    "timeline-capacity-tube",
    day.capacityTube,
  );
  const reservedRegion = createRect(
    document,
    "timeline-reserved-region",
    day.capacityTube.reservedRegion,
  );
  const projectRegion = createRect(
    document,
    "timeline-project-region",
    day.capacityTube.projectRegion,
  );
  const allocations = createSvgElement(document, "g");
  allocations.setAttribute("class", "timeline-allocations");
  for (const allocation of day.allocations) {
    allocations.append(renderAllocation(document, allocation));
  }

  group.append(cell, tube, reservedRegion, projectRegion, allocations);
  return group;
}

function renderAllocation(
  document: Document,
  allocation: TimelineAllocationGeometry,
): SVGElement {
  const rectangle = createRect(
    document,
    "timeline-project-allocation",
    allocation,
  );
  rectangle.setAttribute("data-project-id", allocation.projectId);
  rectangle.setAttribute("data-team-id", allocation.teamId);
  rectangle.setAttribute("data-date", allocation.date);
  rectangle.setAttribute(
    "data-priority-index",
    String(allocation.priorityIndex),
  );
  return rectangle;
}

function createRect(
  document: Document,
  className: string,
  geometry: TimelineRectGeometry,
): SVGElement {
  const rectangle = createSvgElement(document, "rect");
  rectangle.setAttribute("class", className);
  setRectGeometry(rectangle, geometry);
  return rectangle;
}

function setRectGeometry(
  rectangle: SVGElement,
  geometry: TimelineRectGeometry,
): void {
  rectangle.setAttribute("x", String(geometry.x));
  rectangle.setAttribute("y", String(geometry.y));
  rectangle.setAttribute("width", String(geometry.width));
  rectangle.setAttribute("height", String(geometry.height));
}

function createSvgElement(
  document: Document,
  name: "g" | "rect",
): SVGElement {
  return document.createElementNS(SVG_NAMESPACE, name);
}
