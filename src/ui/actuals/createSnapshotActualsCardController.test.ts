import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectSnapshotActualsViewModel, createPlanningSession } from "../../application/index.js";
import { createCivilDate, createConsumedWorkload, createProject, createPortfolio, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createSnapshotActualsDraftStore } from "./snapshotActualsDraftStore.js";
import { createSnapshotActualsCardController } from "./createSnapshotActualsCardController.js";

type Listener = (event: { preventDefault?: () => void }) => void;
class FakeDocument {
  activeElement: FakeElement | undefined;
  createElement(tag: string): FakeElement { return new FakeElement(this, tag); }
  createTextNode(text: string): FakeElement { const node = this.createElement("#text"); node.textContent = text; return node; }
}
class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly attributes = new Map<string, string>();
  className = ""; textContent = ""; hidden = false; value = ""; type = ""; checked = false;
  constructor(readonly ownerDocument: FakeDocument, readonly tag: string) {}
  append(...items: FakeElement[]): void { this.children.push(...items); }
  replaceChildren(...items: FakeElement[]): void { this.children.splice(0, this.children.length, ...items); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>(); set.add(listener); this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener): void { this.listeners.get(type)?.delete(listener); }
  emit(type: string): void { for (const listener of this.listeners.get(type) ?? []) listener({ preventDefault() {} }); }
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
  store.update(project.id, { ...draft, confirmed: true,
    teams: draft.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row) });
  form.emit("submit");
  assert.equal(applies, 1);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 1);
  all(host).find((node) => node.textContent === "Cancel Actuals")!.emit("click");
  assert.equal(store.get(project.id)?.open, false);
  controller.destroy();
});
