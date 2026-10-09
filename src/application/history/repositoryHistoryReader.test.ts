import assert from "node:assert/strict";
import { it } from "node:test";
import { createMemoryPlanningRepository } from "../../infrastructure/persistence/memoryRepositoryStorage.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { historyFixture } from "./historyTestFixture.js";
import { createRepositoryHistoryReader } from "./repositoryHistoryReader.js";
import { buildProjectHistoryViewModel } from "./buildProjectHistoryViewModel.js";
it("lazy History preserves metrics/comparisons, loads only requested rows and releases retained profiles/models", async () => {
  const repository = createMemoryPlanningRepository(), snapshots = [historyFixture("a"), historyFixture("b", undefined, 1)];
  const stage = await repository.stageImport({ ...createDemoPlanningScenario(), portfolioSnapshots: snapshots }, "history");
  const token = await repository.activateImport(stage, null, "activate");
  const reader = createRepositoryHistoryReader(repository, () => token), eager = buildProjectHistoryViewModel(snapshots);
  await reader.refresh();
  assert.deepEqual(reader.getModel().snapshots, eager.snapshots);
  for (const project of reader.getModel().projects) for (const row of project.rows) if (row.kind === "present") {
    assert.deepEqual(row.days, []); const oracle = eager.projects.find(p => p.metadata.id === project.metadata.id)!.rows.find(r => r.snapshotId === row.snapshotId)!;
    if (oracle.kind !== "present") throw new Error();
    assert.deepEqual(row.metrics, oracle.metrics); assert.deepEqual(row.comparison, oracle.comparison);
  }
  await reader.ensureRows([{ projectIndex: 0, snapshotIndex: 0 }]);
  const row = reader.getModel().projects[0]!.rows[0]!; if (row.kind !== "present") throw new Error();
  assert.equal(row.daysLoaded, true); assert.deepEqual(row.days, (eager.projects[0]!.rows[0] as typeof row).days);
  assert.equal(reader.getCacheStats().rows, 1); assert.ok(reader.getCacheStats().estimatedBytes <= reader.getCacheStats().budget);
  reader.releaseAll(); assert.equal(reader.getCacheStats().rows, 0); assert.equal(reader.getModel().projects.length, 0);
  assert.deepEqual((await repository.readInfo()).token, token);
});

