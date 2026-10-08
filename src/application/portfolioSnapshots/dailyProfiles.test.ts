import { loadPlanningBackup } from "../../main/planning/planningBackupOperations.js";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/synchronousPlanningDispatcher.fixture.js";
import { createPlanningSession } from "../session/planningSession.js";
import { decodePlanningInputs, encodePlanningInputs } from "../backup/planningInputCodec.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV6, encodeFlowplanBackupV7 } from "../backup/flowplanBackupV1.js";
import { capturePortfolioSnapshot, validateHistoricalSnapshot } from "./capturePortfolioSnapshot.js";
import { addRationals, compareRationals, rationalToCanonicalString } from "../../domain/model/rational.js";
import { capacityFromSerialized, consumedWorkloadFromSerialized, rationalOf } from "../../domain/model/scalars.js";
import { ZERO } from "../../domain/portfolioSnapshots/historicalDailyProfile.js";
import { snapshotId } from "../../domain/actuals/snapshots.js";
import type { HistoricalProjectForecastV2, PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";

const viewport = { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 };
const instant = "2026-10-08T10:00:00.000Z";
function state(mode: "none" | "raf-only" | "zero" | "v5" | "legacy" = "v5", change: (dto: any) => void = () => {}) {
  const dto: any = encodePlanningInputs(createDemoPlanningScenario());
  const p = dto.portfolio.projects[0]; const ids = p.requirements.map((r: any) => r.teamId);
  p.requirements.forEach((r: any) => { r.remainingWorkload = "2/3"; });
  if (["v5", "zero", "raf-only"].includes(mode)) {
    p.migrationStatus = "native";
    p.snapshots = [{ snapshotId: snapshotId("project", p.id, 1), version: 1, knowledgeDate: "2026-01-01", participation: ids, retiredZeroTeams: [],
      raf: ids.map((teamId: string) => ({ teamId, amount: "2/3" })),
      ...(mode === "raf-only" ? {} : { coverage: { actualsFrom: "2024-12-27", actualsThrough: "2024-12-30", periods: [
        { periodId: "a", from: "2024-12-27", through: "2024-12-27", consumed: ids.map((teamId: string) => ({ teamId, amount: mode === "zero" ? "0/1" : "1/3" })) },
        { periodId: "b", from: "2024-12-28", through: "2024-12-30", consumed: ids.map((teamId: string) => ({ teamId, amount: "0/1" })) },
      ] } }) }];
  }
  if (mode === "legacy") {
    p.migrationStatus = "legacy-pending";
    p.legacyV4Actuals = { actualsFromDate: "2024-12-27", records: [{ actualsThroughDate: "2024-12-30", teams: ids.map((teamId: string) => ({ teamId, cumulativeConsumed: "1/3", remainingWorkload: "2/3" })) }], rafAuthorityByTeam: ids.map((teamId: string) => ({ teamId, authority: "current-configuration" })) };
  }
  change(dto);
  return decodePlanningInputs(dto, 5, undefined, true);
}
function capture(s = state()) {
  const run = buildPlanningSessionProjection({ state: s, geometryViewport: viewport });
  const snapshot = capturePortfolioSnapshot(s, run.planningResult, run.actualsReconstruction, "daily", instant);
  return { s, run, snapshot, row: snapshot.forecast.projects[0]! as HistoricalProjectForecastV2 };
}
function sum(values: readonly string[]) {
  return values.reduce((total, value) => {
    const q = consumedWorkloadFromSerialized(value); assert.ok(q.ok);
    return addRationals(total, rationalOf(q.value));
  }, ZERO);
}
function legacy(snapshot: PortfolioSnapshot, s: ReturnType<typeof state>) {
  const dto: any = structuredClone(snapshot); dto.forecast.forecastSchemaVersion = 1;
  dto.forecast.projects.forEach((row: any) => { delete row.dailyProfile; });
  return validateHistoricalSnapshot(dto, s);
}

describe("11A.2 exact published daily capture", () => {
  for (const mode of ["none", "raf-only", "zero", "v5", "legacy"] as const) it(`captures ${mode}, conserving exact totals and source ranges without mutating inputs`, () => {
    const { s, run, snapshot } = capture(state(mode));
    assert.equal(snapshot.forecast.forecastSchemaVersion, 2);
    for (const row of snapshot.forecast.projects as readonly HistoricalProjectForecastV2[]) {
      const d = row.dailyProfile;
      assert.equal(rationalToCanonicalString(sum(d.days.map((day) => day.actualsWorkload))), row.actuals);
      assert.ok(compareRationals(sum(d.days.map((day) => day.forecastWorkload)), sum([row.raf])) <= 0);
      assert.equal(rationalToCanonicalString(sum([row.actuals, row.raf])), row.eac);
      const plans = run.planningResult.teamPlans.flatMap((t) => t.projectPlans.filter((p) => p.projectId === row.projectId));
      const project = s.portfolio.projects.find((p) => p.id === row.projectId)!;
      if (project.isActive && plans.every((p) => p.complete)) assert.equal(rationalToCanonicalString(sum(d.days.map((day) => day.forecastWorkload))), row.raf);
      assert.deepEqual(d.forecastRange, { from: s.planning.startDate, through: s.planning.endDate });
      assert.deepEqual(d.days.map((day) => day.date), [...new Set(d.days.map((day) => day.date))].sort());
      assert.ok(d.days.every((day) => day.actualsWorkload !== "0/1" || day.forecastWorkload !== "0/1"));
      assert.equal(row.estimatedStartDate, d.days[0]?.date ?? null);
      if (row.estimatedEndDate) assert.equal(row.estimatedEndDate, d.days.filter((day) => day.forecastWorkload !== "0/1").at(-1)?.date);
      for (const day of d.days) {
        assert.equal(day.actualsWorkload, rationalToCanonicalString(run.actualsReconstruction.contributions.filter((c) => c.sourceKind === "project" && c.sourceId === row.projectId && c.date === day.date).reduce((a, c) => addRationals(a, rationalOf(c.amount)), ZERO)));
        assert.equal(day.forecastWorkload, rationalToCanonicalString(plans.flatMap((p) => p.allocations).filter((a) => a.date === day.date).reduce((a, c) => addRationals(a, rationalOf(c.workload)), ZERO)));
      }
    }
    assert.deepEqual(encodePlanningInputs(s), encodePlanningInputs(state(mode)));
    const row = snapshot.forecast.projects[0]! as HistoricalProjectForecastV2;
    assert.deepEqual(row.dailyProfile.actualsRange, ["none", "raf-only"].includes(mode) ? null : { from: "2024-12-27", through: "2024-12-30" });
    if (mode === "v5") { assert.equal(row.dailyProfile.days[0]!.actualsWorkload, "2/3"); assert.equal(row.dailyProfile.days[0]!.forecastWorkload, "0/1"); assert.ok(!row.dailyProfile.days.some((d) => d.date === "2024-12-28")); }
  });
  for (const scenario of ["inactive", "zero-raf", "no-allocation", "incomplete", "complete"] as const) it(`Forecast ${scenario} respects positioned workload rather than inventing RAF`, () => {
    const s = state("none", (dto) => {
      const p = dto.portfolio.projects[0];
      if (scenario === "inactive") p.isActive = false;
      if (scenario === "zero-raf") p.requirements.forEach((r: any) => { r.remainingWorkload = "0/1"; });
      if (scenario === "no-allocation") p.earliestStartDate = "2027-01-01";
      if (scenario === "incomplete") { dto.planning.endDate = dto.planning.startDate; p.requirements.forEach((r: any) => { r.remainingWorkload = "999/1"; }); }
    });
    const { row } = capture(s); const f = rationalToCanonicalString(sum(row.dailyProfile.days.map((d) => d.forecastWorkload)));
    if (scenario === "complete") assert.equal(f, row.raf);
    if (["inactive", "zero-raf", "no-allocation"].includes(scenario)) assert.equal(f, "0/1");
    if (scenario === "incomplete") { assert.equal(row.endAbsenceReason, "incomplete-within-horizon"); assert.notEqual(f, row.raf); }
  });
  for (const invalid of ["no-team", "unknown-team", "missing-priority"] as const) it(`rejects ${invalid} before publishing a Project run`, () => {
    assert.throws(() => state("none", (dto) => {
      const p = dto.portfolio.projects[0];
      if (invalid === "no-team") p.requirements = [];
      if (invalid === "unknown-team") p.requirements[0].teamId = "missing-team";
      if (invalid === "missing-priority") dto.portfolio.priorityOrder = dto.portfolio.priorityOrder.filter((id: string) => id !== p.id);
    }), invalid === "no-team" ? /at least one team requirement/ : invalid === "unknown-team" ? /team in the portfolio/ : /exactly once in priority order/);
  });
  for (const blocked of ["empty-capacity", "zero-daily-cap", "future-start", "non-working-horizon", "priority-blocked"] as const) it(`publishes incomplete plans and saves positive unallocated RAF: ${blocked}`, () => {
    const s = state("none", (dto) => {
      const p = dto.portfolio.projects[0];
      if (blocked === "empty-capacity") dto.portfolio.teams.forEach((t: any) => { t.capacitySchedule = { periods: [], exceptions: [] }; });
      if (blocked === "zero-daily-cap") p.requirements.forEach((r: any) => { r.dailyCap = "0/1"; });
      if (blocked === "future-start") p.earliestStartDate = "2027-01-01";
      if (blocked === "non-working-horizon") { dto.planning.startDate = "2025-01-04"; dto.planning.endDate = "2025-01-05"; }
      if (blocked === "priority-blocked") {
        const blocker = structuredClone(p); blocker.id = "project-blocker"; blocker.name = "Blocker";
        blocker.requirements.forEach((r: any) => { r.remainingWorkload = "9999/1"; delete r.dailyCap; });
        dto.portfolio.projects.push(blocker); dto.portfolio.priorityOrder.unshift(blocker.id); dto.planning.maxParallelProjects = 1;
      }
    });
    const session = createPlanningSession(s); let builds = 0, writes = 0, document = "";
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport, hasUnappliedChanges: () => false,
      now: () => instant, snapshotId: () => "blocked",
      buildProjection: (input) => { builds++; return buildPlanningSessionProjection(input); },
      backupStore: { read: () => document, write: (text) => { writes++; document = text; } } });
    const run = dispatcher.getProjection(), project = s.portfolio.projects[0]!;
    const plans = run.planningResult.teamPlans.flatMap((t) => t.projectPlans.filter((p) => p.projectId === project.id));
    assert.ok(project.isActive);
    assert.deepEqual(plans.map((p) => p.teamId).sort(), project.requirements.map((r) => r.teamId).sort());
    assert.ok(plans.length > 0);
    for (const plan of plans) {
      assert.equal(plan.complete, false); assert.deepEqual(plan.allocations, []);
      const requirement = project.requirements.find((r) => r.teamId === plan.teamId)!;
      assert.equal(rationalToCanonicalString(rationalOf(plan.remainingUnplannedWorkload)), rationalToCanonicalString(rationalOf(requirement.remainingWorkload)));
    }
    assert.equal(dispatcher.savePortfolioSnapshot().ok, true);
    const snapshot = dispatcher.getPortfolioSnapshots()[0]!;
    const row = snapshot.forecast.projects[0]! as HistoricalProjectForecastV2;
    assert.equal(row.raf, "4/3"); assert.deepEqual(row.dailyProfile.days, []);
    assert.equal(row.endAbsenceReason, "incomplete-within-horizon"); assert.equal(row.estimatedEndDate, null);
    assert.equal(row.estimatedStartDate, null); assert.equal(row.startAbsenceReason, "no-activity");
    assert.deepEqual(decodeFlowplanBackup(document).portfolioSnapshots, [snapshot]);
    assert.strictEqual(dispatcher.getProjection(), run); assert.equal(builds, 1); assert.equal(writes, 1);
  });
  it("keeps every Team plan when one completes and another cannot allocate", () => {
    const { s, run, row } = capture(state("none", (dto) => { dto.portfolio.projects[0].requirements[1].dailyCap = "0/1"; }));
    const plans = run.planningResult.teamPlans.flatMap((t) => t.projectPlans.filter((p) => p.projectId === s.portfolio.projects[0]!.id));
    assert.equal(plans.length, 2); assert.equal(plans[0]!.complete, true); assert.equal(plans[1]!.complete, false);
    assert.deepEqual(plans[1]!.allocations, []);
    assert.equal(rationalToCanonicalString(sum(row.dailyProfile.days.map((d) => d.forecastWorkload))), "2/3");
    assert.equal(row.raf, "4/3"); assert.equal(row.endAbsenceReason, "incomplete-within-horizon");
  });
  it("keeps Actuals after the planning horizon", () => {
    const { row } = capture(state("v5", (dto) => {
      const c = dto.portfolio.projects[0].snapshots[0].coverage;
      c.actualsFrom = "2025-12-27"; c.actualsThrough = "2025-12-30";
      for (const p of c.periods) { p.from = p.from.replace("2024", "2025"); p.through = p.through.replace("2024", "2025"); }
    }));
    assert.ok(row.dailyProfile.days.some((d) => d.date > row.dailyProfile.forecastRange.through && d.actualsWorkload !== "0/1"));
  });
  it("aggregates multiple contributions and allocations on the same Project/date with exact fractions and no alias", () => {
    const { s, run } = capture();
    const actuals: any = { ...run.actualsReconstruction, contributions: run.actualsReconstruction.contributions.map((c) => ({ ...c })) };
    const contribution = actuals.contributions.find((c: any) => c.sourceKind === "project" && rationalOf(c.amount).numerator > 0n);
    const third = consumedWorkloadFromSerialized("1/9"); assert.ok(third.ok);
    contribution.amount = third.value; actuals.contributions.push({ ...contribution }, { ...contribution });
    const result: any = { ...run.planningResult, teamPlans: run.planningResult.teamPlans.map((t) => ({ ...t, projectPlans: t.projectPlans.map((p) => ({ ...p, allocations: p.allocations.map((a) => ({ ...a })) })) })) };
    const plan = result.teamPlans.flatMap((t: any) => t.projectPlans).find((p: any) => p.projectId === s.portfolio.projects[0]!.id && p.allocations.length);
    const allocation = plan.allocations[0]; const amount = rationalOf(allocation.workload);
    const piece = capacityFromSerialized(`${amount.numerator}/${amount.denominator * 2n}`); assert.ok(piece.ok);
    allocation.workload = piece.value; plan.allocations.push({ ...allocation });
    const saved = capturePortfolioSnapshot(s, result, actuals, "split", instant);
    const before = JSON.stringify(saved);
    actuals.contributions.length = 0; plan.allocations.length = 0;
    assert.equal(JSON.stringify(saved), before);
    const profile = (saved.forecast.projects[0] as HistoricalProjectForecastV2).dailyProfile;
    assert.throws(() => { (profile.days as any).push({}); }, TypeError);
    assert.throws(() => { (profile.days[0] as any).actualsWorkload = "99/1"; }, TypeError);
    assert.throws(() => { (profile.actualsRange as any).from = "2020-01-01"; }, TypeError);
  });
  it("omits explicit zero allocations and Forecast weekends/gaps", () => {
    const { s, run, snapshot } = capture(state("none"));
    const zero = capacityFromSerialized("0/1"); assert.ok(zero.ok);
    const result = { ...run.planningResult, teamPlans: run.planningResult.teamPlans.map((t) => ({ ...t,
      projectPlans: t.projectPlans.map((p) => ({ ...p, allocations: [...p.allocations, { date: s.planning.endDate, workload: zero.value }] })) })) };
    const withZeros = capturePortfolioSnapshot(s, result, run.actualsReconstruction, "daily", instant);
    assert.deepEqual(withZeros, snapshot);
    const row = snapshot.forecast.projects[0]! as HistoricalProjectForecastV2;
    assert.ok(!row.dailyProfile.days.some((d) => d.date === "2025-01-04" || d.date === "2025-01-05"));
  });
  it("allows Actuals/Forecast overlap on one civil day without shifting either component", () => {
    const s = state("v5", (dto) => {
      const c = dto.portfolio.projects[0].snapshots[0].coverage;
      c.actualsFrom = "2025-01-01"; c.actualsThrough = "2025-01-01";
      c.periods = [{ ...c.periods[0], from: c.actualsFrom, through: c.actualsThrough }];
    });
    const historical = validateHistoricalSnapshot(JSON.parse(readFileSync("src/main/planning/fixtures/lot11c-baseline-overlap.json", "utf8")), s);
    const row = historical.forecast.projects[0]! as HistoricalProjectForecastV2;
    assert.equal(historical.forecast.engineVersion, "planning-engine-v1/actuals-aware/1");
    assert.ok(row.dailyProfile.days.some((d) => d.actualsWorkload !== "0/1" && d.forecastWorkload !== "0/1"));
  });
  it("rejects a purported fully allocated run when its daily Forecast does not conserve RAF", () => {
    const { s, run } = capture(state("none"));
    const result = { ...run.planningResult, teamPlans: run.planningResult.teamPlans.map((t) => ({ ...t,
      projectPlans: t.projectPlans.map((p) => ({ ...p, allocations: p.projectId === s.portfolio.projects[0]!.id ? [] : p.allocations })) })) };
    assert.throws(() => capturePortfolioSnapshot(s, result, run.actualsReconstruction, "bad-complete", instant), /differs from RAF/);
  });
  it("copies every mutable profile DTO member before freezing", () => {
    const { s, snapshot } = capture(); const dto: any = structuredClone(snapshot);
    const saved = validateHistoricalSnapshot(dto, s); const before = JSON.stringify(saved);
    dto.forecast.projects[0].dailyProfile.days[0].actualsWorkload = "999/1";
    dto.forecast.projects[0].dailyProfile.actualsRange.from = "2020-01-01";
    dto.forecast.projects[0].dailyProfile.forecastRange.through = "2027-01-01";
    dto.forecast.projects[0].dailyProfile.days.length = 0;
    assert.equal(JSON.stringify(saved), before);
  });
  it("V5 uses only the published current version, never sums retained versions", () => {
    const s = state("v5", (dto) => {
      const p = dto.portfolio.projects[0], next = structuredClone(p.snapshots[0]);
      next.version = 2; next.snapshotId = snapshotId("project", p.id, 2); next.knowledgeDate = "2026-01-02";
      next.coverage.periods[0].periodId = "replacement";
      next.coverage.periods[0].consumed.forEach((c: any) => { c.amount = "2/3"; }); p.snapshots.push(next);
    });
    const { row } = capture(s); assert.equal(row.actuals, "4/3");
    assert.equal(rationalToCanonicalString(sum(row.dailyProfile.days.map((d) => d.actualsWorkload))), "4/3");
  });
});

