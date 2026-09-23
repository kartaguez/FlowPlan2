import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  TeamEditViewModel,
  UpdateTeamCommand,
} from "../../application/index.js";
import {
  createCivilDate,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import type { TeamEditControls } from "../renderApp.js";
import { createTeamEditController } from "./createTeamEditController.js";

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
  checked = false;
  type = "";
  name = "";
  value = "";
  min = "";
  step = "";

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  append(...children: (FakeElement | string)[]): void {
    this.childNodes.push(
      ...children.filter((child): child is FakeElement => child instanceof FakeElement),
    );
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

const teamId = must(createTeamId("team-alpha"));

function model(label = "Team Alpha"): TeamEditViewModel {
  return Object.freeze({
    teamId,
    label,
    maxParallelProjects: 2,
    workingWeekdays: Object.freeze([1, 2, 3, 4, 5] as const),
    capacityPeriods: Object.freeze([
      Object.freeze({
        index: 0,
        startDate: must(createCivilDate("2025-01-01")),
        endDate: must(createCivilDate("2025-01-31")),
        capacity: "3/1",
        unavailabilityPercent: "0",
      }),
      Object.freeze({
        index: 1,
        startDate: must(createCivilDate("2025-02-01")),
        endDate: must(createCivilDate("2025-03-31")),
        capacity: "5/2",
        unavailabilityPercent: "25",
      }),
    ]),
  });
}

function fixture(
  onApply: (
    command: UpdateTeamCommand,
  ) =>
    | { readonly ok: true }
    | {
        readonly ok: false;
        readonly errors: readonly {
          code: string;
          path: string;
          message: string;
        }[];
      } = () => ({ ok: true }),
) {
  const document = new FakeDocument();
  const form = document.createElement("form");
  const fields = document.createElement("div");
  const apply = document.createElement("button");
  const cancel = document.createElement("button");
  const status = document.createElement("p");
  const error = document.createElement("p");
  error.hidden = true;
  const controller = createTeamEditController({
    controls: { form, fields, apply, cancel, status } as unknown as TeamEditControls,
    errorContainer: error as unknown as HTMLElement,
    onApply,
  });
  return { form, fields, apply, cancel, status, error, controller };
}

function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

function field(root: FakeElement, name: string): FakeElement {
  const result = descendants(root).find((element) => element.name === name);
  if (!result) throw new Error(`Missing field ${name}`);
  return result;
}

describe("TeamEditController", () => {
  it("renders team-global settings, seven weekdays, and existing periods only", () => {
    const input = fixture();
    input.controller.setTeam(model());
    const elements = descendants(input.fields);
    assert.equal(field(input.fields, "team.name").value, "Team Alpha");
    assert.equal(field(input.fields, "team.maxParallelProjects").value, "2");
    assert.equal(
      elements.filter((element) => element.name.startsWith("team.workingPattern.")).length,
      7,
    );
    assert.equal(
      elements.filter((element) => element.name.endsWith(".capacity")).length,
      2,
    );
    assert.equal(
      elements.filter((element) => element.name.endsWith(".unavailability")).length,
      2,
    );
    assert.equal(input.apply.disabled, false);
  });

  it("disables and clears the form without a team selection", () => {
    const input = fixture();
    input.controller.setTeam(model());
    input.controller.setTeam(undefined);
    assert.equal(input.fields.childNodes.length, 0);
    assert.equal(input.apply.disabled, true);
    assert.equal(input.cancel.disabled, true);
  });

  it("Cancel restores all local fields without dispatch", () => {
    let applyCount = 0;
    const input = fixture(() => {
      applyCount += 1;
      return { ok: true };
    });
    input.controller.setTeam(model());
    field(input.fields, "team.name").value = "Dirty";
    field(input.fields, "team.maxParallelProjects").value = "9";
    field(input.fields, "team.capacityPeriods[0].capacity").value = "99";
    input.cancel.dispatch("click");
    assert.equal(field(input.fields, "team.name").value, "Team Alpha");
    assert.equal(field(input.fields, "team.maxParallelProjects").value, "2");
    assert.equal(field(input.fields, "team.capacityPeriods[0].capacity").value, "3/1");
    assert.equal(applyCount, 0);
  });

  it("keeps dirty values and reports an invalid atomic form", () => {
    let applyCount = 0;
    const input = fixture(() => {
      applyCount += 1;
      return { ok: true };
    });
    input.controller.setTeam(model());
    field(input.fields, "team.name").value = "Alpha Dirty";
    field(input.fields, "team.capacityPeriods[0].capacity").value = "bad";
    input.form.dispatch("submit", { preventDefault() {} });
    assert.equal(applyCount, 0);
    assert.equal(field(input.fields, "team.name").value, "Alpha Dirty");
    assert.equal(field(input.fields, "team.capacityPeriods[0].capacity").value, "bad");
    assert.equal(input.error.hidden, false);
    assert.match(input.error.textContent ?? "", /capacity/);
  });

  it("emits one typed update-team command and clears stale errors", () => {
    let command: UpdateTeamCommand | undefined;
    const input = fixture((candidate) => {
      command = candidate;
      return { ok: true };
    });
    input.controller.setTeam(model());
    input.error.hidden = false;
    input.error.textContent = "Old";
    field(input.fields, "team.name").value = "Alpha Updated";
    field(input.fields, "team.capacityPeriods[1].unavailability").value = "50";
    input.form.dispatch("submit", { preventDefault() {} });
    assert.equal(command?.kind, "update-team");
    assert.equal(command?.name, "Alpha Updated");
    assert.equal(command?.capacityPeriods.length, 2);
    assert.equal(input.error.hidden, true);
  });
});
