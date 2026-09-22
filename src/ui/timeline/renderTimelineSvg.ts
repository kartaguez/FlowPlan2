import type {
  TimelineAllocationGeometry,
  TimelineDayGeometry,
  TimelineGeometry,
  TimelineMonthGeometry,
  TimelineRectGeometry,
  TimelineTeamGeometry,
  TimelineTimeAxisGeometry,
  TimelineYearGeometry,
} from "../../adapters/index.js";
import { projectColorIndex } from "./projectVisualIdentity.js";

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
  input.svg.setAttribute("width", String(input.geometry.width));
  input.svg.setAttribute("height", String(input.geometry.height));

  const document = input.svg.ownerDocument;
  const root = createSvgElement(document, "g");
  root.setAttribute("class", "timeline-root");
  root.append(renderTimeAxis(document, input.geometry.timeAxis));

  for (const team of input.geometry.teams) {
    root.append(renderTeam(document, team));
  }

  input.svg.replaceChildren(root);
}

function renderTimeAxis(
  document: Document,
  axis: TimelineTimeAxisGeometry,
): SVGElement {
  const group = createSvgElement(document, "g");
  group.setAttribute("class", "timeline-time-axis");

  const years = createSvgElement(document, "g");
  years.setAttribute("class", "timeline-years");
  for (const year of axis.years) {
    years.append(renderTimeSegment(document, year, "year"));
  }

  const months = createSvgElement(document, "g");
  months.setAttribute("class", "timeline-months");
  for (const month of axis.months) {
    months.append(renderTimeSegment(document, month, "month"));
  }

  group.append(years, months);
  return group;
}

function renderTimeSegment(
  document: Document,
  segment: TimelineYearGeometry | TimelineMonthGeometry,
  kind: "year" | "month",
): SVGElement {
  const group = createSvgElement(document, "g");
  group.setAttribute("class", `timeline-${kind}`);
  group.setAttribute("data-year", String(segment.year));
  if (kind === "month" && "month" in segment) {
    group.setAttribute("data-month", String(segment.month));
  }

  const cell = createRect(document, `timeline-${kind}-cell`, segment);
  const label = createSvgElement(document, "text");
  label.setAttribute("class", `timeline-${kind}-label`);
  label.setAttribute("x", String(segment.labelX));
  label.setAttribute("y", String(segment.labelY));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = segment.label;
  group.append(cell, label);
  return group;
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
  group.setAttribute(
    "class",
    day.overReserved
      ? "timeline-day timeline-day--over-reserved"
      : "timeline-day",
  );
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
  const colorIndex = projectColorIndex(allocation.projectId);
  const rectangle = createRect(
    document,
    `timeline-project-allocation timeline-project-color-${colorIndex}`,
    allocation,
  );
  rectangle.setAttribute("data-project-id", allocation.projectId);
  rectangle.setAttribute("data-team-id", allocation.teamId);
  rectangle.setAttribute("data-date", allocation.date);
  rectangle.setAttribute(
    "data-priority-index",
    String(allocation.priorityIndex),
  );
  rectangle.setAttribute("data-project-color-index", String(colorIndex));
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
  name: "g" | "rect" | "text",
): SVGElement {
  return document.createElementNS(SVG_NAMESPACE, name);
}
