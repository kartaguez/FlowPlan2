import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { encodePlanningInputs, decodePlanningInputs, type PlanningInputsDto } from "../backup/planningInputCodec.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";
import { snapshotId } from "../../domain/actuals/snapshots.js";

/** A real V5 source whose positive Actuals overlap the Forecast horizon. */
export function addHistoryActuals(dto: PlanningInputsDto): void {
  const project = dto.portfolio.projects[0]!;
  project.migrationStatus = "native";
  project.snapshots = [{ snapshotId: snapshotId("project", project.id, 1), version: 1,
    knowledgeDate: "2026-01-01" as any, participation: project.requirements.map((r) => r.teamId), retiredZeroTeams: [],
    raf: project.requirements.map((r) => ({ teamId: r.teamId, amount: r.remainingWorkload })),
    coverage: { actualsFrom: "2025-01-01" as any, actualsThrough: "2025-01-01" as any,
      periods: [{ periodId: "history-period", from: "2025-01-01" as any, through: "2025-01-01" as any,
        consumed: project.requirements.map((r) => ({ teamId: r.teamId, amount: "1/3" })) }] } }];
}

/** Validated snapshots, including schema 1, for History boundary tests. */
export function historyFixture(id = "a", change: (dto: PlanningInputsDto) => void = () => {}, schema: 1 | 2 = 2, instant = "2026-10-08T10:00:00.000Z") {
  const dto = encodePlanningInputs(createDemoPlanningScenario()); change(dto);
  const state = decodePlanningInputs(dto, 5, undefined, true);
  const run = buildPlanningSessionProjection({ state, geometryViewport: { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 } });
  const modern = capturePortfolioSnapshot(state, run.planningResult, run.actualsReconstruction, id, instant);
  const inputs = structuredClone(modern.inputs) as { rafModelVersion?: number }; delete inputs.rafModelVersion;
  const snapshot = validateHistoricalSnapshot({ ...modern, inputs, inputsSchemaVersion: 1 }, state);
  if (schema === 2) return snapshot;
  const legacy = structuredClone(snapshot) as any;
  legacy.forecast.forecastSchemaVersion = 1;
  legacy.forecast.engineVersion = "unknown historical engine";
  legacy.forecast.projects.forEach((row: any) => { delete row.dailyProfile; });
  return validateHistoricalSnapshot(legacy, state);
}
