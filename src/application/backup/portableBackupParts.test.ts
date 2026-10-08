import assert from "node:assert/strict";
import { it } from "node:test";
import { portableBackupParts } from "./portableBackupParts.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { encodeFlowplanBackupV7 } from "./flowplanBackupV7.js";
import { historyFixture } from "../history/historyTestFixture.js";
it("portable header keeps snapshots out of Current and yields exact documents with escaped strings/nesting", () => {
  const snapshot = historyFixture('id:"braces[]{},\\'), state = createDemoPlanningScenario();
  const text = encodeFlowplanBackupV7({ ...state, portfolioSnapshots: [snapshot] });
  const parts = portableBackupParts(text);
  assert.deepEqual(parts.current.portfolioSnapshots, []);
  assert.deepEqual([...parts.snapshots()], [snapshot]);
  const raw = JSON.parse(text); const reordered = JSON.stringify({ data: raw.data, exportedAt: raw.exportedAt, version: raw.version, format: raw.format });
  assert.deepEqual([...portableBackupParts(reordered).snapshots()], [snapshot]);
});
for (const array of ['[}', '[,]', '[{},]', '[{"a":]}', '["unfinished]', '[{]']) it(`rejects malformed historical array ${array}`, () => {
  const valid = encodeFlowplanBackupV7(createDemoPlanningScenario());
  const malformed = valid.replace('"portfolioSnapshots":[]', `"portfolioSnapshots":${array}`);
  assert.throws(() => [...portableBackupParts(malformed).snapshots()]);
});
it("duplicate historical fields are rejected explicitly instead of silently losing a branch", () => {
  const valid = encodeFlowplanBackupV7(createDemoPlanningScenario());
  assert.throws(() => portableBackupParts(valid.replace('"portfolioSnapshots":[]', '"portfolioSnapshots":[],"portfolioSnapshots":[]')), /Duplicate/);
});
