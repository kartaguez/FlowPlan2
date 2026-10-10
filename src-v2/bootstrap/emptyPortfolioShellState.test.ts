import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyPortfolioShellState } from "./emptyPortfolioShellState.js";

test("a fresh boot is empty without invented business configuration", () => {
  assert.deepEqual(createEmptyPortfolioShellState(), {
    kind: "empty", teams: [], projects: [], reservations: [], snapshots: [],
  });
});
test("published shell state and every collection resist mutation", () => {
  const state = createEmptyPortfolioShellState();
  for (const collection of [state.teams, state.projects, state.reservations, state.snapshots]) {
    assert.throws(() => (collection as unknown as unknown[]).push("sentinel"), TypeError);
  }
  assert.throws(() => Object.assign(state, { kind: "demo" }), TypeError);
  assert.deepEqual(createEmptyPortfolioShellState(), state);
});
