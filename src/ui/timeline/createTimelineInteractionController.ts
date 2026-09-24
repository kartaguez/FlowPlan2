import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import type { ProjectId, Rational } from "../../domain/index.js";
import { createTimelineInteractionLookup, renderTimelineTooltip } from "./renderTimelineInteractionDetails.js";
import { hitTestTimelineGeometry, type TimelineHit } from "./timelineHitTesting.js";
import { timelinePointFromClientPoint, type TimelineViewportState } from "./timelineViewport.js";

export const MARKER_HIT_TOLERANCE_CSS_PX = 4;
export const CLICK_DRAG_THRESHOLD_CSS_PX = 4;
export interface TimelineInteractionState { readonly hovered: TimelineHit | undefined }
export interface TimelineInteractionController {
  readonly getState: () => TimelineInteractionState;
  readonly refreshTooltip: () => void;
  readonly destroy: () => void;
}
export interface CreateTimelineInteractionControllerInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly viewModel: TimelineViewModel;
  readonly getViewport: () => TimelineViewportState;
  readonly tooltipContainer: HTMLElement;
  readonly getProjectProgress?: (projectId: ProjectId) => Rational | undefined;
}
export function createTimelineInteractionController(input: CreateTimelineInteractionControllerInput): TimelineInteractionController {
  const lookup = createTimelineInteractionLookup(input.viewModel);
  let hovered: TimelineHit | undefined;
  let hoverPoint = { clientX: 0, clientY: 0 };
  const render = (): void => renderTimelineTooltip({
    container: input.tooltipContainer, lookup, hit: hovered, ...hoverPoint,
    ...(input.getProjectProgress === undefined ? {} : { getProjectProgress: input.getProjectProgress }),
  });
  const clear = (): void => { hovered = undefined; render(); };
  const onPointerMove = (event: PointerEvent): void => {
    const bounds = input.svg.getBoundingClientRect();
    const viewport = input.getViewport();
    const point = timelinePointFromClientPoint({ clientX: event.clientX, clientY: event.clientY,
      svgLeft: bounds.left, svgTop: bounds.top, svgWidth: bounds.width, svgHeight: bounds.height,
      viewport, geometryHeight: input.geometry.height });
    hovered = hitTestTimelineGeometry({ geometry: input.geometry, x: point.x, y: point.y,
      markerHitTolerance: (MARKER_HIT_TOLERANCE_CSS_PX / bounds.width) * viewport.width });
    hoverPoint = { clientX: event.clientX, clientY: event.clientY };
    render();
  };
  input.svg.addEventListener("pointermove", onPointerMove);
  input.svg.addEventListener("pointerleave", clear);
  input.svg.addEventListener("pointercancel", clear);
  clear();
  return {
    getState: () => ({ hovered }), refreshTooltip: render,
    destroy: () => {
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerleave", clear);
      input.svg.removeEventListener("pointercancel", clear);
      clear();
    },
  };
}
