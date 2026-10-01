import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectSnapshotActualsViewModel, buildReservationSnapshotActualsViewModel, createPlanningSession,
  buildProjectEditViewModel } from "../../application/index.js";
import { createCivilDate, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
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
    teams: draft.teams.map((row) => row.enabled ? { ...row, raf: "5/3" } : row),
    periods: [{ from: "2025-01-04", through: "2025-01-04",
      values: draft.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "1/3" : "" })) }] };
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
    values: draft.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "1/3" : "" })) }] };
  const parsed = parseSnapshotActualsCommand(model, edited);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(session.dispatch(parsed.command).ok, true);
  assert.deepEqual(session.getState().portfolio.reservations[0]!.teamAllocations, before);
  assert.equal(serializeQuantity(session.getState().portfolio.reservations[0]!.snapshots![0]!.coverage!.periods[0]!.consumed[0]!.amount), "1/3");
});

test("partition edits remain stale after a concurrent snapshot, without merging two edits", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const draft = { ...base, open: true, confirmed: true, teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row) };
  store.update(project.id, draft);
  const parsed = parseSnapshotActualsCommand(model, draft);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(session.dispatch(parsed.command).ok, true);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  assert.equal(store.get(project.id)?.stale, true);
  assert.equal(parseSnapshotActualsCommand(store.get(project.id)!.model, store.get(project.id)!).ok, false);
});

test("draft rebases disjoint RAF edits but reports a conflicting partition", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const firstModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const firstStore = createSnapshotActualsDraftStore();
  const first = firstStore.initialize(firstModel);
  const initial = parseSnapshotActualsCommand(firstModel, { ...first, confirmed: true,
    teams: first.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const enabled = base.teams.filter((row) => row.enabled);
  assert.ok(enabled.length >= 2);
  store.update(project.id, { ...base, open: true, confirmed: true,
    teams: base.teams.map((row) => row.teamId === enabled[0]!.teamId ? { ...row, raf: "2" } : row) });
  const remote = parseSnapshotActualsCommand(model, { ...base, confirmed: true,
    teams: base.teams.map((row) => row.teamId === enabled[1]!.teamId ? { ...row, raf: "3" } : row) });
  assert.equal(remote.ok, true);
  if (!remote.ok) return;
  assert.equal(session.dispatch(remote.command).ok, true);
  store.rebase(buildProjectSnapshotActualsViewModel(session.getState(), project.id)!);
  const rebased = store.get(project.id)!;
  assert.equal(rebased.stale, false);
  assert.equal(rebased.baseVersion, 2);
  assert.equal(rebased.teams.find((row) => row.teamId === enabled[0]!.teamId)?.raf, "2");
  assert.equal(rebased.teams.find((row) => row.teamId === enabled[1]!.teamId)?.raf, "3/1");
  assert.equal(rebased.confirmed, false);
});

test("zero-only Project zone repartitions without re-entering zero in each new cell", () => {
  const session = createPlanningSession(createDemoPlanningScenario(), { today: () => d("2025-01-06") });
  const project = session.getState().portfolio.projects[0]!;
  const model = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const store = createSnapshotActualsDraftStore();
  const base = store.initialize(model);
  const initial = parseSnapshotActualsCommand(model, { ...base, confirmed: true,
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row),
    periods: [{ from: "2025-01-04", through: "2025-01-05",
      values: base.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "0" : "" })) }] });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const nextBase = createSnapshotActualsDraftStore().initialize(nextModel);
  const changed = parseSnapshotActualsCommand(nextModel, { ...nextBase, confirmed: true,
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
    teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row),
    periods: ["2025-01-04", "2025-01-05"].map((date) => ({ from: date, through: date,
      values: base.teams.map((row) => ({ teamId: row.teamId, text: row.enabled ? "0" : "" })) })) });
  assert.equal(initial.ok, true);
  if (!initial.ok) return;
  assert.equal(session.dispatch(initial.command).ok, true);
  const nextModel = buildProjectSnapshotActualsViewModel(session.getState(), project.id)!;
  const nextBase = createSnapshotActualsDraftStore().initialize(nextModel);
  const retire = nextBase.teams.find((row) => row.enabled)!;
  const edited = { ...nextBase, confirmed: true, retirementConfirmed: true,
    teams: nextBase.teams.map((row) => row.teamId === retire.teamId ? { ...row, enabled: false } : row),
    periods: nextBase.periods.slice(0, 1) };
  const parsed = parseSnapshotActualsCommand(nextModel, edited);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.command.intent.kind, "replace");
  assert.equal(session.dispatch(parsed.command).ok, true);
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
  const draft = { ...base, open: true, confirmed: true, teams: base.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row) };
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
    teams: draft.teams.map((row) => row.enabled ? { ...row, raf: "1" } : row) });
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
