import type { ActualsDailyContribution } from "../actuals/reconstruction.js";
import type { CivilDate } from "../model/date.js";
import { rationalOf } from "../model/scalars.js";
import type { ProjectAllocation } from "./contracts.js";

export function projectEstimatedStartDate(projectId: string, contributions: readonly ActualsDailyContribution[], allocations: readonly ProjectAllocation[]): CivilDate | null {
  const dates = [...contributions.filter((c) => c.sourceKind === "project" && c.sourceId === projectId && rationalOf(c.amount).numerator > 0n).map((c) => c.date),
    ...allocations.filter((a) => rationalOf(a.workload).numerator > 0n).map((a) => a.date)];
  return dates.length ? dates.reduce((first, date) => date < first ? date : first) : null;
}
export function projectEstimatedEndDate(isActive: boolean, states: readonly Readonly<{ complete: boolean; projectedEndDate?: CivilDate }>[]) {
  if (!isActive) return { date: null, reason: "inactive", complete: false } as const;
  if (!states.every((s) => s.complete)) return { date: null, reason: "incomplete-within-horizon", complete: false } as const;
  const dates = states.flatMap((s) => s.projectedEndDate === undefined ? [] : [s.projectedEndDate]);
  return dates.length ? { date: dates.reduce((last, date) => date > last ? date : last), reason: null, complete: true } as const
    : { date: null, reason: "no-allocation", complete: true } as const;
}
