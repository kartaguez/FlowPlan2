import { createTemporalRangeController } from "./createTemporalRangeController.js";
import { createInteractionLifecycle } from "../interactionLifecycle.js";
import {
  buildTimelineCursorGeometry,
  type TimelineGeometry,
} from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";
import { renderTimelineCursor } from "./renderTimelineCursor.js";
import type { TimelineRangeSelection } from "./renderTimelineRangeSelection.js";
import { preserveTimelineLabelTypography } from "./applyTimelineViewport.js";
import {
  type TimelineViewportState,
} from "./timelineViewport.js";

export { timelineXFromClientX } from "./timelineViewport.js";

export interface TimelineCursorState {
  readonly selectedDate: CivilDate;
}

export interface TimelineCursorController {
  readonly getState: () => TimelineCursorState;
  readonly refresh: () => void;
  readonly suspend: () => void;
  readonly resume: () => void;
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

export function createTimelineCursorController(
  input: CreateTimelineCursorControllerInput,
): TimelineCursorController {
  let selectedDate = input.initialDate;
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

  const range = createTemporalRangeController({ svg: input.svg, geometry: input.geometry,
    getViewport: input.getViewport, onClick: setSelectedDate,
    ...(input.onVisibleDateRange ? { onVisibleDateRange: input.onVisibleDateRange } : {}),
    ...(input.onRangePreviewChange ? { onRangePreviewChange: input.onRangePreviewChange } : {}),
  });
  const lifecycle = createInteractionLifecycle();
  lifecycle.listen(input.svg, "keydown", onKeyDown);
  lifecycle.listen(input.cursorControl, "keydown", onKeyDown);
  lifecycle.listen(input.svg.ownerDocument, "keydown", onDocumentKeyDown);
  render();

  return Object.freeze({
    getState: () => Object.freeze({ selectedDate }),
    refresh: render,
    suspend: () => { range.suspend(); lifecycle.suspend(); },
    resume: () => { range.resume(); lifecycle.resume(); },
    destroy: () => { range.destroy(); lifecycle.destroy(); },
  });
}
