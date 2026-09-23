import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";

const geometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

describe("buildPlanningSessionProjection", () => {
  it("builds planning, semantic view model, and full geometry deterministically", () => {
    const state = createDemoPlanningScenario();
    const first = buildPlanningSessionProjection({ state, geometryViewport });
    const second = buildPlanningSessionProjection({ state, geometryViewport });

    assert.deepEqual(first, second);
    assert.equal(first.planningResult.teamPlans.length, state.portfolio.teams.length);
    assert.deepEqual(
      first.viewModel.projects.map((project) => project.label),
      state.portfolio.priorityOrder.map(
        (projectId) =>
          state.portfolio.projects.find((project) => project.id === projectId)!.name,
      ),
    );
    assert.equal(first.geometry.width, geometryViewport.width);
    assert.equal(first.geometry.teams.length, state.portfolio.teams.length);
    assert.equal(Object.isFrozen(first), true);
  });

  it("is a deterministic DOM-free composition boundary", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/main/planning/buildPlanningSessionProjection.ts",
      ),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /HTMLElement|SVGElement|renderTimelineSvg|renderApp|createTimeline.*Controller/,
    );
  });
});
