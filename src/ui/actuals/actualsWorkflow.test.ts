import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectSnapshotActualsViewModel, buildReservationSnapshotActualsViewModel, createPlanningSession,
  buildProjectEditViewModel } from "../../application/index.js";
import { createCivilDate, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/synchronousPlanningDispatcher.fixture.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { createProjectDraftStore } from "../project-edit/projectDraftStore.js";
import { actualsForecastConflict } from "./actualsForecastConflict.js";
import { createSnapshotActualsDraftStore } from "./snapshotActualsDraftStore.js";
import { parseSnapshotActualsCommand } from "./parseSnapshotActualsCommand.js";

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("; "));
  return result.value;
}
const d = (text: string) => valid(createCivilDate(text));
const viewport = { width: 1000, teamLaneHeight: 100, teamHeaderHeight: 112, timeAxisHeight: 56 };

test("Project matrix draft applies one exact V5 snapshot and Cancel stays local", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const draft = store.initialize(model);
  assert.equal(draft.baseVersion, 0);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots, undefined);
  const edited = { ...draft, open: true, confirmed: true,
    teams: draft.teams.map((row) => row.enabled ? { ...row, raf: "5/3", rafConfirmed: true } : row),
    periods: [{ from: "2025-01-04", through: "2025-01-04",
      values: draft.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "1/3" : "", provenance: row.enabled ? "user-entered" as const : "needs-confirmation" as const })) }] };
  store.update(project.id, edited);
  assert.equal(store.isDirty(project.id), true);
  const parsed = parseSnapshotActualsCommand(model, edited);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(dispatcher.dispatch(parsed.command).ok, true);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 1);
  assert.equal(serializeQuantity(session.getState().portfolio.projects[0]!.requirements[0]!.remainingWorkload), "5/3");
  store.cancel(project.id);
  assert.equal(store.get(project.id), undefined);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 1);
});

test("Reservation matrix keeps Forecast allocation and exact thirds", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const reservation = session.getState().portfolio.reservations[0]!;
  const before = reservation.teamAllocations;
  const model = buildReservationSnapshotActualsViewModel(session.getState(), reservation.id)!;
  const store = createSnapshotActualsDraftStore();
  const draft = store.initialize(model);
  const edited = { ...draft, confirmed: true, periods: [{ from: "2025-01-04", through: "2025-01-04",
    values: draft.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "1/3" : "", provenance: row.enabled ? "user-entered" as const : "needs-confirmation" as const })) }] };
  const parsed = parseSnapshotActualsCommand(model, edited);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(session.dispatch(parsed.command).ok, true);
  assert.deepEqual(session.getState().portfolio.reservations[0]!.teamAllocations, before);
  assert.equal(serializeQuantity(session.getState().portfolio.reservations[0]!.snapshots![0]!.coverage!.periods[0]!.consumed[0]!.amount), "1/3");
});

test("a concurrent snapshot with the same RAF edit rebases safely", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const draft = { ...base, open: true, confirmed: true, teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) };
  store.update(project.id, draft);
  const parsed = parseSnapshotActualsCommand(model, draft);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const result = session.dispatch(parsed.command);
  assert.equal(result.ok, true, JSON.stringify(result));
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  assert.equal(store.get(project.id)?.stale, false);
  assert.equal(store.get(project.id)?.baseVersion, 0);
});

