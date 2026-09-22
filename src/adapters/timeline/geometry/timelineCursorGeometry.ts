import type { CivilDate } from "../../../domain/index.js";
import type { TimelineGeometry } from "./timelineGeometry.js";

export interface TimelineCursorGeometry {
  readonly date: CivilDate;
  readonly x: number;
  readonly y1: number;
  readonly y2: number;
}

export interface BuildTimelineCursorGeometryInput {
  readonly geometry: TimelineGeometry;
  readonly selectedDate: CivilDate;
}

export function buildTimelineCursorGeometry(
  input: BuildTimelineCursorGeometryInput,
): TimelineCursorGeometry {
  const day = input.geometry.dates.find(
    (candidate) => candidate.date === input.selectedDate,
  );
  if (day === undefined) {
    throw new TypeError(
      `Selected date ${input.selectedDate} is outside the timeline geometry.`,
    );
  }

  return Object.freeze({
    date: day.date,
    x: day.x + day.width / 2,
    y1: input.geometry.timeAxis.height,
    y2: input.geometry.height,
  });
}

export interface DateAtTimelineXInput {
  readonly geometry: TimelineGeometry;
  readonly x: number;
}

export function dateAtTimelineX(input: DateAtTimelineXInput): CivilDate {
  if (!Number.isFinite(input.x)) {
    throw new TypeError("Timeline x must be a finite number.");
  }
  const first = input.geometry.dates[0];
  const last = input.geometry.dates.at(-1);
  if (first === undefined || last === undefined) {
    throw new TypeError("Timeline geometry must contain at least one date.");
  }
  if (input.x <= first.x) return first.date;
  if (input.x >= last.x + last.width) return last.date;

  const day = input.geometry.dates.find(
    (candidate) =>
      input.x >= candidate.x && input.x < candidate.x + candidate.width,
  );
  if (day === undefined) {
    throw new TypeError("Timeline x does not match a date column.");
  }
  return day.date;
}
