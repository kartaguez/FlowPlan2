import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPortfolio, serializeQuantity, type DomainResult } from "../../domain/index.js";
import type { CreateReservationCommand } from "../../application/index.js";
import type { ProjectCreateControls } from "../renderApp.js";
import { createReservationCreateController } from "./createReservationCreateController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  activeElement?: FakeElement;
  createElement(tag: string): FakeElement { return new FakeElement(this, tag); }
}
class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  readonly dataset: Record<string, string> = {};
  childNodes: FakeElement[] = [];
  textContent = ""; className = ""; type = ""; value = ""; checked = false;
  disabled = false; hidden = false; id = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.childNodes.push(...children); }
  prepend(...children: FakeElement[]): void { this.childNodes.unshift(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  setAttribute(): void {}
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
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}
function fixture(emptyTeams: boolean) {
  const scenario = createDemoPlanningScenario();
  const portfolio = emptyTeams ? must(createPortfolio({ teams: [], projects: [], programs: [],
    priorityFamilies: [], priorityOrder: [], reservations: [] })) : scenario.portfolio;
  const document = new FakeDocument();
  const element = (tag: string) => document.createElement(tag);
  const controls = { container: element("section"), form: element("form"), fields: element("div"),
    error: element("p"), create: element("button"), cancel: element("button") };
  controls.container.hidden = true;
  controls.error.hidden = true;
  const commands: CreateReservationCommand[] = [];
  const controller = createReservationCreateController({
    controls: controls as unknown as ProjectCreateControls,
    portfolio, horizon: { start: scenario.planning.startDate, end: scenario.planning.endDate },
    confirmDiscard: () => true, onClose: () => {},
    onCreate: (command) => { commands.push(command); return { ok: true }; },
  });
  return { scenario, controller, controls, document, commands };
}

describe("Create Reservation form", () => {
  it("starts as a local empty draft at the horizon and creates with no Teams", () => {
    const app = fixture(true);
    app.controller.open();
    const inputs = descendants(app.controls.fields).filter((item) => item.tagName === "input");
    assert.equal(inputs[0]!.value, "");
    assert.equal(inputs[1]!.value, app.scenario.planning.startDate);
    assert.equal(inputs[2]!.value, app.scenario.planning.endDate);
    assert.equal(app.document.activeElement, inputs[0]);
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 0);
    assert.equal(app.controls.error.hidden, false);
    inputs[0]!.value = "Fresh";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 1);
    assert.deepEqual(app.commands[0]!.teamAllocations, []);
    assert.equal(app.controller.isOpen(), false);
  });

  it("tracks a Team enabled before creation and parses its exact amount", () => {
    const app = fixture(false);
    app.controller.open();
    const teamId = app.scenario.portfolio.teams[0]!.id;
    const inputs = descendants(app.controls.fields).filter((item) => item.tagName === "input");
    inputs[0]!.value = "With Team";
    const enabled = inputs.find((item) => item.type === "checkbox")!;
    enabled.checked = true; enabled.dispatch("change");
    assert.equal(app.controller.isTeamEnabled(teamId), true);
    const value = inputs.find((item) => item.type === "text" && item !== inputs[0])!;
    value.value = "1/3";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 1);
    const allocation = app.commands[0]!.teamAllocations[0]!;
    assert.equal(allocation.kind, "ratio");
    if (allocation.kind === "ratio") assert.equal(serializeQuantity(allocation.ratio), "1/300");
  });
});
