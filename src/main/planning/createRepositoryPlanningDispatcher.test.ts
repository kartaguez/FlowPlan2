import assert from "node:assert/strict";
import { it } from "node:test";
import { createMemoryPlanningRepository } from "../../infrastructure/persistence/memoryRepositoryStorage.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { createPlanningSession } from "../../application/session/planningSession.js";
import { encodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import { PersistenceError, type PlanningRepository } from "../../application/persistence/planningRepository.js";
import { createRepositoryPlanningDispatcher } from "./createRepositoryPlanningDispatcher.js";
const viewport = { width: 1000, teamLaneHeight: 100, timeAxisHeight: 76 };
async function fixture() {
  const repository = createMemoryPlanningRepository();
  const stage = await repository.stageImport(createDemoPlanningScenario(), "seed"); await repository.activateImport(stage, null, "activate");
  const current = await repository.readCurrent(), session = createPlanningSession(current.state);
  const messages: string[] = [], drafts = { text: "unapplied input" }; let n = 0;
  const create = (repo: PlanningRepository = repository, live = session, record = current) => createRepositoryPlanningDispatcher({ repository: repo, current: record, session: live,
    geometryViewport: viewport, hasUnappliedChanges: () => false, recoveryRequired: message => messages.push(message), operationId: () => `op-${++n}` });
  const command = { kind: "reorder-project" as const, projectId: current.state.portfolio.priorityOrder[0]!, targetPosition: 2 };
  return { repository, current, session, messages, drafts, create, command };
}
function needsRecovery(result: Awaited<ReturnType<ReturnType<typeof createRepositoryPlanningDispatcher>["dispatch"]>>) {
  assert.equal(result.ok, false); if (result.ok) throw Error(); assert.match(result.errors[0]!.message, /requires recovery.*(may already have committed|operation committed)/);
}
for (const action of ["Save", "Delete"] as const) it(`${action} committed then readCurrent failure blocks all mutations and reports uncertainty to UI`, async () => {
  const f = await fixture();
  if (action === "Delete") { const seed = f.create(); assert.ok((await seed.savePortfolioSnapshot()).ok); }
  const current = await f.repository.readCurrent();
  const dispatcher = f.create({ ...f.repository, readCurrent: async () => { throw Error("read unavailable"); } }, createPlanningSession(current.state), current);
  const result = action === "Save" ? await dispatcher.savePortfolioSnapshot() : await dispatcher.deletePortfolioSnapshot("op-1"); needsRecovery(result);
  assert.ok(dispatcher.isReloadRequired()); assert.equal(dispatcher.getRecoveryState(), "committed-unreconciled"); assert.match(f.messages[0]!, /drafts were preserved/);
  const committed = await f.repository.readInfo(); assert.equal(committed.snapshotCount, action === "Save" ? 1 : 0);
  needsRecovery(await dispatcher.dispatch(f.command)); needsRecovery(await dispatcher.savePortfolioSnapshot()); needsRecovery(await dispatcher.deletePortfolioSnapshot("any"));
  assert.deepEqual(await f.repository.readInfo(), committed); assert.equal(f.drafts.text, "unapplied input");
});
it("Save followed by a foreign Current commit requires recovery instead of publishing a foreign projection", async () => {
  const f = await fixture(), before = f.session.getState();
  const dispatcher = f.create({ ...f.repository, readCurrent: async () => {
    const current = await f.repository.readCurrent(); await f.repository.writeCurrent(encodePlanningInputs(current.state), current.token, "foreign"); return f.repository.readCurrent();
  } });
  const projection = dispatcher.getProjection(); needsRecovery(await dispatcher.savePortfolioSnapshot());
  assert.strictEqual(dispatcher.getProjection(), projection); assert.strictEqual(f.session.getState(), before); assert.ok(dispatcher.isReloadRequired());
});
it("Current committed but local publication impossible requires recovery with the old projection unpublished", async () => {
  const f = await fixture(), session = { ...f.session, publish: () => ({ ok: false as const, errors: [] }) }, dispatcher = f.create(f.repository, session);
  const projection = dispatcher.getProjection(); needsRecovery(await dispatcher.dispatch(f.command));
  assert.equal((await f.repository.readCurrent()).token.revision, f.current.token.revision + 1); assert.strictEqual(dispatcher.getProjection(), projection);
  needsRecovery(await dispatcher.dispatch(f.command));
});
it("confirmed rollback keeps local state usable and retries the same operationId", async () => {
  const f = await fixture(); let fail = true; const ids: string[] = [];
  const dispatcher = f.create({ ...f.repository, writeCurrent: async (candidate, token, id) => {
    ids.push(id); if (fail) throw new PersistenceError("QUOTA", "confirmed abort", { commitOutcome: "not-applied" }); return f.repository.writeCurrent(candidate, token, id);
  } });
  assert.equal((await dispatcher.dispatch(f.command)).ok, false); assert.equal(dispatcher.isReloadRequired(), false);
  fail = false; assert.ok((await dispatcher.dispatch(f.command)).ok); assert.equal(ids[0], ids[1]); assert.equal(f.messages.length, 0);
});
it("lost acknowledgment after commit is uncertain and cannot double Save", async () => {
  const f = await fixture(), dispatcher = f.create({ ...f.repository, createSnapshot: async (...args) => { await f.repository.createSnapshot(...args); throw Error("acknowledgment lost"); } });
  needsRecovery(await dispatcher.savePortfolioSnapshot()); assert.equal(dispatcher.getRecoveryState(), "commit-uncertain"); needsRecovery(await dispatcher.savePortfolioSnapshot()); assert.equal((await f.repository.readInfo()).snapshotCount, 1);
});
it("unknown storage rejection cannot be treated as rollback", async () => {
  const f = await fixture(), dispatcher = f.create({ ...f.repository, writeCurrent: async () => { throw Error("network unavailable"); } });
  needsRecovery(await dispatcher.dispatch(f.command)); assert.ok(dispatcher.isReloadRequired());
});
it("explicit recovery reads authority and builds a new coherent session while old drafts remain until user disposal", async () => {
  const f = await fixture(), dispatcher = f.create({ ...f.repository, writeCurrent: async (...args) => { await f.repository.writeCurrent(...args); throw Error("ack lost"); } });
  needsRecovery(await dispatcher.dispatch(f.command));
  const authoritative = await f.repository.readCurrent(), recovered = f.create(f.repository, createPlanningSession(authoritative.state), authoritative);
  assert.deepEqual(recovered.getToken(), authoritative.token); assert.deepEqual(recovered.getProjection().portfolio, authoritative.state.portfolio);
  assert.equal(f.drafts.text, "unapplied input"); assert.ok((await recovered.savePortfolioSnapshot()).ok);
});
it("Save retry after a confirmed rollback keeps capture, operationId and timestamp stable", async () => {
  const f = await fixture(); let fail = true; const snapshots: unknown[] = [], ids: string[] = [];
  const dispatcher = f.create({ ...f.repository, createSnapshot: async (snapshot, revision, token, id) => {
    snapshots.push(snapshot); ids.push(id); if (fail) throw new PersistenceError("QUOTA", "abort", { commitOutcome: "not-applied" }); return f.repository.createSnapshot(snapshot, revision, token, id);
  } });
  assert.equal((await dispatcher.savePortfolioSnapshot()).ok, false); fail = false; assert.ok((await dispatcher.savePortfolioSnapshot()).ok);
  assert.strictEqual(snapshots[0], snapshots[1]); assert.equal(ids[0], ids[1]);
});
