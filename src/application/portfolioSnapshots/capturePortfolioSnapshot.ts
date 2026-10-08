import { captureDailyProfiles } from "./captureDailyProfiles.js";
import { addRationals, rationalFromInteger, rationalToCanonicalString } from "../../domain/model/rational.js";
import { capacityFromSerialized, rationalOf } from "../../domain/model/scalars.js";
import type { PlanningSessionState } from "../session/planningSession.js";
import { encodePlanningInputs, decodePlanningInputs, type PlanningInputsDto } from "../backup/planningInputCodec.js";
import { createPortfolioSnapshot, type PortfolioSnapshot, type ActualsSource } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { projectExactTotals } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { projectEstimatedStartDate, projectEstimatedEndDate } from "../../domain/planning/projectEstimatedDates.js";
import type { ActualsReconstruction, PlanningResult } from "../../domain/index.js";

export const PLANNING_ENGINE_VERSION = "planning-engine-v1/actuals-aware/1";

export function captureHistoricalInputs(state: PlanningSessionState) {
  const inputs = encodePlanningInputs(state);
  const actualsSources: ActualsSource[] = [];
  for (const kind of ["project", "reservation"] as const) {
    const objects = kind === "project" ? inputs.portfolio.projects : inputs.portfolio.reservations;
    for (const object of objects) {
      const current = object.snapshots?.at(-1);
      actualsSources.push({ kind, objectId: object.id, ...(current ? { source: "snapshot" as const, snapshotId: current.snapshotId } : { source: object.legacyV4Actuals ? "legacy-v4" as const : "none" as const }) });
      delete object.snapshots;
    }
  }
  return { inputs, actualsSources };
}

/** Resolve exact IDs using the consecutive prefix; no current-membership substitution. */
export function hydrateHistoricalInputs(inputs: unknown, sources: readonly ActualsSource[], current: PlanningSessionState): PlanningSessionState {
  const data = structuredClone(inputs) as PlanningInputsDto;
  if (!data?.portfolio || !Array.isArray(sources)) throw new TypeError("Invalid historical inputs.");
  let encodedCurrent: PlanningInputsDto | undefined;
  for (const kind of ["project", "reservation"] as const) {
    const objects = kind === "project" ? data.portfolio.projects : data.portfolio.reservations;
    if (!Array.isArray(objects)) throw new TypeError("Missing historical objects.");
    for (const object of objects) {
      if (Object.hasOwn(object, "snapshots")) throw new TypeError("Historical inputs cannot duplicate Actuals history.");
      const source = sources.find((s) => s.kind === kind && s.objectId === object.id);
      if (!source) throw new TypeError(`Missing historical source for ${kind}:${object.id}.`);
      if (source.source === "snapshot") {
        const owners = kind === "project" ? current.portfolio.projects : current.portfolio.reservations;
        const owner = owners.find((o) => o.id === object.id);
        const index = owner?.snapshots?.findIndex((s) => s.snapshotId === source.snapshotId) ?? -1;
        if (index < 0) throw new TypeError(`Broken Actuals reference ${kind}:${object.id}:${source.snapshotId}.`);
        const encoded = encodedCurrent ??= encodePlanningInputs(current);
        const encodedOwners = kind === "project" ? encoded.portfolio.projects : encoded.portfolio.reservations;
        // Codec owns the DTO; assigning the prefix preserves Project/Reservation-specific fields.
        Object.assign(object, { snapshots: encodedOwners.find((o) => o.id === object.id)!.snapshots!.slice(0, index + 1) });
      } else if (source.source !== "none" && source.source !== "legacy-v4") throw new TypeError("Unknown Actuals source.");
    }
  }
  return decodePlanningInputs(data, 5, undefined, true);
}

export function validateHistoricalSnapshot(value: unknown, current: PlanningSessionState): PortfolioSnapshot {
  const item = value as PortfolioSnapshot;
  const historical = hydrateHistoricalInputs(item?.inputs, item?.actualsSources, current);
  return createPortfolioSnapshot(value, historical.portfolio, { from: historical.planning.startDate, through: historical.planning.endDate });
}

export function capturePortfolioSnapshot(state: PlanningSessionState, result: PlanningResult, actuals: ActualsReconstruction, snapshotId: string, createdAt: string): PortfolioSnapshot {
  const captured = captureHistoricalInputs(state);
  const indexed = captureDailyProfiles(state.portfolio, { from: state.planning.startDate, through: state.planning.endDate }, result, actuals);
  const projects = state.portfolio.projects.map((project) => {
    const plans = indexed.plans.get(project.id)!;
    const dailyProfile = indexed.profiles.get(project.id)!;
    const totals = projectExactTotals(project);
    if (project.isActive && plans.every((p) => p.complete)) {
      const forecast = dailyProfile.days.reduce((sum, day) => {
        const amount = capacityFromSerialized(day.forecastWorkload);
        if (!amount.ok) throw new TypeError("Invalid captured Forecast.");
        return addRationals(sum, rationalOf(amount.value));
      }, rationalFromInteger(0n));
      if (rationalToCanonicalString(forecast) !== totals.raf) throw new TypeError(`Complete Project ${project.id} Forecast differs from RAF.`);
    }
    const start = projectEstimatedStartDate(project.id, indexed.contributions.get(project.id)!, plans.flatMap((p) => p.allocations));
    const end = projectEstimatedEndDate(project.isActive, plans);
    return { projectId: project.id, ...totals, dailyProfile, priorityPosition: state.portfolio.priorityOrder.indexOf(project.id) + 1,
      estimatedStartDate: start, startAbsenceReason: start === null ? "no-activity" as const : null,
      estimatedEndDate: end.date, endAbsenceReason: end.reason };
  });
  return validateHistoricalSnapshot({ snapshotId, createdAt, inputsSchemaVersion: 1, ...captured,
    forecast: { forecastSchemaVersion: 2, engineVersion: PLANNING_ENGINE_VERSION, projects } }, state);
}
