import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeFlowplanBackupV1 } from "../../application/backup/flowplanBackupV1.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { importPlanningBackup, loadPlanningBackup } from "./planningBackupOperations.js";

function memoryStore(initial: string | null = null) {
  let value = initial;
  let fail = false;
  return {
    read: () => value,
    write: (document: string) => { if (fail) throw new Error("quota"); value = document; },
    value: () => value,
    failWrites: () => { fail = true; },
  };
}

describe("planning backup operations", () => {
  it("uses demo without writing when the key is missing or invalid", () => {
    const demo = createDemoPlanningScenario();
    const absent = memoryStore();
    assert.deepEqual(loadPlanningBackup(absent, demo, () => {}), { state: demo, invalid: false });
    assert.equal(absent.value(), null);
    const invalid = memoryStore("broken");
    assert.deepEqual(loadPlanningBackup(invalid, demo, () => {}), { state: demo, invalid: true });
    assert.equal(invalid.value(), "broken");
  });

  it("validates before confirmation and preserves the prior document for every refusal", () => {
    const demo = createDemoPlanningScenario();
    const store = memoryStore("old");
    let confirms = 0;
    let reloads = 0;
    const run = (document: string, preflight = () => {}) => importPlanningBackup({
      document, store, preflight,
      confirm: () => { confirms += 1; return true; }, reload: () => { reloads += 1; },
    });
    for (const document of ["{", "{}", JSON.stringify({ ...JSON.parse(encodeFlowplanBackupV1(demo)), version: 2 })]) {
      assert.equal(run(document), "failed");
      assert.equal(store.value(), "old");
    }
    assert.equal(run(encodeFlowplanBackupV1(demo), () => { throw new Error("projection failed"); }), "failed");
    assert.equal(confirms, 0);
    assert.equal(reloads, 0);
    assert.equal(store.value(), "old");
    assert.equal(importPlanningBackup({ document: encodeFlowplanBackupV1(demo), store, preflight: () => {},
      confirm: () => false, reload: () => { reloads += 1; } }), "cancelled");
    assert.equal(store.value(), "old");
    store.failWrites();
    assert.equal(run(encodeFlowplanBackupV1(demo)), "failed");
    assert.equal(store.value(), "old");
    assert.equal(reloads, 0);
  });

  it("replaces the whole document and reloads from the imported state", () => {
    const demo = createDemoPlanningScenario();
    const document = encodeFlowplanBackupV1(demo);
    const store = memoryStore("old");
    let reloads = 0;
    assert.equal(importPlanningBackup({ document, store, preflight: () => {}, confirm: () => true,
      reload: () => { reloads += 1; } }), "imported");
    assert.equal(store.value(), document);
    assert.equal(reloads, 1);
    const loaded = loadPlanningBackup(store, demo, () => {});
    assert.equal(loaded.invalid, false);
    assert.deepEqual(JSON.parse(encodeFlowplanBackupV1(loaded.state)).data, JSON.parse(document).data);
  });
});
