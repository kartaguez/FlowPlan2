import type { CivilDate } from "../../domain/index.js";
import type { TimelineDateGeometry, TimelineTimeAxisGeometry, TimelineYearGeometry, TimelineMonthGeometry } from "../timeline/geometry/timelineGeometry.js";

/** Minimum temporal contract, shared without Team or PlanningResult stand-ins. */
export interface TemporalGeometry {
  readonly width: number; readonly height: number; readonly dayWidth: number;
  readonly dates: readonly TimelineDateGeometry[];
  readonly timeAxis: TimelineTimeAxisGeometry;
}

const MONTH_LABELS = Object.freeze([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]);

export function buildTimeAxisGeometry(
  dates: readonly CivilDate[],
  dayWidth: number,
  width: number,
  height: number,
  labelHeight: number,
): TimelineTimeAxisGeometry {
  const rowHeight = (height - labelHeight) / 2;
  const years = buildTimeSegments(dates, dayWidth, labelHeight, rowHeight, "year");
  const months = buildTimeSegments(
    dates,
    dayWidth,
    labelHeight + rowHeight,
    rowHeight,
    "month",
  );

  return Object.freeze({
    x: 0,
    y: 0,
    width,
    height,
    projectionBand: Object.freeze({ x: 0, y: 0, width, height: labelHeight }),
    years: Object.freeze(years) as readonly TimelineYearGeometry[],
    months: Object.freeze(months) as readonly TimelineMonthGeometry[],
  });
}

function buildTimeSegments(
  dates: readonly CivilDate[],
  dayWidth: number,
  y: number,
  height: number,
  kind: "year" | "month",
): readonly (TimelineYearGeometry | TimelineMonthGeometry)[] {
  const segments: (TimelineYearGeometry | TimelineMonthGeometry)[] = [];
  let startIndex = 0;

  while (startIndex < dates.length) {
    const startDate = dates[startIndex]!;
    const year = civilDateYear(startDate);
    const month = civilDateMonth(startDate);
    let endIndex = startIndex + 1;
    while (
      endIndex < dates.length &&
      civilDateYear(dates[endIndex]!) === year &&
      (kind === "year" || civilDateMonth(dates[endIndex]!) === month)
    ) {
      endIndex += 1;
    }

    const x = startIndex * dayWidth;
    const segmentWidth = (endIndex - startIndex) * dayWidth;
    const common = {
      x,
      y,
      width: segmentWidth,
      height,
      labelX: x + segmentWidth / 2,
      labelY: y + height / 2,
    };
    segments.push(
      Object.freeze(
        kind === "year"
          ? { ...common, year, label: String(year) }
          : {
              ...common,
              year,
              month,
              label: requireMonthLabel(month),
            },
      ),
    );
    startIndex = endIndex;
  }

  return segments;
}

function civilDateYear(date: CivilDate): number {
  return Number(date.slice(0, 4));
}

function civilDateMonth(date: CivilDate): number {
  return Number(date.slice(5, 7));
}

function requireMonthLabel(month: number): string {
  const label = MONTH_LABELS[month - 1];
  if (label === undefined) {
    throw new TypeError(`Invalid CivilDate month ${month}.`);
  }
  return label;
}
