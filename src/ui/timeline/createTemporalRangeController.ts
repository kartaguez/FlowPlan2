import { createInteractionLifecycle } from "../interactionLifecycle.js";
import type { TemporalGeometry } from "../../adapters/temporal/temporalGeometry.js";
import { dateAtTimelineX } from "../../adapters/timeline/geometry/timelineCursorGeometry.js";
import type { CivilDate } from "../../domain/index.js";
import { timelineXFromClientX, type TimelineViewportState } from "./timelineViewport.js";
import type { TimelineRangeSelection } from "./renderTimelineRangeSelection.js";

const RANGE_DRAG_THRESHOLD_CSS_PX = 4;

interface ActiveGesture {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startDate: CivilDate;
  dragging: boolean;
}

/** Shared primary pointer gesture; cursor/History clicks remain view-owned. */
export function createTemporalRangeController(input: {
  readonly svg: SVGSVGElement; readonly geometry: TemporalGeometry;
  readonly getViewport: () => TimelineViewportState;
  readonly onClick?: (date: CivilDate, event: PointerEvent) => void;
  readonly onVisibleDateRange?: (start: CivilDate, end: CivilDate) => void;
  readonly onRangePreviewChange?: (range: TimelineRangeSelection | undefined) => void;
}) {
  let activeGesture: ActiveGesture | undefined;
  const dateFromPointer = (event: PointerEvent): CivilDate => {
    const bounds = input.svg.getBoundingClientRect();
    const x = timelineXFromClientX({
      clientX: Math.max(bounds.left, Math.min(event.clientX, bounds.left + bounds.width)),
      svgLeft: bounds.left,
      svgWidth: bounds.width,
      viewport: input.getViewport(),
    });
    return dateAtTimelineX({ geometry: input.geometry, x });
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.shiftKey || activeGesture !== undefined ||
      (event.button !== undefined && event.button !== 0) || event.isPrimary === false) return;
    if (typeof input.svg.setPointerCapture === "function") {
      input.svg.setPointerCapture(event.pointerId);
    }
    activeGesture = { pointerId: event.pointerId, startClientX: event.clientX,
      startDate: dateFromPointer(event), dragging: false };
    event.preventDefault?.();
  };
  const onPointerMove = (event: PointerEvent): void => {
    const gesture = activeGesture;
    if (gesture?.pointerId !== event.pointerId) return;
    if (!gesture.dragging &&
      Math.abs(event.clientX - gesture.startClientX) >= RANGE_DRAG_THRESHOLD_CSS_PX) {
      gesture.dragging = true;
    }
    if (gesture.dragging) {
      input.onRangePreviewChange?.({ startDate: gesture.startDate, endDate: dateFromPointer(event) });
      event.preventDefault?.();
    }
  };
  const finishPointer = (event: PointerEvent, cancelled: boolean): void => {
    const gesture = activeGesture;
    if (gesture?.pointerId !== event.pointerId) return;
    if (!cancelled) {
      if (!gesture.dragging &&
        Math.abs(event.clientX - gesture.startClientX) >= RANGE_DRAG_THRESHOLD_CSS_PX) {
        gesture.dragging = true;
      }
      const endDate = dateFromPointer(event);
      if (gesture.dragging) {
        const start = gesture.startDate <= endDate ? gesture.startDate : endDate;
        const end = gesture.startDate <= endDate ? endDate : gesture.startDate;
        input.onVisibleDateRange?.(start, end);
      } else {
        input.onClick?.(endDate, event);
      }
    }
    releasePointerCapture(input.svg, event.pointerId);
    activeGesture = undefined;
    if (gesture.dragging) input.onRangePreviewChange?.(undefined);
  };
  const onPointerUp = (event: PointerEvent): void => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent): void => finishPointer(event, true);
  const lifecycle = createInteractionLifecycle(() => {
    const gesture = activeGesture; activeGesture = undefined;
    if (gesture) {
      releasePointerCapture(input.svg, gesture.pointerId);
      if (gesture.dragging) input.onRangePreviewChange?.(undefined);
    }
  });
  lifecycle.listen(input.svg, "pointerdown", onPointerDown);
  lifecycle.listen(input.svg, "pointermove", onPointerMove);
  lifecycle.listen(input.svg, "pointerup", onPointerUp);
  lifecycle.listen(input.svg, "pointercancel", onPointerCancel);
  return { suspend: lifecycle.suspend, resume: lifecycle.resume, destroy: lifecycle.destroy };
}

function releasePointerCapture(svg: SVGSVGElement, pointerId: number): void {
  if (typeof svg.releasePointerCapture !== "function") return;
  if (
    typeof svg.hasPointerCapture !== "function" ||
    svg.hasPointerCapture(pointerId)
  ) {
    svg.releasePointerCapture(pointerId);
  }
}
