import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectSnapshotActualsViewModel, buildReservationSnapshotActualsViewModel, createPlanningSession } from "../../application/index.js";
import { createCivilDate, createConsumedWorkload, createProject, createPortfolio, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createSnapshotActualsDraftStore } from "./snapshotActualsDraftStore.js";
import { parseSnapshotActualsCommand } from "./parseSnapshotActualsCommand.js";
import { createSnapshotActualsCardController } from "./createSnapshotActualsCardController.js";

type Listener = (event: { preventDefault?: () => void; shiftKey?: boolean; key?: string }) => void;
class FakeDocument {
  activeElement: FakeElement | undefined;
  createElement(tag: string): FakeElement { return new FakeElement(this, tag); }
  createTextNode(text: string): FakeElement { const node = this.createElement("#text"); node.textContent = text; return node; }
}
class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly attributes = new Map<string, string>();
  className = ""; textContent = ""; hidden = false; value = ""; type = ""; checked = false; disabled = false;
  constructor(readonly ownerDocument: FakeDocument, readonly tag: string) {}
  append(...items: FakeElement[]): void { this.children.push(...items); }
  replaceChildren(...items: FakeElement[]): void { this.children.splice(0, this.children.length, ...items); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>(); set.add(listener); this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string, options: { shiftKey?: boolean; key?: string } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {}, ...options });
  }
  focus(): void { this.ownerDocument.activeElement = this; }
}
const all = (root: FakeElement): FakeElement[] => [root, ...root.children.flatMap(all)];
function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("; "));
  return result.value;
}
const d = (text: string) => valid(createCivilDate(text));

test("current editor shows legacy and snapshot histories read-only, then applies only a confirmed whole draft", () => {
  const state = createDemoPlanningScenario();
  const project = state.portfolio.projects[0]!;
  const legacy = valid(createProject({ ...project, actuals: { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-01"), teams: project.requirements.map((row) => ({
      teamId: row.teamId, cumulativeConsumed: valid(createConsumedWorkload("1")), remainingWorkload: row.remainingWorkload })) },
  ] }, requirements: project.requirements.map((row) => ({ ...row, rafAuthority: "latest-actuals" as const })) }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? legacy : item) }));
  const session = createPlanningSession({ ...state, portfolio }, { today: () => d("2025-01-06") });
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const host = new FakeDocument().createElement("div");
  let applies = 0;
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply(command) {
      applies += 1; assert.equal(command.kind, "replace-project-actuals");
      return session.dispatch(command);
    } });
  assert.ok(all(host).some((node) => node.textContent === "Legacy V4 history (read only)"));
  assert.equal(all(host).some((node) => /Delete snapshot|Edit history/.test(node.textContent)), false);
  all(host).find((node) => node.textContent === "Reconcile legacy Actuals")!.emit("click");
  assert.equal(applies, 0);
  const form = all(host).find((node) => node.tag === "form")!;
  form.emit("submit");
  assert.equal(applies, 0);
  const draft = store.get(project.id)!;
  store.update(project.id, { ...draft, modal: { ...draft.modal!, step: 3,
    periods: [{ from: "2025-01-01", through: "2025-01-01", values: project.requirements.map((row) => ({
      teamId: row.teamId, text: "1", provenance: "user-entered" as const })) }],
    teams: draft.modal!.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) } });
  form.emit("submit");
  assert.equal(applies, 1);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 1);
  all(host).find((node) => node.textContent === "Cancel modal")!.emit("click");
  assert.equal(store.get(project.id)?.modal, undefined);
  controller.destroy();
});

