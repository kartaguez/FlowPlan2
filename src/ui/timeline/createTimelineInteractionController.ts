import { createInteractionLifecycle } from "../interactionLifecycle.js";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import type { ProjectId, Rational } from "../../domain/index.js";
import { createTimelineInteractionLookup, renderTimelineTooltip } from "./renderTimelineInteractionDetails.js";
import { hitTestTimelineGeometry, type TimelineHit } from "./timelineHitTesting.js";
import { timelinePointFromClientPoint, type TimelineViewportState } from "./timelineViewport.js";

export const MARKER_HIT_TOLERANCE_CSS_PX = 4;
export interface TimelineInteractionState { readonly hovered: TimelineHit | undefined }
export interface TimelineInteractionController {
  readonly getState: () => TimelineInteractionState;
  readonly refreshTooltip: () => void;
  readonly suspend: () => void;
  readonly resume: () => void;
  readonly destroy: () => void;
}
export interface CreateTimelineInteractionControllerInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly viewModel: TimelineViewModel;
  readonly getViewport: () => TimelineViewportState;
  readonly tooltipContainer: HTMLElement;
  readonly getProjectProgress?: (projectId: ProjectId) => Rational | undefined;
  readonly isRangeDragging?: () => boolean;
}
export function createTimelineInteractionController(input: CreateTimelineInteractionControllerInput): TimelineInteractionController {
  const lookup = createTimelineInteractionLookup(input.viewModel);
  let hovered: TimelineHit | undefined;
  let hoverPoint: { clientX: number; clientY: number } | undefined;
  const render = (): void => renderTimelineTooltip({
    container: input.tooltipContainer, lookup,
    hit: input.isRangeDragging?.() ? undefined : hovered,
    ...(hoverPoint ?? { clientX: 0, clientY: 0 }),
    ...(input.getProjectProgress === undefined ? {} : { getProjectProgress: input.getProjectProgress }),
  });
  const clear = (): void => { hovered = undefined; hoverPoint = undefined; render(); };
  const updateHit = (): void => {
    if (hoverPoint === undefined) { hovered = undefined; render(); return; }
    const bounds = input.svg.getBoundingClientRect();
    if (hoverPoint.clientX < bounds.left || hoverPoint.clientX > bounds.left + bounds.width ||
      hoverPoint.clientY < bounds.top || hoverPoint.clientY > bounds.top + bounds.height) {
      hovered = undefined; render(); return;
    }
    const viewport = input.getViewport();
    const point = timelinePointFromClientPoint({ ...hoverPoint,
      svgLeft: bounds.left, svgTop: bounds.top, svgWidth: bounds.width, svgHeight: bounds.height,
      viewport, geometryHeight: input.geometry.height });
    hovered = hitTestTimelineGeometry({ geometry: input.geometry, x: point.x, y: point.y,
      markerHitTolerance: (MARKER_HIT_TOLERANCE_CSS_PX / bounds.width) * viewport.width });
    render();
  };
  const onPointerMove = (event: PointerEvent): void => {
    hoverPoint = { clientX: event.clientX, clientY: event.clientY };
    updateHit();
  };
  const lifecycle = createInteractionLifecycle(clear);
  lifecycle.listen(input.svg, "pointermove", onPointerMove);
  lifecycle.listen(input.svg, "pointerleave", clear);
  lifecycle.listen(input.svg, "pointercancel", clear);
  clear();
  return {
    getState: () => ({ hovered }), refreshTooltip: updateHit,
    suspend: lifecycle.suspend, resume: lifecycle.resume,
    destroy: () => {
      lifecycle.destroy();
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerleave", clear);
      input.svg.removeEventListener("pointercancel", clear);
      clear();
    },
  };
}
