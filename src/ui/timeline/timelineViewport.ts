import { GEOMETRY_EPSILON } from "../../adapters/index.js";

export interface TimelineViewportState {
  readonly x: number;
  readonly width: number;
}

export interface ClampTimelineViewportInput {
  readonly viewport: TimelineViewportState;
  readonly geometryWidth: number;
  readonly minWidth: number;
}

export function createFullTimelineViewport(
  geometryWidth: number,
): TimelineViewportState {
  validatePositiveFinite(geometryWidth, "Geometry width");
  return Object.freeze({ x: 0, width: geometryWidth });
}

export function clampTimelineViewport(
  input: ClampTimelineViewportInput,
): TimelineViewportState {
  validatePositiveFinite(input.geometryWidth, "Geometry width");
  validatePositiveFinite(input.minWidth, "Minimum viewport width");
  if (!Number.isFinite(input.viewport.x)) {
    throw new TypeError("Viewport x must be finite.");
  }
  validatePositiveFinite(input.viewport.width, "Viewport width");

  const minimumWidth = Math.min(input.minWidth, input.geometryWidth);
  const width = Math.min(
    input.geometryWidth,
    Math.max(minimumWidth, input.viewport.width),
  );
  let x = Math.min(
    input.geometryWidth - width,
    Math.max(0, input.viewport.x),
  );
  if (Math.abs(x) <= GEOMETRY_EPSILON) x = 0;
  if (
    Math.abs(x + width - input.geometryWidth) <= GEOMETRY_EPSILON
  ) {
    x = input.geometryWidth - width;
  }
  return Object.freeze({ x, width });
}

export interface ZoomTimelineViewportInput
  extends Omit<ClampTimelineViewportInput, "viewport"> {
  readonly viewport: TimelineViewportState;
  readonly anchorX: number;
  readonly scale: number;
}

export function zoomTimelineViewport(
  input: ZoomTimelineViewportInput,
): TimelineViewportState {
  if (!Number.isFinite(input.anchorX)) {
    throw new TypeError("Zoom anchor must be finite.");
  }
  validatePositiveFinite(input.scale, "Zoom scale");
  const current = clampTimelineViewport(input);
  const anchorRatio = (input.anchorX - current.x) / current.width;
  const width = Math.min(
    input.geometryWidth,
    Math.max(
      Math.min(input.minWidth, input.geometryWidth),
      current.width * input.scale,
    ),
  );
  const x = input.anchorX - anchorRatio * width;
  return clampTimelineViewport({
    viewport: { x, width },
    geometryWidth: input.geometryWidth,
    minWidth: input.minWidth,
  });
}

export interface PanTimelineViewportInput {
  readonly viewport: TimelineViewportState;
  readonly geometryWidth: number;
  readonly deltaX: number;
}

export function panTimelineViewport(
  input: PanTimelineViewportInput,
): TimelineViewportState {
  if (!Number.isFinite(input.deltaX)) {
    throw new TypeError("Pan delta must be finite.");
  }
  return clampTimelineViewport({
    viewport: {
      x: input.viewport.x + input.deltaX,
      width: input.viewport.width,
    },
    geometryWidth: input.geometryWidth,
    minWidth: input.viewport.width,
  });
}

export interface TimelineXFromClientXInput {
  readonly clientX: number;
  readonly svgLeft: number;
  readonly svgWidth: number;
  readonly viewport: TimelineViewportState;
}

export function timelineXFromClientX(
  input: TimelineXFromClientXInput,
): number {
  if (
    !Number.isFinite(input.clientX) ||
    !Number.isFinite(input.svgLeft) ||
    !Number.isFinite(input.svgWidth) ||
    input.svgWidth <= 0
  ) {
    throw new TypeError("Pointer geometry must contain finite positive widths.");
  }
  if (!Number.isFinite(input.viewport.x)) {
    throw new TypeError("Viewport x must be finite.");
  }
  validatePositiveFinite(input.viewport.width, "Viewport width");
  const relativeX = (input.clientX - input.svgLeft) / input.svgWidth;
  return input.viewport.x + relativeX * input.viewport.width;
}

export interface TimelinePointFromClientPointInput
  extends TimelineXFromClientXInput {
  readonly clientY: number;
  readonly svgTop: number;
  readonly svgHeight: number;
  readonly geometryHeight: number;
}

export interface TimelinePoint {
  readonly x: number;
  readonly y: number;
}

export function timelinePointFromClientPoint(
  input: TimelinePointFromClientPointInput,
): TimelinePoint {
  if (
    !Number.isFinite(input.clientY) ||
    !Number.isFinite(input.svgTop) ||
    !Number.isFinite(input.svgHeight) ||
    input.svgHeight <= 0 ||
    !Number.isFinite(input.geometryHeight) ||
    input.geometryHeight <= 0
  ) {
    throw new TypeError("Pointer geometry must contain finite positive heights.");
  }
  return Object.freeze({
    x: timelineXFromClientX(input),
    y:
      ((input.clientY - input.svgTop) / input.svgHeight) *
      input.geometryHeight,
  });
}

function validatePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be finite and positive.`);
  }
}