test("Cancel restores an invalid card RAF exactly and the draft survives remount", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const document = new FakeDocument();
  const create = (host: FakeElement) => createSnapshotActualsCardController({ host: host as unknown as HTMLElement,
    model, store, onDraftChange() {}, conflict: () => undefined, onApply: (command) => session.dispatch(command) });
  const host = document.createElement("div");
  const first = create(host);
  const teamId = model.teams.find((team) => team.participating)!.teamId;
  const raf = all(host).find((node) => node.attributes.get("data-raf-team") === teamId)!;
  raf.value = "not a number"; raf.emit("input");
  assert.equal(store.get(id)!.teams.find((row) => row.teamId === teamId)?.raf, "not a number");
  all(host).find((node) => node.textContent === "Update actuals")!.emit("click");
  assert.equal(store.get(id)!.modal?.teams.find((row) => row.teamId === teamId)?.raf, "not a number");
  all(host).find((node) => node.textContent === "Cancel modal")!.emit("click");
  assert.equal(store.get(id)!.modal, undefined);
  assert.equal(store.get(id)!.teams.find((row) => row.teamId === teamId)?.raf, "not a number");
  first.destroy();
  const remounted = document.createElement("div");
  const second = create(remounted);
  assert.equal(all(remounted).find((node) => node.attributes.get("data-raf-team") === teamId)?.value, "not a number");
  second.destroy();
});

test("a differently written exact RAF stays a quick no-op", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const initialModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const base = createSnapshotActualsDraftStore().initialize(initialModel);
  const initial = parseSnapshotActualsCommand(initialModel, { ...base,
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) });
  assert.equal(initial.ok, true);
  if (initial.ok) assert.equal(session.dispatch(initial.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const host = new FakeDocument().createElement("div");
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply: (command) => session.dispatch(command) });
  const teamId = model.teams.find((team) => team.participating)!.teamId;
  const field = all(host).find((node) => node.attributes.get("data-raf-team") === teamId)!;
  field.value = "2/2"; field.emit("input");
  assert.equal(store.isDirty(id), false);
  assert.equal(all(host).some((node) => /^(Apply RAF|Revert RAF|Record initial RAF)$/.test(node.textContent)), false);
  controller.destroy();
});

test("card RAF is dirty until global Cancel, and global Apply revises current RAF without a snapshot", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const host = new FakeDocument().createElement("div");
  let intent = "";
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply(command) {
      intent = ("intent" in command ? command.intent.kind : command.kind);
      return session.dispatch(command);
    } });
  const field = all(host).find((node) => node.attributes.has("data-raf-team"))!;
  field.value = "7/3"; field.emit("input");
  assert.equal(store.isDirty(id), true);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots, undefined);
  controller.cancelCardRaf();
  assert.equal(store.isDirty(id), false);
  field.value = "7/3"; field.emit("input");
  assert.equal(synchronous(controller.applyCardRaf()).ok, true);
  assert.equal(intent, "update-project-current-raf");
  assert.equal(session.getState().portfolio.projects[0]?.snapshots, undefined);
  controller.destroy();
});

test("first Actuals opens at periods, date typing waits for a complete change, split date starts hidden", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const host = new FakeDocument().createElement("div");
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply: (command) => session.dispatch(command) });
  all(host).find((node) => node.textContent === "Update actuals")!.emit("click");
  assert.equal(store.get(id)?.modal?.step, 2);
  assert.equal(all(host).some((node) => node.textContent === "Create first Actuals period"), false);
  const from = all(host).find((node) => node.tag === "label" && node.textContent === "From")!.children[0]!;
  const original = store.get(id)!.modal!.periods;
  from.value = "0002-01-04"; from.emit("input"); from.emit("change");
  assert.equal(store.get(id)!.modal!.periods, original);
  assert.equal(all(host).find((node) => node.tag === "label" && node.textContent === "From")!.children[0], from);
  from.value = "2025-01-0"; from.emit("blur");
  assert.equal(store.get(id)!.modal!.periods, original);
  from.value = "2025-01-04"; from.emit("blur");
  assert.equal(store.get(id)!.modal!.periods[0]?.from, "2025-01-04");
  assert.equal(all(host).find((node) => node.attributes.get("aria-label")?.startsWith("Split "))?.hidden, true);
  all(host).find((node) => node.textContent === "Split at date")!.emit("click");
  assert.equal(all(host).find((node) => node.attributes.get("aria-label")?.startsWith("Split "))?.hidden, false);
  controller.destroy();
});

