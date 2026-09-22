import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderApp } from "./renderApp.js";

class FakeClassList {
  constructor(private readonly element: FakeElement) {}

  add(...tokens: string[]): void {
    this.element.className = [this.element.className, ...tokens]
      .filter(Boolean)
      .join(" ");
  }
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }

  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly classList = new FakeClassList(this);
  childNodes: FakeElement[] = [];
  className = "";
  id = "";
  textContent: string | null = null;
  type = "";

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.childNodes = [...nodes];
  }
}

function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

describe("renderApp", () => {
  it("creates a native cursor button adjacent to the timeline", () => {
    const root = new FakeDocument().createElement("div");
    const elements = renderApp(root as unknown as HTMLElement);
    const control = elements.cursorControl as unknown as FakeElement;

    assert.equal(control.tagName, "button");
    assert.equal(control.type, "button");
    assert.equal(control.className, "timeline-cursor-control");
    assert.equal(control.getAttribute("aria-label"), "Timeline date cursor");
    assert.equal(control.textContent, "Selected date");

    const renderedElements = descendants(root);
    assert.ok(
      renderedElements.indexOf(control) <
        renderedElements.indexOf(elements.svg as unknown as FakeElement),
    );
  });

  it("returns a frozen, strictly typed set of application elements", () => {
    const root = new FakeDocument().createElement("div");
    const elements = renderApp(root as unknown as HTMLElement);

    assert.equal(Object.isFrozen(elements), true);
    assert.equal((elements.svg as unknown as FakeElement).tagName, "svg");
    assert.equal((elements.dateSummary as unknown as FakeElement).tagName, "section");
    assert.equal((elements.diagnostics as unknown as FakeElement).tagName, "section");
    assert.equal(Object.isFrozen(elements.viewportControls), true);
    assert.equal(
      (elements.viewportControls.zoomIn as unknown as FakeElement).getAttribute(
        "aria-label",
      ),
      "Zoom in",
    );
    assert.equal(
      (elements.viewportControls.zoomOut as unknown as FakeElement).getAttribute(
        "aria-label",
      ),
      "Zoom out",
    );
    assert.equal(
      (elements.viewportControls.reset as unknown as FakeElement).textContent,
      "Reset view",
    );
  });
});
