import type { TimelineCursorGeometry } from "../../adapters/index.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface RenderTimelineCursorInput {
  readonly svg: SVGSVGElement;
  readonly cursor: TimelineCursorGeometry;
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
  layer.replaceChildren(line);
}
