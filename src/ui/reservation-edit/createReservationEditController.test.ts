import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationEditViewModel, UpdateReservationCommand } from "../../application/index.js";
import { createCivilDate, createReservationId, createTeamId, type DomainResult } from "../../domain/index.js";
import type { ReservationEditControls } from "../renderApp.js";
import { createReservationEditController } from "./createReservationEditController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
  createTextNode(): FakeElement { return new FakeElement(this, "#text"); }
}
class FakeElement {
  readonly listeners = new Map<string, Set<Listener>>(); readonly dataset: Record<string, string> = {}; childNodes: FakeElement[] = [];
  className = ""; textContent: string | null = null; hidden = false; disabled = false; checked = false; type = ""; value = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: (FakeElement | string)[]): void { this.childNodes.push(...children.filter((x): x is FakeElement => x instanceof FakeElement)); }
  prepend(...children: FakeElement[]): void { this.childNodes.unshift(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  setAttribute(): void {}
  addEventListener(type: string, listener: EventListener): void { const set = this.listeners.get(type) ?? new Set(); set.add(listener as Listener); this.listeners.set(type, set); }
  removeEventListener(type: string, listener: EventListener): void { this.listeners.get(type)?.delete(listener as Listener); }
  dispatch(type: string, event: { preventDefault?: () => void } = {}): void { for (const listener of this.listeners.get(type) ?? []) listener(event); }
}
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(); return result.value; }
const model: ReservationEditViewModel = Object.freeze({
  reservationId: must(createReservationId("run")), name: "Run", startDate: must(createCivilDate("2025-01-01")), endDate: must(createCivilDate("2025-01-31")),
  teamAllocations: Object.freeze([
    Object.freeze({ teamId: must(createTeamId("alpha")), teamLabel: "Team Alpha", enabled: true, kind: "ratio", value: "33.333", exact: "1/3" }),
    Object.freeze({ teamId: must(createTeamId("beta")), teamLabel: "Team Beta", enabled: false, kind: "ratio", value: "" }),
  ]),
});
function descendants(root: FakeElement, tag: string): FakeElement[] { return root.childNodes.flatMap((child) => [...(child.tagName === tag ? [child] : []), ...descendants(child, tag)]); }
function fixture(onApply: (command: UpdateReservationCommand) => { ok: true } | { ok: false; errors: readonly never[] } = () => ({ ok: true })) {
  const document = new FakeDocument(); const element = (tag: string) => document.createElement(tag);
  const controls = { container: element("section"), title: element("h3"), form: element("form"), fields: element("div"), apply: element("button"), cancel: element("button"), status: element("p") };
  const error = element("p"); error.hidden = true;
  const controller = createReservationEditController({ controls: controls as unknown as ReservationEditControls, errorContainer: error as unknown as HTMLElement, onApply });
  return { controller, controls, error };
}

describe("ReservationEditController", () => {
  it("retains a Team value across OFF then ON within one draft", () => {
    const input = fixture();
    input.controller.setReservation(model);
    const checkboxes = descendants(input.controls.fields, "input").filter((field) => field.type === "checkbox");
    const values = descendants(input.controls.fields, "input").filter((field) => field.type === "text");
    const first = checkboxes[0]!;
    const value = values[1]!;
    value.value = "40";
    first.checked = false;
    first.dispatch("change");
    first.checked = true;
    first.dispatch("change");
    assert.equal(value.value, "40");
  });
  it("hydrates global fields once and one accessible allocation row per team", () => {
    const input = fixture(); input.controller.setReservation(model);
    assert.equal(input.controls.apply.disabled, false);
    assert.equal(descendants(input.controls.fields, "fieldset").length, 2);
    assert.equal(descendants(input.controls.fields, "input").filter((field) => field.type === "date").length, 2);
  });
  it("applies one global command, preserves untouched exact input, and Cancel does not dispatch", () => {
    const commands: UpdateReservationCommand[] = []; const input = fixture((command) => { commands.push(command); return { ok: true }; });
    input.controller.setReservation(model); input.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(commands.length, 1); assert.equal(commands[0]!.kind, "update-reservation");
    input.controls.cancel.dispatch("click"); assert.equal(commands.length, 1);
  });
  it("clears value when allocation mode changes instead of converting it", () => {
    const input = fixture(); input.controller.setReservation(model);
    const select = descendants(input.controls.fields, "select")[0]!; const values = descendants(input.controls.fields, "input").filter((field) => field.type === "text");
    select.value = "fixed-daily"; select.dispatch("change"); assert.equal(values.at(-2)!.value, "");
  });
  it("shows a local error and does not dispatch reversed dates", () => {
    const commands: UpdateReservationCommand[] = [];
    const input = fixture((command) => { commands.push(command); return { ok: true }; });
    input.controller.setReservation(model);
    const dates = descendants(input.controls.fields, "input").filter((field) => field.type === "date");
    dates[0]!.value = "2025-03-01";
    dates[1]!.value = "2025-01-01";
    input.controls.form.dispatch("submit", { preventDefault() {} });
    assert.equal(commands.length, 0);
    assert.equal(input.error.hidden, false);
    assert.match(input.error.textContent ?? "", /end date must be on or after its start date/i);
  });
});