test("one-click contiguous selection renders only chosen rows with fixed external boundaries", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const initialModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const initial = createSnapshotActualsDraftStore().initialize(initialModel);
  const parsed = parseSnapshotActualsCommand(initialModel, { ...initial,
    periods: ["2025-01-01", "2025-01-02", "2025-01-03"].map((date) => ({ from: date, through: date,
      values: initial.teams.filter((team) => team.enabled).map((team) => ({ teamId: team.teamId, text: "0",
        provenance: "user-entered" as const })) })),
    teams: initial.teams.map((team) => team.enabled ? { ...team, raf: "1", rafConfirmed: true } : team) });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(session.dispatch(parsed.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const check = (selection: "before" | "after" | "single" | "multi") => {
    const host = new FakeDocument().createElement("div");
    const store = createSnapshotActualsDraftStore();
    const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
      onDraftChange() {}, conflict: () => undefined, onApply: (command) => session.dispatch(command) });
    all(host).find((node) => node.textContent === "Update actuals")!.emit("click");
    const tiles = () => all(host).filter((node) => node.className === "card-actuals-frieze-tile");
    assert.equal(all(host).some((node) => node.textContent === "Select through here"), false);
    assert.equal(all(host).some((node) => node.textContent === "Extend selection"), false);
    if (selection === "before") tiles()[0]!.emit("click");
    if (selection === "after") tiles()[4]!.emit("click");
    if (selection === "single" || selection === "multi") {
      tiles()[2]!.emit("click");
      if (selection === "multi") tiles()[3]!.emit("click");
    }
    assert.deepEqual(store.get(id)?.modal?.selection, selection === "before" || selection === "after" ? selection :
      selection === "single" ? { from: 1, through: 1 } : { from: 1, through: 2 });
    assert.equal(tiles().filter((node) => node.attributes.get("aria-selected") === "true").length,
      selection === "multi" ? 2 : 1);
    all(host).find((node) => node.textContent === "Next")!.emit("click");
    const matrix = all(host).find((node) => node.attributes.get("aria-label") === "Actuals Team by period matrix")!;
    const table = matrix.children[0]!;
    const rows = table.children.filter((node) => node.tag === "tr").slice(1);
    const date = (row: number, field: number) => rows[row]!.children[field]!.children[0]!.children[0]!;
    const consumed = (row: number) => rows[row]!.children[2]!.children[0]!.children[0]!;
    assert.equal(rows.length, selection === "multi" ? 2 : 1);
    if (selection === "before") {
      assert.equal(date(0, 0).disabled, false); assert.equal(date(0, 1).disabled, true);
      assert.equal(consumed(0).disabled, false);
    } else if (selection === "after") {
      assert.equal(date(0, 0).disabled, true); assert.equal(date(0, 1).disabled, false);
      assert.equal(consumed(0).disabled, false);
    } else {
      assert.equal(date(0, 0).disabled, true);
      assert.equal(date(selection === "single" ? 0 : 1, 1).disabled, true);
      assert.equal(consumed(0).disabled, false);
      if (selection === "multi") { assert.equal(consumed(1).disabled, false); assert.equal(date(0, 1).disabled, false); }
    }
    const merges = rows.map((row) => all(row).find((node) => node.textContent === "Merge with next")!);
    assert.equal(merges.filter((node) => !node.hidden).length, selection === "multi" ? 1 : 0);
    if (selection === "before" || selection === "after") {
      const changing = date(0, selection === "before" ? 0 : 1);
      changing.value = selection === "before" ? "2024-12-29" : "2025-01-06";
      changing.emit("blur");
      all(host).find((node) => node.textContent === "Split at date")!.emit("click");
      const splitDate = all(host).find((node) => node.attributes.get("aria-label")?.startsWith("Split "))!;
      splitDate.value = selection === "before" ? "2024-12-30" : "2025-01-05";
      all(host).find((node) => node.textContent === "Confirm split")!.emit("click");
      const splitRows = all(host).find((node) => node.attributes.get("aria-label") === "Actuals Team by period matrix")!
        .children[0]!.children.filter((node) => node.tag === "tr").slice(1);
      assert.equal(splitRows.length, 2);
      const splitDateField = (row: number, column: number) => splitRows[row]!.children[column]!.children[0]!.children[0]!;
      assert.equal(splitDateField(selection === "before" ? 1 : 0, selection === "before" ? 1 : 0).disabled, true);
      assert.equal(all(splitRows[0]!).find((node) => node.textContent === "Merge with next")?.hidden, false);
    }
    controller.destroy();
  };
  for (const selection of ["before", "after", "single", "multi"] as const) check(selection);
});