import { createCivilDate } from "../../domain/model/date.js";
import { projectHistoryCapture } from "./historyCaptureProjection.js";
function controlled<T>() {
  let resolve!: (value: T) => void, reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function concurrentFixture(budget?: number) {
  const repository = createMemoryPlanningRepository();
  const stage = await repository.stageImport({ ...createDemoPlanningScenario(), portfolioSnapshots: [historyFixture("a"), historyFixture("b"), historyFixture("c")] }, "race");
  let token = await repository.activateImport(stage, null, "activate");
  const calls: string[] = [], started = controlled<void>(), gate = controlled<void>(); let first = true;
  const reader = createRepositoryHistoryReader(repository, () => token, budget, async (id, expected, request) => {
    const snapshot = await repository.readSnapshot(id, expected);
    if (request.mode === "profiles") {
      calls.push(id);
      if (first) { first = false; started.resolve(); await gate.promise; }
    }
    return projectHistoryCapture(snapshot, request);
  });
  await reader.refresh();
  const hit = (snapshotIndex: number) => ({ projectIndex: 0, snapshotIndex });
  const loaded = (snapshotIndex: number) => { const row = reader.getModel().projects[0]!.rows[snapshotIndex]!; return row.kind === "present" && row.daysLoaded; };
  return { reader, repository, calls, started, gate, hit, loaded, changeGeneration: async () => { const next = await repository.stageImport({ ...createDemoPlanningScenario(), portfolioSnapshots: [historyFixture("new")] }, "new-generation"); token = await repository.activateImport(next, token, "switch"); }, change: async () => { token = await repository.writeCurrent((await import("../backup/planningInputCodec.js")).encodePlanningInputs(createDemoPlanningScenario()), token, "change"); } };
}
it("concurrent disjoint ensureRows requests each load their own eligible rows", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(1)]); f.gate.resolve(); await Promise.all([a, b]);
  assert.deepEqual(f.calls, ["a", "b"]); assert.ok(f.loaded(0) && f.loaded(1));
});
it("overlapping concurrent requests reuse rows without duplicate reads", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(0), f.hit(1)]); f.gate.resolve(); await Promise.all([a, b]);
  assert.deepEqual(f.calls, ["a", "b"]); assert.ok(f.loaded(0) && f.loaded(1));
});
it("successive concurrent requests are served in order and deduplicate shared rows", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(0), f.hit(1)]), c = f.reader.ensureRows([f.hit(1), f.hit(2)]);
  f.gate.resolve(); await Promise.all([a, b, c]); assert.deepEqual(f.calls, ["a", "b", "c"]); assert.ok(f.loaded(2));
});
it("release invalidates running and queued requests and allows new work before old IO finishes", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(1)]); f.reader.releaseProfiles();
  await f.reader.ensureRows([f.hit(2)]); assert.ok(f.loaded(2));
  f.gate.resolve(); await Promise.all([a, b]); assert.deepEqual(f.calls, ["a", "c"]); assert.equal(f.loaded(0), false);
});
it("refresh invalidates pending requests without publishing old revision profiles", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(1)]); await f.change(); await f.reader.refresh();
  f.gate.resolve(); await Promise.all([a, b]); assert.equal(f.reader.getCacheStats().rows, 0); assert.equal(f.loaded(0), false);
});
it("token change alone invalidates a profile response before publication", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  await f.change(); f.gate.resolve(); await a; assert.equal(f.reader.getCacheStats().rows, 0);
});
it("concurrent requests evict LRU rows within the budget", async () => {
  const f = await concurrentFixture(16 * 1024), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(1)]), c = f.reader.ensureRows([f.hit(2)]);
  f.gate.resolve(); await Promise.all([a, b, c]); assert.ok(f.loaded(2)); assert.equal(f.loaded(0), false); assert.equal(f.reader.getCacheStats().rows, 1); assert.ok(f.reader.getCacheStats().estimatedBytes <= 16 * 1024);
});
it("a profile read error rejects that request and does not block the next request", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const failed = assert.rejects(a, /injected/), b = f.reader.ensureRows([f.hit(1)]);
  f.gate.reject(new Error("injected")); await failed; await b; assert.ok(f.loaded(1));
});
it("oversized visible requests fail with a bounded cache and later requests remain usable", async () => {
  const f = await concurrentFixture(1), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const failed = assert.rejects(a, /budget/); f.gate.resolve(); await failed;
  assert.equal(f.reader.getCacheStats().estimatedBytes, 0); await assert.rejects(f.reader.ensureRows([f.hit(1)]), /budget/);
});

it("a generation switch invalidates running and queued requests without reviving old captures", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(1)]); await f.changeGeneration(); await f.reader.refresh();
  f.gate.resolve(); await Promise.all([a, b]); assert.equal(f.reader.getModel().snapshots[0]!.snapshotId, "new");
  assert.equal(f.reader.getCacheStats().rows, 0); await f.reader.ensureRows([f.hit(0)]); assert.ok(f.loaded(0));
});
it("an obsolete read error cannot clear profiles loaded by a newer view", async () => {
  const f = await concurrentFixture(), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const failed = assert.rejects(a, /obsolete/); f.reader.releaseProfiles(); await f.reader.ensureRows([f.hit(1)]);
  f.gate.reject(new Error("obsolete")); await failed; assert.ok(f.loaded(1));
});
it("concurrent pinned rows that exceed budget reject explicitly and the next request can recover", async () => {
  const f = await concurrentFixture(16 * 1024), a = f.reader.ensureRows([f.hit(0)]); await f.started.promise;
  const b = f.reader.ensureRows([f.hit(0), f.hit(1)]), failed = assert.rejects(b, /budget/), c = f.reader.ensureRows([f.hit(2)]);
  f.gate.resolve(); await a; await failed; await c; assert.ok(f.loaded(2)); assert.equal(f.reader.getCacheStats().rows, 1);
});

it("releasing History between totals invalidates the remaining samples of that capture", async () => {
  const f = await concurrentFixture();
  const from = createCivilDate("2025-01-01"), through = createCivilDate("2025-12-31"); if (!from.ok || !through.ok) throw Error();
  const scan = f.reader.dailyTotals(from.value, through.value)[Symbol.asyncIterator]();
  assert.equal((await scan.next()).done, false); f.reader.releaseAll();
  await assert.rejects(scan.next(), /cancelled/);
});
