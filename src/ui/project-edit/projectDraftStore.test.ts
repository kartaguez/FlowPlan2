import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProjectId, createTeamId, type DomainResult } from "../../domain/index.js";
import type { ProjectEditViewModel } from "../../application/index.js";
import { createProjectDraftStore } from "./projectDraftStore.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const a = must(createProjectId("a"));
const b = must(createProjectId("b"));
const teamId = must(createTeamId("alpha"));
const optionalTeamId = must(createTeamId("optional"));
const model = (projectId: typeof a, name = "A", raf = "20", exact = "20/1"): ProjectEditViewModel => ({
  projectId, label: name, programs: [], priorityFamilies: [],
  requirements: [{ teamId, teamLabel: "Alpha", enabled: true, remainingWorkload: raf, remainingWorkloadExact: exact }],
});

describe("ProjectDraftStore", () => {
  it("computes reversible global and Team dirty independently", () => {
    const store = createProjectDraftStore();
    const initial = store.initialize(a, model(a));
    assert.equal(store.isDirty(a), false);
    store.update(a, { ...initial.values, name: "A changed" });
    assert.equal(store.isDirty(a), true);
    assert.equal(store.isTeamDirty(a, teamId), false);
    store.update(a, initial.values);
    assert.equal(store.isDirty(a), false);
    store.update(a, { ...initial.values, teams: [{ ...initial.values.teams[0]!, enabled: false }] });
    assert.equal(store.isTeamDirty(a, teamId), true);
    store.update(a, initial.values);
    assert.equal(store.isDirty(a), false);
  });
  it("rebases local changes, adopts untouched fields, and preserves exact RAF anchors", () => {
    const store = createProjectDraftStore();
    const first = store.initialize(a, model(a));
    store.initialize(b, model(b, "B"));
    store.update(a, { ...first.values, name: "Local", teams: [{ ...first.values.teams[0]!,
      remainingWorkload: "21", expanded: true }] });
    store.setErrors(a, ["Local error"]);
    store.setExpanded(a, true);
    store.rebase(a, model(a, "Session", "22", "22/1"));
    const updated = store.get(a)!;
    assert.equal(updated.reference.name, "Session");
    assert.equal(updated.values.name, "Local");
    assert.equal(updated.values.teams[0]!.remainingWorkload, "21");
    assert.equal(updated.values.teams[0]!.remainingWorkloadExact, "20/1");
    assert.equal(updated.values.teams[0]!.expanded, true);
    assert.deepEqual(updated.errors, ["Local error"]);
    assert.equal(updated.expanded, true);
    store.cancel(a);
    assert.equal(store.get(a), undefined);
    assert.equal(store.get(b)?.values.name, "B");
  });
  it("keeps an unrelated local draft dirty after a reorder rebase", () => {
    const store = createProjectDraftStore();
    const first = store.initialize(a, model(a));
    store.update(a, { ...first.values, name: "Local" });
    store.rebase(a, model(a));
    assert.equal(store.get(a)?.values.name, "Local");
    assert.equal(store.isDirty(a), true);
  });
  it("blocks a structurally vanished active Team without dropping its local draft", () => {
    const store = createProjectDraftStore();
    const first = store.initialize(a, model(a));
    store.update(a, { ...first.values, teams: [{ ...first.values.teams[0]!, remainingWorkload: "21" }] });
    store.rebase(a, { ...model(a), requirements: [] });
    assert.equal(store.get(a)?.invalidReference, true);
    assert.equal(store.get(a)?.values.teams[0]?.remainingWorkload, "21");
  });
  it("keeps a divergent historical deadline unresolved until an explicit choice", () => {
    const store = createProjectDraftStore();
    const historical = { ...model(a), objectiveEndDate: "2025-02-01" as never,
      mandatoryDeadline: "2025-03-01" as never };
    const draft = store.initialize(a, historical);
    assert.equal(draft.values.resolution, "unresolved");
    assert.equal(draft.values.mandatory, false);
    store.update(a, { ...draft.values, resolution: "align", mandatory: true });
    assert.equal(store.isDirty(a), true);
    store.cancel(a);
    assert.equal(store.get(a), undefined);
  });
  it("drops an unchanged missing Team option and preserves unrelated local edits", () => {
    const store = createProjectDraftStore();
    const option = { teamId: optionalTeamId, teamLabel: "Optional", enabled: false,
      remainingWorkload: "", remainingWorkloadExact: "" };
    const initialModel = { ...model(a), requirements: [...model(a).requirements, option] };
    const first = store.initialize(a, initialModel);
    store.update(a, { ...first.values, name: "Locally changed" });
    assert.equal(store.isTeamDirty(a, optionalTeamId), false);
    store.rebase(a, model(a));
    assert.equal(store.get(a)?.values.teams.some((team) => team.teamId === optionalTeamId), false);
    assert.equal(store.get(a)?.values.name, "Locally changed");
    assert.equal(store.isDirty(a), true);
    assert.equal(store.get(a)?.invalidReference, false);
  });
  it("keeps a changed missing Team row across repeated rebases", () => {
    const store = createProjectDraftStore();
    const option = { teamId: optionalTeamId, teamLabel: "Optional", enabled: false,
      remainingWorkload: "", remainingWorkloadExact: "" };
    const first = store.initialize(a, { ...model(a), requirements: [...model(a).requirements, option] });
    store.update(a, { ...first.values, teams: first.values.teams.map((team) =>
      team.teamId === optionalTeamId ? { ...team, remainingWorkload: "5" } : team) });
    assert.equal(store.isTeamDirty(a, optionalTeamId), true);
    store.rebase(a, model(a));
    store.rebase(a, model(a));
    assert.equal(store.get(a)?.invalidReference, true);
    assert.equal(store.get(a)?.values.teams.find((team) => team.teamId === optionalTeamId)?.remainingWorkload, "5");
  });
});
