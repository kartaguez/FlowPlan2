import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlanningSession } from "../../application/index.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV1, encodeFlowplanBackupV2 } from "../../application/backup/flowplanBackupV1.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { importPlanningBackup, loadPlanningBackup } from "./planningBackupOperations.js";

function memoryStore(initial: string | null = null) {
  let value = initial;
  let fail = false;
  let writes = 0;
  return {
    read: () => value,
    write: (document: string) => { if (fail) throw new Error("quota"); value = document; writes += 1; },
    value: () => value,
    writes: () => writes,
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
    assert.equal(store.writes(), 0);
    assert.equal(importPlanningBackup({ document: encodeFlowplanBackupV1(demo), store, preflight: () => {},
      confirm: () => false, reload: () => { reloads += 1; } }), "cancelled");
    assert.equal(store.value(), "old");
    assert.equal(store.writes(), 0);
    store.failWrites();
    assert.equal(run(encodeFlowplanBackupV1(demo)), "failed");
    assert.equal(store.value(), "old");
    assert.equal(store.writes(), 0);
    assert.equal(reloads, 0);
  });

  it("migrates a successful V1 import to V2 and reloads exactly once", () => {
    const demo = createDemoPlanningScenario();
    const document = encodeFlowplanBackupV1(demo);
    const store = memoryStore("old");
    let reloads = 0;
    assert.equal(importPlanningBackup({ document, store, preflight: () => {}, confirm: () => true,
      reload: () => { reloads += 1; } }), "imported");
    assert.equal(store.writes(), 1);
    assert.equal(reloads, 1);
    const loaded = loadPlanningBackup(store, demo, () => {});
    assert.equal(loaded.invalid, false);
    assert.equal(JSON.parse(store.value()!).version, 3);
    assert.ok(loaded.state.portfolio.projects.every((project) => project.isActive));
    assert.ok(loaded.state.portfolio.reservations.every((reservation) => reservation.isActive));
    assert.deepEqual(JSON.parse(encodeFlowplanBackupV1(loaded.state)).data, JSON.parse(document).data);
  });

  it("preserves inactive Projects and Reservations when importing V2", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const initial = session.getState();
    const projectId = initial.portfolio.projects[0]!.id;
    const reservationId = initial.portfolio.reservations[0]!.id;
    assert.equal(session.dispatch({ kind: "set-project-active", projectId, isActive: false }).ok, true);
    assert.equal(session.dispatch({ kind: "set-reservation-active", reservationId, isActive: false }).ok, true);
    const document = encodeFlowplanBackupV2(session.getState());
    const store = memoryStore("old");
    let reloads = 0;
    assert.equal(importPlanningBackup({ document, store, preflight: () => {}, confirm: () => true,
      reload: () => { reloads += 1; } }), "imported");
    assert.equal(store.writes(), 1);
    assert.equal(reloads, 1);
    assert.equal(JSON.parse(store.value()!).version, 3);
    const restored = decodeFlowplanBackup(store.value()!);
    assert.deepEqual(restored.portfolio.projects.map((project) => project.isActive),
      session.getState().portfolio.projects.map((project) => project.isActive));
    assert.deepEqual(restored.portfolio.reservations.map((reservation) => reservation.isActive),
      session.getState().portfolio.reservations.map((reservation) => reservation.isActive));
    assert.deepEqual(JSON.parse(encodeFlowplanBackupV2(restored)).data, JSON.parse(document).data);
  });
});
