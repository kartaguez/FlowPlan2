import {
  buildTimelineCursorGeometry,
  dateAtTimelineX,
  type TimelineGeometry,
  type TimelineViewModel,
} from "../../adapters/index.js";
import type { CivilDate } from "../../domain/index.js";
import { renderTimelineCursor } from "./renderTimelineCursor.js";
import { renderTimelineDateSummary } from "./renderTimelineDateSummary.js";
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
  readonly destroy: () => void;
}

export interface CreateTimelineCursorControllerInput {
  readonly svg: SVGSVGElement;
  readonly geometry: TimelineGeometry;
  readonly viewModel: TimelineViewModel;
  readonly summaryContainer: HTMLElement;
  readonly cursorControl: HTMLButtonElement;
  readonly initialDate: CivilDate;
  readonly getViewport: () => TimelineViewportState;
  readonly onSelectedDateChange?: (date: CivilDate) => void;
}

export function createTimelineCursorController(
  input: CreateTimelineCursorControllerInput,
): TimelineCursorController {
  let selectedDate = input.initialDate;
  let activePointerId: number | undefined;
  const dates = input.geometry.dates.map((day) => day.date);

  const render = (): void => {
    const cursor = buildTimelineCursorGeometry({
      geometry: input.geometry,
      selectedDate,
    });
    renderTimelineCursor({ svg: input.svg, cursor });
    renderTimelineDateSummary({
      container: input.summaryContainer,
      viewModel: input.viewModel,
      selectedDate,
    });
    input.cursorControl.textContent = `Selected date: ${selectedDate}`;
    input.cursorControl.setAttribute(
      "aria-label",
      `Timeline date cursor, selected date ${selectedDate}`,
    );
  };

  const setSelectedDate = (nextDate: CivilDate): void => {
    if (nextDate === selectedDate) return;
    selectedDate = nextDate;
    render();
    input.onSelectedDateChange?.(selectedDate);
  };

  const selectFromPointer = (event: PointerEvent): void => {
    const bounds = input.svg.getBoundingClientRect();
    const x = timelineXFromClientX({
      clientX: event.clientX,
      svgLeft: bounds.left,
      svgWidth: bounds.width,
      viewport: input.getViewport(),
    });
    setSelectedDate(dateAtTimelineX({ geometry: input.geometry, x }));
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.shiftKey) return;
    if (typeof input.svg.setPointerCapture === "function") {
      input.svg.setPointerCapture(event.pointerId);
    }
    activePointerId = event.pointerId;
    selectFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    selectFromPointer(event);
  };
  const stopPointer = (event: PointerEvent): void => {
    if (activePointerId !== event.pointerId) return;
    releasePointerCapture(input.svg, event.pointerId);
    activePointerId = undefined;
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex < 0) {
      throw new TypeError(`Selected date ${selectedDate} is outside the timeline.`);
    }

    let nextIndex: number | undefined;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case "ArrowRight":
        nextIndex = Math.min(dates.length - 1, currentIndex + 1);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = dates.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelectedDate(dates[nextIndex]!);
  };

  input.svg.addEventListener("pointerdown", onPointerDown);
  input.svg.addEventListener("pointermove", onPointerMove);
  input.svg.addEventListener("pointerup", stopPointer);
  input.svg.addEventListener("pointercancel", stopPointer);
  input.cursorControl.addEventListener("keydown", onKeyDown);
  render();

  return Object.freeze({
    getState: () => Object.freeze({ selectedDate }),
    destroy: () => {
      input.svg.removeEventListener("pointerdown", onPointerDown);
      input.svg.removeEventListener("pointermove", onPointerMove);
      input.svg.removeEventListener("pointerup", stopPointer);
      input.svg.removeEventListener("pointercancel", stopPointer);
      input.cursorControl.removeEventListener("keydown", onKeyDown);
      if (activePointerId !== undefined) {
        releasePointerCapture(input.svg, activePointerId);
      }
      activePointerId = undefined;
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
