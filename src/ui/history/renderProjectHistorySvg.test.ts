import assert from "node:assert/strict";
import { it } from "node:test";
import { HistoryFakeDocument } from "./historyFakeDom.js";
import { renderProjectHistorySvg } from "./renderProjectHistorySvg.js";
import { historyFixture } from "../../application/history/historyTestFixture.js";
import { buildProjectHistoryViewModel, historyQuantity } from "../../application/history/buildProjectHistoryViewModel.js";
import { buildProjectHistoryGeometry, createHistoryTemporalGeometry } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
it("uses sparse paths, accessible excess indicators and inclusive knowledge markers without legacy daily shapes", () => {
  const document = new HistoryFakeDocument(), svg = document.createElement("svg");
  const legacy = historyFixture("a", () => {}, 1), modern = historyFixture("b");
  const model = buildProjectHistoryViewModel([legacy, modern]), temporal = createHistoryTemporalGeometry(model);
  const geometry = buildProjectHistoryGeometry({ model, temporal, viewport: { x: 0, width: temporal.width }, cap: historyQuantity("1/100") });
  renderProjectHistorySvg(svg as any, geometry);
  const legacyGroups = svg.all().filter((node) => node.getAttribute("data-snapshot-id") === "a");
  assert.ok(legacyGroups.every((group) => group.children.length === 0));
  assert.ok(svg.all().some((node) => node.className === "history-cap-excess" && node.getAttribute("aria-label")?.includes("exceeds")));
  assert.ok(svg.all().filter((node) => node.tagName === "path").length <= model.projects.length * 3);
  assert.equal(svg.all().filter((node) => node.className === "history-knowledge-marker").length, 0);
});