test("card RAF Apply uses command A after a snapshot and keeps the draft after failure", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const firstModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const first = createSnapshotActualsDraftStore().initialize(firstModel);
  const initial = parseSnapshotActualsCommand(firstModel, { ...first,
    periods: [{ from: "2025-01-04", through: "2025-01-04", values: first.teams.filter(row => row.enabled).map(row => ({ teamId: row.teamId, text: "0", provenance: "user-entered" as const })) }],
    teams: first.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const host = new FakeDocument().createElement("div");
  let reject = true;
  let intent = "";
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply(command) {
      intent = ("intent" in command ? command.intent.kind : command.kind);
      return reject ? { ok: false, errors: [{ code: "TEST_FAILURE", path: "raf", message: "Retry" }] }
        : session.dispatch(command);
    } });
  const field = all(host).find((node) => node.attributes.has("data-raf-team"))!;
  field.value = "7/3"; field.emit("input");
  assert.equal(synchronous(controller.applyCardRaf()).ok, false);
  assert.equal(intent, "update-project-current-raf");
  assert.equal(store.get(id)?.teams.some((row) => row.raf === "7/3"), true);
  assert.equal(session.getState().portfolio.projects[0]!.snapshots?.length, 1);
  reject = false;
  assert.equal(synchronous(controller.applyCardRaf()).ok, true);
  assert.equal(session.getState().portfolio.projects[0]!.snapshots?.length, 1);
  controller.destroy();
});

/** Characterization fixtures intentionally use the synchronous adapter. */
function synchronous<T>(value: T | Promise<T>): T {
  if (value instanceof Promise) throw new Error("Expected synchronous characterization adapter.");
  return value;
}

for (const text of ["2/2", "2/1"]) test(`V2 RAF typing cannot mint R1 confirmation: ${text}`, () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id, model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore(), base = store.initialize(model);
  const teams = base.teams.map(row => ({ ...row, raf: "1", rafConfirmed: false }));
  const periods = [{ from: "2025-01-04", through: "2025-01-04", values: teams.filter(row => row.enabled).map(row => ({ teamId: row.teamId, text: "1/3", provenance: "user-entered" as const })) }];
  store.update(id, { ...base, modal: { step: 3, selection: "initial", periods, teams, confirmed: false, retirementConfirmed: false, anchor: 0 } });
  const host = new FakeDocument().createElement("div");
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store, onDraftChange() {}, conflict: () => undefined, onApply: command => session.dispatch(command) });
  const label = all(host).find(node => node.tag === "label" && node.textContent.endsWith(" RAF (exact)"))!;
  label.children[0]!.value = text; label.children[0]!.emit("input");
  assert.equal(store.get(id)!.modal!.teams.find(row => row.teamId === teams.find(row => row.enabled)!.teamId)!.rafConfirmed, false);
  const parsed = parseSnapshotActualsCommand(model, { ...store.get(id)!, ...store.get(id)!.modal! }); assert.ok(parsed.ok);
  if (parsed.ok) assert.equal(session.dispatch(parsed.command).ok, false);
  controller.destroy();
});

