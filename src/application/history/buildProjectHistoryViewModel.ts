import type { PlanningInputsDto } from "../backup/planningInputCodec.js";
import { comparePortfolioSnapshots, immutableCopy, type PortfolioSnapshot, type HistoricalProjectForecast } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { HistoricalProjectDailyProfile, HistoricalDateRange } from "../../domain/portfolioSnapshots/historicalDailyProfile.js";
import { civilDayDifference, type CivilDate } from "../../domain/model/date.js";
import { addRationals, compareRationals, subtractRationals, parseSerializedRational, rationalFromInteger, type Rational } from "../../domain/model/rational.js";

export interface HistoricalAssociation { readonly id: string; readonly name: string }
export interface HistoryMetadata {
  readonly id: string; readonly name: string; readonly isActive: boolean;
  readonly program: HistoricalAssociation | null; readonly pas: HistoricalAssociation | null;
}
export interface HistoryDay {
  readonly date: CivilDate; readonly actuals: Rational; readonly forecast: Rational; readonly total: Rational;
}
export interface HistoryComparison {
  readonly previousSnapshotId: string;
  readonly priority: Readonly<{ previous: number; next: number; delta: number }>;
  readonly eac: Readonly<{ previous: Rational; next: Rational; delta: Rational }>;
  readonly start: Readonly<{ previous: CivilDate | null; next: CivilDate | null; delta: number | null; previousReason: string | null; nextReason: string | null }>;
  readonly end: HistoryComparison["start"];
  readonly programChanged: boolean; readonly pasChanged: boolean; readonly activationChanged: boolean;
  readonly previousMetadata: HistoryMetadata;
}
export interface HistoryPresentRow {
  readonly kind: "present"; readonly snapshotId: string; readonly createdAt: string;
  readonly metadata: HistoryMetadata; readonly metrics: HistoricalProjectForecast;
  readonly actuals: Rational; readonly raf: Rational; readonly eac: Rational;
  readonly profile: "available" | "unavailable-legacy";
  readonly actualsRange: HistoricalDateRange | null; readonly forecastRange: HistoricalDateRange | null;
  readonly days: readonly HistoryDay[]; readonly daysLoaded?: boolean; readonly hasActivity?: boolean; readonly firstForecastPositiveDate: CivilDate | null;
  readonly forecastStatus: "inactive" | "no remaining workload" | "fully allocated" | "partially allocated" | "no allocation within horizon" | "daily allocations unavailable";
  readonly comparison: HistoryComparison | null;
}
export type HistoryRow = HistoryPresentRow | Readonly<{ kind: "absent"; snapshotId: string }>;
export interface HistoryProject { readonly metadata: HistoryMetadata; readonly rows: readonly HistoryRow[] }
export interface ProjectHistoryViewModel {
  readonly snapshots: readonly Readonly<{ snapshotId: string; createdAt: string }>[];
  readonly referenceSnapshotId: string | null; readonly horizon: HistoricalDateRange | null;
  readonly projects: readonly HistoryProject[];
}
export function historyQuantity(value: string): Rational {
  const result = parseSerializedRational(value);
  if (!result.ok) throw new TypeError("History requires validated exact quantities.");
  return result.value;
}

/** Reads the already validated DTO only. Deliberately never decodes/hydrates V5 sources. */
export function readHistoryMetadata(snapshot: PortfolioSnapshot) {
  const dto = snapshot.inputs as unknown as PlanningInputsDto;
  const programs = new Map(dto.portfolio.programs.map((row) => [String(row.id), row.name]));
  const families = new Map(dto.portfolio.priorityFamilies.map((row) => [String(row.id), row.name]));
  const association = (id: string | undefined, names: ReadonlyMap<string, string>): HistoricalAssociation | null =>
    id === undefined ? null : Object.freeze({ id, name: names.get(id)! });
  return {
    horizon: Object.freeze({ from: dto.planning.startDate, through: dto.planning.endDate }),
    projects: new Map(dto.portfolio.projects.map((project) => [String(project.id), Object.freeze({
      id: String(project.id), name: project.name, isActive: project.isActive!,
      program: association(project.programId, programs), pas: association(project.priorityFamilyId, families),
    })])),
  };
}
const changed = (a: HistoricalAssociation | null, b: HistoricalAssociation | null) => a?.id !== b?.id || a?.name !== b?.name;
function dateComparison(previous: CivilDate | null, next: CivilDate | null, previousReason: string | null, nextReason: string | null) {
  return Object.freeze({ previous, next, previousReason, nextReason,
    delta: previous === null || next === null ? null : civilDayDifference(next, previous) });
}
/** A single captured row; day decoding can be deferred without changing its metrics. */
export function buildHistoryPresence(snapshot: Pick<PortfolioSnapshot, "snapshotId" | "createdAt">,
  metrics: HistoricalProjectForecast, historicalMetadata: HistoryMetadata,
  profile: HistoricalProjectDailyProfile | undefined, loadDays = true, allocatedForecast?: Rational): Omit<HistoryPresentRow, "comparison"> {
  const days = Object.freeze((loadDays ? profile?.days ?? [] : []).map(day => {
    const actuals = historyQuantity(day.actualsWorkload), forecast = historyQuantity(day.forecastWorkload);
    return Object.freeze({ date: day.date, actuals, forecast, total: addRationals(actuals, forecast) });
  }));
  const raf = historyQuantity(metrics.raf), zero = rationalFromInteger(0n);
  const allocated = allocatedForecast ?? (profile?.days ?? []).reduce((sum, day) => addRationals(sum, historyQuantity(day.forecastWorkload)), zero);
  const { projectId, actuals, actualsKnowledge, eac, priorityPosition, estimatedStartDate, startAbsenceReason, estimatedEndDate, endAbsenceReason } = metrics;
  return { kind: "present", snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt,
    metadata: historicalMetadata, metrics: { projectId, actuals, actualsKnowledge, raf: metrics.raf, eac, priorityPosition, estimatedStartDate, startAbsenceReason, estimatedEndDate, endAbsenceReason },
    actuals: historyQuantity(actuals), raf, eac: historyQuantity(eac), profile: profile ? "available" : "unavailable-legacy", days,
    daysLoaded: loadDays || !profile, hasActivity: !!profile?.days.length,
    actualsRange: profile?.actualsRange ?? null, forecastRange: profile?.forecastRange ?? null,
    firstForecastPositiveDate: profile?.days.find(day => day.forecastWorkload !== "0/1")?.date ?? null,
    forecastStatus: !historicalMetadata.isActive ? "inactive" : compareRationals(raf, zero) === 0 ? "no remaining workload"
      : !profile ? "daily allocations unavailable" : compareRationals(allocated, zero) === 0 ? "no allocation within horizon"
      : compareRationals(allocated, raf) === 0 ? "fully allocated" : "partially allocated" };
}

