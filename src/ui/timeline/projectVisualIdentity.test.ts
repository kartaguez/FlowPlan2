import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_COLOR_COUNT,
  projectColorIndex,
} from "./projectVisualIdentity.js";

describe("projectVisualIdentity", () => {
  it("returns the same palette index for repeated calls with the same id", () => {
    const first = projectColorIndex("project-a");

    assert.equal(projectColorIndex("project-a"), first);
    assert.equal(projectColorIndex("project-a"), first);
  });

  it("is independent from the order in which projects are evaluated", () => {
    const firstOrder = ["project-a", "project-b", "project-c"].map(
      projectColorIndex,
    );
    const reverseOrder = ["project-c", "project-b", "project-a"]
      .map(projectColorIndex)
      .reverse();

    assert.deepEqual(reverseOrder, firstOrder);
  });

  it("always returns an index inside the fixed palette", () => {
    for (const projectId of [
      "",
      "project-a",
      "project-b",
      "équipe/projet-42",
      "very-long-project-identifier-1234567890",
    ]) {
      const index = projectColorIndex(projectId);
      assert.ok(index >= 0);
      assert.ok(index < PROJECT_COLOR_COUNT);
      assert.equal(Number.isInteger(index), true);
    }
  });
});
