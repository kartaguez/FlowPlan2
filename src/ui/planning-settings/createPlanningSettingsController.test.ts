import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlanningSettingsViewModel } from "../../application/index.js";
import type { PlanningSettingsControls } from "../renderApp.js";
import { createPlanningSettingsController } from "./createPlanningSettingsController.js";

type Listener = (event: unknown) => void;

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;
  hidden = false;
  type = "";
  name = "";
  value = "";
  checked = false;
  min = "";
  step = "";
  files: { text: () => Promise<string> }[] = [];

  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}

  append(...children: (FakeElement | string)[]): void {
    this.childNodes.push(
      ...children.filter((value): value is FakeElement => value instanceof FakeElement),
    );
  }

  replaceChildren(...children: FakeElement[]): void {
    this.childNodes = [...children];
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  dispatch(type: string, event: object = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  click(): void { this.dispatch("click"); }
}

const model = (maxParallelProjects = 2): PlanningSettingsViewModel => ({
  startDate: "2025-01-01" as PlanningSettingsViewModel["startDate"],
  endDate: "2025-03-31" as PlanningSettingsViewModel["endDate"],
  workingWeekdays: [1, 2, 3, 4, 5],
  maxParallelProjects,
});

function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

function named(root: FakeElement, name: string): FakeElement {
  const match = descendants(root).find((element) => element.name === name);
  if (match === undefined) throw new Error(`Missing ${name}`);
  return match;
}

function fixture() {
  const document = new FakeDocument();
  const element = (tagName: string) => document.createElement(tagName);
  const controls = {
    container: element("section"),
    form: element("form"),
    fields: element("div"),
    apply: element("button"),
    cancel: element("button"),
    error: element("p"),
    importButton: element("button"),
    exportButton: element("button"),
    fileInput: element("input"),
  };
  controls.container.hidden = true;
  controls.error.hidden = true;
  const trigger = element("button");
  const commands: unknown[] = [];
  const controller = createPlanningSettingsController({
    trigger: trigger as unknown as HTMLButtonElement,
    controls: controls as unknown as PlanningSettingsControls,
    initialModel: model(),
    onApply: (command) => {
      commands.push(command);
      return { ok: true };
    },
    onImport: () => "failed",
  });
  return { controls, trigger, commands, controller };
}

describe("PlanningSettingsController", () => {
  it("opens the native file input and reports a failed import without submitting planning settings", async () => {
    const input = fixture();
    input.trigger.dispatch("click");
    input.controls.importButton.click();
    input.controls.fileInput.files = [{ text: async () => "broken" }];
    input.controls.fileInput.dispatch("change");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(input.commands.length, 0);
    assert.equal(input.controls.error.textContent, "Import failed.");
  });
  it("renders seven compact weekday inputs and keeps all edits local until Apply", () => {
    const input = fixture();
    input.trigger.dispatch("click");
    const weekdays = descendants(input.controls.fields).filter(
      (element) => element.type === "checkbox",
    );
    assert.equal(weekdays.length, 7);
    assert.deepEqual(weekdays.map((field) => field.checked), [true, true, true, true, true, false, false]);

    named(input.controls.fields, "planning.startDate").value = "2025-01-06";
    weekdays[4]!.checked = false;
    named(input.controls.fields, "planning.maxParallelProjects").value = "4";
    assert.equal(input.commands.length, 0);

    input.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(input.commands.length, 1);
    assert.deepEqual(input.commands[0], {
      kind: "update-planning-settings",
      startDate: "2025-01-06",
      endDate: "2025-03-31",
      workingPattern: { workingWeekdays: [1, 2, 3, 4] },
      maxParallelProjects: 4,
    });
  });

  it("Cancel discards local values and reopens from the current session model", () => {
    const input = fixture();
    input.trigger.dispatch("click");
    named(input.controls.fields, "planning.maxParallelProjects").value = "9";
    input.controls.cancel.dispatch("click");
    assert.equal(input.commands.length, 0);

    input.controller.setModel(model(3));
    input.trigger.dispatch("click");
    assert.equal(
      named(input.controls.fields, "planning.maxParallelProjects").value,
      "3",
    );
  });

  it("rejects invalid local values without dispatch and removes listeners on destroy", () => {
    const input = fixture();
    input.trigger.dispatch("click");
    named(input.controls.fields, "planning.maxParallelProjects").value = "0";
    input.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(input.commands.length, 0);
    assert.equal(input.controls.error.hidden, false);

    input.controller.destroy();
    assert.ok(
      [input.trigger, input.controls.cancel, input.controls.form].every((element) =>
        [...element.listeners.values()].every((listeners) => listeners.size === 0),
      ),
    );
  });
});