export function buildProjectHistoryViewModel(collection: readonly PortfolioSnapshot[]): ProjectHistoryViewModel {
  const snapshots = [...collection].sort(comparePortfolioSnapshots);
  const metadata = snapshots.map(readHistoryMetadata);
  const presences = snapshots.map((snapshot, index) => {
    const profiles = snapshot.forecast.forecastSchemaVersion === 2
      ? new Map(snapshot.forecast.projects.map(row => [row.projectId, row.dailyProfile])) : undefined;
    return new Map(snapshot.forecast.projects.map(metrics => [metrics.projectId,
      buildHistoryPresence(snapshot, metrics, metadata[index]!.projects.get(metrics.projectId)!, profiles?.get(metrics.projectId))]));
  });
  return assembleProjectHistoryViewModel(snapshots, metadata.at(-1)?.horizon ?? null, presences);
}

/** Common union, ordering and exact previous-presence comparisons for eager and lazy readers. */
export function assembleProjectHistoryViewModel(
  snapshots: readonly Pick<PortfolioSnapshot, "snapshotId" | "createdAt">[], horizon: HistoricalDateRange | null,
  presences: readonly ReadonlyMap<string, Omit<HistoryPresentRow, "comparison">>[],
): ProjectHistoryViewModel {
  const reference = snapshots.at(-1);
  const union = new Set(presences.flatMap((map) => [...map.keys()]));
  const projects = [...union].map((id) => {
    let previous: HistoryPresentRow | undefined;
    const rows = snapshots.map((snapshot, index): HistoryRow => {
      const row = presences[index]!.get(id);
      if (!row) return Object.freeze({ kind: "absent", snapshotId: snapshot.snapshotId });
      const comparison: HistoryComparison | null = previous ? {
        previousSnapshotId: previous.snapshotId,
        priority: { previous: previous.metrics.priorityPosition, next: row.metrics.priorityPosition, delta: row.metrics.priorityPosition - previous.metrics.priorityPosition },
        eac: { previous: previous.eac, next: row.eac, delta: subtractRationals(row.eac, previous.eac) },
        start: dateComparison(previous.metrics.estimatedStartDate, row.metrics.estimatedStartDate, previous.metrics.startAbsenceReason, row.metrics.startAbsenceReason),
        end: dateComparison(previous.metrics.estimatedEndDate, row.metrics.estimatedEndDate, previous.metrics.endAbsenceReason, row.metrics.endAbsenceReason),
        programChanged: changed(previous.metadata.program, row.metadata.program), pasChanged: changed(previous.metadata.pas, row.metadata.pas),
        activationChanged: previous.metadata.isActive !== row.metadata.isActive, previousMetadata: previous.metadata,
      } : null;
      previous = { ...row, comparison };
      return previous;
    });
    return { metadata: previous!.metadata, rows, lastPriority: previous!.metrics.priorityPosition,
      referencePriority: presences.at(-1)?.get(id)?.metrics.priorityPosition };
  });
  projects.sort((a, b) => (a.referencePriority === undefined ? 1 : 0) - (b.referencePriority === undefined ? 1 : 0)
    || (a.referencePriority ?? a.lastPriority) - (b.referencePriority ?? b.lastPriority)
    || (a.metadata.id < b.metadata.id ? -1 : a.metadata.id > b.metadata.id ? 1 : 0));
  return immutableCopy({ snapshots: snapshots.map(({ snapshotId, createdAt }) => ({ snapshotId, createdAt })),
    referenceSnapshotId: reference?.snapshotId ?? null, horizon,
    projects: projects.map(({ metadata, rows }) => ({ metadata, rows })) });
}

/** Binary boundary used by geometry and tooltip; no dense zero materialization. */
export function historyDayIndex(days: readonly HistoryDay[], date: CivilDate): number {
  let low = 0, high = days.length;
  while (low < high) { const middle = (low + high) >>> 1; if (days[middle]!.date < date) low = middle + 1; else high = middle; }
  return low;
}
