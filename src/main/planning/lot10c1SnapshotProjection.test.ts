import assert from "node:assert/strict";
import test from "node:test";
import { createConsumedWorkload, createCivilDate, createPortfolio, createProject, reconstructActuals,
  serializeQuantity, snapshotId, type DomainResult, type ProjectActualsSnapshot } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { encodeFlowplanBackupV4 } from "../../application/backup/flowplanBackupV1.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { hitTestTimelineGeometry } from "../../ui/timeline/timelineHitTesting.js";

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  return result.value;
}
const d = (value: string) => valid(createCivilDate(value));
const c = (value: string) => valid(createConsumedWorkload(value));

test("only the current V5 snapshot contributes when legacy and older snapshots are retained", () => {
  const state = createDemoPlanningScenario();
  const prior = state.portfolio.projects[0]!;
  const teams = prior.requirements.map((row) => row.teamId);
  const period = (periodId: string, value: string) => ({ periodId, from: d("2025-01-04"), through: d("2025-01-04"),
    consumed: teams.map((teamId) => ({ teamId, amount: c(value) })) });
  const snapshot = (version: number, periodId: string, value: string): ProjectActualsSnapshot => ({
    snapshotId: snapshotId("project", prior.id, version), version, knowledgeDate: d("2025-01-06"),
    participation: teams, retiredZeroTeams: [], raf: prior.requirements.map((row) => ({ teamId: row.teamId, amount: row.remainingWorkload })),
    coverage: { actualsFrom: d("2025-01-04"), actualsThrough: d("2025-01-04"), periods: [period(periodId, value)] },
  });
  const project = valid(createProject({ ...prior, snapshots: [snapshot(1, "first", "9"), snapshot(2, "second", "3")],
    actuals: { actualsFromDate: d("2025-01-04"), records: [{ actualsThroughDate: d("2025-01-04"),
      teams: prior.requirements.map((row) => ({ teamId: row.teamId, cumulativeConsumed: c("100"), remainingWorkload: row.remainingWorkload })) }] } }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const contributions = reconstructActuals(portfolio, state.planning.workingPattern).contributions
    .filter((item) => item.sourceId === prior.id);
  assert.equal(contributions.length, teams.length);
  assert.deepEqual(new Set(contributions.map((item) => item.snapshotId)), new Set([snapshotId("project", prior.id, 2)]));
  assert.deepEqual(new Set(contributions.map((item) => item.periodId)), new Set(["second"]));
  assert.deepEqual(contributions.map((item) => serializeQuantity(item.amount)), ["3/1", "3/1"]);
  const projection = buildPlanningSessionProjection({ state: { ...state, portfolio },
    geometryViewport: { width: 1800, teamLaneHeight: 100, timeAxisHeight: 76 } });
  const segment = projection.geometry.teams.flatMap((team) => team.days.flatMap((day) => day.actualSegments ?? []))
    .find((item) => item.sourceId === prior.id && item.height > 0);
  assert.ok(segment);
  assert.equal(segment.snapshotId, snapshotId("project", prior.id, 2));
  assert.equal(segment.periodId, "second");
  const hit = hitTestTimelineGeometry({ geometry: projection.geometry,
    x: segment.x + segment.width / 2, y: segment.y + segment.height / 2, markerHitTolerance: 0 });
  assert.equal(hit?.kind, "actual");
  if (hit?.kind === "actual") assert.equal(hit.periodId, "second");
  assert.throws(() => encodeFlowplanBackupV4({ ...state, portfolio }), /cannot encode knowledge snapshots/);
});
