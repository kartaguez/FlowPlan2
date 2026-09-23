import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePlanningSettingsCommand } from "./parsePlanningSettingsCommand.js";

const valid = () => ({
  startDate: "2025-01-01",
  endDate: "2025-03-31",
  workingWeekdays: [1, 2, 3, 4, 5],
  maxParallelProjects: "3",
});

describe("parsePlanningSettingsCommand", () => {
  it("builds one typed global planning command", () => {
    const result = parsePlanningSettingsCommand(valid());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.command, {
      kind: "update-planning-settings",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      workingPattern: { workingWeekdays: [1, 2, 3, 4, 5] },
      maxParallelProjects: 3,
    });
  });

  it("rejects an inverted horizon, an empty week, and invalid parallel limits", () => {
    for (const values of [
      { ...valid(), startDate: "2025-04-01" },
      { ...valid(), workingWeekdays: [] },
      { ...valid(), maxParallelProjects: "0" },
      { ...valid(), maxParallelProjects: "1.5" },
    ]) {
      assert.equal(parsePlanningSettingsCommand(values).ok, false);
    }
  });

  it("uses CivilDate parsing without JavaScript Date coercion", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const source = await readFile(
      resolve(process.cwd(), "src/ui/planning-settings/parsePlanningSettingsCommand.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /new Date|Date\.parse|Date\.now/);
  });
});
