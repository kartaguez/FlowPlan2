import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ProjectEditViewModel,
  UpdateProjectCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  createProjectId,
  createProgramId,
  createPriorityFamilyId,
  createTeamId,
  serializeQuantity,
  type DomainResult,
  type TeamId,
} from "../../domain/index.js";
import type { ProjectEditControls } from "../renderApp.js";
import { createProjectEditController } from "./createProjectEditController.js";
import { createProjectDraftStore } from "./projectDraftStore.js";

type Listener = (event: unknown) => void;

class FakeDocument {
  activeElement?: FakeElement;
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
  checked = false;
  readonly attributes = new Map<string, string>();

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
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  focus(): void { this.ownerDocument.activeElement = this; }

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
const phoenixId = must(createProgramId("program-phoenix"));
const strategicId = must(createPriorityFamilyId("pas-strategic"));

function model(label = "Project Atlas"): ProjectEditViewModel {
  return Object.freeze({
    projectId,
    label,
    programId: phoenixId,
    priorityFamilyId: strategicId,
    programs: Object.freeze([Object.freeze({ id: phoenixId, name: "Phoenix" })]),
    priorityFamilies: Object.freeze([Object.freeze({ id: strategicId, name: "Strategic" })]),
    earliestStartDate: must(createCivilDate("2025-01-02")),
    objectiveEndDate: must(createCivilDate("2025-02-03")),
    mandatoryDeadline: must(createCivilDate("2025-02-03")),
    requirements: Object.freeze([
      Object.freeze({
        teamId: alphaId,
        teamLabel: "Team Alpha",
        enabled: true,
        remainingWorkload: "12.5",
        remainingWorkloadExact: "25/2",
        dailyCapExact: "3/2",
      }),
      Object.freeze({
        teamId: betaId,
        teamLabel: "Team Beta",
        enabled: true,
        remainingWorkload: "0",
        remainingWorkloadExact: "0/1",
      }),
    ]),
  });
}

function fixture(onApply: (command: UpdateProjectCommand) => { ok: true } | { ok: false; errors: readonly { code: string; path: string; message: string }[] } = () => ({ ok: true }),
  options?: { draftStore?: boolean; confirmDiscard?: boolean;
    getActualsRaf?: (teamId: TeamId) => string | undefined;
    onActualsRafInput?: (teamId: TeamId, value: string) => void;
    onCancel?: () => void;
    onDelete?: (id: typeof projectId) =>
    { ok: true } | { ok: false; errors: readonly { code: string; path: string; message: string }[] } }) {
  const document = new FakeDocument();
  const form = document.createElement("form");
  const container = document.createElement("section");
  const fields = document.createElement("div");
  const apply = document.createElement("button");
  const cancel = document.createElement("button");
  const status = document.createElement("p");
  const error = document.createElement("p");
  const deleteButton = document.createElement("button");
  const deleteConfirmation = document.createElement("div");
  const deleteConfirm = document.createElement("button");
  const deleteCancel = document.createElement("button");
  error.hidden = true;
  const controls = {
    container,
    form,
    fields,
    apply,
    cancel,
    status,
    deleteButton, deleteConfirmation, deleteConfirm, deleteCancel,
  } as unknown as ProjectEditControls;
  const draftStore = options?.draftStore ? createProjectDraftStore() : undefined;
  const controller = createProjectEditController({
    controls,
    errorContainer: error as unknown as HTMLElement,
    onApply,
    ...(draftStore ? { draftStore } : {}),
    ...(options?.onDelete ? { onDelete: options.onDelete } : {}),
    ...(options?.getActualsRaf ? { getActualsRaf: options.getActualsRaf } : {}),
    ...(options?.onActualsRafInput ? { onActualsRafInput: options.onActualsRafInput } : {}),
    ...(options?.onCancel ? { onCancel: options.onCancel } : {}),
    confirmDiscard: () => options?.confirmDiscard ?? true,
  });
  return { container, form, fields, apply, cancel, status, error, controller,
    deleteButton, deleteConfirmation, deleteConfirm, deleteCancel, draftStore, document };
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
  it("shows RAF provenance without a numeric editing lock", () => {
    const input = fixture(undefined, { draftStore: true });
    const governed = { ...model(), requirements: [
      { ...model().requirements[0]!, remainingWorkload: "0.333", remainingWorkloadExact: "1/3", currentRafEditable: true, rafAuthority: "latest-actuals" as const },
      { ...model().requirements[1]!, rafAuthority: "current-configuration" as const },
    ] };
    input.controller.setProject(governed);
    const exact = field(input.fields, `requirements.${alphaId}.remainingWorkload`) as FakeElement & { readOnly?: boolean };
    const editable = field(input.fields, `requirements.${betaId}.remainingWorkload`) as FakeElement & { readOnly?: boolean };
    assert.equal(exact.value, "1/3");
    assert.equal(exact.readOnly, undefined);
    assert.equal(editable.readOnly, undefined);
    assert.equal(input.draftStore?.isDirty(projectId), false);
  });
  it("edits latest-Actuals RAF in the Project card while keeping Forecast command unchanged", () => {
    let actualsRaf = "1/3";
    let applied: UpdateProjectCommand | undefined;
    const input = fixture((command) => { applied = command; return { ok: true }; }, {
      draftStore: true,
      getActualsRaf: () => actualsRaf,
      onActualsRafInput: (_teamId, value) => { actualsRaf = value; },
      onCancel: () => { actualsRaf = "1/3"; },
    });
    const governed = { ...model(), requirements: [
      { ...model().requirements[0]!, remainingWorkload: "0.333", remainingWorkloadExact: "1/3", currentRafEditable: true, rafAuthority: "latest-actuals" as const },
      { ...model().requirements[1]!, rafAuthority: "current-configuration" as const },
    ] };
    input.controller.setProject(governed);
    assert.equal(descendants(input.fields).some((node) => node.name === `requirements.${alphaId}.remainingWorkload`), false);
    // The sole Actuals/RAF owner is edited externally; this form cannot echo or
    // silently submit that RAF. It still submits every published requirement.
    actualsRaf = "7/3";
    input.form.dispatch("input");
    assert.equal(actualsRaf, "7/3");
    assert.equal(input.draftStore?.isDirty(projectId), false);
    input.form.dispatch("submit", { preventDefault() {} });
    assert.ok(applied);
    assert.equal(serializeQuantity(applied.teamRequirements[0]!.remainingWorkload), "1/3");
    input.cancel.dispatch("click");
    assert.equal(actualsRaf, "1/3");
    assert.equal(descendants(input.fields).some((node) => node.name === `requirements.${alphaId}.remainingWorkload`), false);
  });
  it("uses Team deletion's dirty-discard and inline confirmation pattern", () => {
    let deleted = 0;
    const input = fixture(undefined, { draftStore: true,
      onDelete: () => { deleted += 1; return { ok: true }; } });
    input.controller.setProject(model());
    field(input.fields, "project.name").value = "Dirty";
    input.deleteButton.dispatch("click");
    assert.equal(input.deleteConfirmation.hidden, false);
    assert.equal(field(input.fields, "project.name").value, "Project Atlas");
    assert.equal(input.draftStore?.isDirty(projectId), false);
    assert.equal(input.document.activeElement, input.deleteConfirm);
    input.deleteCancel.dispatch("click");
    assert.equal(input.deleteConfirmation.hidden, true);
    assert.equal(deleted, 0);
    input.deleteButton.dispatch("click");
    input.deleteConfirm.dispatch("click");
    assert.equal(deleted, 1);
  });

  it("retains a dirty draft when discard is refused and shows application deletion errors", () => {
    const input = fixture(undefined, { draftStore: true, confirmDiscard: false,
      onDelete: () => ({ ok: false, errors: [{ code: "UNKNOWN_PROJECT", path: "projectId", message: "Missing" }] }) });
    input.controller.setProject(model());
    field(input.fields, "project.name").value = "Dirty";
    input.deleteButton.dispatch("click");
    assert.equal(input.deleteConfirmation.hidden, true);
    assert.equal(field(input.fields, "project.name").value, "Dirty");
    input.cancel.dispatch("click");
    input.deleteButton.dispatch("click");
    input.deleteConfirm.dispatch("click");
    assert.equal(input.deleteConfirmation.hidden, true);
    assert.match(input.error.textContent ?? "", /projectId: Missing/);
    assert.equal(input.document.activeElement, input.deleteButton);
  });
  it("renders global dates and decimal RAF while hiding daily caps", () => {
    const input = fixture();
    input.controller.setProject(model());
    const elements = descendants(input.fields);

    for (const name of [
      "project.name",
      "project.programId",
      "project.priorityFamilyId",
      "project.earliestStartDate",
      "project.objectiveEndDate",
      "project.mandatory",
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
    assert.equal(field(input.fields, "project.programId").value, phoenixId);
    assert.equal(field(input.fields, "project.priorityFamilyId").value, strategicId);
    const programOptions = field(input.fields, "project.programId").childNodes;
    const familyOptions = field(input.fields, "project.priorityFamilyId").childNodes;
    assert.deepEqual(programOptions.map(({ value, textContent }) => [value, textContent]), [["", "None"], [phoenixId, "Phoenix"], ["__new__", "New…"]]);
    assert.deepEqual(familyOptions.map(({ value, textContent }) => [value, textContent]), [["", "None"], [strategicId, "Strategic"], ["__new__", "New…"]]);
    assert.equal(elements.some((element) => element.name === "project.priority"), false);
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
    assert.equal(input.status.textContent, "");
  });

  it("Cancel restores every field without dispatching", () => {
    let applyCount = 0;
    const input = fixture(() => {
      applyCount += 1;
      return { ok: true };
    });
    input.controller.setProject(model());
    field(input.fields, "project.name").value = "Dirty";
    field(input.fields, "project.programId").value = "";
    field(input.fields, "project.priorityFamilyId").value = "";
    field(input.fields, "project.mandatory").checked = false;
    field(input.fields, `requirements.${alphaId}.remainingWorkload`).value = "99";
    input.cancel.dispatch("click");

    assert.equal(field(input.fields, "project.name").value, "Project Atlas");
    assert.equal(field(input.fields, "project.programId").value, phoenixId);
    assert.equal(field(input.fields, "project.priorityFamilyId").value, strategicId);
    assert.equal(field(input.fields, "project.mandatory").checked, true);
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
    field(input.fields, `requirements.${betaId}.remainingWorkload`).value = "0.25";
    input.form.dispatch("submit", { preventDefault() {} });

    assert.equal(command?.kind, "update-project");
    assert.equal(command?.name, "Atlas Updated");
    assert.equal(command?.programId, phoenixId);
    assert.equal(command?.priorityFamilyId, strategicId);
    assert.equal(command === undefined ? false : "priorityPosition" in command, false);
    assert.equal(command?.teamRequirements.length, 2);
    assert.equal(command?.teamRequirements[0]?.dailyCap === undefined, false);
    assert.equal(
      serializeQuantity(command!.teamRequirements[0]!.dailyCap!),
      "3/2",
    );
    assert.equal(input.error.hidden, true);
    assert.equal(input.error.textContent, "");
  });

  it("keeps select changes local until Apply and emits empty associations", () => {
    const commands: UpdateProjectCommand[] = [];
    const input = fixture((command) => {
      commands.push(command);
      return { ok: true };
    });
    input.controller.setProject(model());
    field(input.fields, "project.programId").value = "";
    field(input.fields, "project.priorityFamilyId").value = "";
    assert.equal(commands.length, 0);
    input.form.dispatch("submit", { preventDefault() {} });
    assert.equal(commands.length, 1);
    assert.equal(commands[0]!.programId, undefined);
    assert.equal(commands[0]!.priorityFamilyId, undefined);
  });
});
