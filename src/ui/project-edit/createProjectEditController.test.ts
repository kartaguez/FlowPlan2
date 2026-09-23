import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ProjectEditViewModel,
  UpdateProjectCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  createProjectId,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import type { ProjectEditControls } from "../renderApp.js";
import { createProjectEditController } from "./createProjectEditController.js";

type Listener = (event: unknown) => void;

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  readonly dataset: Record<string, string> = {};
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  type = "";
  name = "";
  value = "";
  min = "";
  max = "";
  step = "";

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  append(...children: FakeElement[]): void {
    this.childNodes.push(...children);
  }

  prepend(...children: FakeElement[]): void {
    this.childNodes.unshift(...children);
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
}

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const projectId = must(createProjectId("project-atlas"));
const alphaId = must(createTeamId("team-alpha"));
const betaId = must(createTeamId("team-beta"));

function model(label = "Project Atlas"): ProjectEditViewModel {
  return Object.freeze({
    projectId,
    label,
    priorityPosition: 2,
    projectCount: 4,
    earliestStartDate: must(createCivilDate("2025-01-02")),
    objectiveEndDate: must(createCivilDate("2025-02-03")),
    mandatoryDeadline: must(createCivilDate("2025-03-04")),
    requirements: Object.freeze([
      Object.freeze({
        teamId: alphaId,
        teamLabel: "Team Alpha",
        remainingWorkload: "12.5",
        remainingWorkloadExact: "25/2",
        dailyCapExact: "3/2",
      }),
      Object.freeze({
        teamId: betaId,
        teamLabel: "Team Beta",
        remainingWorkload: "0",
        remainingWorkloadExact: "0/1",
      }),
    ]),
  });
}

function fixture(onApply: (command: UpdateProjectCommand) => { ok: true } | { ok: false; errors: readonly { code: string; path: string; message: string }[] } = () => ({ ok: true })) {
  const document = new FakeDocument();
  const form = document.createElement("form");
  const container = document.createElement("section");
  const fields = document.createElement("div");
  const apply = document.createElement("button");
  const cancel = document.createElement("button");
  const status = document.createElement("p");
  const error = document.createElement("p");
  error.hidden = true;
  const controls = {
    container,
    form,
    fields,
    apply,
    cancel,
    status,
  } as unknown as ProjectEditControls;
  const controller = createProjectEditController({
    controls,
    errorContainer: error as unknown as HTMLElement,
    onApply,
  });
  return { container, form, fields, apply, cancel, status, error, controller };
}

function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

function field(root: FakeElement, name: string): FakeElement {
  const result = descendants(root).find((element) => element.name === name);
  if (result === undefined) throw new Error(`Missing field ${name}`);
  return result;
}

describe("ProjectEditController", () => {
  it("renders global dates and decimal RAF while hiding daily caps", () => {
    const input = fixture();
    input.controller.setProject(model());
    const elements = descendants(input.fields);

    for (const name of [
      "project.name",
      "project.priority",
      "project.earliestStartDate",
      "project.objectiveEndDate",
      "project.mandatoryDeadline",
    ]) {
      assert.equal(elements.filter((element) => element.name === name).length, 1);
    }
    assert.equal(
      elements.filter((element) => element.name.endsWith(".remainingWorkload")).length,
      2,
    );
    assert.equal(
      elements.filter((element) => element.name.endsWith(".dailyCap")).length,
      0,
    );
    assert.equal(
      elements.filter((element) => element.tagName === "fieldset").length,
      3,
    );
    assert.equal(field(input.fields, "project.name").value, "Project Atlas");
    assert.equal(field(input.fields, "project.priority").value, "2");
    assert.equal(field(input.fields, "project.earliestStartDate").value, "2025-01-02");
    assert.equal(
      field(input.fields, `requirements.${alphaId}.remainingWorkload`).value,
      "12.5",
    );
    assert.equal(input.apply.disabled, false);
  });

  it("disables and clears the form without a selected project", () => {
    const input = fixture();
    input.controller.setProject(model());
    input.controller.setProject(undefined);
    assert.equal(input.fields.childNodes.length, 0);
    assert.equal(input.apply.disabled, true);
    assert.equal(input.cancel.disabled, true);
    assert.match(input.status.textContent ?? "", /Select a project/);
  });

  it("Cancel restores every field without dispatching", () => {
    let applyCount = 0;
    const input = fixture(() => {
      applyCount += 1;
      return { ok: true };
    });
    input.controller.setProject(model());
    field(input.fields, "project.name").value = "Dirty";
    field(input.fields, "project.priority").value = "4";
    field(input.fields, "project.mandatoryDeadline").value = "";
    field(input.fields, `requirements.${alphaId}.remainingWorkload`).value = "99";
    input.cancel.dispatch("click");

    assert.equal(field(input.fields, "project.name").value, "Project Atlas");
    assert.equal(field(input.fields, "project.priority").value, "2");
    assert.equal(field(input.fields, "project.mandatoryDeadline").value, "2025-03-04");
    assert.equal(
      field(input.fields, `requirements.${alphaId}.remainingWorkload`).value,
      "12.5",
    );
    assert.equal(applyCount, 0);
  });

  it("keeps user values and shows errors when one field is invalid", () => {
    let applyCount = 0;
    const input = fixture(() => {
      applyCount += 1;
      return { ok: true };
    });
    input.controller.setProject(model());
    field(input.fields, "project.name").value = "Valid rename";
    field(input.fields, `requirements.${alphaId}.remainingWorkload`).value = "invalid";
    input.form.dispatch("submit", { preventDefault() {} });

    assert.equal(applyCount, 0);
    assert.equal(field(input.fields, "project.name").value, "Valid rename");
    assert.equal(
      field(input.fields, `requirements.${alphaId}.remainingWorkload`).value,
      "invalid",
    );
    assert.equal(input.error.hidden, false);
    assert.match(input.error.textContent ?? "", /remainingWorkload/);
  });

  it("emits one typed atomic command and clears errors after success", () => {
    let command: UpdateProjectCommand | undefined;
    const input = fixture((candidate) => {
      command = candidate;
      return { ok: true };
    });
    input.controller.setProject(model());
    input.error.hidden = false;
    input.error.textContent = "Old error";
    field(input.fields, "project.name").value = "Atlas Updated";
    field(input.fields, "project.priority").value = "1";
    field(input.fields, `requirements.${betaId}.remainingWorkload`).value = "0.25";
    input.form.dispatch("submit", { preventDefault() {} });

    assert.equal(command?.kind, "update-project");
    assert.equal(command?.name, "Atlas Updated");
    assert.equal(command?.priorityPosition, 1);
    assert.equal(command?.teamRequirements.length, 2);
    assert.equal(command?.teamRequirements[0]?.dailyCap === undefined, false);
    assert.equal(
      serializeQuantity(command!.teamRequirements[0]!.dailyCap!),
      "3/2",
    );
    assert.equal(input.error.hidden, true);
    assert.equal(input.error.textContent, "");
  });
});
