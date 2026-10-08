import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { addRationals, rationalToCanonicalString, type Rational } from "../../domain/model/rational.js";
import type { CivilDate } from "../../domain/model/date.js";
import { buildHistoryPresence, readHistoryMetadata, historyQuantity, type HistoryPresentRow } from "./buildProjectHistoryViewModel.js";
import type { RepositoryToken } from "../persistence/planningRepository.js";
export type HistoryReadRequest = Readonly<{ mode: "summary" | "profiles" | "totals"; projectIds?: readonly string[]; from?: CivilDate; through?: CivilDate }>;
export interface HistoryCaptureProjection {
  readonly projectionVersion: 1;
  readonly rows: readonly Omit<HistoryPresentRow, "comparison">[];
  readonly totals: readonly Readonly<{ date: CivilDate; total: Rational; count: number }>[];
}
export type HistoryProjectionReader = (id: string, token: RepositoryToken, request: HistoryReadRequest) => Promise<HistoryCaptureProjection>;
/** Disposable projection of a validated immutable capture. Never persisted or exported. */
export function projectHistoryCapture(snapshot: PortfolioSnapshot, request: HistoryReadRequest): HistoryCaptureProjection {
  if (request.mode === "totals") {
    const counts = new Map<string, { date: CivilDate; total: Rational; count: number }>();
    const amounts = new Map<string, Rational>();
    if (snapshot.forecast.forecastSchemaVersion === 2) for (const project of snapshot.forecast.projects) for (const day of project.dailyProfile.days) {
      if ((request.from && day.date < request.from) || (request.through && day.date > request.through)) continue;
      const amountsKey = `${day.actualsWorkload}|${day.forecastWorkload}`;
      let total = amounts.get(amountsKey);
      if (!total) { total = addRationals(historyQuantity(day.actualsWorkload), historyQuantity(day.forecastWorkload)); amounts.set(amountsKey, total); }
      const key = JSON.stringify([day.date, rationalToCanonicalString(total)]), old = counts.get(key);
      if (old) old.count++; else counts.set(key, { date: day.date, total, count: 1 });
    }
    return { projectionVersion: 1, rows: [], totals: [...counts.values()] };
  }
  const metadata = readHistoryMetadata(snapshot), selected = request.projectIds ? new Set(request.projectIds) : undefined;
  const profiles = snapshot.forecast.forecastSchemaVersion === 2 ? new Map(snapshot.forecast.projects.map(row => [row.projectId, row.dailyProfile])) : undefined;
  const sums = new Map<string, Rational>();
  return { projectionVersion: 1, totals: [], rows: snapshot.forecast.projects.filter(row => !selected || selected.has(row.projectId)).map(row => {
    const profile = profiles?.get(row.projectId); let allocated: Rational | undefined;
    if (profile) { const signature = profile.days.map(day => day.forecastWorkload).join("|"); allocated = sums.get(signature);
      if (!allocated) { allocated = profile.days.reduce((sum, day) => addRationals(sum, historyQuantity(day.forecastWorkload)), historyQuantity("0/1")); sums.set(signature, allocated); }
    }
    return buildHistoryPresence(snapshot, row, metadata.projects.get(row.projectId)!, profile, request.mode === "profiles", allocated);
  }) };
}
