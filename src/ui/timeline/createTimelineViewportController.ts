import type { TimelineGeometry } from "../../adapters/index.js";
import { applyTimelineViewport } from "./applyTimelineViewport.js";
import {
  createFullTimelineViewport,
  panTimelineViewport,
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
  readonly destroy: () => void;
}

export interface CreateTimelineViewportControllerInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly controls: TimelineViewportControlElements;
}

interface ActivePan {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startViewport: TimelineViewportState;
}

export function createTimelineViewportController(
  input: CreateTimelineViewportControllerInput,
): TimelineViewportController {
  const fullViewport = createFullTimelineViewport(input.geometry.width);
  const minWidth = Math.min(
    input.geometry.width,
    MINIMUM_VISIBLE_DAYS * input.geometry.dayWidth,
  );
  let viewport = fullViewport;
  let activePan: ActivePan | undefined;

  const render = (): void => {
    applyTimelineViewport({
      svg: input.svg,
      geometry: input.geometry,
      viewport,
    });
  };
  const zoom = (scale: number): void => {
    const anchorX = viewport.x + viewport.width / 2;
    viewport = zoomTimelineViewport({
      viewport,
      geometryWidth: input.geometry.width,
      minWidth,
      anchorX,
      scale,
    });
    render();
  };
  const onZoomIn = (): void => zoom(1 / ZOOM_FACTOR);
  const onZoomOut = (): void => zoom(ZOOM_FACTOR);
  const onReset = (): void => {
    viewport = fullViewport;
    render();
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!event.shiftKey) return;
    if (typeof input.svg.setPointerCapture === "function") {
      input.svg.setPointerCapture(event.pointerId);
    }
    activePan = Object.freeze({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startViewport: viewport,
    });
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (activePan?.pointerId !== event.pointerId) return;
    const bounds = input.svg.getBoundingClientRect();
    if (!Number.isFinite(bounds.width) || bounds.width <= 0) {
      throw new TypeError("SVG displayed width must be finite and positive.");
    }
    const clientDelta = event.clientX - activePan.startClientX;
    const timelineDelta =
      (-clientDelta / bounds.width) * activePan.startViewport.width;
    viewport = panTimelineViewport({
      viewport: activePan.startViewport,
      geometryWidth: input.geometry.width,
      deltaX: timelineDelta,
    });
    render();
  };
  const stopPan = (event: PointerEvent): void => {
    if (activePan?.pointerId !== event.pointerId) return;
    releasePointerCapture(input.svg, event.pointerId);
    activePan = undefined;
  };

  input.controls.zoomIn.addEventListener("click", onZoomIn);
  input.controls.zoomOut.addEventListener("click", onZoomOut);
  input.controls.reset.addEventListener("click", onReset);
  input.svg.addEventListener("pointerdown", onPointerDown);
  input.svg.addEventListener("pointermove", onPointerMove);
  input.svg.addEventListener("pointerup", stopPan);
  input.svg.addEventListener("pointercancel", stopPan);
  render();

  return Object.freeze({
    getState: () => viewport,
    destroy: () => {
      input.controls.zoomIn.removeEventListener("click", onZoomIn);
      input.controls.zoomOut.removeEventListener("click", onZoomOut);
      input.controls.reset.removeEventListener("click", onReset);
      input.svg.removeEventListener("pointerdown", onPointerDown);
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerup", stopPan);
      input.svg.removeEventListener("pointercancel", stopPan);
      if (activePan !== undefined) {
        releasePointerCapture(input.svg, activePan.pointerId);
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
