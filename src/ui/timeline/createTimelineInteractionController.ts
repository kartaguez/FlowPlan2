import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type { ProjectId, Rational } from "../../domain/index.js";
import { renderTimelineSelection } from "./renderTimelineSelection.js";
import {
  createTimelineInteractionLookup,
  renderTimelineSelectionSummary,
  renderTimelineTooltip,
} from "./renderTimelineInteractionDetails.js";
import {
  hitTestTimelineGeometry,
  type TimelineHit,
} from "./timelineHitTesting.js";
import { buildTimelineSelectionGeometry } from "./timelineSelectionGeometry.js";
import {
  timelinePointFromClientPoint,
  type TimelineViewportState,
} from "./timelineViewport.js";

export const MARKER_HIT_TOLERANCE_CSS_PX = 4;
export const CLICK_DRAG_THRESHOLD_CSS_PX = 4;

export interface TimelineInteractionState {
  readonly hovered: TimelineHit | undefined;
  readonly selected: TimelineHit | undefined;
}

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
  readonly selectionSummaryContainer: HTMLElement;
  readonly keyboardControl: HTMLElement;
  readonly initialSelected?: TimelineHit;
  readonly onSelectionChange?: (selected: TimelineHit | undefined) => void;
  readonly getProjectProgress?: (projectId: ProjectId) => Rational | undefined;
}

interface PointerPress {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  dragged: boolean;
}

export function createTimelineInteractionController(
  input: CreateTimelineInteractionControllerInput,
): TimelineInteractionController {
  const lookup = createTimelineInteractionLookup(input.viewModel);
  let hovered: TimelineHit | undefined;
  let hoverPoint = { clientX: 0, clientY: 0 };
  let selected = input.initialSelected;
  let pointerPress: PointerPress | undefined;
  let ignoredShiftPointerId: number | undefined;

  const hitAtPointer = (event: PointerEvent): TimelineHit | undefined => {
    const bounds = input.svg.getBoundingClientRect();
    const viewport = input.getViewport();
    const point = timelinePointFromClientPoint({
      clientX: event.clientX,
      clientY: event.clientY,
      svgLeft: bounds.left,
      svgTop: bounds.top,
      svgWidth: bounds.width,
      svgHeight: bounds.height,
      viewport,
      geometryHeight: input.geometry.height,
    });
    return hitTestTimelineGeometry({
      geometry: input.geometry,
      x: point.x,
      y: point.y,
      markerHitTolerance:
        (MARKER_HIT_TOLERANCE_CSS_PX / bounds.width) * viewport.width,
    });
  };
  const clearHover = (): void => {
    hovered = undefined;
    renderTimelineTooltip({
      container: input.tooltipContainer,
      lookup,
      hit: undefined,
      clientX: 0,
      clientY: 0,
    });
  };
  const showHover = (event: PointerEvent): void => {
    hovered = hitAtPointer(event);
    hoverPoint = { clientX: event.clientX, clientY: event.clientY };
    renderTimelineTooltip({
      container: input.tooltipContainer,
      lookup,
      hit: hovered,
      clientX: event.clientX,
      clientY: event.clientY,
      ...(input.getProjectProgress === undefined ? {} : { getProjectProgress: input.getProjectProgress }),
    });
  };
  const renderSelection = (): void => {
    renderTimelineSelection({
      svg: input.svg,
      selection:
        selected === undefined
          ? undefined
          : buildTimelineSelectionGeometry(input.geometry, selected),
    });
    renderTimelineSelectionSummary({
      container: input.selectionSummaryContainer,
      lookup,
      selected,
    });
    input.onSelectionChange?.(selected);
  };
  const onPointerDown = (event: PointerEvent): void => {
    clearHover();
    if (event.shiftKey) {
      ignoredShiftPointerId = event.pointerId;
      pointerPress = undefined;
      return;
    }
    pointerPress = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragged: false,
    };
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (ignoredShiftPointerId === event.pointerId) {
      clearHover();
      return;
    }
    if (pointerPress?.pointerId === event.pointerId) {
      if (
        Math.hypot(
          event.clientX - pointerPress.startClientX,
          event.clientY - pointerPress.startClientY,
        ) > CLICK_DRAG_THRESHOLD_CSS_PX
      ) {
        pointerPress.dragged = true;
      }
      clearHover();
      return;
    }
    showHover(event);
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (ignoredShiftPointerId === event.pointerId) {
      ignoredShiftPointerId = undefined;
      clearHover();
      return;
    }
    if (pointerPress?.pointerId !== event.pointerId) return;
    const moved = Math.hypot(
      event.clientX - pointerPress.startClientX,
      event.clientY - pointerPress.startClientY,
    );
    const isClick =
      !pointerPress.dragged && moved <= CLICK_DRAG_THRESHOLD_CSS_PX;
    pointerPress = undefined;
    if (!isClick) {
      clearHover();
      return;
    }
    selected = hitAtPointer(event);
    renderSelection();
    showHover(event);
  };
  const onPointerCancel = (event: PointerEvent): void => {
    if (ignoredShiftPointerId === event.pointerId) {
      ignoredShiftPointerId = undefined;
    }
    if (pointerPress?.pointerId === event.pointerId) pointerPress = undefined;
    clearHover();
  };
  const onPointerLeave = (): void => clearHover();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    selected = undefined;
    renderSelection();
  };

  input.svg.addEventListener("pointerdown", onPointerDown);
  input.svg.addEventListener("pointermove", onPointerMove);
  input.svg.addEventListener("pointerup", onPointerUp);
  input.svg.addEventListener("pointercancel", onPointerCancel);
  input.svg.addEventListener("pointerleave", onPointerLeave);
  input.keyboardControl.addEventListener("keydown", onKeyDown);
  clearHover();
  renderSelection();

  return Object.freeze({
    getState: () => Object.freeze({ hovered, selected }),
    refreshTooltip: () => renderTimelineTooltip({ container: input.tooltipContainer, lookup,
      hit: hovered, ...hoverPoint,
      ...(input.getProjectProgress === undefined ? {} : { getProjectProgress: input.getProjectProgress }) }),
    destroy: () => {
      input.svg.removeEventListener("pointerdown", onPointerDown);
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerup", onPointerUp);
      input.svg.removeEventListener("pointercancel", onPointerCancel);
      input.svg.removeEventListener("pointerleave", onPointerLeave);
      input.keyboardControl.removeEventListener("keydown", onKeyDown);
      pointerPress = undefined;
      ignoredShiftPointerId = undefined;
      clearHover();
    },
  });
}