test("11D.1 R3 initialization, focus, blur, modal Cancel and remount cannot confirm RAF", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore(); const document = new FakeDocument();
  const host = document.createElement("div"); let dispatches = 0;
  const mount = () => createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply(command) { dispatches++; return session.dispatch(command); } });
  let controller = mount();
  const before = session.getState();
  const raf = all(host).find(node => node.attributes.has("data-raf-team"))!;
  raf.focus(); raf.emit("blur"); raf.value = "1,25"; raf.emit("input");
  assert.equal(store.get(id)!.teams.find(row => row.teamId === raf.attributes.get("data-raf-team"))!.rafConfirmed, false);
  all(host).find(node => node.textContent === "Update actuals")!.emit("click");
  assert.equal(store.get(id)!.modal!.teams.some(row => row.rafConfirmed), false);
  all(host).find(node => node.tag === "div" && node.attributes.get("role") === "dialog")!.emit("keydown", { key: "Escape" });
  assert.equal(store.get(id)!.modal, undefined); assert.equal(raf.value, "1,25");
  controller.destroy(); host.replaceChildren(); controller = mount();
  assert.equal(all(host).find(node => node.attributes.has("data-raf-team"))!.value, "1,25");
  assert.equal(store.get(id)!.teams.some(row => row.rafConfirmed), false);
  assert.equal(dispatches, 0); assert.strictEqual(session.getState(), before);
  controller.destroy();
});

for (const kind of ["project", "reservation"] as const) test(`11D.1 compact ${kind} columns and empty membership have no fictitious consumption`, () => {
  const state = createDemoPlanningScenario();
  const model = kind === "project" ? buildProjectSnapshotActualsViewModel(state, state.portfolio.projects[0]!.id)!
    : buildReservationSnapshotActualsViewModel(state, state.portfolio.reservations[0]!.id)!;
  const document = new FakeDocument(), host = document.createElement("div");
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement,
    model: { ...model, teams: model.teams.map(row => ({ ...row, participating: false })) },
    store: createSnapshotActualsDraftStore(), onDraftChange() {}, conflict: () => undefined,
    onApply() { throw Error("Rendering cannot submit"); } });
  assert.equal(all(host).filter(node => node.tag === "th").length, kind === "project" ? 3 : 2);
  assert.equal(all(host).filter(node => node.tag === "td").length, 0);
  assert.ok(all(host).some(node => node.textContent === "No participating Teams."));
  assert.equal(all(host).filter(node => node.attributes.has("data-raf-team")).length, 0);
  controller.destroy();
});

test("11D.1 final Cancel clears abandoned RAF proofs/errors/base and preserves another RAM owner exactly", () => {
  const state = createDemoPlanningScenario(), [a, b] = state.portfolio.projects;
  assert.ok(a && b);
  const model = buildProjectSnapshotActualsViewModel(state, a.id)!;
  const store = createSnapshotActualsDraftStore(), opening = store.initialize(model);
  const other = store.initialize(buildProjectSnapshotActualsViewModel(state, b.id)!);
  store.update(b.id, { ...other, teams: other.teams.map((row, i) => i === 0 ? { ...row, raf: "1/" } : row), errors: ["Other error"] });
  const otherDraft = store.get(b.id)!;
  store.update(a.id, { ...opening, stale: true, confirmed: true, retirementConfirmed: true, errors: ["Abandoned error"],
    teams: opening.teams.map(row => row.enabled ? { ...row, raf: "2/3", rafConfirmed: true } : row) });
  const host = new FakeDocument().createElement("div"); let dispatches = 0;
  const controller = createSnapshotActualsCardController({ host: host as unknown as HTMLElement, model, store,
    onDraftChange() {}, conflict: () => undefined, onApply: () => { dispatches++; return { ok: true }; } });
  controller.cancelCardRaf();
  assert.deepEqual(store.get(a.id), opening);
  assert.strictEqual(store.get(b.id), otherDraft);
  assert.strictEqual(store.get(b.id)!.baseModel, otherDraft.baseModel);
  assert.strictEqual(store.get(b.id)!.model.currentBase, otherDraft.model.currentBase);
  assert.equal(store.isDirty(a.id), false); assert.equal(store.isDirty(b.id), true); assert.equal(dispatches, 0);
  controller.destroy();
  const remount = createSnapshotActualsCardController({ host: new FakeDocument().createElement("div") as unknown as HTMLElement,
    model, store, onDraftChange() {}, conflict: () => undefined, onApply: () => { dispatches++; return { ok: true }; } });
  assert.deepEqual(store.get(a.id), opening); assert.strictEqual(store.get(b.id), otherDraft); assert.equal(dispatches, 0);
  remount.destroy();
});
