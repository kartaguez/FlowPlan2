import { test } from "node:test";
import assert from "node:assert/strict";
import { createV2Application } from "./createV2Application.js";

test("refused origin is rejected before any state is mounted or DOM created", () => {
  const root = { ownerDocument: {
    defaultView: { location: { origin: "http://127.0.0.1:4174" } },
    createElement() { throw new Error("DOM must not be touched"); },
  } } as unknown as HTMLElement;
  assert.throws(() => createV2Application(root), /Origine non autorisée/);
});
test("missing browser context remains a startup error", () => {
  assert.throws(() => createV2Application({ ownerDocument: { defaultView: null } } as unknown as HTMLElement), /window is missing/);
});
