import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { addHistoryActuals, historyFixture } from "../../application/history/historyTestFixture.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { createProjectHistoryCoordinator } from "./createProjectHistoryCoordinator.js";
import { HistoryFakeDocument } from "./historyFakeDom.js";
import { HISTORY_GROUP_HEADER_HEIGHT, visibleHistoryDates } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
function fixture(empty = false, initial?: readonly PortfolioSnapshot[]) {
  const document = new HistoryFakeDocument(), container = document.createElement("section");
  let snapshots = initial ?? (empty ? [] : [historyFixture("a"), historyFixture("b", () => {}, 1)]);
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

const outside = /Captured activity lies outside the visible window or reference axis/;
function selectWindow(app: ReturnType<typeof fixture>, first: string, last: string) {
  const state = app.coordinator.getState(), axis = app.container.querySelector(".history-axis")!.children[1]!;
  const x = (date: string) => {
    const day = state.temporal!.dates.find((d) => d.date === date)!;
    return (day.x + day.width / 2 - state.viewport!.x) / state.viewport!.width * 1000;
  };
  axis.emit("pointerdown", { clientX: x(first), pointerId: 40 });
  axis.emit("pointermove", { clientX: x(last), pointerId: 40 });
  axis.emit("pointerup", { clientX: x(last), pointerId: 40 }); app.document.flush();
}
function sparseSnapshot(id: string, start: string) {
  return historyFixture(id, (dto) => {
    dto.portfolio.projects[0]!.earliestStartDate = start as any;
    dto.portfolio.projects[0]!.requirements.forEach((r) => { r.remainingWorkload = "1/3"; });
  });
}

it("uses the complete profile when an active row is unmounted by vertical scrolling", () => {
  const snapshot = historyFixture("many", (dto) => {
    const original = dto.portfolio.projects[0]!;
    for (let i = 0; i < 20; i++) {
      const p = { ...structuredClone(original), id: `history-project-${i}` as any };
      dto.portfolio.projects.push(p); dto.portfolio.priorityOrder.push(p.id);
    }
  });
  const app = fixture(false, [snapshot]), scroll = app.container.querySelector(".history-scroll")!;
  app.rows()[0]!.focus(); assert.doesNotMatch(app.tooltip.text(), outside);
  const initialPaths = app.svg.all().filter((n) => n.getAttribute("data-project-index") === "0");
  assert.ok(initialPaths.length);
  const state = app.coordinator.getState();
  scroll.scrollTop = 15 * state.temporal!.groupHeight; scroll.emit("scroll"); app.document.flush();
  assert.equal(app.svg.all().filter((n) => n.getAttribute("data-project-index") === "0").length, 0);
  assert.equal(app.tooltip.hidden, false); assert.doesNotMatch(app.tooltip.text(), outside);
  app.rows()[0]!.focus(); app.document.flush(); assert.doesNotMatch(app.tooltip.text(), outside);
  assert.strictEqual(app.coordinator.getState().model, state.model); assert.strictEqual(app.coordinator.getState().cap, state.cap);
  scroll.scrollTop = 0; scroll.emit("scroll"); app.document.flush(); assert.doesNotMatch(app.tooltip.text(), outside);
  app.coordinator.destroy();
});

it("checks inclusive civil-day window bounds and updates the message after zoom, pan and Reset", () => {
  const app = fixture(false, [sparseSnapshot("a", "2025-01-01"), sparseSnapshot("b", "2025-01-07")]);
  selectWindow(app, "2025-01-01", "2025-01-07");
  let state = app.coordinator.getState();
  assert.deepEqual(visibleHistoryDates(state.temporal!, state.viewport!), ["2025-01-01", "2025-01-07"]);
  app.rows()[0]!.focus(); assert.doesNotMatch(app.tooltip.text(), outside);
  app.rows()[1]!.focus(); assert.doesNotMatch(app.tooltip.text(), outside);
  // A pan of exactly seven days moves the window to Jan 8–14 without changing its cap.
  const axis = app.container.querySelector(".history-axis")!.children[1]!;
  axis.emit("pointerdown", { clientX: 1000, pointerId: 41, shiftKey: true, currentTarget: axis });
  axis.emit("pointermove", { clientX: 0, pointerId: 41, shiftKey: true });
  axis.emit("pointerup", { clientX: 0, pointerId: 41, shiftKey: true }); app.document.flush();
  app.rows()[0]!.focus(); assert.match(app.tooltip.text(), outside);
  app.rows()[1]!.focus(); assert.match(app.tooltip.text(), outside);
  assert.strictEqual(app.coordinator.getState().cap, state.cap);
  app.container.all().find((n) => n.getAttribute("aria-label") === "Reset History view")!.emit("click"); app.document.flush();
  app.rows()[0]!.focus(); assert.doesNotMatch(app.tooltip.text(), outside);
  selectWindow(app, "2025-02-01", "2025-02-14");
  app.rows()[0]!.focus(); assert.match(app.tooltip.text(), outside);
  app.zoom().emit("click"); app.document.flush();
  app.rows()[0]!.focus(); assert.match(app.tooltip.text(), outside);
  app.coordinator.destroy();
});

it("reports captured activity clipped by a changed reference horizon even with a legacy reference", () => {
  const old = sparseSnapshot("a", "2025-01-01");
  const reference = historyFixture("b", (dto) => { dto.planning.startDate = "2025-02-01" as any; }, 1);
  const app = fixture(false, [old, reference]);
  app.rows()[0]!.focus(); assert.match(app.tooltip.text(), outside);
  app.rows()[1]!.focus(); assert.match(app.tooltip.text(), /Daily profile unavailable/); assert.doesNotMatch(app.tooltip.text(), outside);
  app.coordinator.destroy();
});

it("never labels absent, legacy or empty schema 2 rows as activity outside the window", () => {
  const present = sparseSnapshot("a", "2025-01-01"), id = present.forecast.projects[0]!.projectId;
  const absent = historyFixture("b", (dto) => { dto.portfolio.projects[0]!.id = "replacement-project" as any;
    dto.portfolio.priorityOrder = dto.portfolio.priorityOrder.map((p) => p === id ? "replacement-project" as any : p); });
  const empty = historyFixture("c", (dto) => { dto.portfolio.projects[0]!.earliestStartDate = "2027-01-01" as any; });
  const legacy = historyFixture("d", () => {}, 1);
  const app = fixture(false, [present, absent, empty, legacy]);
  const group = app.container.querySelector(".history-gutters")!.children.find((g) => g.text().includes("absent from snapshot"))!;
  const note = group.all().find((n) => n.getAttribute("role") === "note")!;
  assert.ok(note); assert.equal(note.listeners.size, 0);
  app.container.emit("keydown", { key: "Escape" }); note.focus(); assert.equal(app.tooltip.hidden, true);
  for (const snapshot of [empty, legacy]) {
    const row = app.rows().find((n) => n.getAttribute("aria-label")?.includes(`ID ${snapshot.snapshotId},`))!;
    row.focus(); assert.doesNotMatch(app.tooltip.text(), outside);
    if (snapshot === empty) { assert.match(app.tooltip.text(), /no activity/); assert.doesNotMatch(app.tooltip.text(), /Daily profile unavailable/); }
  }
  app.coordinator.destroy();
});

it("renders positive Actuals and Forecast in mixed schema generations without a schema 2 unavailable label", () => {
  const app = fixture(false, [historyFixture("a", addHistoryActuals, 1), historyFixture("b", addHistoryActuals)]);
  assert.ok(app.svg.all().some((n) => n.className === "history-actuals"));
  assert.ok(app.svg.all().some((n) => n.className === "history-forecast"));
  const model = app.coordinator.getState().model;
  for (const project of model.projects) for (const row of project.rows) {
    if (row.kind !== "present") continue;
    const button = app.rows().find((n) => n.getAttribute("aria-label")?.startsWith(`${row.metadata.name},`) && n.getAttribute("aria-label")?.includes(`ID ${row.snapshotId},`))!;
    button.focus();
    assert.equal(/Daily profile unavailable/.test(app.tooltip.text()), row.profile === "unavailable-legacy");
    assert.equal(/daily profile unavailable/.test(button.getAttribute("aria-label")!), row.profile === "unavailable-legacy");
  }
  app.rows()[1]!.emit("keydown", { key: "Home" }); assert.match(app.tooltip.text(), /Simulated daily Actuals/);
  assert.doesNotMatch(app.tooltip.text(), /Daily profile unavailable/); app.coordinator.destroy();
});
