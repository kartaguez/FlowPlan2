import type {
  TimelineAllocationGeometry,
  TimelineDayGeometry,
  TimelineGeometry,
  TimelineMonthGeometry,
  TimelineProjectMarkerGeometry,
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
  input.svg.setAttribute("role", "group");
  input.svg.setAttribute("width", "100%");
  input.svg.setAttribute("height", String(input.geometry.height));
  input.svg.setAttribute("preserveAspectRatio", "none");

  const document = input.svg.ownerDocument;
  const root = createSvgElement(document, "g");
  root.setAttribute("class", "timeline-root");
  root.append(renderTimeAxis(document, input.geometry.timeAxis));

  for (const team of input.geometry.teams) {
    root.append(renderTeam(document, team));
  }
  const cursorLayer = createSvgElement(document, "g");
  cursorLayer.setAttribute("class", "timeline-cursor-layer");
  root.append(cursorLayer);

  input.svg.replaceChildren(root);
}

function renderTimeAxis(
  document: Document,
  axis: TimelineTimeAxisGeometry,
): SVGElement {
  const group = createSvgElement(document, "g");
  group.setAttribute("class", "timeline-time-axis");
  if (axis.projectionBand) group.append(createRect(document, "timeline-projection-band timeline-projection-band--global", axis.projectionBand));

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
  label.setAttribute("data-timeline-label-x", String(segment.labelX));
  label.setAttribute("data-timeline-label-y", String(segment.labelY));
  label.setAttribute("data-screen-space-typography", "true");
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
  const projectionBand = team.projectionBand
    ? createRect(document, "timeline-projection-band timeline-projection-band--team", team.projectionBand)
    : null;
  const days = createSvgElement(document, "g");
  days.setAttribute("class", "timeline-days");
  for (const day of team.days) {
    days.append(renderDay(document, day));
  }
  const markers = createSvgElement(document, "g");
  markers.setAttribute("class", "timeline-project-markers");
  for (const marker of team.markers) {
    markers.append(renderProjectMarker(document, marker));
  }
  if (projectionBand) group.append(projectionBand);
  group.append(lane, days, markers);
  return group;
}

function renderProjectMarker(
  document: Document,
  marker: TimelineProjectMarkerGeometry,
): SVGElement {
  const line = createSvgElement(document, "line");
  const classes = [
    "timeline-project-marker",
    `timeline-project-marker--${marker.kind}`,
  ];
  if (marker.deadlineStatus !== undefined) {
    classes.push(
      `timeline-project-marker--deadline-${marker.deadlineStatus.toLowerCase()}`,
    );
  }
  line.setAttribute("class", classes.join(" "));
  line.setAttribute("x1", String(marker.x));
  line.setAttribute("x2", String(marker.x));
  line.setAttribute("y1", String(marker.y1));
  line.setAttribute("y2", String(marker.y2));
  line.setAttribute("data-project-id", marker.projectId);
  line.setAttribute("data-team-id", marker.teamId);
  line.setAttribute("data-date", marker.date);
  line.setAttribute("data-marker-kind", marker.kind);
  if (marker.deadlineStatus !== undefined) {
    line.setAttribute("data-deadline-status", marker.deadlineStatus);
  }
  return line;
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
  const reservationSegments = createSvgElement(document, "g");
  reservationSegments.setAttribute("class", "timeline-reservation-segments");
  for (const segment of day.reservationSegments ?? []) {
    if (segment.height <= 0) continue;
    const rectangle = createRect(document, "timeline-reservation-segment", segment);
    rectangle.setAttribute("data-reservation-id", segment.reservationId);
    reservationSegments.append(rectangle);
  }
  const allocations = createSvgElement(document, "g");
  allocations.setAttribute("class", "timeline-allocations");
  for (const allocation of day.allocations) {
    allocations.append(renderAllocation(document, allocation));
  }

  group.append(cell, tube, reservedRegion, reservationSegments, projectRegion, allocations);
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
  name: "g" | "line" | "rect" | "text",
): SVGElement {
  return document.createElementNS(SVG_NAMESPACE, name);
}
