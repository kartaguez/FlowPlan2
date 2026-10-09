import { captureLegacyInputs as capturePortfolioSnapshot } from "./legacyCapture.fixture.js";
import type { PlanningBackupDataset } from "../backup/planningBackupDataset.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningSession, type PlanningSessionState } from "../session/planningSession.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/synchronousPlanningDispatcher.fixture.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { decodePlanningInputs, encodePlanningInputs } from "../backup/planningInputCodec.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV1, encodeFlowplanBackupV2, encodeFlowplanBackupV3, encodeFlowplanBackupV4, encodeFlowplanBackupV5, encodeFlowplanBackupV6 } from "../backup/flowplanBackupV1.js";
import { hydrateHistoricalInputs } from "./capturePortfolioSnapshot.js";
import { createPortfolioSnapshot, comparePortfolioSnapshots } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { createCivilDate, snapshotId, unavailabilityRatioFromSerialized, type DomainResult } from "../../domain/index.js";
import { loadPlanningBackup, importPlanningBackup } from "../../main/planning/planningBackupOperations.js";

const viewport = { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 };
const instant = "2026-10-07T10:00:00.123Z";
function must<T>(r: DomainResult<T>): T { if (!r.ok) throw new Error(r.errors.map((e) => e.message).join()); return r.value; }
function rich(mode: "none" | "raf-only" | "zero" | "v5" | "legacy" | "reconciled" = "none"): PlanningSessionState {
  const data: any = encodePlanningInputs(createDemoPlanningScenario());
  data.planning.workingWeekdays = [1, 2, 4, 5]; data.planning.maxParallelProjects = 3;
  data.portfolio.teams[0].capacitySchedule.exceptions = [{ date: "2024-12-01", capacity: "1/3" }, { date: "2025-01-01", capacity: "7/3" }];
  data.portfolio.teams[0].capacitySchedule.periods[0].unavailabilityRatio = "1/3";
  data.portfolio.teams[0].capacitySchedule.periods[1].dailyCapacity = "8/3";
  const p = data.portfolio.projects[0]; const ids = p.requirements.map((r: any) => r.teamId);
  p.requirements[0].dailyCap = "1/3"; p.requirements[0].remainingWorkload = "7/3";
  p.requirements[1].remainingWorkload = "2/3";
  p.earliestStartDate = "2025-01-10"; p.objectiveEndDate = "2025-02-01"; p.mandatoryDeadline = "2025-02-01";
  data.portfolio.projects[1].isActive = false;
  data.portfolio.reservations[0].isActive = false;
  data.portfolio.reservations[1].teamAllocations[0].amount = { kind: "fixed-daily", dailyCapacity: "2/3" };
  if (mode === "legacy" || mode === "reconciled") {
    p.legacyV4Actuals = { actualsFromDate: "2024-12-01", records: [
      { actualsThroughDate: "2024-12-01", teams: [{ teamId: ids[0], cumulativeConsumed: "1/3", remainingWorkload: "5/3" },
        { teamId: data.portfolio.teams[2].id, cumulativeConsumed: "2/3", remainingWorkload: "1/1" }] },
      { actualsThroughDate: "2024-12-02", teams: [{ teamId: ids[1], cumulativeConsumed: "2/3", remainingWorkload: "2/3" }] },
      { actualsThroughDate: "2024-12-03", teams: [{ teamId: ids[0], cumulativeConsumed: "4/3", remainingWorkload: "7/3" }] },
    ], rafAuthorityByTeam: ids.map((teamId: string) => ({ teamId, authority: "current-configuration" })) };
    p.migrationStatus = "legacy-pending";
    const r = data.portfolio.reservations[0];
    r.legacyV4Actuals = { actualsFromDate: "2024-12-01", records: [{ actualsThroughDate: "2024-12-02", teams: [
      { teamId: data.portfolio.teams[2].id, cumulativeConsumed: "1/3" }] }] }; r.migrationStatus = "legacy-pending";
  }
  if (["raf-only", "zero", "v5", "reconciled"].includes(mode)) {
    p.snapshots = [{ snapshotId: snapshotId("project", p.id, 1), version: 1, knowledgeDate: "2025-01-06", participation: ids, retiredZeroTeams: mode === "reconciled" ? [data.portfolio.teams[2].id] : [],
      raf: p.requirements.map((r: any) => ({ teamId: r.teamId, amount: r.remainingWorkload })),
      ...(mode === "raf-only" ? {} : { coverage: { actualsFrom: "2024-12-01", actualsThrough: "2024-12-02", periods: [
        { periodId: "p1", from: "2024-12-01", through: "2024-12-02", consumed: ids.map((teamId: string) => ({ teamId, amount: mode === "zero" ? "0/1" : "1/3" })) }] } }) }];
    p.migrationStatus = mode === "reconciled" ? "reconciled" : "native";
    const r = data.portfolio.reservations[1]; const teams = r.teamAllocations.map((a: any) => a.teamId);
    r.migrationStatus = "native";
    r.snapshots = [{ snapshotId: snapshotId("reservation", r.id, 1), version: 1, knowledgeDate: "2025-01-06", participation: teams, retiredZeroTeams: [],
      coverage: { actualsFrom: "2025-01-01", actualsThrough: "2025-01-01", periods: [{ periodId: "rp1", from: "2025-01-01", through: "2025-01-01", consumed: teams.map((teamId: string) => ({ teamId, amount: "0/1" })) }] } }];
  }
  return decodePlanningInputs(data, 5, undefined, true);
}
function fixture(state: PlanningBackupDataset = rich()) {
  const session = createPlanningSession(state, { today: () => must(createCivilDate("2026-10-07")) });
  let clock = instant, id = 0, dirty = false, fail = false, writes = 0, builds = 0, document = "original";
  const dispatcher = createPlanningProjectionDispatcher({ session, initialSnapshots: state.portfolioSnapshots, geometryViewport: viewport, now: () => clock, snapshotId: () => `capture-${++id}`,
    hasUnappliedChanges: () => dirty,
    buildProjection: (input) => { builds++; return buildPlanningSessionProjection(input); },
    backupStore: { read: () => document, write: (next) => { if (fail) throw new Error("quota"); writes++; document = next; } } });
  return { session, dispatcher, clock: (v: string) => { clock = v; }, dirty: (v: boolean) => { dirty = v; }, fail: (v: boolean) => { fail = v; },
    builds: () => builds, writes: () => writes, document: () => document, save: dispatcher.savePortfolioSnapshot };
}
function capture(state: PlanningSessionState) {
  const projection = buildPlanningSessionProjection({ state, geometryViewport: viewport });
  // Keep the original 11A/V6 regression fixtures explicitly on schema 1.
  const current = capturePortfolioSnapshot(state, projection.planningResult, projection.actualsReconstruction, "capture", instant);
  const legacy = structuredClone(current) as any;
  legacy.forecast.forecastSchemaVersion = 1;
  for (const row of legacy.forecast.projects) delete row.dailyProfile;
  return createPortfolioSnapshot(legacy, state.portfolio);
}