test("draft rebases disjoint RAF edits with exact values", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const firstModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const firstStore = createSnapshotActualsDraftStore();
  const first = firstStore.initialize(firstModel);
  const initial = parseSnapshotActualsCommand(firstModel, { ...first, confirmed: true,
    teams: first.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const enabled = base.teams.filter((row) => row.enabled);
  assert.ok(enabled.length >= 2);
  store.update(project.id, { ...base, open: true, confirmed: true,
    teams: base.teams.map((row) => row.teamId === enabled[0]!.teamId ? { ...row, raf: "2", rafConfirmed: true } : row) });
  const remote = parseSnapshotActualsCommand(model, { ...base, confirmed: true,
    teams: base.teams.map((row) => row.teamId === enabled[1]!.teamId ? { ...row, raf: "3", rafConfirmed: true } : row) });
  assert.equal(remote.ok, true);
  if (!remote.ok) return;
  assert.equal(session.dispatch(remote.command).ok, true);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  const rebased = store.get(project.id)!;
  assert.equal(rebased.stale, false);
  assert.equal(rebased.baseVersion, 0);
  assert.equal(rebased.teams.find((row) => row.teamId === enabled[0]!.teamId)?.raf, "2");
  assert.equal(rebased.teams.find((row) => row.teamId === enabled[1]!.teamId)?.raf, "3/1");
  assert.equal(rebased.confirmed, false);
});

test("an open RAF modal waits for explicit review before a safe three-way rebase", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const initialModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const initialBase = createSnapshotActualsDraftStore().initialize(initialModel);
  const initial = parseSnapshotActualsCommand(initialModel, { ...initialBase,
    teams: initialBase.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const enabled = base.teams.filter((row) => row.enabled);
  assert.ok(enabled.length >= 2);
  const modalTeams = base.teams.map((row) => row.teamId === enabled[0]!.teamId ? { ...row, raf: "2" } : row);
  store.update(id, { ...base, modal: { step: 3, selection: "initial", anchor: 0,
    periods: base.periods, teams: modalTeams, confirmed: false, retirementConfirmed: false } });
  const remote = parseSnapshotActualsCommand(model, { ...base,
    teams: base.teams.map((row) => row.teamId === enabled[1]!.teamId ?
      { ...row, raf: "3", rafConfirmed: true } : row) });
  assert.equal(remote.ok, true);
  if (!remote.ok) return;
  assert.equal(session.dispatch(remote.command).ok, true);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), id)!);
  assert.equal(store.get(id)?.stale, true);
  assert.equal(store.get(id)?.modal?.teams.find((row) => row.teamId === enabled[0]!.teamId)?.raf, "2");
  assert.equal(store.review(id), true);
  assert.equal(store.get(id)?.stale, false);
  assert.equal(store.get(id)?.baseVersion, 0);
  assert.equal(store.get(id)?.modal?.teams.find((row) => row.teamId === enabled[0]!.teamId)?.raf, "2");
  assert.equal(store.get(id)?.modal?.teams.find((row) => row.teamId === enabled[1]!.teamId)?.raf, "3/1");
});

test("zero-only Project zone repartitions without re-entering zero in each new cell", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const initial = parseSnapshotActualsCommand(model, { ...base, confirmed: true,
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row),
    periods: [{ from: "2025-01-04", through: "2025-01-05",
      values: base.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "0" : "", provenance: row.enabled ? "user-entered" as const : "needs-confirmation" as const })) }] });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const nextBase = createSnapshotActualsDraftStore().initialize(nextModel);
  const changed = parseSnapshotActualsCommand(nextModel, { ...nextBase, confirmed: true,
    teams: nextBase.teams.map(row => ({ ...row, rafConfirmed: true })),
    periods: ["2025-01-04", "2025-01-05"].map((date) => ({ from: date, through: date,
      values: nextBase.teams.map((row) => ({ teamId: row.teamId, text: "" })) })) });
  assert.equal(changed.ok, true);
  if (!changed.ok) return;
  assert.equal(session.dispatch(changed.command).ok, true);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 2);
});

test("Team retirement and tail erosion submit one atomic replacement", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const base = createSnapshotActualsDraftStore().initialize(model);
  const initial = parseSnapshotActualsCommand(model, { ...base, confirmed: true,
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row),
    periods: ["2025-01-04", "2025-01-05"].map((date) => ({ from: date, through: date,
      values: base.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "0" : "", provenance: row.enabled ? "user-entered" as const : "needs-confirmation" as const })) })) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const nextBase = createSnapshotActualsDraftStore().initialize(nextModel);
  const retire = nextBase.teams.find((row) => row.enabled)!;
  const edited = { ...nextBase, confirmed: true, retirementConfirmed: true,
    teams: nextBase.teams.map((row) => row.teamId === retire.teamId ? { ...row, enabled: false } :
      row.enabled ? { ...row, rafConfirmed: true } : row),
    periods: nextBase.periods.slice(0, 1) };
  const parsed = parseSnapshotActualsCommand(nextModel, edited);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.command.intent.kind, "replace");
  const result = session.dispatch(parsed.command);
  assert.equal(result.ok, true, JSON.stringify(result));
  const current = session.getState().portfolio.projects[0]!.snapshots!.at(-1)!;
  assert.equal(current.coverage?.actualsThrough, d("2025-01-04"));
  assert.equal(current.retiredZeroTeams.includes(retire.teamId), true);
});

test("projection and V5 persistence failure roll back the whole draft candidate", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const before = session.getState();
  const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport,
    backupStore: { read: () => null, write: () => { throw new Error("disk full"); } } });
  const previousProjection = dispatcher.getProjection();
  const project = before.portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(before, project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const draft = { ...base, open: true, confirmed: true, teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) };
  store.update(project.id, draft);
  const parsed = parseSnapshotActualsCommand(model, draft);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(dispatcher.dispatch(parsed.command).ok, false);
  assert.equal(session.getState(), before);
  assert.equal(dispatcher.getProjection(), previousProjection);
  assert.equal(store.get(project.id), draft);
});

