import { createCivilDate, type CivilDate } from "../model/date.js";
import type { Project } from "../model/entities.js";
import { addRationals, compareRationals, rationalFromInteger, rationalToCanonicalString, type Rational } from "../model/rational.js";
import { capacityFromSerialized, consumedWorkloadFromSerialized, rationalOf, serializeQuantity } from "../model/scalars.js";
import type { HistoricalProjectForecast } from "./portfolioSnapshot.js";

import { projectActualsRange, type ProjectActualsRange } from "../actuals/projectActualsKnowledge.js";
export { projectActualsRange } from "../actuals/projectActualsKnowledge.js";
export type HistoricalDateRange = ProjectActualsRange;
export interface HistoricalProjectDailyLoad { readonly date: CivilDate; readonly actualsWorkload: string; readonly forecastWorkload: string }
export interface HistoricalProjectDailyProfile {
  readonly actualsRange: HistoricalDateRange | null;
  readonly forecastRange: HistoricalDateRange;
  readonly days: readonly HistoricalProjectDailyLoad[];
}
export const ZERO = rationalFromInteger(0n);

function fields(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((k) => !Object.hasOwn(value, k))) throw new TypeError("Invalid fields.");
}
function range(value: unknown): asserts value is HistoricalDateRange {
  fields(value, ["from", "through"]);
  if (typeof value.from !== "string" || typeof value.through !== "string" || !createCivilDate(value.from).ok || !createCivilDate(value.through).ok || value.from > value.through) throw new TypeError("Invalid range.");
}
function sameRange(a: HistoricalDateRange | null, b: HistoricalDateRange | null) { return a === null ? b === null : b !== null && a.from === b.from && a.through === b.through; }
function exact(value: unknown, forecast: boolean): Rational {
  const q = typeof value === "string" ? (forecast ? capacityFromSerialized(value) : consumedWorkloadFromSerialized(value)) : undefined;
  if (!q?.ok || serializeQuantity(q.value) !== value) throw new TypeError("Expected canonical nonnegative rational.");
  return rationalOf(q.value);
}
const inside = (date: CivilDate, r: HistoricalDateRange | null) => r !== null && date >= r.from && date <= r.through;

/** Structural validation only: no reconstruction or historical engine replay. */
export function validateHistoricalDailyProfile(value: unknown, row: HistoricalProjectForecast, project: Project, horizon: HistoricalDateRange): void {
  try {
    fields(value, ["actualsRange", "forecastRange", "days"]);
    if (value.actualsRange !== null) range(value.actualsRange);
    range(value.forecastRange);
    if (!sameRange(value.actualsRange as HistoricalDateRange | null, projectActualsRange(project)) || !sameRange(value.forecastRange, horizon)) throw new TypeError("Source/horizon range mismatch.");
    if (!Array.isArray(value.days)) throw new TypeError("Missing days.");
    let previous: CivilDate | undefined;
    let first: CivilDate | null = null;
    let lastForecast: CivilDate | null = null;
    let actuals = ZERO; let forecast = ZERO;
    value.days.forEach((day: unknown, index: number) => {
      try {
        fields(day, ["date", "actualsWorkload", "forecastWorkload"]);
        if (typeof day.date !== "string" || !createCivilDate(day.date).ok || (previous !== undefined && day.date <= previous)) throw new TypeError("Invalid date/order/duplicate.");
        const date = day.date as CivilDate;
        const a = exact(day.actualsWorkload, false); const f = exact(day.forecastWorkload, true);
        if (a.numerator === 0n && f.numerator === 0n) throw new TypeError("Double-zero day must be omitted.");
        if (a.numerator > 0n && !inside(date, value.actualsRange as HistoricalDateRange | null)) throw new TypeError("Actuals outside coverage.");
        if (f.numerator > 0n && (!inside(date, horizon) || !project.isActive)) throw new TypeError("Forecast outside horizon or inactive.");
        previous = date; first ??= date;
        if (f.numerator > 0n) lastForecast = date;
        actuals = addRationals(actuals, a); forecast = addRationals(forecast, f);
      } catch (cause) { throw new TypeError(`days[${index}]: ${cause instanceof Error ? cause.message : cause}`); }
    });
    if (rationalToCanonicalString(actuals) !== row.actuals) throw new TypeError("Daily Actuals sum mismatch.");
    if (compareRationals(forecast, exact(row.raf, false)) > 0) throw new TypeError("Daily Forecast exceeds RAF.");
    if (row.estimatedStartDate !== first) throw new TypeError("Start differs from first positive activity.");
    if (row.estimatedEndDate !== null && row.estimatedEndDate !== lastForecast) throw new TypeError("End differs from last positive Forecast.");
  } catch (cause) { throw new TypeError(`projects[${row.projectId}].dailyProfile: ${cause instanceof Error ? cause.message : cause}`); }
}
