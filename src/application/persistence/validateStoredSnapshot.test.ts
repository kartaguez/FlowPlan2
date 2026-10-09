import assert from "node:assert/strict";
import { it } from "node:test";
import { validateStoredSnapshotContent } from "./validateStoredSnapshot.js";
import { createPlanningRepository, type StoredContent } from "./createPlanningRepository.js";
import { createMemoryRepositoryStorage } from "../../infrastructure/persistence/memoryRepositoryStorage.js";
import { sha256 } from "../../infrastructure/persistence/fingerprint.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { encodePlanningInputs } from "../backup/planningInputCodec.js";
import { historyFixture } from "../history/historyTestFixture.js";
async function content(value: unknown, validationVersion?: number): Promise<StoredContent> {
  const text = JSON.stringify(value); return { text, digest: await sha256(text), validationVersion } as StoredContent;
}
async function fixture() {
  const state = createDemoPlanningScenario(), snapshot = historyFixture("valid");
  return { state, snapshot, current: await content(encodePlanningInputs(state)) };
}
it("valid legacy certified snapshot is fully validated and returned unchanged", async () => {
  const f = await fixture(); assert.deepEqual(await validateStoredSnapshotContent(await content(f.snapshot, 1), f.current, sha256), f.snapshot);
});
it("structurally invalid certified snapshot with correct digest is rejected", async () => {
  const f = await fixture(); await assert.rejects(validateStoredSnapshotContent(await content({ ...f.snapshot, forecast: null }, 1), f.current, sha256), /Invalid stored snapshot/);
});
it("business-invalid certified snapshot with correct digest is rejected", async () => {
  const f = await fixture(), invalid = structuredClone(f.snapshot); (invalid.forecast.projects[0] as any).eac = "999999";
  await assert.rejects(validateStoredSnapshotContent(await content(invalid, 1), f.current, sha256));
});
for (const version of [undefined, 999]) it(`absent or unknown validationVersion (${version}) always executes full validation`, async () => {
  const f = await fixture(); assert.deepEqual(await validateStoredSnapshotContent(await content(f.snapshot, version), f.current, sha256), f.snapshot);
  await assert.rejects(validateStoredSnapshotContent(await content({ ...f.snapshot, inputsSchemaVersion: 999 }, version), f.current, sha256));
});
it("Current changes do not substitute historical inputs on reading a valid capture", async () => {
  const f = await fixture(), dto = encodePlanningInputs(f.state); dto.portfolio.projects[0]!.name = "Current renamed";
  assert.deepEqual(await validateStoredSnapshotContent(await content(f.snapshot, 1), await content(dto), sha256), f.snapshot);
});
it("corruption after certification is rejected by integrity verification", async () => {
  const f = await fixture(), stored = await content(f.snapshot, 1);
  await assert.rejects(validateStoredSnapshotContent({ ...stored, text: stored.text + " " }, f.current, sha256), /checksum/);
});
it("partially written staging resumes, revalidates and activates only after sealing", async () => {
  let fail = true;
  const storage = createMemoryRepositoryStorage({ beforeWrite: store => { if (store === "snapshotContent" && fail) { fail = false; throw Error("interrupted"); } } });
  const repo = createPlanningRepository(storage, sha256), f = await fixture(), dataset = { ...f.state, portfolioSnapshots: [f.snapshot] };
  await assert.rejects(repo.stageImport(dataset, "interrupted")); const unfinished = await repo.listUnfinishedStages(); assert.equal(unfinished.length, 1);
  await assert.rejects(repo.activateImport(unfinished[0]!, null, "premature")); assert.equal((await repo.readInfo()).token, null);
  const resumed = await repo.stageImport(dataset, "retry"); assert.equal(resumed.generation, unfinished[0]!.generation);
  const token = await repo.activateImport(resumed, null, "activate"); assert.deepEqual(await repo.readSnapshot("valid", token), f.snapshot);
  const stored = await storage.transaction(["snapshotContent"], "readonly", tx => tx.get<StoredContent>("snapshotContent", [token.generation, "valid"])); assert.equal(stored?.validationVersion, undefined);
});
it("invalid capture among valid imports cannot seal or activate a partially validated generation", async () => {
  const storage = createMemoryRepositoryStorage(), repo = createPlanningRepository(storage, sha256), f = await fixture();
  const invalid = structuredClone(historyFixture("invalid")); (invalid.forecast.projects[0] as any).eac = "999999";
  await assert.rejects(repo.stageImport({ ...f.state, portfolioSnapshots: [f.snapshot, invalid] }, "mixed"));
  const jobs = await repo.listUnfinishedStages(); assert.equal(jobs.length, 1);
  await assert.rejects(repo.activateImport(jobs[0]!, null, "activate")); assert.equal((await repo.readInfo()).token, null);
});