describe("11A.2 V7 and unavailable schema 1", () => {
  it("round trips mixed schemas and equal timestamps; refuses V6 downgrade and never enriches V6 at startup", () => {
    const { s, snapshot } = capture(); const old = legacy(snapshot, s);
    const v6 = encodeFlowplanBackupV6({ ...s, portfolioSnapshots: [old] }, instant);
    const imported = decodeFlowplanBackup(v6);
    assert.deepEqual(imported.portfolioSnapshots, [old]);
    assert.ok(!Object.hasOwn(imported.portfolioSnapshots![0]!.forecast.projects[0]!, "dailyProfile"));
    const mix = { ...imported, portfolioSnapshots: [old, { ...snapshot, snapshotId: "new" }] };
    const text = encodeFlowplanBackupV7(mix, instant);
    assert.equal(JSON.parse(text).version, 7); assert.ok(!text.includes("\n"));
    assert.equal(encodeFlowplanBackupV7(decodeFlowplanBackup(text), instant), text);
    assert.throws(() => encodeFlowplanBackupV6(mix), /schema 1/);
    const raw = JSON.parse(text); raw.version = 6; assert.throws(() => decodeFlowplanBackup(JSON.stringify(raw)), /schema 1/);
  });
  it("loads V6 without rewriting storage or generating profiles", () => {
    const { s, snapshot } = capture(); const old = legacy(snapshot, s);
    const text = encodeFlowplanBackupV6({ ...s, portfolioSnapshots: [old] }, instant);
    let writes = 0, preflights = 0;
    const loaded = loadPlanningBackup({ read: () => text, write: () => { writes++; } }, s, () => { preflights++; });
    assert.equal(loaded.invalid, false); assert.equal(writes, 0); assert.equal(preflights, 1);
    assert.deepEqual(loaded.state.portfolioSnapshots, [old]);
  });
  it("decodes captured daily shapes without redistributing historical Actuals or recomputing Forecast", () => {
    const { s, snapshot } = capture();
    const raw = JSON.parse(encodeFlowplanBackupV7({ ...s, portfolioSnapshots: [snapshot] }, instant));
    const historical = raw.data.portfolioSnapshots[0];
    historical.forecast.engineVersion = "historical-engine-not-installed";
    historical.inputs.planning.workingWeekdays = [6, 7];
    for (const team of historical.inputs.portfolio.teams) {
      team.capacitySchedule.exceptions = [];
      for (const period of team.capacitySchedule.periods) period.dailyCapacity = "0/1";
    }
    const loaded = decodeFlowplanBackup(JSON.stringify(raw));
    assert.deepEqual((loaded.portfolioSnapshots![0]!.forecast.projects[0] as HistoricalProjectForecastV2).dailyProfile,
      (snapshot.forecast.projects[0] as HistoricalProjectForecastV2).dailyProfile);
  });
  it("distinguishes no source, uncovered RAF-only, covered zero, legacy schema1 and empty schema2", () => {
    for (const mode of ["none", "raf-only", "zero"] as const) {
      const { s, row, snapshot } = capture(state(mode, (dto) => { dto.portfolio.projects[0].isActive = false; }));
      assert.deepEqual(row.dailyProfile.days, []);
      assert.equal(row.actualsKnowledge, mode === "none" ? "none" : mode === "raf-only" ? "uncovered" : "covered");
      assert.equal(row.dailyProfile.actualsRange === null, mode !== "zero");
      assert.ok(!Object.hasOwn(legacy(snapshot, s).forecast.projects[0]!, "dailyProfile"));
    }
  });
  const invalid: [string, (row: any, snapshot: any) => void][] = [
    ["missing profile", (r) => { delete r.dailyProfile; }],
    ["unknown schema", (_, s) => { s.forecast.forecastSchemaVersion = 99; }],
    ["schema1 extra profile", (_, s) => { s.forecast.forecastSchemaVersion = 1; }],
    ["missing days", (r) => { delete r.dailyProfile.days; }],
    ["extra field", (r) => { r.dailyProfile.teamPlans = []; }],
    ["invalid date", (r) => { r.dailyProfile.days[0].date = "2024-02-30"; }],
    ["duplicate day", (r) => { r.dailyProfile.days.splice(1, 0, structuredClone(r.dailyProfile.days[0])); }],
    ["unordered days", (r) => { r.dailyProfile.days.reverse(); }],
    ["noncanonical", (r) => { r.dailyProfile.days[0].actualsWorkload = "4/6"; }],
    ["noncanonical Forecast", (r) => { r.dailyProfile.days.at(-1).forecastWorkload = "2/6"; }],
    ["negative Forecast", (r) => { r.dailyProfile.days.at(-1).forecastWorkload = "-1/3"; }],
    ["missing component", (r) => { delete r.dailyProfile.days[0].forecastWorkload; }],
    ["negative", (r) => { r.dailyProfile.days[0].actualsWorkload = "-2/3"; }],
    ["double zero", (r) => { r.dailyProfile.days[0].actualsWorkload = "0/1"; }],
    ["reversed range", (r) => { r.dailyProfile.actualsRange.from = "2027-01-01"; }],
    ["missing coverage", (r) => { r.dailyProfile.actualsRange = null; }],
    ["wrong horizon", (r) => { r.dailyProfile.forecastRange.through = "2027-01-01"; }],
    ["Actuals outside coverage", (r) => { r.dailyProfile.days[0].date = "2024-12-26"; }],
    ["Forecast outside horizon", (r) => { r.dailyProfile.days[0].forecastWorkload = "1/3"; }],
    ["Actuals sum", (r) => { r.dailyProfile.days[0].actualsWorkload = "1/3"; }],
    ["Forecast exceeds RAF", (r) => { r.dailyProfile.days.at(-1).forecastWorkload = "999/1"; }],
    ["start mismatch", (r) => { r.estimatedStartDate = "2024-12-28"; }],
    ["end mismatch", (r) => { r.estimatedEndDate = "2025-01-31"; r.endAbsenceReason = null; }],
    ["EAC mismatch", (r) => { r.eac = "999/1"; }],
    ["broken reference", (_, s) => { s.actualsSources[0].snapshotId = "missing"; }],
  ];
  for (const [name, edit] of invalid) it(`rejects whole V7 document: ${name}`, () => {
    const { s, snapshot } = capture();
    const raw = JSON.parse(encodeFlowplanBackupV7({ ...s, portfolioSnapshots: [snapshot, { ...snapshot, snapshotId: "middle" }, { ...snapshot, snapshotId: "last" }] }, instant));
    const middle = raw.data.portfolioSnapshots[1]; edit(middle.forecast.projects[0], middle);
    assert.throws(() => decodeFlowplanBackup(JSON.stringify(raw)), /portfolioSnapshots\[1\]/);
  });
  it("rejects Forecast for inactive historical Project", () => {
    const { s, snapshot } = capture(state("none", (dto) => { dto.portfolio.projects[0].isActive = false; }));
    const raw: any = structuredClone(snapshot); const r = raw.forecast.projects[0];
    r.dailyProfile.days.push({ date: s.planning.startDate, actualsWorkload: "0/1", forecastWorkload: "1/3" });
    r.estimatedStartDate = s.planning.startDate; r.startAbsenceReason = null;
    assert.throws(() => validateHistoricalSnapshot(raw, s), /inactive/);
  });
  for (const [label, failure] of [["write failure", new Error("storage unavailable")], ["quota failure", new DOMException("Quota exceeded", "QuotaExceededError")]] as const) {
    it(`schema2 Save ${label} publishes nothing and preserves prior history without engine call`, () => {
      const { s, snapshot } = capture(); const session = createPlanningSession(s);
      let builds = 0, writes = 0; const previousDocument = encodeFlowplanBackupV7({ ...session.getState(), portfolioSnapshots: [snapshot] }, instant);
      const dispatcher = createPlanningProjectionDispatcher({ session, initialSnapshots: [snapshot], geometryViewport: viewport, hasUnappliedChanges: () => false,
        now: () => instant, snapshotId: () => "attempt",
        buildProjection: (input) => { builds++; return buildPlanningSessionProjection(input); },
        backupStore: { read: () => previousDocument, write: (text) => {
          writes++; assert.equal(JSON.parse(text).data.portfolioSnapshots.at(-1).forecast.forecastSchemaVersion, 2); throw failure;
        } } });
      const before = session.getState(), run = dispatcher.getProjection();
      const result = dispatcher.savePortfolioSnapshot(); assert.equal(result.ok, false);
      if (!result.ok) { assert.equal(result.errors[0]!.code, "COMMIT_FAILED"); assert.equal(result.errors[0]!.message, "Portfolio history could not be saved."); }
      assert.strictEqual(session.getState(), before); assert.strictEqual(dispatcher.getProjection(), run);
      assert.equal(encodeFlowplanBackupV7({ ...session.getState(), portfolioSnapshots: dispatcher.getPortfolioSnapshots() }, instant), previousDocument);
      assert.equal(builds, 1); assert.equal(writes, 1); assert.equal(dispatcher.getPortfolioSnapshots().length, 1);
    });
  }
  it("Save codec error leaves state, prior document and published run intact without recompute", () => {
    const s = state(); const session = createPlanningSession(s); let builds = 0; let document = "old";
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport, hasUnappliedChanges: () => false, now: () => instant,
      buildProjection: (input) => { builds++; const run = buildPlanningSessionProjection(input); return { ...run, actualsReconstruction: { contributions: [], teamDayTotals: [] } }; },
      backupStore: { read: () => document, write: (text) => { document = text; } } });
    const before = session.getState(), run = dispatcher.getProjection();
    const result = dispatcher.savePortfolioSnapshot(); assert.equal(result.ok, false);
    assert.strictEqual(session.getState(), before); assert.strictEqual(dispatcher.getProjection(), run);
    assert.equal(document, "old"); assert.equal(builds, 1);
  });
});
