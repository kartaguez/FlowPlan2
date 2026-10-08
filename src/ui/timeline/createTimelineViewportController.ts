import type { TemporalGeometry } from "../../adapters/temporal/temporalGeometry.js";
import { createInteractionLifecycle } from "../interactionLifecycle.js";
import { buildTimelineCursorGeometry } from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";
import { applyTimelineViewport } from "./applyTimelineViewport.js";
import {
  clampTimelineViewport,
  createFullTimelineViewport,
  panTimelineViewport,
  timelineViewportFromDateRange,
  zoomTimelineViewport,
  type TimelineViewportState,
} from "./timelineViewport.js";

const ZOOM_FACTOR = 1.25;
const MINIMUM_VISIBLE_DAYS = 7;

export interface TimelineViewportControlElements {
  readonly zoomIn: HTMLButtonElement;
  readonly zoomOut: HTMLButtonElement;
  readonly reset: HTMLButtonElement;
}

export interface TimelineViewportController {
  readonly getState: () => TimelineViewportState;
  readonly setVisibleDateRange: (startDate: CivilDate, endDate: CivilDate) => void;
  readonly suspend: () => void;
  readonly resume: () => void;
  readonly destroy: () => void;
}

export interface TemporalViewportControllerInput {
  readonly svg: SVGSVGElement;
  readonly pointerSurfaces?: readonly SVGSVGElement[];
  readonly geometry: TemporalGeometry;
  readonly controls: TimelineViewportControlElements;
  readonly initialViewport?: TimelineViewportState;
  readonly getProjectionDate?: () => CivilDate;
  readonly getZoomAnchorX?: (viewport: TimelineViewportState) => number;
  readonly onViewportChange?: (change: TemporalViewportChange) => void;
  readonly onPanStateChange?: (active: boolean) => void;
  readonly isPanPointerAllowed?: (event: PointerEvent) => boolean;
}

export interface TemporalViewportChange {
  readonly cause: "initial" | "zoom-button" | "range-zoom" | "reset" | "pan" | "restore" | "reference-change";
  readonly previous: TimelineViewportState; readonly next: TimelineViewportState;
}
export interface CreateTimelineViewportControllerInput extends TemporalViewportControllerInput {
  readonly getProjectionDate: () => CivilDate;
}

interface ActivePan {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startViewport: TimelineViewportState;
  readonly surface: SVGSVGElement;
}

export function createTimelineViewportController(input: CreateTimelineViewportControllerInput): TimelineViewportController {
  return createTemporalViewportController(input);
}

export function createTemporalViewportController(input: TemporalViewportControllerInput): TimelineViewportController {
  const fullViewport = createFullTimelineViewport(input.geometry.width);
  const minWidth = Math.min(
    input.geometry.width,
    MINIMUM_VISIBLE_DAYS * input.geometry.dayWidth,
  );
  let viewport =
    input.initialViewport === undefined
      ? fullViewport
      : clampTimelineViewport({
          viewport: input.initialViewport,
          geometryWidth: input.geometry.width,
          minWidth,
        });
  let activePan: ActivePan | undefined;

  const publish = (next: TimelineViewportState, cause: TemporalViewportChange["cause"]): void => {
    const previous = viewport;
    viewport = clampTimelineViewport({ viewport: next, geometryWidth: input.geometry.width, minWidth });
    applyTimelineViewport({
      svg: input.svg,
      geometry: input.geometry,
      viewport,
    });
    input.onViewportChange?.({ cause, previous, next: viewport });
  };
  const setVisibleDateRange = (startDate: CivilDate, endDate: CivilDate): void => {
    publish(timelineViewportFromDateRange({ geometry: input.geometry, startDate, endDate, minWidth }), "range-zoom");
  };
  const zoom = (scale: number): void => {
    const projectionX = input.getZoomAnchorX?.(viewport) ?? buildTimelineCursorGeometry({
      geometry: input.geometry, selectedDate: input.getProjectionDate!(),
    }).x;
    const anchorX = Math.max(viewport.x, Math.min(projectionX, viewport.x + viewport.width));
    publish(zoomTimelineViewport({
      viewport,
      geometryWidth: input.geometry.width,
      minWidth,
      anchorX,
      scale,
    }), "zoom-button");
  };
  const onZoomIn = (): void => zoom(1 / ZOOM_FACTOR);
  const onZoomOut = (): void => zoom(ZOOM_FACTOR);
  const onReset = (): void => {
    publish(fullViewport, "reset");
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!event.shiftKey || (input.isPanPointerAllowed && (activePan !== undefined || !input.isPanPointerAllowed(event)))) return;
    const surface = (event.currentTarget ?? input.svg) as SVGSVGElement;
    if (typeof surface.setPointerCapture === "function") {
      surface.setPointerCapture(event.pointerId);
    }
    activePan = Object.freeze({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startViewport: viewport, surface,
    });
    input.onPanStateChange?.(true);
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (activePan?.pointerId !== event.pointerId) return;
    const bounds = activePan.surface.getBoundingClientRect();
    if (!Number.isFinite(bounds.width) || bounds.width <= 0) {
      throw new TypeError("SVG displayed width must be finite and positive.");
    }
    const clientDelta = event.clientX - activePan.startClientX;
    const timelineDelta =
      (-clientDelta / bounds.width) * activePan.startViewport.width;
    publish(panTimelineViewport({
      viewport: activePan.startViewport,
      geometryWidth: input.geometry.width,
      deltaX: timelineDelta,
    }), "pan");
  };
  const stopPan = (event: PointerEvent): void => {
    if (activePan?.pointerId !== event.pointerId) return;
    releasePointerCapture(activePan.surface, event.pointerId);
    activePan = undefined;
    input.onPanStateChange?.(false);
  };

  const lifecycle = createInteractionLifecycle(() => {
    const pan = activePan; activePan = undefined;
    if (pan) { releasePointerCapture(pan.surface, pan.pointerId); input.onPanStateChange?.(false); }
  });
  lifecycle.listen(input.controls.zoomIn, "click", onZoomIn);
  lifecycle.listen(input.controls.zoomOut, "click", onZoomOut);
  lifecycle.listen(input.controls.reset, "click", onReset);
  for (const surface of new Set(input.pointerSurfaces ?? [input.svg])) {
    lifecycle.listen(surface, "pointerdown", onPointerDown);
    lifecycle.listen(surface, "pointermove", onPointerMove);
    lifecycle.listen(surface, "pointerup", stopPan);
    lifecycle.listen(surface, "pointercancel", stopPan);
  }
  publish(viewport, "initial");

  return Object.freeze({
    getState: () => viewport,
    setVisibleDateRange,
    suspend: lifecycle.suspend, resume: lifecycle.resume,
    destroy: () => {
      lifecycle.destroy();
      input.controls.zoomIn.removeEventListener("click", onZoomIn);
      input.controls.zoomOut.removeEventListener("click", onZoomOut);
      input.controls.reset.removeEventListener("click", onReset);
      input.svg.removeEventListener("pointerdown", onPointerDown);
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerup", stopPan);
      input.svg.removeEventListener("pointercancel", stopPan);
      if (activePan !== undefined) {
        releasePointerCapture(activePan.surface, activePan.pointerId);
      }
      activePan = undefined;
    },
  });
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
