import type { TimelineGeometry } from "../../adapters/index.js";
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
    input.viewport.x < 0 ||
    !Number.isFinite(input.viewport.width) ||
    input.viewport.width <= 0 ||
    input.viewport.x + input.viewport.width > input.geometry.width
  ) {
    throw new TypeError("Timeline viewport is outside the full geometry.");
  }
  input.svg.setAttribute(
    "viewBox",
    `${input.viewport.x} 0 ${input.viewport.width} ${input.geometry.height}`,
  );
}
