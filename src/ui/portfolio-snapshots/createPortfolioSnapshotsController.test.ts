import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPortfolioSnapshotsController } from "./createPortfolioSnapshotsController.js";
import type { PortfolioSnapshotControls } from "../renderApp.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
class FakeDocument {
  activeElement?: FakeElement;
  createElement(tag: string) { return new FakeElement(this, tag); }
}
class FakeElement {
  children: FakeElement[] = []; textContent = ""; disabled = false; type = ""; dateTime = ""; title = "";
  listeners = new Map<string, (() => void)[]>(); attributes = new Map<string, string>();
  constructor(readonly ownerDocument: FakeDocument, readonly tag: string) {}
  append(...nodes: FakeElement[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: FakeElement[]) { this.children = nodes; }
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  addEventListener(event: string, cb: () => void) { this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]); }
  removeEventListener(event: string, cb: () => void) { this.listeners.set(event, (this.listeners.get(event) ?? []).filter((c) => c !== cb)); }
  click() { for (const cb of this.listeners.get("click") ?? []) cb(); }
  focus() { this.ownerDocument.activeElement = this; }
}
function snapshot(id: string, createdAt = "2026-10-07T10:00:00.123Z"): PortfolioSnapshot {
  return { snapshotId: id, createdAt, inputsSchemaVersion: 1, inputs: {}, actualsSources: [], forecast: { forecastSchemaVersion: 1, engineVersion: "test", projects: [] } };
}
function fixture() {
  const doc = new FakeDocument(); const element = (tag: string) => doc.createElement(tag);
  const controls = { save: element("button"), reason: element("span"), status: element("span"), details: element("details"), count: element("summary"), list: element("ul") };
  let dirty = false, fail = false, confirm = true, saves = 0, removes = 0;
  let snapshots = [snapshot("b"), snapshot("a"), snapshot("old", "2025-01-01T00:00:00.000Z")];
  const controller = createPortfolioSnapshotsController({ controls: controls as unknown as PortfolioSnapshotControls,
    isDirty: () => dirty, getSnapshots: () => snapshots,
    save: () => { saves++; if (fail) return { ok: false, errors: [{ message: "quota" }] }; snapshots = [...snapshots, snapshot("new")]; return { ok: true }; },
    remove: (id) => { removes++; if (fail) return { ok: false, errors: [{ message: "quota" }] }; snapshots = snapshots.filter((s) => s.snapshotId !== id); return { ok: true }; },
    confirm: () => confirm });
  return { controls, controller, doc, dirty: (v: boolean) => { dirty = v; }, fail: (v: boolean) => { fail = v; }, confirm: (v: boolean) => { confirm = v; }, saves: () => saves, removes: () => removes };
}
describe("11A snapshot UI", () => {
  it("shows a deterministic list with precise local dates and snapshot identity", () => {
    const app = fixture(); assert.equal(app.controls.count.textContent, "Portfolio snapshots (3)");
    assert.deepEqual(app.controls.list.children.map((row) => row.children[0]!.title), ["old", "a", "b"]);
    assert.ok(app.controls.list.children[1]!.children[0]!.textContent.includes("123")); app.controller.destroy();
  });
  it("explains disabled Save and rechecks dirty at click before calling the service", () => {
    const app = fixture(); assert.equal(app.controls.save.disabled, false);
    app.dirty(true); app.controls.save.click(); assert.equal(app.saves(), 0); assert.equal(app.controls.save.disabled, true);
    assert.match(app.controls.reason.textContent, /Apply or cancel/);
    app.dirty(false); app.controller.refreshDirty(); assert.equal(app.controls.save.disabled, false);
    app.controls.save.click(); assert.equal(app.saves(), 1); assert.match(app.controls.status.textContent, /saved/);
    assert.equal(app.controls.list.children.length, 4); app.controller.destroy();
  });
  it("keeps the existing list on Save failure and reports the error", () => {
    const app = fixture(); const row = app.controls.list.children[0]; app.fail(true); app.controls.save.click();
    assert.equal(app.controls.list.children.length, 3); assert.strictEqual(app.controls.list.children[0], row);
    assert.equal(app.controls.status.textContent, "quota"); app.controller.destroy();
  });
  it("confirms only the chosen Delete, keeps failure intact and returns focus to the summary", () => {
    const app = fixture(); const remove = app.controls.list.children[1]!.children[1]!;
    assert.match(remove.attributes.get("aria-label")!, /\(a\)/);
    app.confirm(false); remove.click(); assert.equal(app.removes(), 0);
    app.confirm(true); app.fail(true); remove.click(); assert.equal(app.controls.list.children.length, 3);
    app.fail(false); remove.click(); assert.equal(app.controls.list.children.length, 2);
    assert.deepEqual(app.controls.list.children.map((r) => r.children[0]!.title), ["old", "b"]);
    assert.strictEqual(app.doc.activeElement, app.controls.count); app.controller.destroy();
  });
  it("removes the Save listener on destroy", () => {
    const app = fixture(); app.controller.destroy(); app.controls.save.click(); assert.equal(app.saves(), 0);
  });
});
