import { historyDayIndex, type ProjectHistoryViewModel, type HistoryPresentRow, type HistoryDay } from "../../../application/history/buildProjectHistoryViewModel.js";
import { civilDatesInclusive, civilDayDifference, type CivilDate } from "../../../domain/model/date.js";
import { addRationals, compareRationals, createRational, minRational, multiplyRationals, rationalFromInteger, subtractRationals, type Rational } from "../../../domain/model/rational.js";
import { buildTimeAxisGeometry, type TemporalGeometry } from "../../temporal/temporalGeometry.js";
import type { TimelineViewportState } from "../../../ui/timeline/timelineViewport.js";

export const HISTORY_ROW_HEIGHT = 30, HISTORY_GROUP_HEADER_HEIGHT = 52, HISTORY_GROUP_GAP = 14, HISTORY_DRAW_HEIGHT = 22, HISTORY_AXIS_HEIGHT = 44;
export interface HistoryCellGeometry {
  readonly day: HistoryDay; readonly x: number; readonly width: number;
  readonly actualsHeight: number; readonly forecastHeight: number; readonly capped: boolean;
}
export interface HistoryRowGeometry {
  readonly projectIndex: number; readonly snapshotIndex: number; readonly y: number;
  readonly row: HistoryPresentRow; readonly cells: readonly HistoryCellGeometry[];
  readonly knowledgeX: number | null;
}
export interface ProjectHistoryGeometry extends TemporalGeometry {
  readonly groupHeight: number; readonly rows: readonly HistoryRowGeometry[];
  readonly viewport: TimelineViewportState; readonly cap: Rational;
}
export function createHistoryTemporalGeometry(model: ProjectHistoryViewModel, width = 2160): TemporalGeometry & { readonly groupHeight: number } {
  if (!model.horizon) throw new TypeError("History has no reference horizon.");
  const dates = civilDatesInclusive(model.horizon.from, model.horizon.through);
  const dayWidth = width / dates.length;
  const groupHeight = HISTORY_GROUP_HEADER_HEIGHT + model.snapshots.length * HISTORY_ROW_HEIGHT + HISTORY_GROUP_GAP;
  return Object.freeze({ width, dayWidth, groupHeight,
    height: Math.max(1, groupHeight * model.projects.length),
    dates: Object.freeze(dates.map((date, i) => Object.freeze({ date, x: i * dayWidth, width: dayWidth }))),
    timeAxis: buildTimeAxisGeometry(dates, dayWidth, width, HISTORY_AXIS_HEIGHT, 0),
  });
}
export function visibleHistoryDates(geometry: TemporalGeometry, viewport: TimelineViewportState): readonly [CivilDate, CivilDate] {
  const first = Math.max(0, Math.floor(viewport.x / geometry.dayWidth));
  const last = Math.min(geometry.dates.length - 1, Math.ceil((viewport.x + viewport.width) / geometry.dayWidth) - 1);
  return [geometry.dates[first]!.date, geometry.dates[last]!.date];
}
export function computeHistoryVisualCap(model: ProjectHistoryViewModel, geometry: TemporalGeometry, viewport: TimelineViewportState): Rational {
  const [from, through] = visibleHistoryDates(geometry, viewport);
  const values: Rational[] = [];
  for (const project of model.projects) for (const row of project.rows) {
    if (row.kind !== "present" || row.profile !== "available") continue;
    for (let i = historyDayIndex(row.days, from); i < row.days.length && row.days[i]!.date <= through; i++) {
      const day = row.days[i]!;
      // Strict positive intersection avoids border-only samples, including floating boundary noise.
      const x = civilDayDifference(day.date, geometry.dates[0]!.date) * geometry.dayWidth;
      if (Math.min(x + geometry.dayWidth, viewport.x + viewport.width) > Math.max(x, viewport.x) && day.total.numerator > 0n) values.push(day.total);
    }
  }
  values.sort(compareRationals);
  if (!values.length) return rationalFromInteger(1n);
  const max = values.at(-1)!;
  if (values.length < 8) return minRational(max, multiplyRationals(values[Math.floor((values.length - 1) / 2)]!, rationalFromInteger(3n)));
  const q1 = values[Math.ceil(values.length / 4) - 1]!, q3 = values[Math.ceil(3 * values.length / 4) - 1]!;
  const factor = createRational(3n, 2n); if (!factor.ok) throw new TypeError("Invalid fence.");
  return minRational(max, addRationals(q3, multiplyRationals(subtractRationals(q3, q1), factor.value)));
}
/** Number conversion only for a bounded pixel ratio, never for absolute business quantities. */
export function historyPixelRatio(part: Rational, total: Rational): number {
  if (part.numerator <= 0n || total.numerator <= 0n) return 0;
  const numerator = part.numerator * total.denominator, denominator = part.denominator * total.numerator;
  if (numerator >= denominator) return 1;
  return Number(numerator * 1_000_000_000n / denominator) / 1_000_000_000;
}
export function buildProjectHistoryGeometry(input: {
  readonly model: ProjectHistoryViewModel; readonly temporal: TemporalGeometry & { readonly groupHeight: number };
  readonly viewport: TimelineViewportState; readonly cap: Rational;
  readonly firstProject?: number; readonly throughProject?: number;
}): ProjectHistoryGeometry {
  const { model, temporal, viewport, cap } = input;
  const [from, through] = visibleHistoryDates(temporal, viewport);
  const firstDate = temporal.dates[0]!.date;
  const rows: HistoryRowGeometry[] = [];
  for (let p = input.firstProject ?? 0; p < Math.min(model.projects.length, input.throughProject ?? model.projects.length); p++) {
    const project = model.projects[p]!;
    project.rows.forEach((row, s) => {
      if (row.kind !== "present") return;
      const cells: HistoryCellGeometry[] = [];
      for (let i = historyDayIndex(row.days, from); i < row.days.length && row.days[i]!.date <= through; i++) {
        const day = row.days[i]!, x = civilDayDifference(day.date, firstDate) * temporal.dayWidth;
        const left = Math.max(x, viewport.x, 0), right = Math.min(x + temporal.dayWidth, viewport.x + viewport.width, temporal.width);
        if (right <= left) continue;
        const capped = compareRationals(day.total, cap) > 0;
        const denominator = capped ? day.total : cap;
        cells.push(Object.freeze({ day, x: left, width: right - left, capped,
          actualsHeight: HISTORY_DRAW_HEIGHT * historyPixelRatio(day.actuals, denominator),
          forecastHeight: HISTORY_DRAW_HEIGHT * historyPixelRatio(day.forecast, denominator) }));
      }
      const knowledgeX = row.actualsRange ? (civilDayDifference(row.actualsRange.through, firstDate) + 1) * temporal.dayWidth : null;
      rows.push(Object.freeze({ projectIndex: p, snapshotIndex: s,
        y: p * temporal.groupHeight + HISTORY_GROUP_HEADER_HEIGHT + s * HISTORY_ROW_HEIGHT,
        row, cells: Object.freeze(cells), knowledgeX: knowledgeX !== null && knowledgeX > viewport.x && knowledgeX <= viewport.x + viewport.width && knowledgeX > 0 && knowledgeX <= temporal.width ? knowledgeX : null }));
    });
  }
  return Object.freeze({ ...temporal, rows: Object.freeze(rows), viewport, cap });
}
export interface HistoryHit { readonly projectId: string; readonly snapshotId: string; readonly projectIndex: number; readonly snapshotIndex: number; readonly date: CivilDate; readonly part: "knowledge" | "cap" | "daily" | "row" }
export function hitTestProjectHistory(model: ProjectHistoryViewModel, geometry: ProjectHistoryGeometry, x: number, y: number, tolerance: number): HistoryHit | undefined {
  if (x < geometry.viewport.x || x > geometry.viewport.x + geometry.viewport.width || y < 0 || y >= geometry.height) return;
  const p = Math.floor(y / geometry.groupHeight);
  const s = Math.floor((y - p * geometry.groupHeight - HISTORY_GROUP_HEADER_HEIGHT) / HISTORY_ROW_HEIGHT);
  const row = model.projects[p]?.rows[s]; if (!row || row.kind !== "present") return;
  const dayIndex = Math.max(0, Math.min(geometry.dates.length - 1, Math.floor(x / geometry.dayWidth)));
  const date = geometry.dates[dayIndex]!.date;
  const day = row.days[historyDayIndex(row.days, date)];
  const marker = row.actualsRange ? (civilDayDifference(row.actualsRange.through, geometry.dates[0]!.date) + 1) * geometry.dayWidth : null;
  return { projectId: row.metadata.id, snapshotId: row.snapshotId, projectIndex: p, snapshotIndex: s, date,
    part: marker !== null && marker > geometry.viewport.x && marker <= geometry.viewport.x + geometry.viewport.width && Math.abs(marker - x) <= tolerance ? "knowledge"
      : day?.date === date ? compareRationals(day.total, geometry.cap) > 0 ? "cap" : "daily" : "row" };
}
