import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { encodePlanningInputs, decodePlanningInputs, type PlanningInputsDto } from "../backup/planningInputCodec.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";

/** Validated snapshots, including schema 1, for History boundary tests. */
export function historyFixture(id = "a", change: (dto: PlanningInputsDto) => void = () => {}, schema: 1 | 2 = 2, instant = "2026-10-08T10:00:00.000Z") {
  const dto = encodePlanningInputs(createDemoPlanningScenario()); change(dto);
  const state = decodePlanningInputs(dto, 5, undefined, true);
  const run = buildPlanningSessionProjection({ state, geometryViewport: { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 } });
  const snapshot = capturePortfolioSnapshot(state, run.planningResult, run.actualsReconstruction, id, instant);
  if (schema === 2) return snapshot;
  const legacy = structuredClone(snapshot) as any;
  legacy.forecast.forecastSchemaVersion = 1;
  legacy.forecast.engineVersion = "unknown historical engine";
  legacy.forecast.projects.forEach((row: any) => { delete row.dailyProfile; });
  return validateHistoricalSnapshot(legacy, state);
}