test("projection failure leaves both snapshot version and published projection unchanged", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const before = session.getState();
  let calls = 0;
  const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport,
    buildProjection(input) { if (++calls > 1) throw new Error("projection failed");
      return buildPlanningSessionProjection(input); } });
  const projection = dispatcher.getProjection();
  const project = before.portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(before, project.id)!;
  const draft = createSnapshotActualsDraftStore().initialize(model);
  const command = parseSnapshotActualsCommand(model, { ...draft, confirmed: true,
    teams: draft.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row) });
  assert.equal(command.ok, true);
  if (!command.ok) return;
  assert.equal(dispatcher.dispatch(command.command).ok, false);
  assert.equal(session.getState(), before);
  assert.equal(dispatcher.getProjection(), projection);
});

test("independent Forecast text remains separate, while Team and RAF changes need sequencing", () => {
  const state = createDemoPlanningScenario();
  const id = state.portfolio.projects[0]!.id;
  const model = buildProjectEditViewModel(state, id)!;
  const store = createProjectDraftStore();
  const draft = store.initialize(id, model);
  store.update(id, { ...draft.values, name: "Independent" });
  assert.equal(actualsForecastConflict(store.get(id)), undefined);
  store.update(id, { ...draft.values, teams: [{ ...draft.values.teams[0]!, enabled: false }, ...draft.values.teams.slice(1)] });
  assert.match(actualsForecastConflict(store.get(id))!, /Forecast Team/);
  store.update(id, { ...draft.values, teams: [{ ...draft.values.teams[0]!, remainingWorkload: "99" }, ...draft.values.teams.slice(1)] });
  assert.match(actualsForecastConflict(store.get(id))!, /Forecast RAF/);
});

test("first Project RAF revises requirements, then exact no-op keeps Actuals absent", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const initial = { ...base, teams: base.teams.map((row) => row.enabled ?
    { ...row, raf: "1", rafConfirmed: true } : row) };
  const first = parseSnapshotActualsCommand(model, initial);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.command.intent.kind, "initial");
  assert.equal(first.command.current.coverage, undefined);
  assert.equal(session.dispatch(first.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const fresh = createSnapshotActualsDraftStore().initialize(nextModel);
  const equivalent = { ...fresh, teams: fresh.teams.map((row) => row.enabled ?
    { ...row, raf: "2/2", rafConfirmed: true } : row) };
  assert.equal(createSnapshotActualsDraftStore().initialize(nextModel).baseVersion, 0);
  const parsed = parseSnapshotActualsCommand(nextModel, equivalent);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.command.intent.kind, "initial");
  assert.equal(session.dispatch(parsed.command).ok, true);
  assert.equal(session.getState().portfolio.projects[0]!.snapshots, undefined);
});

test("changed nonzero cells need their own evidence and are never prorated by a split", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const id = session.getState().portfolio.projects[0]!.id;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const base = createSnapshotActualsDraftStore().initialize(model);
  const initial = parseSnapshotActualsCommand(model, { ...base,
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1", rafConfirmed: true } : row),
    periods: [{ from: "2025-01-04", through: "2025-01-05", values: base.teams.filter((row) => row.enabled)
      .map((row) => ({ teamId: row.teamId, text: "1", provenance: "user-entered" as const })) }] });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), id)!;
  const next = createSnapshotActualsDraftStore().initialize(nextModel);
  const split = ["2025-01-04", "2025-01-05"].map((date) => ({ from: date, through: date,
    values: next.teams.filter((row) => row.enabled).map((row) => ({ teamId: row.teamId,
      text: "1", provenance: "needs-confirmation" as const })) }));
  const unconfirmed = parseSnapshotActualsCommand(nextModel, { ...next, periods: split });
  assert.equal(unconfirmed.ok, true);
  if (!unconfirmed.ok) return;
  assert.equal(unconfirmed.command.evidence.consumedCells.length, 0);
  const refusal = session.dispatch(unconfirmed.command);
  assert.equal(refusal.ok, false);
  if (!refusal.ok) assert.ok(refusal.errors.some((error) => error.code === "ACTUALS_VALUE_UNCONFIRMED"));
  assert.equal(session.getState().portfolio.projects[0]!.snapshots!.length, 1);
  const confirmed = parseSnapshotActualsCommand(nextModel, { ...next, teams: next.teams.map(row => ({ ...row, rafConfirmed: true })), periods: split.map((period) => ({ ...period,
    values: period.values.map((row) => ({ ...row, text: "1/2", provenance: "user-entered" as const })) })) });
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.equal(confirmed.command.evidence.consumedCells.length, 2 * next.teams.filter((row) => row.enabled).length);
  assert.equal(session.dispatch(confirmed.command).ok, true);
});
