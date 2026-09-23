import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  ReplaceTeamReservationsCommand,
  TeamReservationsEditViewModel,
} from "../../application/index.js";
import {
  createCivilDate,
  createReservationId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import type { ReservationEditControls } from "../renderApp.js";
import { createReservationEditController } from "./createReservationEditController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
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
  value = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...children: (FakeElement | string)[]): void {
    this.childNodes.push(...children.filter((item): item is FakeElement => item instanceof FakeElement));
  }
  prepend(...children: FakeElement[]): void { this.childNodes.unshift(...children); }
  replaceChildren(...children: FakeElement[]): void { this.childNodes = [...children]; }
  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }
  dispatch(type: string, event: { preventDefault?: () => void } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const teamId = must(createTeamId("team-alpha"));
const firstId = must(createReservationId("reservation-a"));
const addedId = must(createReservationId("reservation-new"));
const model: TeamReservationsEditViewModel = Object.freeze({
  teamId,
  teamLabel: "Team Alpha",
  reservations: Object.freeze([
    Object.freeze({
      reservationId: firstId,
      startDate: must(createCivilDate("2025-01-01")),
      endDate: must(createCivilDate("2025-01-31")),
      ratioPercent: "25",
    }),
  ]),
});

function fixture(onApply: (command: ReplaceTeamReservationsCommand) => { ok: true } | { ok: false; errors: readonly { code: string; path: string; message: string }[] } = () => ({ ok: true })) {
  const document = new FakeDocument();
  const form = document.createElement("form");
  const rows = document.createElement("div");
  const add = document.createElement("button");
  const apply = document.createElement("button");
  const cancel = document.createElement("button");
  const status = document.createElement("p");
  const error = document.createElement("p");
  error.hidden = true;
  const controller = createReservationEditController({
    controls: { form, rows, add, apply, cancel, status } as unknown as ReservationEditControls,
    errorContainer: error as unknown as HTMLElement,
    nextReservationId: () => addedId,
    onApply,
  });
  return { controller, form, rows, add, apply, cancel, status, error };
}

function descendants(root: FakeElement, tagName: string): FakeElement[] {
  return root.childNodes.flatMap((child) => [
    ...(child.tagName === tagName ? [child] : []),
    ...descendants(child, tagName),
  ]);
}

describe("ReservationEditController", () => {
  it("activates only for a team and renders exact existing reservations", () => {
    const input = fixture();
    assert.equal(input.apply.disabled, true);
    input.controller.setTeam(model);
    assert.equal(input.apply.disabled, false);
    assert.equal(input.rows.childNodes.length, 1);
    assert.deepEqual(descendants(input.rows, "input").map((item) => item.value), [
      "2025-01-01", "2025-01-31", "25",
    ]);
  });

  it("adds and removes rows locally, then Cancel restores without dispatch", () => {
    let dispatches = 0;
    const input = fixture(() => { dispatches += 1; return { ok: true }; });
    input.controller.setTeam(model);
    input.add.dispatch("click");
    assert.equal(input.rows.childNodes.length, 2);
    const firstRemove = descendants(input.rows, "button")[0]!;
    firstRemove.dispatch("click");
    assert.equal(input.rows.childNodes.length, 1);
    input.cancel.dispatch("click");
    assert.equal(input.rows.childNodes.length, 1);
    assert.equal(input.rows.childNodes[0]!.dataset.reservationId, firstId);
    assert.equal(dispatches, 0);
  });

  it("keeps dirty values on invalid Apply and emits one typed command on success", () => {
    const commands: ReplaceTeamReservationsCommand[] = [];
    const input = fixture((command) => { commands.push(command); return { ok: true }; });
    input.controller.setTeam(model);
    const fields = descendants(input.rows, "input");
    fields[2]!.value = "100/3";
    input.form.dispatch("submit", { preventDefault() {} });
    assert.equal(commands.length, 1);
    assert.equal(commands[0]!.kind, "replace-team-reservations");

    fields[2]!.value = "101";
    input.form.dispatch("submit", { preventDefault() {} });
    assert.equal(commands.length, 1);
    assert.equal(input.error.hidden, false);
    assert.equal(fields[2]!.value, "101");
  });
});
