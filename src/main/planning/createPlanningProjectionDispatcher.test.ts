import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlanningSession } from "../../application/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const geometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

describe("PlanningProjectionDispatcher", () => {
  it("rebuilds projections only after a successful immutable command", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    let buildCount = 0;
    const dispatcher = createPlanningProjectionDispatcher({
      session,
      geometryViewport,
      buildProjection: (input) => {
        buildCount += 1;
        return buildPlanningSessionProjection(input);
      },
    });
    const initialProjection = dispatcher.getProjection();
    assert.equal(buildCount, 1);

    const invalid = dispatcher.dispatch({
      kind: "rename-project",
      projectId: initial.portfolio.projects[0]!.id,
      label: " ",
    });
    assert.equal(invalid.ok, false);
    assert.equal(buildCount, 1);
    assert.equal(dispatcher.getProjection(), initialProjection);

    const valid = dispatcher.dispatch({
      kind: "rename-project",
      projectId: initial.portfolio.projects[0]!.id,
      label: "Atlas Reprojected",
    });
    assert.equal(valid.ok, true);
    assert.equal(buildCount, 2);
    assert.notEqual(dispatcher.getProjection(), initialProjection);
    assert.deepEqual(
      dispatcher.getProjection().planningResult,
      initialProjection.planningResult,
    );
    assert.equal(
      dispatcher.getProjection().viewModel.projects[0]?.label,
      "Atlas Reprojected",
    );
    assert.notEqual(
      dispatcher.getProjection().geometry,
      initialProjection.geometry,
    );
  });
});
