import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTeamId, type DomainResult } from "../../domain/index.js";
import { createTeamSubcard } from "./createTeamSubcard.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeDocument {
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
}

class FakeElement {
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Array<() => void>>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent = "";
  type = "";
  id = "";
  checked = false;
  hidden = false;
  disabled = false;
  value = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...nodes: FakeElement[]): void { this.childNodes.push(...nodes); }
  prepend(...nodes: FakeElement[]): void { this.childNodes.unshift(...nodes); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(name: string, listener: () => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  dispatch(name: string): void { for (const listener of this.listeners.get(name) ?? []) listener(); }
}

describe("Team subcard draft controls", () => {
  it("keeps enabled separate from expansion and restores local values after OFF then ON", () => {
    const document = new FakeDocument();
    const parent = document.createElement("div");
    const content = document.createElement("input");
    content.value = "20";
    const subcard = createTeamSubcard(parent as unknown as HTMLElement, "Project",
      must(createTeamId("alpha")), "Alpha", true, content as unknown as HTMLElement);
    const card = parent.childNodes[0]!;
    const expand = card.childNodes[0]!.childNodes[1]!;
    assert.equal(subcard.enabled.checked, true);
    assert.equal(subcard.details.hidden, true);
    expand.dispatch("click");
    assert.equal(subcard.details.hidden, false);
    expand.dispatch("click");
    assert.equal(subcard.enabled.checked, true);
    assert.equal(subcard.details.hidden, true);
    const enabled = subcard.enabled as unknown as FakeElement;
    enabled.checked = false;
    enabled.dispatch("change");
    assert.equal(expand.disabled, true);
    enabled.checked = true;
    enabled.dispatch("change");
    assert.equal(subcard.details.hidden, false);
    assert.equal(content.value, "20");
    assert.equal(expand.attributes.get("aria-expanded"), "true");
  });
});
