import assert from "node:assert/strict";
import { it } from "node:test";
import { projectHistoryTooltipLines } from "./renderProjectHistoryTooltip.js";
import { buildProjectHistoryViewModel, historyQuantity } from "../../application/history/buildProjectHistoryViewModel.js";
import { historyFixture } from "../../application/history/historyTestFixture.js";

it("reports exact totals, noncomparable dates, full timestamp/zone/ID and uncovered sparse zero", () => {
  const vm = buildProjectHistoryViewModel([historyFixture("a"), historyFixture("b", (dto) => { dto.portfolio.projects[0]!.isActive = false; })]);
  const row = vm.projects.find((p) => p.metadata.id === historyFixture().forecast.projects[0]!.projectId)!.rows[1]!;
  if (row.kind !== "present") throw new Error();
  const lines = projectHistoryTooltipLines(row, vm.horizon!.from, historyQuantity("1/3")).join("\n");
  assert.match(lines, /2026-10-08T10:00:00.000Z/); assert.match(lines, /ID b/); assert.match(lines, /exact/);
  assert.match(lines, /not comparable/); assert.match(lines, /Active → Inactive/);
  assert.match(lines, /No Actuals coverage for this day/); assert.match(lines, /Present in this snapshot, no activity/);
});