describe("11A Portfolio capture and V6", () => {
  it("creates only by explicit Save, repeats identical inputs, accepts same timestamps and clock rollback", () => {
    const app = fixture(); const projection = app.dispatcher.getProjection();
    assert.deepEqual(app.dispatcher.getPortfolioSnapshots(), []);
    assert.equal(app.save().ok, true); assert.equal(app.save().ok, true);
    app.clock("2025-01-01T00:00:00.000Z"); assert.equal(app.save().ok, true);
    const snapshots = app.dispatcher.getPortfolioSnapshots();
    assert.equal(snapshots.length, 3); assert.equal(new Set(snapshots.map((s) => s.snapshotId)).size, 3);
    assert.deepEqual(snapshots.map((s) => s.createdAt), [instant, instant, "2025-01-01T00:00:00.000Z"]);
    assert.deepEqual([...snapshots].reverse().sort(comparePortfolioSnapshots).map((s) => s.snapshotId), ["capture-3", "capture-1", "capture-2"]);
    assert.strictEqual(app.dispatcher.getProjection(), projection); assert.equal(app.builds(), 1); assert.equal(app.writes(), 3);
    assert.deepEqual(snapshots[0]!.inputs, snapshots[1]!.inputs);
  });
  it("guards actual-time dirty including direct calls and missing precondition", () => {
    const app = fixture(); const state = app.session.getState();
    app.dirty(true); assert.equal(app.save().ok, false); assert.equal(app.writes(), 0); assert.strictEqual(app.session.getState(), state);
    app.dirty(false); assert.equal(app.save().ok, true);
    const unguarded = createPlanningProjectionDispatcher({ session: createPlanningSession(rich()), geometryViewport: viewport });
    assert.equal(unguarded.savePortfolioSnapshot().ok, false);
  });
  it("refuses a state/projection mismatch without changing either", () => {
    const app = fixture(); const projection = app.dispatcher.getProjection(); const p = app.session.getState().portfolio.projects[0]!;
    assert.equal(app.session.dispatch({ kind: "set-project-active", projectId: p.id, isActive: false }).ok, true);
    const before = app.session.getState(); assert.equal(app.save().ok, false);
    assert.strictEqual(app.session.getState(), before); assert.strictEqual(app.dispatcher.getProjection(), projection); assert.equal(app.writes(), 0);
  });
  it("rejects duplicate IDs but never timestamps", () => {
    const session = createPlanningSession(rich());
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport, now: () => instant, snapshotId: () => "same", hasUnappliedChanges: () => false });
    assert.equal(dispatcher.savePortfolioSnapshot().ok, true); const before = session.getState();
    assert.equal(dispatcher.savePortfolioSnapshot().ok, false); assert.strictEqual(session.getState(), before);
  });
  it("Save persistence failure publishes no partial artifact, projection or inputs", () => {
    const app = fixture(rich("v5")); const state = app.session.getState(), projection = app.dispatcher.getProjection();
    app.fail(true); assert.equal(app.save().ok, false);
    assert.strictEqual(app.session.getState(), state); assert.strictEqual(app.dispatcher.getProjection(), projection);
    assert.equal(app.document(), "original"); assert.equal(app.builds(), 1); assert.deepEqual(app.dispatcher.getPortfolioSnapshots(), []);
  });
  it("Delete is atomic, validates IDs, preserves all Actuals and does no recompute", () => {
    const app = fixture(rich("v5")); assert.equal(app.save().ok, true); assert.equal(app.save().ok, true);
    const before = app.session.getState(), projection = app.dispatcher.getProjection();
    assert.equal(app.dispatcher.deletePortfolioSnapshot("unknown").ok, false);
    assert.equal(app.dispatcher.deletePortfolioSnapshot(" ").ok, false);
    app.fail(true); assert.equal(app.dispatcher.deletePortfolioSnapshot("capture-1").ok, false); assert.strictEqual(app.session.getState(), before);
    app.fail(false); app.dirty(true); assert.equal(app.dispatcher.deletePortfolioSnapshot("capture-1").ok, true);
    assert.equal(app.dispatcher.getPortfolioSnapshots().length, 1); assert.strictEqual(app.session.getState().portfolio, before.portfolio);
    assert.strictEqual(app.dispatcher.getProjection(), projection); assert.equal(app.builds(), 1);
  });
  for (const mode of ["none", "raf-only", "zero", "v5", "legacy", "reconciled"] as const) {
    it(`losslessly captures rich inputs and exclusive ${mode} Actuals with exact minimal forecast`, () => {
      const state = rich(mode); const before = encodePlanningInputs(state); const snapshot = capture(state);
      const hydrated = hydrateHistoricalInputs(snapshot.inputs, snapshot.actualsSources, state);
      assert.deepEqual(encodePlanningInputs(hydrated), before); assert.deepEqual(encodePlanningInputs(state), before);
      const totals = snapshot.forecast.projects[0]!;
      assert.equal(totals.raf, "3/1");
      assert.equal(totals.actuals, mode === "legacy" ? "8/3" : ["v5", "reconciled"].includes(mode) ? "2/3" : "0/1");
      assert.equal(totals.eac, mode === "legacy" ? "17/3" : ["v5", "reconciled"].includes(mode) ? "11/3" : "3/1");
      assert.equal(totals.actualsKnowledge, mode === "raf-only" ? "uncovered" : mode === "none" ? "none" : mode === "legacy" ? "legacy-v4" : "covered");
      assert.deepEqual(snapshot.forecast.projects.map((p) => p.priorityPosition), [1, 2, 3, 4]);
      assert.deepEqual(Object.keys(snapshot.forecast).sort(), ["engineVersion", "forecastSchemaVersion", "projects"]);
      assert.equal(JSON.stringify(snapshot).includes('"teamPlans"'), false);
      assert.equal(JSON.stringify(snapshot.inputs).includes('"snapshots"'), false);
      const session = { ...state, portfolioSnapshots: [snapshot] };
      const document = encodeFlowplanBackupV6(session, "2024-01-01T00:00:00.000Z");
      assert.equal(encodeFlowplanBackupV6(decodeFlowplanBackup(document), "2024-01-01T00:00:00.000Z"), document);
    });
  }
  it("retains an old V5 reference after later versions and membership evolution using a prefix", () => {
    const old = rich("v5"); const snapshot = capture(old); const data: any = encodePlanningInputs(old); const p = data.portfolio.projects[0];
    const second = structuredClone(p.snapshots[0]); second.version = 2; second.snapshotId = snapshotId("project", p.id, 2);
    second.knowledgeDate = "2025-01-07"; second.raf[0].amount = "9/1"; p.requirements[0].remainingWorkload = "9/1";
    second.coverage.periods[0].periodId = "p2"; second.coverage.periods[0].consumed[0].amount = "9/1";
    const alpha = p.requirements[0].teamId, beta = p.requirements[1].teamId, gamma = data.portfolio.teams[2].id;
    second.participation = [alpha, gamma]; second.retiredZeroTeams = [beta];
    second.raf = [{ teamId: alpha, amount: "9/1" }, { teamId: gamma, amount: "4/3" }];
    second.coverage.periods[0].consumed = [{ teamId: alpha, amount: "9/1" }, { teamId: gamma, amount: "4/3" }];
    p.requirements = [p.requirements[0], { teamId: gamma, remainingWorkload: "4/3" }];
    const zeroBeforeRetirement = structuredClone(p.snapshots[0]);
    zeroBeforeRetirement.version = 2; zeroBeforeRetirement.snapshotId = snapshotId("project", p.id, 2); zeroBeforeRetirement.knowledgeDate = "2025-01-07";
    zeroBeforeRetirement.raf[1].amount = "0/1"; zeroBeforeRetirement.coverage.periods[0].periodId = "p-zero-before-retire";
    zeroBeforeRetirement.coverage.periods[0].consumed[1].amount = "0/1";
    second.version = 3; second.snapshotId = snapshotId("project", p.id, 3); second.knowledgeDate = "2025-01-08";
    p.snapshots.push(zeroBeforeRetirement, second);
    const reservation = data.portfolio.reservations[1], r2 = structuredClone(reservation.snapshots[0]);
    r2.version = 2; r2.snapshotId = snapshotId("reservation", reservation.id, 2); r2.knowledgeDate = "2025-01-07";
    r2.coverage.periods[0].periodId = "rp2"; r2.coverage.periods[0].consumed[0].amount = "8/1";
    reservation.snapshots.push(r2);
    const current = decodePlanningInputs(data, 5, undefined, true);
    const document = encodeFlowplanBackupV6({ ...current, portfolioSnapshots: [snapshot] });
    const restored = decodeFlowplanBackup(document); const frozen = restored.portfolioSnapshots![0]!;
    assert.equal(restored.portfolio.projects[0]!.snapshots!.length, 3);
    const historical = hydrateHistoricalInputs(frozen.inputs, frozen.actualsSources, restored);
    assert.equal(historical.portfolio.projects[0]!.snapshots!.length, 1);
    assert.equal(historical.portfolio.reservations[1]!.snapshots!.length, 1);
    assert.deepEqual(historical.portfolio.projects[0]!.requirements.map((r) => r.teamId), [alpha, beta]);
    assert.equal(frozen.forecast.projects[0]!.actuals, "2/3");
  });
  it("pending legacy remains frozen after reconciliation without double counting or invented IDs", () => {
    const old = rich("legacy"), frozen = capture(old), reconciled = rich("reconciled");
    assert.equal(old.portfolio.projects[0]!.snapshots, undefined);
    assert.equal(frozen.actualsSources[0]!.source, "legacy-v4"); assert.equal('snapshotId' in frozen.actualsSources[0]!, false);
    const restored = decodeFlowplanBackup(encodeFlowplanBackupV6({ ...reconciled, portfolioSnapshots: [frozen] }));
    assert.equal(restored.portfolioSnapshots![0]!.forecast.projects[0]!.actuals, "8/3");
    const next = capture(restored); assert.equal(next.actualsSources[0]!.source, "snapshot"); assert.equal(next.forecast.projects[0]!.actuals, "2/3");
  });
  it("supports future-through legacy without synthesizing knowledge dates", () => {
    const data: any = encodePlanningInputs(rich("legacy")); data.portfolio.projects[0].legacyV4Actuals.records.at(-1).actualsThroughDate = "2027-01-01";
    const state = decodePlanningInputs(data, 5, undefined, true); const snap = capture(state);
    assert.equal(snap.actualsSources[0]!.source, "legacy-v4"); assert.equal(state.portfolio.projects[0]!.snapshots, undefined);
    assert.equal(decodeFlowplanBackup(encodeFlowplanBackupV6({ ...state, portfolioSnapshots: [snap] })).portfolioSnapshots!.length, 1);
  });
  it("deep freezes copied inputs and forecasts without retaining caller arrays", () => {
    const state = rich("legacy"), snap = capture(state); const inputs = snap.inputs as any;
    assert.throws(() => { inputs.portfolio.teams[0].capacitySchedule.exceptions.push({}); }, TypeError);
    assert.throws(() => { (snap.forecast.projects[0] as any).raf = "0/1"; }, TypeError);
    assert.notStrictEqual(inputs.portfolio.priorityOrder, state.portfolio.priorityOrder);
    assert.notStrictEqual(inputs.portfolio.projects[0].requirements, state.portfolio.projects[0]!.requirements);
  });
  it("ordinary settings, activation, priority and Team edits preserve captures", () => {
    const app = fixture(); assert.equal(app.save().ok, true); const before = JSON.stringify(app.dispatcher.getPortfolioSnapshots());
    const state = app.session.getState(), p = state.portfolio.projects[0]!, team = state.portfolio.teams[0]!;
    const commands = [
      { kind: "update-planning-settings" as const, ...state.planning, maxParallelProjects: 2 },
      { kind: "set-project-active" as const, projectId: p.id, isActive: false },
      { kind: "reorder-project" as const, projectId: p.id, targetPosition: 4 },
      { kind: "update-team-name" as const, teamId: team.id, name: "Changed" },
      { kind: "update-team-capacity-periods" as const, teamId: team.id, capacityPeriods: [] },
      { kind: "set-reservation-active" as const, reservationId: state.portfolio.reservations[1]!.id, isActive: false },
    ];
    for (const command of commands) { assert.equal(app.dispatcher.dispatch(command).ok, true); assert.equal(JSON.stringify(app.dispatcher.getPortfolioSnapshots()), before); }
    assert.equal(app.builds(), 7);
  });
  it("imports multi captures into a fresh store without rewriting historical engine/metrics", () => {
    const app = fixture(rich("v5")); app.save(); app.save(); const raw = JSON.parse(app.document());
    raw.data.portfolioSnapshots[0].forecast.engineVersion = "retired-engine/99";
    let stored = "old", recomputes = 0, reloads = 0;
    assert.equal(importPlanningBackup({ document: JSON.stringify(raw), store: { read: () => stored, write: (v) => { stored = v; } },
      preflight: () => { recomputes++; }, confirm: () => true, reload: () => { reloads++; } }), "imported");
    assert.equal(recomputes, 1); assert.equal(reloads, 1);
    assert.equal(decodeFlowplanBackup(stored).portfolioSnapshots![0]!.forecast.engineVersion, "retired-engine/99");
  });
  it("all V1–V5 readers migrate to empty history and all encoders refuse downgrade", () => {
    for (const encode of [encodeFlowplanBackupV1, encodeFlowplanBackupV2, encodeFlowplanBackupV3, encodeFlowplanBackupV4, encodeFlowplanBackupV5]) {
      const state = decodeFlowplanBackup(encode(createDemoPlanningScenario())); assert.deepEqual(state.portfolioSnapshots, []);
      assert.throws(() => encode({ ...state, portfolioSnapshots: [capture(state)] }), /Portfolio Snapshots/);
    }
  });
  const invalidCases: [string, (data: any) => void][] = [
    ["duplicate capture IDs", (d) => { d.portfolioSnapshots[1].snapshotId = d.portfolioSnapshots[0].snapshotId; }],
    ["noncanonical timestamp", (d) => { d.portfolioSnapshots[0].createdAt = "2026-10-07"; }],
    ["unknown inputs schema", (d) => { d.portfolioSnapshots[0].inputsSchemaVersion = 2; }],
    ["unknown forecast schema", (d) => { d.portfolioSnapshots[0].forecast.forecastSchemaVersion = 2; }],
    ["missing V5 owner", (d) => { d.portfolioSnapshots[0].actualsSources[0].objectId = "missing"; }],
    ["wrong kind", (d) => { d.portfolioSnapshots[0].actualsSources[0].kind = "reservation"; }],
    ["wrong reference/version", (d) => { d.portfolioSnapshots[0].actualsSources[0].snapshotId += ":99"; }],
    ["missing reference", (d) => { d.portfolioSnapshots[0].actualsSources.pop(); }],
    ["wrong historical RAF", (d) => { d.portfolioSnapshots[0].inputs.portfolio.projects[0].requirements[0].remainingWorkload = "9/1"; }],
    ["wrong historical membership", (d) => { d.portfolioSnapshots[0].inputs.portfolio.projects[0].requirements.pop(); }],
    ["unknown Team", (d) => { d.portfolioSnapshots[0].inputs.portfolio.teams.pop(); }],
    ["priority mismatch", (d) => { d.portfolioSnapshots[0].forecast.projects[0].priorityPosition = 2; }],
    ["noncanonical rational", (d) => { d.portfolioSnapshots[0].forecast.projects[0].raf = "6/2"; }],
    ["EAC mismatch", (d) => { d.portfolioSnapshots[0].forecast.projects[0].eac = "0/1"; }],
    ["wrong Actuals knowledge", (d) => { d.portfolioSnapshots[0].forecast.projects[0].actualsKnowledge = "none"; }],
    ["missing start reason", (d) => { d.portfolioSnapshots[0].forecast.projects[0].estimatedStartDate = null; d.portfolioSnapshots[0].forecast.projects[0].startAbsenceReason = null; }],
    ["invalid end reason", (d) => { d.portfolioSnapshots[0].forecast.projects[1].endAbsenceReason = "no-allocation"; }],
    ["invalid date", (d) => { d.portfolioSnapshots[0].forecast.projects[0].estimatedStartDate = "2025-02-30"; }],
    ["hidden full result", (d) => { d.portfolioSnapshots[0].forecast.teamPlans = []; }],
    ["recursive inputs", (d) => { d.portfolioSnapshots[0].inputs.portfolioSnapshots = []; }],
    ["duplicated Actuals history", (d) => { d.portfolioSnapshots[0].inputs.portfolio.projects[0].snapshots = []; }],
    ["invalid historical color", (d) => { d.portfolioSnapshots[0].inputs.portfolio.programs[0].color = "bad"; }],
    ["orphan catalog", (d) => { d.portfolioSnapshots[0].inputs.portfolio.programs.push({ id: "orphan", name: "Orphan", color: "#123456" }); }],
    ["invalid priorityOrder", (d) => { d.portfolioSnapshots[0].inputs.portfolio.priorityOrder.pop(); }],
  ];
  for (const [label, edit] of invalidCases) it(`rejects the entire V6 for ${label}, preserves startup/import document`, () => {
    const app = fixture(rich("v5")); app.save(); app.save(); const raw = JSON.parse(app.document());
    raw.version = 6;
    for (const snapshot of raw.data.portfolioSnapshots) {
      snapshot.forecast.forecastSchemaVersion = 1;
      for (const row of snapshot.forecast.projects) delete row.dailyProfile;
    }
    edit(raw.data);
    const bad = JSON.stringify(raw); assert.throws(() => decodeFlowplanBackup(bad));
    let stored = bad, writes = 0, reloads = 0;
    const store = { read: () => stored, write: (v: string) => { writes++; stored = v; } };
    assert.equal(loadPlanningBackup(store, createDemoPlanningScenario(), () => {}).invalid, true);
    assert.equal(stored, bad); assert.equal(writes, 0);
    assert.equal(importPlanningBackup({ document: bad, store, preflight: () => {}, confirm: () => true, reload: () => { reloads++; } }), "failed");
    assert.equal(stored, bad); assert.equal(writes, 0); assert.equal(reloads, 0);
  });
});

