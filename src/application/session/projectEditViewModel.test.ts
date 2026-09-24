import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildProjectEditViewModel } from "./projectEditViewModel.js";

describe("ProjectEditViewModel", () => {
  it("separates global dates and exposes decimal RAF with exact hidden values", () => {
    const state = createDemoPlanningScenario();
    const project = state.portfolio.projects[0]!;
    const model = buildProjectEditViewModel(state, project.id)!;

    assert.equal(model.label, "Project Atlas");
    assert.equal(model.programId, state.portfolio.programs[0]!.id);
    assert.equal(model.priorityFamilyId, state.portfolio.priorityFamilies[0]!.id);
    assert.deepEqual(model.programs.map(({ name }) => name), ["Phoenix"]);
    assert.deepEqual(model.priorityFamilies.map(({ name }) => name), ["Strategic", "Regulatory"]);
    assert.equal(Object.isFrozen(model.programs), true);
    assert.equal(Object.isFrozen(model.priorityFamilies), true);
    assert.equal(model.priorityPosition, 1);
    assert.equal(model.projectCount, 4);
    assert.equal(model.earliestStartDate, undefined);
    assert.equal(model.objectiveEndDate, "2025-02-28");
    assert.equal(model.mandatoryDeadline, undefined);
    assert.deepEqual(
      model.requirements.map((requirement) => requirement.teamLabel),
      ["Team Alpha", "Team Beta"],
    );
    assert.deepEqual(
      model.requirements.map((requirement) => requirement.remainingWorkload),
      ["55", "30"],
    );
    assert.deepEqual(
      model.requirements.map((requirement) => requirement.dailyCapExact),
      ["3/2", "1/1"],
    );
    for (const requirement of model.requirements) {
      assert.equal("earliestStartDate" in requirement, false);
      assert.equal("objectiveEndDate" in requirement, false);
      assert.equal("mandatoryDeadline" in requirement, false);
      assert.equal(Object.isFrozen(requirement), true);
    }
    assert.equal(Object.isFrozen(model.requirements), true);
    assert.equal(Object.isFrozen(model), true);
  });

  it("returns undefined for an unknown project", () => {
    const state = createDemoPlanningScenario();
    assert.equal(
      buildProjectEditViewModel(
        state,
        "missing-project" as typeof state.portfolio.projects[0]["id"],
      ),
      undefined,
    );
  });
});
