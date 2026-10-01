import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectActualsViewModel, buildReservationActualsViewModel } from "../../application/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createActualsDraftStore, updateConsumedSuggestion } from "./actualsDraftStore.js";

const state = createDemoPlanningScenario();
const project = buildProjectActualsViewModel(state, state.portfolio.projects[0]!.id)!;
const reservation = buildReservationActualsViewModel(state, state.portfolio.reservations[0]!.id)!;

describe("Actuals draft dirty baseline", () => {
  for (const model of [project, reservation]) {
    it(`${model.kind} stays pristine when opened or closed, and tracks edits and Cancel`, () => {
      const store = createActualsDraftStore();
      const initial = store.initialize(model, "2025-01-04");
      assert.equal(store.isDirty(model.id), false);
      store.update(model.id, { ...initial, open: true });
      assert.equal(store.isDirty(model.id), false);
      store.update(model.id, { ...store.get(model.id)!, open: false });
      assert.equal(store.isDirty(model.id), false);
      store.update(model.id, { ...initial, through: "2025-01-05" });
      assert.equal(store.isDirty(model.id), true);
      store.update(model.id, initial);
      assert.equal(store.isDirty(model.id), false);
      store.update(model.id, { ...initial, from: "2025-01-01" });
      assert.equal(store.isDirty(model.id), true);
      store.update(model.id, initial);
      const consumed = updateConsumedSuggestion(initial.teams[0]!, model.teams[0]!, "1/3");
      store.update(model.id, { ...initial, teams: [consumed, ...initial.teams.slice(1)] });
      assert.equal(store.isDirty(model.id), true);
      store.cancel(model.id);
      assert.equal(store.isDirty(model.id), false);
      assert.equal(store.initialize(model, "2025-01-04").open, false);
      assert.equal(store.isDirty(model.id), false);
    });

    it(`${model.kind} marks a Team introduced by rebase unresolved and dirty`, () => {
      const store = createActualsDraftStore();
      store.initialize(model, "2025-01-04");
      const newTeam = state.portfolio.teams.find((team) => !model.teams.some((row) => row.teamId === team.id))!;
      const expanded = { ...model, teams: [...model.teams, { teamId: newTeam.id, label: newTeam.name,
        previousConsumedExact: "0/1", ...(model.kind === "project" ? { currentRafExact: "3/1" } : {}) }] };
      store.rebase(expanded);
      assert.equal(store.get(model.id)?.teams.at(-1)?.unresolved, true);
      assert.equal(store.isDirty(model.id), true);
      store.rebase(expanded);
      assert.equal(store.isDirty(model.id), true);
      store.cancel(model.id);
      store.initialize(expanded, "2025-01-04");
      assert.equal(store.isDirty(model.id), false);
    });
  }

  it("Project manual RAF is dirty and a retained local value stays dirty after rebase", () => {
    const store = createActualsDraftStore();
    const initial = store.initialize(project, "2025-01-04");
    store.update(project.id, { ...initial, teams: [{ ...initial.teams[0]!, raf: "7/3", rafEdited: true },
      ...initial.teams.slice(1)] });
    assert.equal(store.isDirty(project.id), true);
    const changed = { ...project, teams: project.teams.map((team, index) => index === 0
      ? { ...team, currentRafExact: "9/1" } : team) };
    store.rebase(changed);
    assert.equal(store.get(project.id)?.teams[0]?.raf, "7/3");
    assert.equal(store.isDirty(project.id), true);
    store.cancel(project.id);
    store.initialize(changed, "2025-01-04");
    assert.equal(store.isDirty(project.id), false);
  });
});
