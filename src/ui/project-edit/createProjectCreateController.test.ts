import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CreateProjectCommand } from "../../application/index.js";
import { createPortfolio, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import type { ProjectCreateControls } from "../renderApp.js";
import { createProjectCreateController } from "./createProjectCreateController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  activeElement?: FakeElement;
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
}
class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  childNodes: FakeElement[] = [];
  className = ""; textContent: string | null = null; hidden = false; disabled = false;
  type = ""; name = ""; value = ""; checked = false; id = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: FakeElement[]): void { this.childNodes.push(...children); }
  prepend(...children: FakeElement[]): void { this.childNodes.unshift(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  focus(): void { this.ownerDocument.activeElement = this; }
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener); this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListener): void { this.listeners.get(type)?.delete(listener as Listener); }
  dispatch(type: string, event: { preventDefault?: () => void } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
function fixture(teams = true, confirm = true) {
  const document = new FakeDocument();
  const element = (tag: string) => document.createElement(tag);
  const controls = { container: element("section"), form: element("form"), fields: element("div"),
    error: element("p"), create: element("button"), cancel: element("button") };
  controls.container.hidden = true;
  const initial = createDemoPlanningScenario().portfolio;
  const portfolio = teams ? initial : must(createPortfolio({ ...initial, teams: [], projects: [],
    priorityOrder: [], reservations: [] }));
  const commands: CreateProjectCommand[] = [];
  let closed = 0;
  const controller = createProjectCreateController({
    controls: controls as unknown as ProjectCreateControls, portfolio,
    confirmDiscard: () => confirm, onClose: () => { closed += 1; },
    onCreate: (command) => { commands.push(command); return { ok: true }; },
  });
  const field = (name: string): FakeElement => {
    const result = descendants(controls.fields).find((item) => item.name === name);
    if (!result) throw new Error(`Missing ${name}`);
    return result;
  };
  const teamToggle = (index: number): FakeElement => descendants(controls.fields)
    .filter((item) => item.attributes.get("aria-label")?.startsWith("Project enabled for"))[index]!;
  return { controls, controller, commands, field, teamToggle, portfolio, document,
    closed: () => closed };
}

describe("Create Project form", () => {
  it("never enables a Team implicitly and sends one exact command only after explicit activation", () => {
    const app = fixture();
    app.controller.open();
    assert.equal(app.teamToggle(0).checked, false);
    assert.equal(app.teamToggle(1).checked, false);
    app.field("project.name").value = "Fresh";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 0);
    assert.match(app.controls.error.textContent ?? "", /requirements/);
    app.teamToggle(0).checked = true;
    app.field(`requirements.${app.portfolio.teams[0]!.id}.remainingWorkload`).value = "1/3";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 1);
    assert.equal(app.commands[0]!.teamRequirements.length, 1);
    assert.equal(serializeQuantity(app.commands[0]!.teamRequirements[0]!.remainingWorkload), "1/3");
    assert.equal(app.commands[0]!.teamRequirements[0]!.dailyCap, undefined);
    assert.equal(app.controller.isOpen(), false);
    app.controller.destroy();
  });

  it("explains a missing Team and blocks Create", () => {
    const app = fixture(false);
    app.controller.open();
    assert.equal(app.controls.create.disabled, true);
    assert.ok(descendants(app.controls.fields).some((item) => item.textContent === "Create a Team first"));
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 0);
    app.controller.destroy();
  });

  it("parses optional grouping, Mandatory and multiple exact requirements without numeric conversion", () => {
    const app = fixture();
    app.controller.open();
    app.field("project.name").value = "Grouped";
    app.field("project.programId").value = app.portfolio.programs[0]!.id;
    app.field("project.priorityFamilyId").value = app.portfolio.priorityFamilies[0]!.id;
    app.field("project.objectiveEndDate").value = "2025-02-14";
    app.field("project.objectiveEndDate").dispatch("input");
    app.field("project.mandatory").checked = true;
    app.teamToggle(0).checked = true;
    app.teamToggle(1).checked = true;
    app.field(`requirements.${app.portfolio.teams[0]!.id}.remainingWorkload`).value = "1/3";
    app.field(`requirements.${app.portfolio.teams[1]!.id}.remainingWorkload`).value = "2/7";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 1);
    assert.equal(app.commands[0]!.programId, app.portfolio.programs[0]!.id);
    assert.equal(app.commands[0]!.priorityFamilyId, app.portfolio.priorityFamilies[0]!.id);
    assert.equal(app.commands[0]!.mandatoryDeadline, "2025-02-14");
    assert.deepEqual(app.commands[0]!.teamRequirements.map((item) => serializeQuantity(item.remainingWorkload)), ["1/3", "2/7"]);
    app.controller.destroy();
  });

  it("keeps invalid exact RAF in the form without dispatch", () => {
    const app = fixture();
    app.controller.open();
    app.field("project.name").value = "Invalid";
    app.teamToggle(0).checked = true;
    app.field(`requirements.${app.portfolio.teams[0]!.id}.remainingWorkload`).value = "bad";
    app.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(app.commands.length, 0);
    assert.equal(app.controls.error.hidden, false);
    assert.match(app.controls.error.textContent ?? "", /remainingWorkload/);
    app.controller.destroy();
  });

  it("preserves an open draft across Portfolio changes and guards its active Team", () => {
    const app = fixture();
    app.controller.open();
    const id = app.portfolio.teams[0]!.id;
    app.field("project.name").value = "Pending";
    app.teamToggle(0).checked = true;
    app.field(`requirements.${id}.remainingWorkload`).value = "2.5";
    assert.equal(app.controller.isTeamEnabled(id), true);
    app.controller.setPortfolio(app.portfolio);
    assert.equal(app.field("project.name").value, "Pending");
    assert.equal(app.teamToggle(0).checked, true);
    assert.equal(app.field(`requirements.${id}.remainingWorkload`).value, "2.5");
    app.controller.destroy();
  });

  it("keeps a dirty form when discard is declined", () => {
    const app = fixture(true, false);
    app.controller.open();
    app.field("project.name").value = "Pending";
    assert.equal(app.controller.requestClose(), false);
    assert.equal(app.closed(), 0);
    assert.equal(app.controller.isOpen(), true);
    app.controller.destroy();
  });
});
