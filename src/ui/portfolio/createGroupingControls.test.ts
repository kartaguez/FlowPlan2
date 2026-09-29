import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGroupingControls } from "./createGroupingControls.js";

class FakeDocument {
  createElement(tag: string): FakeElement { return new FakeElement(this, tag); }
}
class FakeElement {
  readonly dataset: Record<string, string> = {};
  readonly listeners = new Map<string, (() => void)[]>();
  readonly children: FakeElement[] = [];
  textContent = ""; className = ""; name = ""; value = ""; type = ""; hidden = false;
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.children.push(...children); }
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], listener as () => void]);
  }
  dispatch(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener(); }
}
const descendants = (root: FakeElement): FakeElement[] => root.children.flatMap((child) => [child, ...descendants(child)]);

describe("shared grouping controls", () => {
  it("previews selection, new names and color intent locally", () => {
    const document = new FakeDocument();
    const root = document.createElement("div");
    const catalog = Object.freeze({ programs: Object.freeze([{ id: "program-a", name: "Alpha", color: "#123456" }]),
      priorityFamilies: Object.freeze([{ id: "pas-a", name: "First" }]) });
    let changes = 0;
    const controls = createGroupingControls(root as unknown as HTMLElement, catalog,
      { programId: "", programName: "", priorityFamilyId: "", priorityFamilyName: "",
        color: "#654321", colorChanged: false }, "project-a", () => { changes++; });
    controls.program.value = "program-a";
    (controls.program as unknown as FakeElement).dispatch("change");
    assert.equal(controls.read().color, "#123456");
    assert.equal(controls.read().programName, "Alpha");
    assert.equal(controls.read().colorChanged, false);
    controls.color.value = "#445566";
    (controls.color as unknown as FakeElement).dispatch("input");
    assert.equal(controls.read().colorChanged, true);
    controls.program.value = "";
    (controls.program as unknown as FakeElement).dispatch("change");
    assert.notEqual(controls.read().color, "#654321");
    assert.equal(controls.read().colorChanged, false);
    controls.program.value = "__new__";
    (controls.program as unknown as FakeElement).dispatch("change");
    const newName = descendants(root).find((element) => element.tagName === "label" && element.textContent === "New Program")!.children[0]!;
    newName.value = "Finance"; newName.dispatch("input");
    assert.equal(controls.read().programName, "Finance");
    assert.equal(catalog.programs.length, 1);
    assert.ok(changes >= 4);
  });
});
