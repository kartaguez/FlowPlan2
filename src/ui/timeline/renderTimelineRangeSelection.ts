import type { TimelineGeometry } from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";
import { preserveTimelineLabelTypography } from "./applyTimelineViewport.js";
import { formatProjectionDate } from "./renderTimelineCursor.js";
import type { TimelineViewportState } from "./timelineViewport.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface TimelineRangeSelection {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
}

export interface RenderTimelineRangeSelectionInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly viewport: TimelineViewportState;
  readonly selection: TimelineRangeSelection | undefined;
}

export function renderTimelineRangeSelection(input: RenderTimelineRangeSelectionInput): void {
  const layer = input.svg.querySelector<SVGGElement>(".timeline-range-selection-layer");
  if (layer === null) throw new TypeError("Timeline SVG must contain a range selection layer.");
  if (input.selection === undefined) {
    layer.replaceChildren();
    return;
  }
  const startDate = input.selection.startDate <= input.selection.endDate
    ? input.selection.startDate : input.selection.endDate;
  const endDate = input.selection.startDate <= input.selection.endDate
    ? input.selection.endDate : input.selection.startDate;
  const first = input.geometry.dates.find((day) => day.date === startDate);
  const last = input.geometry.dates.find((day) => day.date === endDate);
  if (first === undefined || last === undefined) {
    throw new TypeError("Selection dates must be inside the timeline geometry.");
  }

  const rect = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "rect");
  rect.setAttribute("class", "timeline-range-selection");
  rect.setAttribute("x", String(first.x));
  rect.setAttribute("y", "0");
  rect.setAttribute("width", String(last.x + last.width - first.x));
  rect.setAttribute("height", String(input.geometry.height));

  const bounds = input.svg.getBoundingClientRect();
  const margin = bounds.width > 0
    ? Math.min(56, bounds.width / 2) * input.viewport.width / bounds.width : 0;
  const clampLabelX = (x: number): number => Math.max(input.viewport.x + margin,
    Math.min(x, input.viewport.x + input.viewport.width - margin));
  const label = (date: CivilDate, x: number, y: number, side: string): SVGTextElement => {
    const node = input.svg.ownerDocument.createElementNS(SVG_NAMESPACE, "text");
    const labelX = clampLabelX(x);
    node.setAttribute("class", `timeline-range-selection-date timeline-range-selection-date--${side}`);
    node.setAttribute("x", String(labelX));
    node.setAttribute("y", String(y));
    node.setAttribute("data-timeline-label-x", String(labelX));
    node.setAttribute("data-timeline-label-y", String(y));
    node.setAttribute("data-screen-space-typography", "true");
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("dominant-baseline", "middle");
    node.setAttribute("data-selection-date", date);
    node.textContent = formatProjectionDate(date);
    return node;
  };
  layer.replaceChildren(rect, label(startDate, first.x, 13, "start"),
    label(endDate, last.x + last.width, 30, "end"));
  preserveTimelineLabelTypography(input.svg, input.viewport, input.geometry.height);
}
