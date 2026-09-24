import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProjectId, type DomainResult, type ProjectId } from "../../domain/index.js";
import { createProjectReorderController } from "./createProjectReorderController.js";

type Listener = (event: never) => void;
class FakeEvents {
  readonly listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener); this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  dispatch(type: string, event: object = {}): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event as never);
  }
}
class FakeDocument extends FakeEvents { hidden = false; }
class FakeElement extends FakeEvents {
  captured: number | undefined;
  constructor(readonly ownerDocument: FakeDocument,
    readonly bounds: { left: number; right: number; top: number; bottom: number }) { super(); }
  getBoundingClientRect(): DOMRect { return this.bounds as DOMRect; }
  setPointerCapture(id: number): void { this.captured = id; }
  hasPointerCapture(id: number): boolean { return this.captured === id; }
  releasePointerCapture(id: number): void {
    if (this.captured !== id) return;
    this.captured = undefined;
    this.dispatch("lostpointercapture", { pointerId: id });
  }
}
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
function fixture() {
  const document = new FakeDocument();
  const ids = ["a", "b", "c", "d"].map((id) => must(createProjectId(id)));
  const list = new FakeElement(document, { left: 0, right: 200, top: 0, bottom: 400 });
  const cards = new Map<ProjectId, { handle: FakeElement; item: FakeElement }>();
  ids.forEach((id, index) => cards.set(id, {
    handle: new FakeElement(document, { left: 0, right: 200, top: index * 100, bottom: (index + 1) * 100 }),
    item: new FakeElement(document, { left: 0, right: 200, top: index * 100, bottom: (index + 1) * 100 }),
  }));
  const calls: Array<[ProjectId, number]> = [];
  const previews: Array<[ProjectId | undefined, number | undefined]> = [];
  const controller = createProjectReorderController({ list: list as unknown as HTMLElement,
    order: ids, cards: cards as unknown as ReadonlyMap<ProjectId, { handle: HTMLButtonElement; item: HTMLElement }>,
    setPreview: (id, target) => previews.push([id, target]),
    onReorder: (id, target) => calls.push([id, target]) });
  const pointer = (type: string, id: ProjectId, y: number, x = 100) => cards.get(id)!.handle.dispatch(type,
    { pointerId: 7, clientX: x, clientY: y, button: 0, isPrimary: true, preventDefault() {} });
  const key = (id: ProjectId, name: string) => cards.get(id)!.handle.dispatch("keydown",
    { key: name, preventDefault() {}, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false });
  return { ids, document, cards, calls, previews, controller, pointer, key };
}

describe("Project reorder controller", () => {
  it("previews using card rectangles, then commits only once across release and lost capture", () => {
    const app = fixture();
    const source = app.ids[3]!;
    app.pointer("pointerdown", source, 350);
    app.pointer("pointermove", source, 240);
    assert.deepEqual(app.previews.at(-1), [source, 3]);
    app.pointer("pointermove", source, 120);
    assert.deepEqual(app.previews.at(-1), [source, 2]);
    assert.deepEqual(app.calls, []);
    app.pointer("pointerup", source, 120);
    app.pointer("lostpointercapture", source, 120);
    assert.deepEqual(app.calls, [[source, 2]]);
    assert.deepEqual(app.previews.at(-1), [undefined, undefined]);
    app.controller.destroy();
  });

  it("cancels on escape, pointercancel, lost capture, outside drop and destruction", () => {
    const app = fixture(); const source = app.ids[2]!;
    for (const end of ["pointercancel", "lostpointercapture", "Escape", "outside", "destroy"] as const) {
      app.pointer("pointerdown", source, 250);
      app.pointer("pointermove", source, 50);
      if (end === "Escape") app.document.dispatch("keydown", { key: "Escape", preventDefault() {} });
      else if (end === "outside") app.pointer("pointerup", source, 50, 300);
      else if (end === "destroy") app.controller.destroy();
      else app.pointer(end, source, 50);
      assert.deepEqual(app.calls, []);
      assert.deepEqual(app.previews.at(-1), [undefined, undefined]);
      if (end === "destroy") break;
    }
  });

  it("uses arrows, Home and End with no dispatch at limits or same position", () => {
    const app = fixture();
    app.key(app.ids[0]!, "ArrowUp");
    app.key(app.ids[3]!, "ArrowDown");
    app.key(app.ids[0]!, "Home");
    app.key(app.ids[3]!, "End");
    assert.deepEqual(app.calls, []);
    app.key(app.ids[2]!, "ArrowUp");
    app.key(app.ids[1]!, "ArrowDown");
    app.key(app.ids[2]!, "Home");
    app.key(app.ids[1]!, "End");
    assert.deepEqual(app.calls, [[app.ids[2], 2], [app.ids[1], 3], [app.ids[2], 1], [app.ids[1], 4]]);
    app.controller.destroy();
  });

  it("does not commit a tap, an original-position drop or a visibility cancellation", () => {
    const app = fixture(); const source = app.ids[1]!;
    app.pointer("pointerdown", source, 150);
    app.pointer("pointerup", source, 150);
    app.pointer("pointerdown", source, 150);
    app.pointer("pointermove", source, 155);
    app.pointer("pointerup", source, 155);
    app.pointer("pointerdown", source, 150);
    app.pointer("pointermove", source, 50);
    app.document.hidden = true;
    app.document.dispatch("visibilitychange");
    assert.deepEqual(app.calls, []);
    app.controller.destroy();
  });

  it("uses the actual midpoint of expanded cards rather than fixed row heights", () => {
    const app = fixture();
    const source = app.ids[3]!;
    const expanded = app.cards.get(app.ids[1]!)!.item.bounds;
    expanded.bottom = 300;
    const next = app.cards.get(app.ids[2]!)!.item.bounds;
    next.top = 300; next.bottom = 400;
    app.pointer("pointerdown", source, 350);
    app.pointer("pointermove", source, 180);
    assert.deepEqual(app.previews.at(-1), [source, 2]);
    app.pointer("pointerup", source, 180);
    assert.deepEqual(app.calls, [[source, 2]]);
    app.controller.destroy();
  });
});