describe("11A dates, identities and independence", () => {
  it("capture uses Timeline's exact end dates and inactive reasons, includes inactive positive Actuals", () => {
    const data: any = encodePlanningInputs(rich("v5")); data.portfolio.projects[0].isActive = false;
    const state = decodePlanningInputs(data, 5, undefined, true);
    const snap = capture(state); const projection = buildPlanningSessionProjection({ state, geometryViewport: viewport });
    assert.equal(snap.forecast.projects[0]!.estimatedStartDate, "2024-12-01");
    assert.equal(snap.forecast.projects[0]!.estimatedEndDate, null); assert.equal(snap.forecast.projects[0]!.endAbsenceReason, "inactive");
    for (const row of snap.forecast.projects) {
      const timeline = projection.viewModel.projects.find((p) => p.id === row.projectId)!;
      assert.equal(row.estimatedEndDate, timeline.estimatedEndDate ?? null);
    }
  });
  it("start uses actual activity rather than actualsFrom or earliestStartDate", () => {
    const data: any = encodePlanningInputs(rich("v5")); const p = data.portfolio.projects[0];
    p.snapshots[0].coverage.periods = [
      { periodId: "zero", from: "2024-12-01", through: "2024-12-01", consumed: p.snapshots[0].participation.map((teamId: string) => ({ teamId, amount: "0/1" })) },
      { periodId: "positive", from: "2024-12-02", through: "2024-12-02", consumed: p.snapshots[0].participation.map((teamId: string) => ({ teamId, amount: "1/3" })) },
    ];
    const state = decodePlanningInputs(data, 5, undefined, true); assert.equal(capture(state).forecast.projects[0]!.estimatedStartDate, "2024-12-02");
  });
  it("zero RAF gives no end allocation but positive Actuals can still give a start", () => {
    const data: any = encodePlanningInputs(rich("v5")); const p = data.portfolio.projects[0];
    p.requirements.forEach((r: any) => { r.remainingWorkload = "0/1"; }); p.snapshots[0].raf.forEach((r: any) => { r.amount = "0/1"; });
    const row = capture(decodePlanningInputs(data, 5, undefined, true)).forecast.projects[0]!;
    assert.equal(row.estimatedStartDate, "2024-12-01"); assert.equal(row.endAbsenceReason, "no-allocation");
  });
  it("keeps all principal inputs frozen after later independent edits and another engine result", () => {
    const old = rich("v5"), snap = capture(old), before = JSON.stringify(snap); const data: any = encodePlanningInputs(old);
    data.planning.workingWeekdays = [6, 7]; data.planning.maxParallelProjects = 1; data.planning.endDate = "2025-01-31";
    data.portfolio.teams[0].capacitySchedule.exceptions[0].capacity = "99/1";
    data.portfolio.programs[0].color = "#FF0000"; data.portfolio.programs[0].name = "Changed Program";
    data.portfolio.priorityFamilies[0].name = "Changed Pas"; data.portfolio.priorityOrder.reverse();
    const p = data.portfolio.projects[0]; p.name = "Changed Project"; p.earliestStartDate = "2025-01-30"; p.objectiveEndDate = "2025-02-20"; p.mandatoryDeadline = "2025-02-20"; p.requirements[0].dailyCap = "9/1";
    const r = data.portfolio.reservations[0]; r.startDate = "2024-01-01"; r.endDate = "2024-02-01"; r.teamAllocations = []; r.name = "Changed Reservation";
    const next = decodePlanningInputs(data, 5, undefined, true);
    const restored = decodeFlowplanBackup(encodeFlowplanBackupV6({ ...next, portfolioSnapshots: [snap] }));
    assert.equal(JSON.stringify(restored.portfolioSnapshots![0]), before);
    const projection = buildPlanningSessionProjection({ state: next, geometryViewport: viewport });
    const alteredResult = { ...projection.planningResult, teamPlans: projection.planningResult.teamPlans.map((t) => ({ ...t,
      projectPlans: t.projectPlans.map((p) => ({ ...p, complete: false })) })) };
    capturePortfolioSnapshot(next, alteredResult, projection.actualsReconstruction, "new-engine", instant);
    assert.equal(JSON.stringify(snap), before);
  });
  for (const kind of ["projects", "reservations", "teams", "programs", "priorityFamilies"] as const) {
    it(`reserves historical ${kind} IDs across deletion/reload, releases after last capture removal`, () => {
      const data: any = encodePlanningInputs(createDemoPlanningScenario());
      const target = kind === "projects" ? "project-session-1" : kind === "reservations" ? "reservation-session-1" : kind === "teams" ? "team-session-1" : kind === "programs" ? "program-1" : "pas-1";
      const previous = data.portfolio[kind][0].id; data.portfolio[kind][0].id = target;
      // Rename references coherently in this fixture.
      const replace = (value: any): any => Array.isArray(value) ? value.map(replace) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, replace(v)])) : value === previous ? target : value;
      const old = decodePlanningInputs(replace(data), 5, undefined, true), snap = capture(old);
      // Empty current portfolio models deletion of all unprotected inputs.
      const empty: any = encodePlanningInputs(old); for (const key of Object.keys(empty.portfolio)) empty.portfolio[key] = [];
      const base = decodePlanningInputs(empty, 5, undefined, true);
      const loaded = decodeFlowplanBackup(encodeFlowplanBackupV6({ ...base, portfolioSnapshots: [snap] }));
      const period = old.portfolio.teams[0]!.capacitySchedule.periods[0]!;
      const capacityPeriods = [{ startDate: period.start, endDate: period.end, capacity: period.dailyCapacity, unavailability: must(unavailabilityRatioFromSerialized("0/1")) }];
      const make = (state: PlanningBackupDataset) => {
        const app = fixture(state);
        if (kind === "teams") {
          assert.equal(app.dispatcher.dispatch({ kind: "create-team", name: "New", capacityPeriods }).ok, true);
          return app.session.getState().portfolio.teams.at(-1)!.id;
        }
        if (kind === "reservations") {
          assert.equal(app.dispatcher.dispatch({ kind: "create-reservation", name: "New", startDate: state.planning.startDate, endDate: state.planning.endDate, teamAllocations: [] }).ok, true);
          return app.session.getState().portfolio.reservations.at(-1)!.id;
        }
        // Projects need a Team requirement.
        const team = old.portfolio.teams[0]!;
        assert.equal(app.dispatcher.dispatch({ kind: "create-team", name: team.name, capacityPeriods }).ok, true);
        assert.equal(app.dispatcher.dispatch({ kind: "create-project", name: "New", teamRequirements: [{ teamId: app.session.getState().portfolio.teams[0]!.id, remainingWorkload: old.portfolio.projects[0]!.requirements[0]!.remainingWorkload }],
          ...(kind === "programs" ? { programName: "New Program" } : {}), ...(kind === "priorityFamilies" ? { priorityFamilyName: "New Pas" } : {}) }).ok, true);
        const portfolio = app.session.getState().portfolio;
        return kind === "projects" ? portfolio.projects[0]!.id : kind === "programs" ? portfolio.programs[0]!.id : portfolio.priorityFamilies[0]!.id;
      };
      assert.notEqual(make(loaded), target);
      const app = fixture(loaded); assert.equal(app.dispatcher.deletePortfolioSnapshot("capture").ok, true);
      const released = decodeFlowplanBackup(encodeFlowplanBackupV6(app.session.getState()));
      assert.equal(make(released), target);
    });
  }
});

