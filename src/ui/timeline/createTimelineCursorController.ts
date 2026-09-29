import {
  buildTimelineCursorGeometry,
  dateAtTimelineX,
  type TimelineGeometry,
} from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";
import { renderTimelineCursor } from "./renderTimelineCursor.js";
import type { TimelineRangeSelection } from "./renderTimelineRangeSelection.js";
import { preserveTimelineLabelTypography } from "./applyTimelineViewport.js";
import {
  timelineXFromClientX,
  type TimelineViewportState,
} from "./timelineViewport.js";

export { timelineXFromClientX } from "./timelineViewport.js";

export interface TimelineCursorState {
  readonly selectedDate: CivilDate;
}

export interface TimelineCursorController {
  readonly getState: () => TimelineCursorState;
  readonly refresh: () => void;
  readonly destroy: () => void;
}

export interface CreateTimelineCursorControllerInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly teamCollectionRow?: HTMLElement;
  readonly cursorControl?: HTMLButtonElement;
  readonly initialDate: CivilDate;
  readonly getViewport: () => TimelineViewportState;
  readonly isModalOpen: () => boolean;
  readonly onSelectedDateChange?: (date: CivilDate) => void;
  readonly onVisibleDateRange?: (startDate: CivilDate, endDate: CivilDate) => void;
  readonly onRangePreviewChange?: (range: TimelineRangeSelection | undefined) => void;
}

const RANGE_DRAG_THRESHOLD_CSS_PX = 4;

interface ActiveGesture {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startDate: CivilDate;
  dragging: boolean;
}

export function createTimelineCursorController(
  input: CreateTimelineCursorControllerInput,
): TimelineCursorController {
  let selectedDate = input.initialDate;
  let activeGesture: ActiveGesture | undefined;
  const dates = input.geometry.dates.map((day) => day.date);

  const render = (): void => {
    const cursor = buildTimelineCursorGeometry({
      geometry: input.geometry,
      selectedDate,
    });
    const viewport = input.getViewport();
    const renderedWidth = input.svg.getBoundingClientRect?.().width ?? 0;
    const labelMargin = renderedWidth > 0
      ? Math.min(34, renderedWidth / 2) * viewport.width / renderedWidth : 0;
    const labelX = Math.max(viewport.x + labelMargin,
      Math.min(cursor.x, viewport.x + viewport.width - labelMargin));
    renderTimelineCursor({ svg: input.svg, cursor, labelX, geometry: input.geometry });
    input.teamCollectionRow?.style.setProperty(
      "--fp-collection-cursor-x",
      `${(cursor.x - viewport.x) / viewport.width * 100}%`,
    );
    preserveTimelineLabelTypography(input.svg, viewport, input.geometry.height);
    if (input.cursorControl) {
      input.cursorControl.textContent = `Projection date: ${selectedDate}`;
      input.cursorControl.setAttribute(
        "aria-label",
        `Projection date ${selectedDate}`,
      );
    }
    input.svg.setAttribute("aria-label", `Planning timeline. Projection date ${selectedDate}. Use Left and Right arrows to move the date.`);
  };

  const setSelectedDate = (nextDate: CivilDate): void => {
    if (nextDate === selectedDate) return;
    selectedDate = nextDate;
    render();
    input.onSelectedDateChange?.(selectedDate);
  };

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
        setSelectedDate(endDate);
      }
    }
    releasePointerCapture(input.svg, event.pointerId);
    activeGesture = undefined;
    if (gesture.dragging) input.onRangePreviewChange?.(undefined);
  };
  const onPointerUp = (event: PointerEvent): void => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent): void => finishPointer(event, true);
  const moveDate = (direction: -1 | 1): void => {
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex < 0) {
      throw new TypeError(`Selected date ${selectedDate} is outside the timeline.`);
    }
    setSelectedDate(dates[Math.max(0, Math.min(dates.length - 1, currentIndex + direction))]!);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveDate(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveDate(1);
        break;
      case "Home":
        event.preventDefault();
        setSelectedDate(dates[0]!);
        break;
      case "End":
        event.preventDefault();
        setSelectedDate(dates.at(-1)!);
        break;
    }
  };
  const onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || input.isModalOpen()) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea" || target?.isContentEditable ||
      target?.closest?.('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    event.preventDefault();
    moveDate(event.key === "ArrowLeft" ? -1 : 1);
  };

  input.svg.addEventListener("pointerdown", onPointerDown);
  input.svg.addEventListener("pointermove", onPointerMove);
  input.svg.addEventListener("pointerup", onPointerUp);
  input.svg.addEventListener("pointercancel", onPointerCancel);
  input.svg.addEventListener("keydown", onKeyDown);
  input.cursorControl?.addEventListener("keydown", onKeyDown);
  input.svg.ownerDocument.addEventListener("keydown", onDocumentKeyDown);
  render();

  return Object.freeze({
    getState: () => Object.freeze({ selectedDate }),
    refresh: render,
    destroy: () => {
      input.svg.removeEventListener("pointerdown", onPointerDown);
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerup", onPointerUp);
      input.svg.removeEventListener("pointercancel", onPointerCancel);
      input.svg.removeEventListener("keydown", onKeyDown);
      input.cursorControl?.removeEventListener("keydown", onKeyDown);
      input.svg.ownerDocument.removeEventListener("keydown", onDocumentKeyDown);
      if (activeGesture !== undefined) {
        releasePointerCapture(input.svg, activeGesture.pointerId);
        if (activeGesture.dragging) input.onRangePreviewChange?.(undefined);
      }
      activeGesture = undefined;
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
