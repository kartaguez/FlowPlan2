import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { effectiveColor } from "../../domain/index.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV2, encodeFlowplanBackupV3 } from "./flowplanBackupV1.js";

describe("FlowPlan backup V3", () => {
  it("round trips canonical colors and migrates V2", () => {
    const state = createDemoPlanningScenario();
    const v3 = encodeFlowplanBackupV3(state, "2025-01-01T00:00:00.000Z");
    assert.equal(JSON.parse(v3).version, 3);
    const restored = decodeFlowplanBackup(v3);
    assert.deepEqual(JSON.parse(encodeFlowplanBackupV3(restored)).data, JSON.parse(v3).data);
    const migrated = decodeFlowplanBackup(encodeFlowplanBackupV2(state));
    assert.equal(migrated.portfolio.programs[0]!.color.startsWith("#"), true);
    assert.equal(migrated.portfolio.projects.find((p) => !p.programId)!.ownColor?.startsWith("#"), true);
  });

  it("repairs colors and orphans and discards hidden own colors, while rejecting unknown references", () => {
    const source = JSON.parse(encodeFlowplanBackupV3(createDemoPlanningScenario()));
    source.data.portfolio.programs[0].color = "invalid";
    source.data.portfolio.programs.push({ id: "unused", name: "Unused", color: "#000000" });
    source.data.portfolio.priorityFamilies.push({ id: "unused-pas", name: "Unused pas" });
    source.data.portfolio.projects[0].ownColor = "#123456";
    const ungrouped = source.data.portfolio.projects.find((p: { programId?: string }) => !p.programId)!;
    ungrouped.ownColor = "invalid";
    source.data.portfolio.reservations[0].ownColor = null;
    const state = decodeFlowplanBackup(JSON.stringify(source));
    assert.equal(state.portfolio.programs.some((p) => p.id === "unused"), false);
    assert.equal(state.portfolio.priorityFamilies.some((p) => p.id === "unused-pas"), false);
    assert.match(state.portfolio.programs[0]!.color, /^#[0-9A-F]{6}$/);
    assert.equal(Object.hasOwn(state.portfolio.projects[0]!, "ownColor"), false);
    assert.match(ungrouped.ownColor, /invalid/);
    assert.match(state.portfolio.projects.find((p) => !p.programId)!.ownColor!, /^#[0-9A-F]{6}$/);
    assert.match(state.portfolio.reservations[0]!.ownColor!, /^#[0-9A-F]{6}$/);
    source.data.portfolio.projects[0].programId = "missing";
    assert.throws(() => decodeFlowplanBackup(JSON.stringify(source)));
  });

  it("restores V3 Program members without residual own colors for either entity kind", () => {
    const source = JSON.parse(encodeFlowplanBackupV3(createDemoPlanningScenario()));
    const programId = source.data.portfolio.programs[0].id;
    source.data.portfolio.programs[0].color = "#1A2B3C";
    source.data.portfolio.projects[0].ownColor = "#AAAAAA";
    source.data.portfolio.reservations[0].programId = programId;
    source.data.portfolio.reservations[0].ownColor = "#BBBBBB";
    const restored = decodeFlowplanBackup(JSON.stringify(source));
    for (const item of [restored.portfolio.projects[0]!, restored.portfolio.reservations[0]!]) {
      assert.equal(Object.hasOwn(item, "ownColor"), false);
      assert.equal(effectiveColor(restored.portfolio, item), "#1A2B3C");
    }
  });
});
