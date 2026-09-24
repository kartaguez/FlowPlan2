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
  hidden = false;
  id = "";
  textContent: string | null = null;
  type = "";
  name = "";
  value = "";
  disabled = false;

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

  it("uses one full-width timeline stage with stacked team panels", () => {
    const root = new FakeDocument().createElement("div");
    const elements = renderApp(root as unknown as HTMLElement);
    const renderedElements = descendants(root);
    const stage = renderedElements.find(
      (element) => element.className === "timeline-stage",
    );

    assert.ok(stage);
    assert.deepEqual(
      stage.childNodes.map((element) => element.className),
      ["timeline-container", "timeline-team-panels"],
    );
    assert.equal(
      renderedElements.some(
        (element) => element.className === "timeline-team-sections",
      ),
      false,
    );
    assert.equal(
      stage.childNodes[1],
      elements.teamPanels as unknown as FakeElement,
    );
    assert.ok(renderedElements.indexOf(elements.cursorProgress as unknown as FakeElement) > renderedElements.indexOf(elements.dateSummary as unknown as FakeElement));
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
    assert.equal(
      (elements.selectionSummary as unknown as FakeElement).getAttribute(
        "aria-live",
      ),
      "polite",
    );
    assert.equal((elements.tooltip as unknown as FakeElement).tagName, "div");
    assert.equal((elements.tooltip as unknown as FakeElement).hidden, true);
    assert.equal(
      (elements.projectEditControls.form as unknown as FakeElement).tagName,
      "form",
    );
    assert.equal(
      (elements.projectEditControls.fields as unknown as FakeElement).className,
      "timeline-project-edit-fields",
    );
    assert.equal(
      (elements.projectEditControls.apply as unknown as FakeElement).disabled,
      true,
    );
    assert.equal(
      (elements.teamEditControls.capacityForm as unknown as FakeElement).tagName,
      "form",
    );
    assert.equal(
      (elements.teamEditControls.capacityFields as unknown as FakeElement).className,
      "timeline-team-edit-fields",
    );
    assert.equal(
      (elements.teamEditControls.capacityApply as unknown as FakeElement).disabled,
      true,
    );
    assert.equal(
      (elements.reservationEditControls.form as unknown as FakeElement).tagName,
      "form",
    );
    assert.equal(
      (elements.reservationEditControls.apply as unknown as FakeElement).disabled,
      true,
    );
    assert.equal(
      (elements.reservationEditError as unknown as FakeElement).getAttribute("role"),
      "alert",
    );
    assert.equal(
      (elements.applicationError as unknown as FakeElement).getAttribute("role"),
      "alert",
    );
    assert.equal(
      (elements.applicationError as unknown as FakeElement).hidden,
      true,
    );
    assert.equal(
      (elements.teamPanels as unknown as FakeElement).className,
      "timeline-team-panels",
    );
    assert.equal(
      (elements.projectList as unknown as FakeElement).tagName,
      "ol",
    );
    assert.equal(
      (elements.projectList as unknown as FakeElement).className,
      "project-sidebar-list",
    );
    assert.equal((elements.projectTab as unknown as FakeElement).tagName, "button");
    assert.equal((elements.projectTab as unknown as FakeElement).getAttribute("aria-pressed"), "true");
    assert.equal((elements.reservationTab as unknown as FakeElement).tagName, "button");
    assert.equal((elements.reservationTab as unknown as FakeElement).getAttribute("aria-pressed"), "false");
    assert.equal((elements.reservationList as unknown as FakeElement).hidden, true);
    assert.equal((elements.reservationEditControls.container as unknown as FakeElement).getAttribute("role"), "dialog");
    assert.equal(
      (elements.editorDrawer as unknown as FakeElement).className,
      "planning-editor-drawer",
    );
    assert.equal(
      (elements.planningSettingsButton as unknown as FakeElement).getAttribute(
        "aria-label",
      ),
      "Edit planning settings",
    );
    assert.equal(
      (elements.planningSettingsButton as unknown as FakeElement).textContent,
      null,
    );
    const planningSettingsIcon = (
      elements.planningSettingsButton as unknown as FakeElement
    ).childNodes[0]!;
    assert.equal(planningSettingsIcon.tagName, "svg");
    assert.equal(planningSettingsIcon.getAttribute("aria-hidden"), "true");
    assert.equal(
      (elements.planningSettingsButton as unknown as FakeElement).getAttribute(
        "title",
      ),
      "Settings",
    );
    assert.equal(
      (elements.planningSettingsControls.container as unknown as FakeElement).getAttribute(
        "role",
      ),
      "dialog",
    );
    assert.equal(
      (elements.teamEditControls.container as unknown as FakeElement).getAttribute(
        "role",
      ),
      "dialog",
    );
    assert.equal(
      (elements.teamEditControls.capacityDetails as unknown as FakeElement).tagName,
      "details",
    );
    assert.equal(
      descendants(elements.teamEditControls.container as unknown as FakeElement).includes(
        elements.reservationEditControls.container as unknown as FakeElement,
      ),
      false,
    );
  });
});
