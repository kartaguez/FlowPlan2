import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectActualsViewModel, buildReservationActualsViewModel, createPlanningSession } from "../../application/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "../../main/planning/createPlanningProjectionDispatcher.js";
import { serializeQuantity, type TeamId } from "../../domain/index.js";
import { createProjectDraftStore } from "../project-edit/projectDraftStore.js";
import { actualsForecastConflict } from "./actualsForecastConflict.js";
import { createActualsDraftStore, suggestedRafExact, updateConsumedSuggestion } from "./actualsDraftStore.js";
import { parseActualsCommand } from "./parseActualsCommand.js";
import { buildProjectEditViewModel } from "../../application/index.js";

const viewport = { width: 1000, teamLaneHeight: 100, teamHeaderHeight: 112, timeAxisHeight: 56 };

describe("10C Actuals workflow", () => {
  it("appends one-day first and later Project photos through the transactional dispatcher with exact RAF", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const id = session.getState().portfolio.projects[0]!.id;
    const model = buildProjectActualsViewModel(session.getState(), id)!;
    const store = createActualsDraftStore();
    let draft = store.initialize(model, "2025-01-04");
    const firstTeam = draft.teams[0]!;
    const changed = updateConsumedSuggestion(firstTeam, model.teams[0]!, "1/3");
    assert.equal(suggestedRafExact(model.teams[0]!, "1/3"), "164/3");
    draft = { ...draft, from: "2025-01-04", teams: [{ ...changed, raf: "5/3", rafEdited: true }, ...draft.teams.slice(1)] };
    const first = parseActualsCommand(model, draft);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.command.kind, "append-project-actuals");
    assert.equal(dispatcher.dispatch(first.command).ok, true);
    assert.equal(session.getState().portfolio.projects[0]!.actuals?.records.length, 1);
    assert.equal(serializeQuantity(session.getState().portfolio.projects[0]!.requirements[0]!.remainingWorkload), "5/3");
    const nextModel = buildProjectActualsViewModel(session.getState(), id)!;
    store.cancel(id);
    const later = store.initialize(nextModel, "2025-01-05");
    assert.equal(later.through, "2025-01-05");
    assert.equal(later.teams[0]?.consumedExact, "1/3");
    const secondTeam = updateConsumedSuggestion(later.teams[0]!, nextModel.teams[0]!, "2/3");
    assert.equal(secondTeam.rafExact, "4/3");
    const second = parseActualsCommand(nextModel, { ...later, teams: [secondTeam, ...later.teams.slice(1)] });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal("actualsFromDate" in second.command, false);
    assert.equal(dispatcher.dispatch(second.command).ok, true);
    assert.equal(session.getState().portfolio.projects[0]!.actuals?.records.length, 2);
    assert.equal(serializeQuantity(session.getState().portfolio.projects[0]!.actuals!.records[1]!.teams[0]!.cumulativeConsumed), "2/3");
    assert.ok(dispatcher.getProjection().actualsReconstruction.contributions.length > 0);
  });

  it("keeps Reservation forecast independent and preserves untouched exact thirds", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const id = session.getState().portfolio.reservations[0]!.id;
    const model = buildReservationActualsViewModel(session.getState(), id)!;
    const store = createActualsDraftStore();
    const initial = store.initialize(model, "2025-01-04");
    const first = parseActualsCommand(model, { ...initial, from: "2025-01-04",
      teams: [{ ...initial.teams[0]!, consumed: "1/3" }, ...initial.teams.slice(1)] });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const before = session.getState().portfolio.reservations[0]!.teamAllocations;
    assert.equal(session.dispatch(first.command).ok, true);
    assert.deepEqual(session.getState().portfolio.reservations[0]!.teamAllocations, before);
    const nextModel = buildReservationActualsViewModel(session.getState(), id)!;
    store.cancel(id);
    const later = store.initialize(nextModel, "2025-01-05");
    assert.equal(later.teams[0]!.consumedExact, "1/3");
    const second = parseActualsCommand(nextModel, later);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal("actualsFromDate" in second.command, false);
    assert.equal(session.dispatch(second.command).ok, true);
    assert.equal(serializeQuantity(session.getState().portfolio.reservations[0]!.actuals!.records[1]!.teams[0]!.cumulativeConsumed), "1/3");
  });

  it("blocks conflicting Forecast membership or current-configuration RAF while accepting independent edits", () => {
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

  it("rebases membership by TeamId and retains a manually entered RAF", () => {
    const state = createDemoPlanningScenario();
    const id = state.portfolio.projects[0]!.id;
    const model = buildProjectActualsViewModel(state, id)!;
    const store = createActualsDraftStore();
    const first = store.initialize(model, "2025-01-04");
    const manual = { ...first.teams[0]!, consumed: "2", raf: "7/3", rafEdited: true };
    store.update(id, { ...first, open: true, teams: [manual, first.teams[1]!] });
    const added = state.portfolio.teams[2]!.id as TeamId;
    store.rebase({ ...model, teams: [model.teams[0]!, { teamId: added, label: "Gamma",
      previousConsumedExact: "0/1", currentRafExact: "3/1", rafAuthority: "current-configuration" }] });
    const after = store.get(id)!;
    assert.equal(after.teams.length, 2);
    assert.equal(after.teams[0]?.raf, "7/3");
    assert.equal(after.teams[1]?.teamId, added);
    assert.equal(after.teams[1]?.unresolved, true);
    assert.equal(parseActualsCommand(after.model, { ...after, from: "2025-01-04" }).ok, false);
  });

  it("retains the draft, session and projection when V4 persistence fails", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const before = session.getState();
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport,
      backupStore: { read: () => null, write: () => { throw new Error("disk full"); } } });
    const priorProjection = dispatcher.getProjection();
    const id = before.portfolio.projects[0]!.id;
    const model = buildProjectActualsViewModel(before, id)!;
    const store = createActualsDraftStore();
    const draft = { ...store.initialize(model, "2025-01-04"), open: true, from: "2025-01-04" };
    store.update(id, draft);
    const parsed = parseActualsCommand(model, draft);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = dispatcher.dispatch(parsed.command);
    assert.equal(result.ok, false);
    assert.equal(session.getState(), before);
    assert.equal(dispatcher.getProjection(), priorProjection);
    assert.equal(store.get(id), draft);
  });

  it("saves an out-of-horizon photo without inventing a visible timeline segment", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const id = session.getState().portfolio.projects[0]!.id;
    const model = buildProjectActualsViewModel(session.getState(), id)!;
    const draft = createActualsDraftStore().initialize(model, "2026-01-01");
    const parsed = parseActualsCommand(model, { ...draft, from: "2026-01-01" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(dispatcher.dispatch(parsed.command).ok, true);
    assert.equal(session.getState().portfolio.projects[0]!.actuals?.records[0]?.actualsThroughDate, "2026-01-01");
    assert.equal(dispatcher.getProjection().viewModel.teams.some((team) =>
      team.actualsContributions?.some((item) => item.sourceId === id)), false);
  });
});