it("an invalid middle capture rejects all three without partial import or repair", () => {
  const app = fixture(rich("v5")); app.save(); app.save(); app.save(); const raw = JSON.parse(app.document());
  raw.data.portfolioSnapshots[1].forecast.projects[0].projectId = "unknown";
  assert.throws(() => decodeFlowplanBackup(JSON.stringify(raw)), /portfolioSnapshots\[1\]/);
  assert.equal(app.dispatcher.getPortfolioSnapshots().length, 3);
});
it("copies mutable snapshot DTO evidence before freezing without aliasing nested arrays", () => {
  const state = rich("legacy"), original: any = structuredClone(capture(state));
  const historical = hydrateHistoricalInputs(original.inputs, original.actualsSources, state);
  const frozen = createPortfolioSnapshot(original, historical.portfolio); const before = JSON.stringify(frozen);
  original.inputs.portfolio.projects[0].legacyV4Actuals.records[0].teams[0].cumulativeConsumed = "999/1";
  original.inputs.portfolio.teams[0].capacitySchedule.periods.length = 0;
  original.inputs.portfolio.priorityOrder.reverse(); original.forecast.projects[0].eac = "0/1";
  original.actualsSources.length = 0; assert.equal(JSON.stringify(frozen), before);
});
it("captures an empty Portfolio explicitly without inventing any inputs or forecasts", () => {
  const data: any = encodePlanningInputs(createDemoPlanningScenario()); for (const key of Object.keys(data.portfolio)) data.portfolio[key] = [];
  const app = fixture(decodePlanningInputs(data, 5, undefined, true)); assert.equal(app.save().ok, true);
  const snap = app.dispatcher.getPortfolioSnapshots()[0]!; assert.deepEqual(snap.forecast.projects, []); assert.deepEqual(snap.actualsSources, []);
  assert.equal(decodeFlowplanBackup(app.document()).portfolioSnapshots!.length, 1);
});

it("history initialization deep freezes artifacts while the live session owns no collection", () => {
  const state = rich(), seed: any = structuredClone(capture(state));
  const app = fixture({ ...state, portfolioSnapshots: [seed] });
  assert.equal(Object.hasOwn(app.session.getState(), "portfolioSnapshots"), false);
  const frozen = app.dispatcher.getPortfolioSnapshots()[0]!, before = JSON.stringify(frozen);
  seed.inputs.portfolio.projects[0].name = "changed seed"; seed.forecast.projects[0].eac = "0/1";
  assert.equal(JSON.stringify(frozen), before); assert.throws(() => { (frozen.forecast.projects as any).pop(); }, TypeError);
});
