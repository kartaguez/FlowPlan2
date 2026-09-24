import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CreateTeamCommand } from "../../application/index.js";
import { serializeQuantity } from "../../domain/index.js";
import type { TeamCreateControls } from "../renderApp.js";
import { createTeamCreateController } from "./createTeamCreateController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  activeElement?: FakeElement;
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
}
class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  childNodes: FakeElement[] = [];
  className = ""; textContent: string | null = null; hidden = false; disabled = false;
  type = ""; name = ""; value = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.childNodes.push(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  focus(): void { this.ownerDocument.activeElement = this; }
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener); this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }
  dispatch(type: string, event: { preventDefault?: () => void } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}
function fixture(confirm = true) {
  const document = new FakeDocument();
  const element = (tag: string) => document.createElement(tag);
  const controls = { container: element("section"), form: element("form"), name: element("input"),
    periodFields: element("div"), addPeriod: element("button"), cancel: element("button"),
    create: element("button"), error: element("p") };
  controls.container.hidden = true;
  const commands: CreateTeamCommand[] = [];
  const controller = createTeamCreateController({ controls: controls as unknown as TeamCreateControls,
    confirmDiscard: () => confirm,
    onCreate: (command) => { commands.push(command); return { ok: true }; } });
  const periodInputs = (index: number): FakeElement[] =>
    descendants(controls.periodFields.childNodes[index]!).filter((item) => item.tagName === "input");
  return { controls, controller, commands, periodInputs, document };
}

describe("Create Team form", () => {
  it("starts blank, adds/removes periods, and sends one exact atomic command", () => {
    const app = fixture();
    app.controller.open();
    assert.equal(app.controls.name.value, "");
    assert.equal(app.controls.periodFields.childNodes.length, 1);
    assert.equal(app.periodInputs(0).every((item) => item.value === ""), true);
    app.controls.addPeriod.dispatch("click");
    assert.equal(app.controls.periodFields.childNodes.length, 2);
    const remove = descendants(app.controls.periodFields.childNodes[0]!)
      .find((item) => item.textContent === "Remove period")!;
    remove.dispatch("click");
    assert.equal(app.controls.periodFields.childNodes.length, 1);
    app.controls.name.value = "New Team";
    const [start, end, capacity, unavailable] = app.periodInputs(0);
    start!.value = "2025-01-01"; end!.value = "2025-01-31";
    capacity!.value = "1/3"; unavailable!.value = "100/3";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 1);
    assert.equal(app.commands[0]!.capacityPeriods.length, 1);
    assert.equal(serializeQuantity(app.commands[0]!.capacityPeriods[0]!.capacity), "1/3");
    assert.equal(serializeQuantity(app.commands[0]!.capacityPeriods[0]!.unavailability), "1/3");
    assert.equal(app.controller.isOpen(), false);
    app.controller.destroy();
  });

  it("keeps a dirty create form when discard is declined", () => {
    const app = fixture(false);
    app.controller.open();
    app.controls.name.value = "Pending";
    assert.equal(app.controller.requestClose(), false);
    assert.equal(app.controller.isOpen(), true);
    assert.equal(app.controls.name.value, "Pending");
    app.controller.destroy();
  });

  it("shows field errors without dispatching", () => {
    const app = fixture();
    app.controller.open();
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 0);
    assert.equal(app.controls.error.hidden, false);
    assert.match(app.controls.error.textContent ?? "", /team.name/);
    app.controller.destroy();
  });
});
