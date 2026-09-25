import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TeamEditViewModel } from "../../application/index.js";
import { createCivilDate, createTeamId, serializeQuantity, type Capacity, type DomainResult,
  type UnavailabilityRatio } from "../../domain/index.js";
import type { TeamEditControls } from "../renderApp.js";
import { createTeamEditController } from "./createTeamEditController.js";

type Listener = (event: unknown) => void;
class FakeDocument { createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); } }
class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>();
  readonly dataset: Record<string, string> = {};
  childNodes: FakeElement[] = [];
  className = ""; textContent: string | null = null; hidden = false; disabled = false;
  type = ""; name = ""; value = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: (FakeElement | string)[]): void { this.childNodes.push(...children.filter((value): value is FakeElement => value instanceof FakeElement)); }
  prepend(...children: FakeElement[]): void { this.childNodes.unshift(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  focus(): void {}
  addEventListener(type: string, listener: EventListener): void { const set = this.listeners.get(type) ?? new Set<Listener>(); set.add(listener as Listener); this.listeners.set(type, set); }
  removeEventListener(type: string, listener: EventListener): void { this.listeners.get(type)?.delete(listener as Listener); }
  dispatch(type: string, event: object = {}): void { for (const listener of this.listeners.get(type) ?? []) listener(event); }
}
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const teamId = must(createTeamId("team-alpha"));
function model(): TeamEditViewModel { return Object.freeze({
  teamId, label: "Team Alpha", capacityPeriods: Object.freeze([
    Object.freeze({ index: 0, startDate: must(createCivilDate("2025-01-01")), endDate: must(createCivilDate("2025-01-31")), capacity: "0.333", capacityExact: "1/3", unavailabilityPercent: "33.333", unavailabilityExact: "1/3" }),
  ]),
}); }
function modelWithTwoPeriods(): TeamEditViewModel {
  return Object.freeze({ ...model(), capacityPeriods: Object.freeze([
    model().capacityPeriods[0]!,
    Object.freeze({ index: 1, startDate: must(createCivilDate("2025-02-01")),
      endDate: must(createCivilDate("2025-02-28")), capacity: "0.286",
      capacityExact: "2/7", unavailabilityPercent: "14.286",
      unavailabilityExact: "1/7" }),
  ]) });
}
function fixture(confirmDiscard = true) {
  const document = new FakeDocument();
  const element = (tag: string) => document.createElement(tag);
  const controls = {
    container: element("section"), title: element("h3"), status: element("p"),
    nameForm: element("form"), nameFields: element("div"), nameApply: element("button"),
    capacityDetails: element("details"), capacityForm: element("form"), capacityFields: element("div"),
    capacityAdd: element("button"),
    capacityApply: element("button"), capacityCancel: element("button"), close: element("button"),
    discard: element("button"), deleteButton: element("button"),
    deleteConfirmation: element("div"), deleteConfirm: element("button"), deleteCancel: element("button"),
  };
  const error = element("p"); error.hidden = true;
  const nameCommands: unknown[] = []; const periodCommands: unknown[] = []; const deleteIds: unknown[] = [];
  const controller = createTeamEditController({
    controls: controls as unknown as TeamEditControls,
    errorContainer: error as unknown as HTMLElement,
    onApplyName: (command) => { nameCommands.push(command); return { ok: true }; },
    onApplyPeriods: (command) => { periodCommands.push(command); return { ok: true }; },
    confirmDiscard: () => confirmDiscard,
    onDelete: (id) => { deleteIds.push(id); return { ok: false, reason: "draft", message: "Unapplied changes concern this Team." }; },
  });
  return { controls, error, controller, nameCommands, periodCommands, deleteIds };
}
function descendants(root: FakeElement): FakeElement[] { return root.childNodes.flatMap((child) => [child, ...descendants(child)]); }
function field(root: FakeElement, name: string): FakeElement { const found = descendants(root).find((item) => item.name === name); if (!found) throw new Error(`Missing ${name}`); return found; }

describe("TeamEditController", () => {
  it("opens a team modal with name and capacity only", () => {
    const input = fixture(); input.controller.setTeam(model());
    assert.equal(input.controls.container.hidden, false);
    assert.equal(field(input.controls.nameFields, "team.name").value, "Team Alpha");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value, "0.333");
    const names = descendants(input.controls.container).map((item) => item.name);
    assert.equal(names.some((name) => name.includes("workingPattern")), false);
    assert.equal(names.some((name) => name.includes("maxParallelProjects")), false);
  });

  it("dispatches name and capacity as independent transactions", () => {
    const input = fixture(); input.controller.setTeam(model());
    field(input.controls.nameFields, "team.name").value = "Alpha Renamed";
    input.controls.nameForm.dispatch("submit", { preventDefault() {} });
    assert.equal((input.nameCommands[0] as { kind: string }).kind, "update-team-name");
    assert.equal(input.periodCommands.length, 0);
    field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value = "1/3";
    input.controls.capacityForm.dispatch("submit", { preventDefault() {} });
    assert.equal((input.periodCommands[0] as { kind: string }).kind, "update-team-capacity-periods");
  });

  it("Cancel changes rehydrates local periods without dispatch", () => {
    const input = fixture(); input.controller.setTeam(model());
    field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value = "9";
    input.controls.capacityCancel.dispatch("click");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value, "0.333");
    assert.equal(input.periodCommands.length, 0);
  });

  it("tracks a deleted first period by reference and Applies the untouched following exact values", () => {
    const input = fixture(false);
    input.controller.setTeam(modelWithTwoPeriods());
    assert.equal(input.controller.hasUnappliedChanges(), false);
    descendants(input.controls.capacityFields).find((item) =>
      item.textContent === "Delete period")!.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), true);
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[1].capacity").value, "0.286");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[1].unavailability").value, "14.286");
    assert.equal(input.controller.requestClose(), false);
    assert.equal(input.controls.container.hidden, false);
    input.controller.setTeam(modelWithTwoPeriods());
    assert.equal(input.controller.hasUnappliedChanges(), true);
    input.controls.capacityForm.dispatch("submit", { preventDefault() {} });
    assert.equal(input.periodCommands.length, 1);
    const command = input.periodCommands[0] as {
      capacityPeriods: { startDate: string; endDate: string; capacity: Capacity;
        unavailability: UnavailabilityRatio }[];
    };
    assert.equal(command.capacityPeriods.length, 1);
    assert.equal(command.capacityPeriods[0]!.startDate, "2025-02-01");
    assert.equal(command.capacityPeriods[0]!.endDate, "2025-02-28");
    assert.equal(serializeQuantity(command.capacityPeriods[0]!.capacity), "2/7");
    assert.equal(serializeQuantity(command.capacityPeriods[0]!.unavailability), "1/7");
  });

  it("Cancel restores every persisted period and clears deletion dirty-state without dispatch", () => {
    const input = fixture(false);
    input.controller.setTeam(modelWithTwoPeriods());
    descendants(input.controls.capacityFields).find((item) =>
      item.textContent === "Delete period")!.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), true);
    input.controls.capacityCancel.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), false);
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value, "0.333");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[1].capacity").value, "0.286");
    assert.equal(input.periodCommands.length, 0);
    assert.equal(input.controller.requestClose(), true);
    assert.equal(input.controls.container.hidden, true);
  });

  it("Add is dirty and deleting only that new row restores a clean draft", () => {
    const input = fixture(false);
    input.controller.setTeam(modelWithTwoPeriods());
    input.controls.capacityAdd.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), true);
    assert.equal(input.controller.requestClose(), false);
    descendants(input.controls.capacityFields).filter((item) =>
      item.textContent === "Delete period").at(-1)!.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), false);
    assert.equal(input.controller.requestClose(), true);
  });

  it("keeps added and deleted rows local, then Cancel restores the persisted schedule", () => {
    const input = fixture(); input.controller.setTeam(model());
    input.controls.capacityAdd.dispatch("click");
    field(input.controls.capacityFields, "team.capacityPeriods[1].startDate").value = "invalid";
    const deleteButtons = descendants(input.controls.capacityFields).filter((item) =>
      item.textContent === "Delete period");
    deleteButtons[0]!.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), true);
    input.controls.capacityCancel.dispatch("click");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value, "0.333");
    assert.equal(descendants(input.controls.capacityFields).filter((item) =>
      item.textContent === "Delete period").length, 1);
    assert.equal(input.periodCommands.length, 0);
  });

  it("can Apply deletion of the last period as an empty schedule", () => {
    const input = fixture(); input.controller.setTeam(model());
    descendants(input.controls.capacityFields).find((item) =>
      item.textContent === "Delete period")!.dispatch("click");
    input.controls.capacityForm.dispatch("submit", { preventDefault() {} });
    assert.equal(input.periodCommands.length, 1);
    assert.deepEqual((input.periodCommands[0] as { capacityPeriods: unknown[] }).capacityPeriods, []);
  });

  it("parses an added period without rounding an untouched existing quantity", () => {
    const input = fixture(); input.controller.setTeam(model());
    input.controls.capacityAdd.dispatch("click");
    field(input.controls.capacityFields, "team.capacityPeriods[1].startDate").value = "2025-02-01";
    field(input.controls.capacityFields, "team.capacityPeriods[1].endDate").value = "2025-02-28";
    field(input.controls.capacityFields, "team.capacityPeriods[1].capacity").value = "2/3";
    input.controls.capacityForm.dispatch("submit", { preventDefault() {} });
    assert.equal(input.periodCommands.length, 1);
    const command = input.periodCommands[0] as { capacityPeriods: { capacity: unknown }[] };
    assert.equal(serializeQuantity(command.capacityPeriods[0]!.capacity as Capacity), "1/3");
    assert.equal(serializeQuantity(command.capacityPeriods[1]!.capacity as Capacity), "2/3");
  });

  it("retains invalid added rows after parsing refusal", () => {
    const input = fixture(); input.controller.setTeam(model());
    input.controls.capacityAdd.dispatch("click");
    field(input.controls.capacityFields, "team.capacityPeriods[1].startDate").value = "invalid";
    input.controls.capacityForm.dispatch("submit", { preventDefault() {} });
    assert.equal(input.periodCommands.length, 0);
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[1].startDate").value, "invalid");
    assert.equal(input.error.hidden, false);
  });
  it("preserves unapplied fields on a same-Team refresh and guards context changes", () => {
    const input = fixture(false); input.controller.setTeam(model());
    field(input.controls.nameFields, "team.name").value = "Local name";
    field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value = "2/3";
    input.controller.setTeam({ ...model(), label: "Remote name" });
    assert.equal(field(input.controls.nameFields, "team.name").value, "Local name");
    assert.equal(field(input.controls.capacityFields, "team.capacityPeriods[0].capacity").value, "2/3");
    assert.equal(input.controller.hasUnappliedChanges(), true);
    assert.equal(input.controller.requestClose(), false);
    assert.equal(input.controls.container.hidden, false);
    input.controls.discard.dispatch("click");
    assert.equal(input.controller.hasUnappliedChanges(), false);
    assert.equal(field(input.controls.nameFields, "team.name").value, "Remote name");
  });

  it("requires explicit deletion confirmation and distinguishes a local draft warning", () => {
    const input = fixture(); input.controller.setTeam(model());
    input.controls.deleteButton.dispatch("click");
    assert.equal(input.controls.deleteConfirmation.hidden, false);
    assert.equal(input.deleteIds.length, 0);
    input.controls.deleteConfirm.dispatch("click");
    assert.deepEqual(input.deleteIds, [teamId]);
    assert.match(input.error.textContent ?? "", /Unapplied changes/);
    assert.equal(input.controls.deleteConfirmation.hidden, true);
  });
});
