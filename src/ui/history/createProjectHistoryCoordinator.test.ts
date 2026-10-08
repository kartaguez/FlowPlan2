import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { historyFixture } from "../../application/history/historyTestFixture.js";
import { createProjectHistoryCoordinator } from "./createProjectHistoryCoordinator.js";
import { HistoryFakeDocument } from "./historyFakeDom.js";
import { HISTORY_GROUP_HEADER_HEIGHT } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
function fixture(empty = false) {
  const document = new HistoryFakeDocument(), container = document.createElement("section");
  let snapshots = empty ? [] : [historyFixture("a"), historyFixture("b", () => {}, 1)];
  const coordinator = createProjectHistoryCoordinator({ container: container as any, getSnapshots: () => snapshots });
  coordinator.resume(); document.flush();
  return { coordinator, document, container, setSnapshots: (next: typeof snapshots) => { snapshots = next; }, snapshots,
    svg: container.querySelector(".history-timeline")!, tooltip: container.querySelector(".history-tooltip")!,
    rows: () => container.all().filter((element) => element.tagName === "button" && element.className === "history-row-entry"),
    zoom: () => container.all().find((element) => element.getAttribute("aria-label") === "Zoom in History")!,
  };
}
describe("History read-only DOM interactions", () => {
  it("shows the empty state without a current horizon or enabled temporal controls", () => {
    const app = fixture(true); assert.match(app.container.text(), /Save a portfolio snapshot in Planning/);
    assert.equal(app.zoom().disabled, true); assert.equal(app.coordinator.getState().temporal, null); app.coordinator.destroy();
  });
  it("keeps all present rows accessible, including schema 1, with focus, daily keyboard and Escape", () => {
    const app = fixture(); const row = app.rows()[0]!;
    row.focus(); assert.equal(app.tooltip.hidden, false); assert.match(app.tooltip.text(), /Priority|EAC|First presence/);
    row.emit("keydown", { key: "ArrowRight" }); assert.match(app.tooltip.text(), /Day 2025-01-01/);
    row.emit("keydown", { key: "End" }); assert.match(app.tooltip.text(), /Day 2025-03-31/);
    row.emit("keydown", { key: "Escape" }); assert.equal(app.tooltip.hidden, true);
    app.rows()[1]!.focus(); assert.match(app.tooltip.text(), /Daily profile unavailable/);
    assert.doesNotMatch(app.tooltip.text(), /Simulated daily Actuals/); app.coordinator.destroy();
  });
  it("supports hover and touch release, keeps zero/gap lines hit-testable, and hides tooltip during range/pan", () => {
    const app = fixture(), y = HISTORY_GROUP_HEADER_HEIGHT + 15;
    app.svg.emit("pointermove", { clientX: 200, clientY: y, pointerId: 1, pointerType: "mouse" }); app.document.flush();
    assert.equal(app.tooltip.hidden, false); assert.match(app.tooltip.text(), /Simulated daily/);
    app.svg.emit("pointerdown", { clientX: 100, clientY: y, pointerId: 2, pointerType: "touch", button: 0, isPrimary: true });
    app.svg.emit("pointerup", { clientX: 100, clientY: y, pointerId: 2, pointerType: "touch" });
    assert.equal(app.tooltip.hidden, false);
    app.svg.emit("pointerdown", { clientX: 100, clientY: y, pointerId: 3 });
    app.svg.emit("pointermove", { clientX: 300, clientY: y, pointerId: 3 });
    assert.equal(app.tooltip.hidden, true);
    app.svg.emit("pointerup", { clientX: 300, clientY: y, pointerId: 3 }); app.document.flush();
    const state = app.coordinator.getState(); assert.equal(state.zoomRevision, 1);
    app.svg.emit("pointerdown", { clientX: 300, clientY: y, pointerId: 4, shiftKey: true });
    app.svg.emit("pointermove", { clientX: 100, clientY: y, pointerId: 4, shiftKey: true });
    app.svg.emit("pointerup", { clientX: 100, clientY: y, pointerId: 4, shiftKey: true }); app.document.flush();
    assert.strictEqual(app.coordinator.getState().cap, state.cap); assert.equal(app.coordinator.getState().zoomRevision, 1); app.coordinator.destroy();
  });
  it("preserves DOM/cache/viewport on copies and repeated mode returns; dataset changes rebuild explicitly", () => {
    const app = fixture(); app.zoom().emit("click"); app.document.flush(); const state = app.coordinator.getState(), row = app.rows()[0];
    for (let n = 0; n < 6; n++) {
      app.coordinator.suspend(); app.coordinator.suspend(); assert.equal(app.svg.listeners.get("pointermove")!.size, 0);
      app.setSnapshots(app.snapshots.map((s) => structuredClone(s))); app.coordinator.resume(); app.coordinator.resume(); app.document.flush();
      assert.strictEqual(app.rows()[0], row); assert.strictEqual(app.coordinator.getState().cap, state.cap);
      assert.deepEqual(app.coordinator.getState().viewport, state.viewport); assert.equal(app.svg.listeners.get("pointermove")!.size, 3);
    }
    app.coordinator.suspend(); app.setSnapshots([]); app.coordinator.resume(); app.document.flush();
    assert.equal(app.coordinator.getState().cap, null); assert.equal(app.rows().length, 0); assert.equal(app.tooltip.hidden, true);
    app.coordinator.destroy(); app.coordinator.resume(); assert.equal(app.container.children.length, 0);
  });
  it("has no rendering dependency on commands, backup decoding, engine or historical hydration", async () => {
    for (const path of ["src/ui/history/createProjectHistoryCoordinator.ts", "src/application/history/buildProjectHistoryViewModel.ts"]) {
      const source = await readFile(path, "utf8");
      assert.doesNotMatch(source, /decodePlanningInputs\(|hydrateHistoricalInputs\(|validateHistoricalSnapshot\(|reconstructActuals\(|recomputePlanning\(|planPortfolio\(|localStorage|dispatch\(/);
    }
  });
});

it("shares range/pan with the global axis and cancels pending hover on Escape", () => {
  const app = fixture(), axis = app.container.querySelector(".history-axis")!.children[1]!;
  axis.emit("pointerdown", { clientX: 100, pointerId: 10 });
  axis.emit("pointermove", { clientX: 300, pointerId: 10 });
  axis.emit("pointerup", { clientX: 300, pointerId: 10 }); app.document.flush();
  assert.equal(app.coordinator.getState().zoomRevision, 1);
  const before = app.coordinator.getState();
  // Event.currentTarget is supplied by native dispatch; the test double spells it explicitly.
  axis.emit("pointerdown", { clientX: 300, pointerId: 11, shiftKey: true, currentTarget: axis });
  axis.emit("pointermove", { clientX: 100, pointerId: 11, shiftKey: true });
  axis.emit("pointercancel", { pointerId: 11 }); app.document.flush();
  assert.strictEqual(app.coordinator.getState().cap, before.cap);
  app.svg.emit("pointermove", { clientX: 200, clientY: HISTORY_GROUP_HEADER_HEIGHT + 15, pointerId: 12, pointerType: "mouse" });
  app.container.emit("keydown", { key: "Escape" }); app.document.flush();
  assert.equal(app.tooltip.hidden, true); app.coordinator.destroy();
});
