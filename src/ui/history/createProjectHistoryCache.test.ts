import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { historyFixture } from "../../application/history/historyTestFixture.js";
import { createProjectHistoryCache } from "./createProjectHistoryCache.js";

describe("History cache identities and viewport/cap lifecycle", () => {
  it("ignores array/capture copies from ordinary commands and restores viewport/cap unchanged", () => {
    const a = historyFixture("a"), b = historyFixture("b"); const cache = createProjectHistoryCache(1000);
    assert.equal(cache.refresh([a, b]), true);
    cache.changeViewport({ cause: "zoom-button", previous: { x: 0, width: 1000 }, next: { x: 100, width: 200 } });
    const state = cache.getState(); assert.equal(state.zoomRevision, 1);
    assert.equal(cache.refresh([structuredClone(b), structuredClone(a)]), false);
    assert.strictEqual(cache.getState(), state);
    cache.changeViewport({ cause: "initial", previous: state.viewport!, next: state.viewport! });
    assert.strictEqual(cache.getState().cap, state.cap); assert.strictEqual(cache.getState().capWindow, state.capWindow);
  });
  it("keeps cap stable through pan, same-width range/reset and clamped no-op zoom", () => {
    const cache = createProjectHistoryCache(1000); cache.refresh([historyFixture()]);
    cache.changeViewport({ cause: "zoom-button", previous: { x: 0, width: 1000 }, next: { x: 100, width: 200 } });
    const state = cache.getState();
    for (const cause of ["pan", "range-zoom", "reset", "zoom-button", "restore"] as const) {
      cache.changeViewport({ cause, previous: { x: 100, width: 200 }, next: { x: 200, width: 200 } });
      assert.strictEqual(cache.getState().cap, state.cap); assert.strictEqual(cache.getState().capWindow, state.capWindow);
      assert.equal(cache.getState().zoomRevision, 1);
    }
    cache.changeViewport({ cause: "range-zoom", previous: { x: 200, width: 200 }, next: { x: 200, width: 400 } });
    assert.equal(cache.getState().zoomRevision, 2);
  });
  it("invalidates backward-clock Save and non-reference Delete while preserving viewport; resets on new/reference Delete/empty", () => {
    const a = historyFixture("a"), b = historyFixture("b", () => {}, 2, "2026-10-09T10:00:00.000Z"),
      old = historyFixture("old", () => {}, 2, "2026-10-07T10:00:00.000Z");
    const cache = createProjectHistoryCache(1000); cache.refresh([a, b]);
    cache.changeViewport({ cause: "zoom-button", previous: { x: 0, width: 1000 }, next: { x: 100, width: 200 } });
    const viewport = cache.getState().viewport, vm = cache.getState().model;
    assert.equal(cache.refresh([old, a, b]), true); assert.strictEqual(cache.getState().viewport, viewport);
    assert.notStrictEqual(cache.getState().model, vm); assert.equal(cache.getState().model.referenceSnapshotId, "b");
    assert.equal(cache.refresh([old, b]), true); assert.strictEqual(cache.getState().viewport, viewport);
    assert.equal(cache.refresh([old]), true); assert.deepEqual(cache.getState().viewport, { x: 0, width: 1000 });
    cache.refresh([old, a]); assert.deepEqual(cache.getState().viewport, { x: 0, width: 1000 });
    cache.refresh([]); assert.equal(cache.getState().viewport, null); assert.equal(cache.getState().cap, null);
  });
});
