import {
  GEOMETRY_EPSILON,
  type TimelineGeometry,
} from "../../adapters/index.js";
import type { TimelineViewportState } from "./timelineViewport.js";

export interface ApplyTimelineViewportInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly viewport: TimelineViewportState;
}

export function applyTimelineViewport(
  input: ApplyTimelineViewportInput,
): void {
  if (
    !Number.isFinite(input.viewport.x) ||
    input.viewport.x < -GEOMETRY_EPSILON ||
    !Number.isFinite(input.viewport.width) ||
    input.viewport.width <= 0 ||
    input.viewport.x + input.viewport.width >
      input.geometry.width + GEOMETRY_EPSILON
  ) {
    throw new TypeError("Timeline viewport is outside the full geometry.");
  }
  let x = input.viewport.x;
  if (Math.abs(x) <= GEOMETRY_EPSILON) x = 0;
  if (
    Math.abs(x + input.viewport.width - input.geometry.width) <=
    GEOMETRY_EPSILON
  ) {
    x = input.geometry.width - input.viewport.width;
  }
  input.svg.setAttribute(
    "viewBox",
    `${x} 0 ${input.viewport.width} ${input.geometry.height}`,
  );
  preserveTimelineLabelTypography(input.svg, input.viewport, input.geometry.height);
}

/** Keeps time-axis glyphs in CSS-pixel space while their anchors stay temporal. */
function preserveTimelineLabelTypography(
  svg: SVGSVGElement,
  viewport: TimelineViewportState,
  geometryHeight: number,
): void {
  if (typeof svg.querySelectorAll !== "function") return;
  const bounds = svg.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const inverseX = viewport.width / bounds.width;
  const inverseY = geometryHeight / bounds.height;
  for (const node of svg.querySelectorAll<SVGTextElement>(
    "[data-screen-space-typography='true']",
  )) {
    const x = node.getAttribute("data-timeline-label-x");
    const y = node.getAttribute("data-timeline-label-y");
    if (x === null || y === null) continue;
    node.setAttribute(
      "transform",
      `translate(${x} ${y}) scale(${inverseX} ${inverseY}) translate(${-Number(x)} ${-Number(y)})`,
    );
  }
}
