import { test } from "node:test";
import assert from "node:assert/strict";
import { assertV2Origin, V2_ORIGINS, V2_NAMESPACES } from "./browserIsolation.js";

test("only the two fixed dedicated browser origins are accepted", () => {
  for (const origin of Object.values(V2_ORIGINS)) assert.doesNotThrow(() => assertV2Origin(origin));
  for (const origin of ["http://127.0.0.1:4174", "http://127.0.0.1:4175", "http://localhost:4274", "https://127.0.0.1:4274", "null", "http://127.0.0.1:4276"]) {
    assert.throws(() => assertV2Origin(origin), /Origine non autorisée/);
  }
  assert.deepEqual(V2_ORIGINS, { dev: "http://127.0.0.1:4274", portable: "http://127.0.0.1:4275" });
});
test("reservations are immutable and distinct from all legacy namespaces", () => {
  assert.deepEqual(V2_NAMESPACES, {
    portfolio: "flowplan2-v2-portfolio-versioned", scratch: "flowplan2-v2-history-scratch",
    uiPrefix: "flowplan2.v2.ui.", revisions: "flowplan2-v2-portfolio-revisions",
  });
  const legacy = ["flowplan-planning", "flowplan-history-workspace", "flowplan.backup.v1", "flowplan-planning-revisions"];
  for (const name of Object.values(V2_NAMESPACES)) assert.equal(legacy.includes(name), false);
  assert.throws(() => Object.assign(V2_NAMESPACES, { portfolio: legacy[0] }), TypeError);
});
