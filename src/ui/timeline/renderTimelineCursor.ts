import type { TimelineCursorGeometry } from "../../adapters/index.js";
import type { TimelineGeometry } from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface RenderTimelineCursorInput {
  readonly svg: SVGSVGElement;
  readonly cursor: TimelineCursorGeometry;
  readonly labelX?: number;
  readonly geometry?: TimelineGeometry;
}

export function formatProjectionDate(date: CivilDate): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function renderTimelineCursor(input: RenderTimelineCursorInput): void {
  const layer = input.svg.querySelector<SVGGElement>(
    ".timeline-cursor-layer",
  );
  if (layer === null) {
    throw new TypeError("Timeline SVG must contain a cursor layer.");
  }

  const line = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "line");
  line.setAttribute("class", "timeline-cursor");
  line.setAttribute("x1", String(input.cursor.x));
  line.setAttribute("x2", String(input.cursor.x));
  line.setAttribute("y1", String(input.cursor.y1));
  line.setAttribute("y2", String(input.cursor.y2));
  line.setAttribute("data-selected-date", input.cursor.date);
  const label = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "text");
  label.setAttribute("class", "timeline-cursor-date-label");
  label.setAttribute("x", String(input.labelX ?? input.cursor.x));
  label.setAttribute("y", "13");
  label.setAttribute("data-timeline-label-x", String(input.labelX ?? input.cursor.x));
  label.setAttribute("data-timeline-label-y", "13");
  label.setAttribute("data-screen-space-typography", "true");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("data-selected-date", input.cursor.date);
  label.textContent = formatProjectionDate(input.cursor.date);
  const teamLabels = (input.geometry?.teams ?? []).filter((team) => (team.projectionBand?.height ?? 0) > 0)
    .map((team) => {
      const band = team.projectionBand!;
      const teamLabel = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "text");
      teamLabel.setAttribute("class", "timeline-cursor-date-label timeline-cursor-team-date-label");
      teamLabel.setAttribute("x", String(input.labelX ?? input.cursor.x));
      teamLabel.setAttribute("y", String(band.y + band.height / 2));
      teamLabel.setAttribute("data-timeline-label-x", String(input.labelX ?? input.cursor.x));
      teamLabel.setAttribute("data-timeline-label-y", String(band.y + band.height / 2));
      teamLabel.setAttribute("data-screen-space-typography", "true");
      teamLabel.setAttribute("text-anchor", "middle");
      teamLabel.setAttribute("dominant-baseline", "middle");
      teamLabel.setAttribute("data-selected-date", input.cursor.date);
      teamLabel.setAttribute("data-team-id", team.teamId);
      teamLabel.textContent = formatProjectionDate(input.cursor.date);
      return teamLabel;
    });
  layer.replaceChildren(line, label, ...teamLabels);
}
