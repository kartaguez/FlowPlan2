import type { ActualsReconstruction } from "../../domain/actuals/reconstruction.js";
import type { PlanningResult, ProjectTeamPlanningResult } from "../../domain/planning/contracts.js";
import type { Portfolio } from "../../domain/model/entities.js";
import type { CivilDate } from "../../domain/model/date.js";
import { addRationals, rationalToCanonicalString, type Rational } from "../../domain/model/rational.js";
import { rationalOf } from "../../domain/model/scalars.js";
import { projectActualsRange, ZERO, type HistoricalDateRange, type HistoricalProjectDailyProfile } from "../../domain/portfolioSnapshots/historicalDailyProfile.js";

/** Index the published sources once; no engine, reconstruction or retained-version scan. */
export function captureDailyProfiles(portfolio: Portfolio, horizon: HistoricalDateRange, result: PlanningResult, actuals: ActualsReconstruction) {
  const days = new Map(portfolio.projects.map((p) => [p.id as string, new Map<CivilDate, { actuals: Rational; forecast: Rational }>()]));
  const plans = new Map(portfolio.projects.map((p) => [p.id as string, [] as ProjectTeamPlanningResult[]]));
  const contributions = new Map(portfolio.projects.map((p) => [p.id as string, [] as ActualsReconstruction["contributions"][number][]]));
  const add = (id: string, date: CivilDate, amount: Rational, kind: "actuals" | "forecast") => {
    const project = days.get(id);
    if (!project) throw new TypeError(`Unknown daily Project ${id}.`);
    const row = project.get(date) ?? { actuals: ZERO, forecast: ZERO };
    row[kind] = addRationals(row[kind], amount);
    project.set(date, row);
  };
  for (const c of actuals.contributions) if (c.sourceKind === "project") {
    add(c.sourceId, c.date, rationalOf(c.amount), "actuals");
    contributions.get(c.sourceId)!.push(c);
  }
  for (const team of result.teamPlans) for (const plan of team.projectPlans) {
    const bucket = plans.get(plan.projectId);
    if (!bucket) throw new TypeError(`Unknown Forecast Project ${plan.projectId}.`);
    bucket.push(plan);
    for (const a of plan.allocations) add(plan.projectId, a.date, rationalOf(a.workload), "forecast");
  }
  const profiles = new Map<string, HistoricalProjectDailyProfile>();
  for (const project of portfolio.projects) profiles.set(project.id, {
    actualsRange: projectActualsRange(project), forecastRange: { ...horizon },
    days: [...days.get(project.id)!].filter(([, d]) => d.actuals.numerator > 0n || d.forecast.numerator > 0n)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([date, d]) => ({ date, actualsWorkload: rationalToCanonicalString(d.actuals), forecastWorkload: rationalToCanonicalString(d.forecast) })),
  });
  return { profiles, plans, contributions };
}
