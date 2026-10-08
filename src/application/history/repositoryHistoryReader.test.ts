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
