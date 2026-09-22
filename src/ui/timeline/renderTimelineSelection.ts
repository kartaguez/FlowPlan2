import type { TimelineSelectionGeometry } from "./timelineSelectionGeometry.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface RenderTimelineSelectionInput {
  readonly svg: SVGSVGElement;
  readonly selection: TimelineSelectionGeometry | undefined;
}

export function renderTimelineSelection(
  input: RenderTimelineSelectionInput,
): void {
  const layer = input.svg.querySelector<SVGGElement>(
    ".timeline-selection-layer",
  );
  if (layer === null) {
    throw new TypeError("Timeline SVG must contain a selection layer.");
  }
  if (input.selection === undefined) {
    layer.replaceChildren();
    return;
  }

  const className =
    `timeline-selection timeline-selection--${input.selection.kind}`;
  if (input.selection.kind === "project-marker") {
    const line = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "line");
    line.setAttribute("class", className);
    line.setAttribute("x1", String(input.selection.x));
    line.setAttribute("x2", String(input.selection.x));
    line.setAttribute("y1", String(input.selection.y1));
    line.setAttribute("y2", String(input.selection.y2));
    layer.replaceChildren(line);
    return;
  }

  const rectangle = input.svg.ownerDocument.createElementNS(
    SVG_NAMESPACE,
    "rect",
  );
  rectangle.setAttribute("class", className);
  rectangle.setAttribute("x", String(input.selection.x));
  rectangle.setAttribute("y", String(input.selection.y));
  rectangle.setAttribute("width", String(input.selection.width));
  rectangle.setAttribute("height", String(input.selection.height));
  layer.replaceChildren(rectangle);
}
