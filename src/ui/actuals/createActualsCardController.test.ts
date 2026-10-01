import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectActualsViewModel, createPlanningSession } from "../../application/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createCivilDate, consumedWorkloadFromSerialized, remainingWorkloadFromSerialized } from "../../domain/index.js";
import { createActualsDraftStore } from "./actualsDraftStore.js";
import { createActualsCardController } from "./createActualsCardController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  createElement(tag: string): FakeElement { return new FakeElement(this, tag); }
}
class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly attributes = new Map<string, string>();
  className = "";
  textContent = "";
  hidden = false;
  value = "";
  type = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tag: string) {}
  append(...items: FakeElement[]): void { this.children.push(...items); }
  replaceChildren(...items: FakeElement[]): void { this.children.splice(0, this.children.length, ...items); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>(); set.add(listener); this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {} }); }
  focus(): void {}
}
function all(root: FakeElement): FakeElement[] { return [root, ...root.children.flatMap(all)]; }

describe("Actuals card controller", () => {
  it("renders exact chronological history with no edit or delete control", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const project = session.getState().portfolio.projects[0]!;
    const date = createCivilDate("2025-01-04");
    const consumed = consumedWorkloadFromSerialized("1/3");
    const raf = remainingWorkloadFromSerialized("5/3");
    assert.ok(date.ok && consumed.ok && raf.ok);
    const teams = project.requirements.map((item) => ({ teamId: item.teamId,
      cumulativeConsumed: consumed.value, remainingWorkload: raf.value }));
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: project.id,
      actualsFromDate: date.value, record: { actualsThroughDate: date.value, teams } }).ok, true);
    const model = buildProjectActualsViewModel(session.getState(), project.id)!;
    const host = new FakeDocument().createElement("div");
    createActualsCardController({ host: host as unknown as HTMLElement, model,
      store: createActualsDraftStore(), proposedDate: "2025-01-05", onDraftChange() {},
      conflict: () => undefined, onApply: () => ({ ok: true }) });
    assert.ok(all(host).some((item) => item.textContent === "[2025-01-04, 2025-01-04]"));
    assert.ok(all(host).some((item) => item.textContent.includes("cumulative consumed 1/3; RAF 5/3")));
    assert.equal(all(host).some((item) => /Edit|Delete/.test(item.textContent)), false);
  });
  it("keeps history read-only and dispatches only after a separate Apply", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const id = session.getState().portfolio.projects[0]!.id;
    const model = buildProjectActualsViewModel(session.getState(), id)!;
    const document = new FakeDocument();
    const host = document.createElement("div");
    const store = createActualsDraftStore();
    let applies = 0;
    const controller = createActualsCardController({ host: host as unknown as HTMLElement,
      model, store, proposedDate: "2025-01-04", onDraftChange() {}, conflict: () => undefined,
      onApply(command) { applies += 1; assert.equal(command.kind, "append-project-actuals"); return { ok: true }; } });
    assert.equal(all(host).filter((item) => item.tag === "form").length, 1);
    assert.equal(all(host).filter((item) => item.tag === "input").length, 0);
    const toggle = all(host).find((item) => item.textContent === "New Actuals photo")!;
    toggle.emit("click");
    const inputs = all(host).filter((item) => item.tag === "input");
    assert.equal(inputs.length, 6);
    inputs[0]!.value = "2025-01-04";
    inputs[0]!.emit("input");
    assert.equal(applies, 0);
    const form = all(host).find((item) => item.tag === "form")!;
    form.emit("submit");
    assert.equal(applies, 1);
    const cancel = all(host).find((item) => item.textContent === "Cancel Actuals")!;
    cancel.emit("click");
    assert.equal(applies, 1);
    assert.equal(store.get(id)?.open, false);
    controller.destroy();
  });

  it("blocks local Forecast conflicts and retains the entered draft", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const model = buildProjectActualsViewModel(session.getState(), session.getState().portfolio.projects[0]!.id)!;
    const document = new FakeDocument();
    const host = document.createElement("div");
    const store = createActualsDraftStore();
    let applies = 0;
    createActualsCardController({ host: host as unknown as HTMLElement, model, store,
      proposedDate: "2025-01-04", onDraftChange() {}, conflict: () => "Apply or cancel Forecast changes first.",
      onApply() { applies += 1; return { ok: true }; } });
    all(host).find((item) => item.textContent === "New Actuals photo")!.emit("click");
    all(host).find((item) => item.tag === "form")!.emit("submit");
    assert.equal(applies, 0);
    assert.equal(store.get(model.id)?.open, true);
    assert.match(store.get(model.id)?.errors.join(" ") ?? "", /Forecast changes/);
  });

  it("retains typed values and marks a field after Domain rejection", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const model = buildProjectActualsViewModel(session.getState(), session.getState().portfolio.projects[0]!.id)!;
    const host = new FakeDocument().createElement("div");
    const store = createActualsDraftStore();
    createActualsCardController({ host: host as unknown as HTMLElement, model, store,
      proposedDate: "2025-01-04", onDraftChange() {}, conflict: () => undefined,
      onApply: () => ({ ok: false, errors: [{ code: "ACTUALS_DATE_NOT_INCREASING",
        path: "records[0].actualsThroughDate", message: "Later through dates must strictly increase." }] }) });
    all(host).find((item) => item.textContent === "New Actuals photo")!.emit("click");
    const from = all(host).find((item) => item.tag === "input" && item.type === "date")!;
    from.value = "2025-01-04";
    from.emit("input");
    all(host).find((item) => item.tag === "form")!.emit("submit");
    assert.equal(store.get(model.id)?.from, "2025-01-04");
    assert.equal(store.get(model.id)?.open, true);
    assert.match(store.get(model.id)?.errors.join(" ") ?? "", /strictly increase/);
    assert.equal(all(host).find((item) => item.attributes.get("aria-invalid") === "true")?.type, "date");
  });
});
