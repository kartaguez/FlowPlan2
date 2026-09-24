import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineDiagnostic } from "../../adapters/index.js";
import type { DiagnosticsControls } from "../renderApp.js";
import { createPlanningDiagnosticsController } from "./createPlanningDiagnosticsController.js";

type Listener = (event: unknown) => void;
class FakeDocument {
  readonly listeners = new Map<string, Set<Listener>>();
  activeElement: FakeElement | undefined;
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }
  dispatch(type: string, event: object): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<Listener>>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;
  type = "";
  hidden = false;
  disabled = false;
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  append(...nodes: FakeElement[]): void { this.childNodes.push(...nodes); }
  replaceChildren(...nodes: FakeElement[]): void { this.childNodes = [...nodes]; }
  contains(target: FakeElement): boolean { return this === target || this.childNodes.some((child) => child.contains(target)); }
  focus(): void {
    this.ownerDocument.activeElement = this;
    this.ownerDocument.dispatch("focusin", { target: this });
  }
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListener): void { this.listeners.get(type)?.delete(listener as Listener); }
  click(): void { if (this.disabled) return; for (const listener of this.listeners.get("click") ?? []) listener({ target: this }); }
}
function fixture() {
  const document = new FakeDocument();
  const element = (tag = "div") => document.createElement(tag);
  const summary = element("section");
  const backdrop = element();
  const dialog = element("section");
  const title = element("h3");
  const list = element();
  const close = element("button");
  dialog.append(title, list, close);
  dialog.hidden = true;
  backdrop.hidden = true;
  const controls = { summary, backdrop, dialog, title, list, close } as unknown as DiagnosticsControls;
  let otherModalOpen = false;
  const controller = createPlanningDiagnosticsController({
    controls,
    isModalOpen: () => otherModalOpen || !dialog.hidden,
  });
  const buttons = () => summary.childNodes[1]!.childNodes;
  return { document, summary, backdrop, dialog, title, list, close, controller, buttons,
    setOtherModalOpen: (open: boolean) => { otherModalOpen = open; } };
}

const diagnostics: readonly TimelineDiagnostic[] = [
  { code: "TEAM_OVER_RESERVED" },
  { code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON" },
  { code: "DEADLINE_UNFEASIBLE" },
  { code: "DEADLINE_MISSED" },
];
function codes(root: FakeElement): (string | null)[] {
  const descendants = (element: FakeElement): FakeElement[] => element.childNodes.flatMap((child) => [child, ...descendants(child)]);
  return descendants(root).filter((element) => element.className.includes("timeline-diagnostic "))
    .map((element) => element.getAttribute("data-diagnostic-code"));
}

describe("PlanningDiagnosticsController", () => {
  it("counts every UI category and filters the dialog without changing diagnostic order", () => {
    const input = fixture();
    input.controller.setDiagnostics(diagnostics);
    assert.equal(input.buttons()[0]!.textContent, "● 3");
    assert.equal(input.buttons()[1]!.textContent, "○ 1");
    input.buttons()[0]!.click();
    assert.equal(input.title.textContent, "Red diagnostics");
    assert.deepEqual(codes(input.list), ["TEAM_OVER_RESERVED", "DEADLINE_UNFEASIBLE", "DEADLINE_MISSED"]);
    assert.equal(input.dialog.hidden, false);
    assert.equal(input.backdrop.hidden, false);
    assert.equal(input.document.activeElement, input.close);
    input.close.click();
    assert.equal(input.document.activeElement, input.buttons()[0]);
    input.buttons()[1]!.click();
    assert.deepEqual(codes(input.list), ["PROJECT_REMAINS_UNPLANNED_AT_HORIZON"]);
  });

  it("disables zero counters and refuses to open above another modal", () => {
    const input = fixture();
    input.controller.setDiagnostics([]);
    assert.equal(input.buttons()[0]!.textContent, "● 0");
    assert.equal(input.buttons()[1]!.textContent, "○ 0");
    assert.equal(input.buttons()[0]!.disabled, true);
    input.controller.setDiagnostics(diagnostics);
    input.setOtherModalOpen(true);
    input.buttons()[0]!.click();
    assert.equal(input.dialog.hidden, true);
  });

  it("closes with Escape, confines focus, restores the trigger, and removes listeners", () => {
    const input = fixture();
    input.controller.setDiagnostics(diagnostics);
    input.buttons()[0]!.click();
    const outside = input.document.createElement("button");
    outside.focus();
    assert.equal(input.document.activeElement, input.close);
    let prevented = false;
    input.document.dispatch("keydown", { key: "Tab", preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    input.document.dispatch("keydown", { key: "Escape", preventDefault() {}, stopPropagation() {} });
    assert.equal(input.dialog.hidden, true);
    assert.equal(input.document.activeElement, input.buttons()[0]);
    input.controller.destroy();
    assert.equal(input.document.listeners.get("keydown")?.size, 0);
    assert.equal(input.document.listeners.get("focusin")?.size, 0);
  });
});
