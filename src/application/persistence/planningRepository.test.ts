import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryPlanningRepository } from "../../infrastructure/persistence/memoryRepositoryStorage.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { encodePlanningInputs } from "../backup/planningInputCodec.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { capturePortfolioSnapshot } from "../portfolioSnapshots/capturePortfolioSnapshot.js";
import { createPlanningSession } from "../session/planningSession.js";
import { createRepositoryPlanningDispatcher } from "../../main/planning/createRepositoryPlanningDispatcher.js";
import { PersistenceError } from "./planningRepository.js";
const viewport = { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 };
async function fixture(options: Parameters<typeof createMemoryPlanningRepository>[0] = {}) {
  const repository = createMemoryPlanningRepository(options), state = createDemoPlanningScenario();
  const stage = await repository.stageImport(state, "seed");
  const token = await repository.activateImport(stage, null, "init", { fingerprint: "absent", document: null });
  const projection = buildPlanningSessionProjection({ state, geometryViewport: viewport });
  const capture = (id: string) => capturePortfolioSnapshot(state, projection.planningResult, projection.actualsReconstruction, id, "2026-10-08T10:00:00.000Z");
  return { repository, state, token, capture };
}
describe("Storage repository / ownership and async CAS", () => {
  it("Current reads and writes never touch historical contents; session owns no collection", async () => {
    const calls: string[] = [], app = await fixture({ observe: (op, store) => calls.push(`${op}:${store}`) });
    const history = await app.repository.createSnapshot(app.capture("a"), app.token.currentRevision, app.token, "save");
    calls.length = 0; const current = await app.repository.readCurrent();
    const session = createPlanningSession(current.state); session.setHistoricalIdentities(current.identities);
    assert.equal(Object.hasOwn(session.getState(), "portfolioSnapshots"), false);
    assert.ok(!calls.some(call => call.endsWith(":snapshotContent")));
    calls.length = 0;
    const next = await app.repository.writeCurrent(encodePlanningInputs(current.state), history, "write");
    assert.deepEqual(next, { ...history, revision: history.revision + 1, currentRevision: history.currentRevision + 1 });
    assert.ok(!calls.some(call => /snapshot|identityReservations/.test(call)));
    assert.deepEqual(await app.repository.readSnapshot("a", next), app.capture("a"));
  });
  it("Save/Delete change History only and preserve exact unrelated captures and Current", async () => {
    const calls: string[] = [], app = await fixture({ observe: (op, store) => calls.push(`${op}:${store}`) });
    calls.length = 0; const a = await app.repository.createSnapshot(app.capture("a"), app.token.currentRevision, app.token, "a");
    assert.ok(!calls.includes("put:current")); assert.ok(!calls.includes("get:snapshotContent"));
    const b = await app.repository.createSnapshot(app.capture("b"), a.currentRevision, a, "b");
    calls.length = 0; const deleted = await app.repository.deleteSnapshot("a", b, "delete");
    assert.ok(!calls.includes("put:current")); assert.ok(!calls.includes("get:snapshotContent"));
    assert.equal(deleted.currentRevision, app.token.currentRevision); assert.equal(deleted.historyRevision, app.token.historyRevision + 3);
    assert.deepEqual(await app.repository.readSnapshot("b", deleted), app.capture("b"));
    assert.deepEqual(encodePlanningInputs((await app.repository.readCurrent()).state), encodePlanningInputs(app.state));
    assert.equal((await app.repository.listSnapshotMetadata(deleted)).items.length, 1);
  });
  it("CAS permits one winner; stale Current run and duplicate operation IDs are rejected", async () => {
    const app = await fixture(), current = encodePlanningInputs(app.state);
    const results = await Promise.allSettled([app.repository.writeCurrent(current, app.token, "one"), app.repository.writeCurrent(current, app.token, "two")]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const now = (await app.repository.readCurrent()).token;
    await assert.rejects(app.repository.createSnapshot(app.capture("stale"), app.token.currentRevision, now, "stale"), (e: unknown) => e instanceof PersistenceError && e.code === "CONFLICT");
    const saved = await app.repository.createSnapshot(app.capture("ok"), now.currentRevision, now, "ok");
    assert.deepEqual(await app.repository.createSnapshot(app.capture("ok"), now.currentRevision, now, "ok"), saved);
    await assert.rejects(app.repository.createSnapshot(app.capture("different"), now.currentRevision, now, "ok"));
    assert.equal((await app.repository.readInfo()).snapshotCount, 1);
  });
  it("failed writes leave committed Current, history, revisions and identity references intact", async () => {
    let fail = false; const app = await fixture({ beforeWrite: () => { if (fail) throw new DOMException("quota", "QuotaExceededError"); } });
    const before = await app.repository.readCurrent(); fail = true;
    await assert.rejects(app.repository.createSnapshot(app.capture("quota"), app.token.currentRevision, app.token, "quota"));
    assert.deepEqual(await app.repository.readCurrent(), before);
  });
  it("staging is invisible; activation changes generation and both revisions; active data cannot be discarded", async () => {
    const app = await fixture(); const stage = await app.repository.stageImport({ ...app.state, portfolioSnapshots: [app.capture("imported")] }, "import");
    assert.equal((await app.repository.readInfo()).snapshotCount, 0);
    const next = await app.repository.activateImport(stage, app.token, "activate");
    assert.notEqual(next.generation, app.token.generation); assert.equal(next.currentRevision, app.token.currentRevision + 1);
    assert.equal(next.historyRevision, app.token.historyRevision + 1);
    await assert.rejects(app.repository.discardStage(stage));
    assert.deepEqual(await app.repository.readSnapshot("imported", next), app.capture("imported"));
  });
  it("async dispatcher publishes after commit, preserves drafts on failure, and never replans Save/Delete", async () => {
    let fail = false; const app = await fixture({ beforeWrite: () => { if (fail) throw new Error("write failed"); } });
    const current = await app.repository.readCurrent(), session = createPlanningSession(current.state); let builds = 0, dirty = false;
    const dispatcher = createRepositoryPlanningDispatcher({ repository: app.repository, current, session, geometryViewport: viewport, hasUnappliedChanges: () => dirty,
      buildProjection: input => { builds++; return buildPlanningSessionProjection(input); }, operationId: (() => { let n = 0; return () => `op-${++n}`; })() });
    const run = dispatcher.getProjection(), before = session.getState();
    dirty = true; assert.equal((await dispatcher.savePortfolioSnapshot()).ok, false); dirty = false;
    fail = true; const promise = dispatcher.dispatch({ kind: "reorder-project", projectId: before.portfolio.priorityOrder[0]!, targetPosition: 2 });
    assert.strictEqual(session.getState(), before); assert.equal((await promise).ok, false); assert.strictEqual(dispatcher.getProjection(), run);
    fail = false; assert.equal((await dispatcher.savePortfolioSnapshot()).ok, true); assert.equal((await dispatcher.deletePortfolioSnapshot("op-2")).ok, true);
    assert.equal(builds, 2); assert.strictEqual(dispatcher.getProjection(), run);
  });
});
