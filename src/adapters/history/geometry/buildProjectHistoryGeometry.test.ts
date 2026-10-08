import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectHistoryViewModel, historyQuantity, type ProjectHistoryViewModel } from "../../../application/history/buildProjectHistoryViewModel.js";
import { historyFixture } from "../../../application/history/historyTestFixture.js";
import { buildProjectHistoryGeometry, computeHistoryVisualCap, createHistoryTemporalGeometry, historyPixelRatio, hitTestProjectHistory, visibleHistoryDates, HISTORY_DRAW_HEIGHT, HISTORY_GROUP_HEADER_HEIGHT } from "./buildProjectHistoryGeometry.js";
import { addDays, type CivilDate } from "../../../domain/model/date.js";
import { rationalToCanonicalString } from "../../../domain/model/rational.js";
function sample(values: string[]) {
  const base = buildProjectHistoryViewModel([historyFixture()]); const project = base.projects[0]!;
  const row = project.rows[0]!; assert.equal(row.kind, "present"); if (row.kind !== "present") throw new Error();
  const days = values.map((value, index) => { const date = addDays(base.horizon!.from, index); assert.ok(date.ok);
    return { date: date.value, actuals: historyQuantity("0/1"), forecast: historyQuantity(value), total: historyQuantity(value) }; });
  const model: ProjectHistoryViewModel = { ...base, projects: [{ ...project, rows: [{ ...row, days }] }] };
  const temporal = createHistoryTemporalGeometry(model, 1000); return { model, temporal, viewport: { x: 0, width: 1000 } };
}
describe("History exact geometry and common visual cap", () => {
  for (const [values, expected] of [
    [[], "1/1"], [["9/1"], "9/1"], [["1/1", "1/1", "100/1"], "3/1"],
    [Array(8).fill("2/3"), "2/3"], [["1/1", "1/1", "1/1", "1/1", "2/1", "2/1", "2/1", "100/1"], "7/2"],
  ] as const) it(`deterministic strategy ${expected} for ${values.length} positive samples`, () => {
    const app = sample([...values]); const cap = computeHistoryVisualCap(app.model, app.temporal, app.viewport);
    assert.equal(rationalToCanonicalString(cap), expected);
    assert.equal(rationalToCanonicalString(computeHistoryVisualCap(app.model, app.temporal, app.viewport)), expected);
  });
  it("converts bounded ratios of enormous exact values at the pixel boundary", () => {
    const giant = 10n ** 1000n;
    assert.equal(historyPixelRatio({ numerator: giant, denominator: 3n }, { numerator: giant, denominator: 1n }), 0.333333333);
    assert.equal(historyPixelRatio(historyQuantity("1/3"), historyQuantity("2/3")), 0.5);
    assert.equal(historyPixelRatio(historyQuantity("0/1"), historyQuantity("2/3")), 0);
    assert.equal(historyPixelRatio(historyQuantity("4/3"), historyQuantity("2/3")), 1);
  });
  it("stacks overlapping components and reduces both proportionally above a shared cap", () => {
    const app = sample(["4/1"]); const project = app.model.projects[0]!, row = project.rows[0]!;
    assert.equal(row.kind, "present"); if (row.kind !== "present") return;
    const model = { ...app.model, projects: [{ ...project, rows: [{ ...row, days: [{ ...row.days[0]!, actuals: historyQuantity("1/1"), forecast: historyQuantity("3/1") }] }] }] };
    const geometry = buildProjectHistoryGeometry({ ...app, model, cap: historyQuantity("2/1") });
    const cell = geometry.rows[0]!.cells[0]!;
    assert.equal(cell.actualsHeight, HISTORY_DRAW_HEIGHT / 4); assert.equal(cell.forecastHeight, 3 * HISTORY_DRAW_HEIGHT / 4);
    assert.equal(cell.capped, true); assert.equal(rationalToCanonicalString(cell.day.total), "4/1");
  });
  it("clips day cells strictly and omits border-only cap samples", () => {
    const app = sample(["1/1", "100/1", "1/1"]); const dayWidth = app.temporal.dayWidth;
    const viewport = { x: 0, width: dayWidth };
    assert.deepEqual(visibleHistoryDates(app.temporal, viewport), [app.temporal.dates[0]!.date, app.temporal.dates[0]!.date]);
    assert.equal(rationalToCanonicalString(computeHistoryVisualCap(app.model, app.temporal, viewport)), "1/1");
    const geometry = buildProjectHistoryGeometry({ ...app, viewport: { x: dayWidth / 2, width: dayWidth }, cap: historyQuantity("1/1") });
    assert.equal(geometry.rows[0]!.cells.length, 2);
    assert.equal(geometry.rows[0]!.cells[0]!.width, dayWidth / 2);
  });
  it("retains a covered-zero knowledge marker at the inclusive final day without a fabricated next date", () => {
    const app = sample([]); const project = app.model.projects[0]!, row = project.rows[0]!;
    if (row.kind !== "present") throw new Error();
    const model = { ...app.model, projects: [{ ...project, rows: [{ ...row, actualsRange: app.model.horizon }] }] };
    const geometry = buildProjectHistoryGeometry({ ...app, model, cap: historyQuantity("1/1") });
    assert.equal(geometry.rows[0]!.knowledgeX, 1000); assert.equal(geometry.rows[0]!.cells.length, 0);
    const hit = hitTestProjectHistory(model, geometry, 999, HISTORY_GROUP_HEADER_HEIGHT + 15, 2)!;
    assert.equal(hit.part, "knowledge");
    const pan = buildProjectHistoryGeometry({ ...app, model, viewport: { x: 0, width: 200 }, cap: historyQuantity("1/1") });
    assert.equal(pan.rows[0]!.knowledgeX, null);
  });
  it("keeps old horizons out of the reference axis and absent rows free of business hits", () => {
    const legacy = historyFixture("a", () => {}, 1);
    const later = historyFixture("b", (dto) => { dto.planning.startDate = "2025-02-01" as CivilDate; });
    const model = buildProjectHistoryViewModel([legacy, later]); const temporal = createHistoryTemporalGeometry(model);
    const geometry = buildProjectHistoryGeometry({ model, temporal, viewport: { x: 0, width: temporal.width }, cap: historyQuantity("1/1") });
    assert.equal(geometry.rows[0]!.cells.length, 0); assert.equal(geometry.rows[0]!.knowledgeX, null);
    assert.equal(hitTestProjectHistory(model, geometry, 100, 5, 2), undefined);
    assert.equal(hitTestProjectHistory(model, geometry, 100, HISTORY_GROUP_HEADER_HEIGHT + 15, 2)!.part, "row");
  });
});
