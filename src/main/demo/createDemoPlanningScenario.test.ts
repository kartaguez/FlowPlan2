import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTimelineGeometry, buildTimelineViewModel } from "../../adapters/index.js";
import { recomputePlanning } from "../../application/index.js";
import { serializeQuantity } from "../../domain/index.js";
import { createDemoPlanningScenario } from "./createDemoPlanningScenario.js";

describe("demo planning bootstrap", () => {
  it("provides a deterministic multi-team, multi-project domain scenario", () => {
    const first = createDemoPlanningScenario();
    const second = createDemoPlanningScenario();

    assert.ok(first.portfolio.teams.length >= 2);
    assert.ok(first.portfolio.projects.length >= 3);
    assert.ok(first.horizon.start.slice(0, 7) !== first.horizon.end.slice(0, 7));
    assert.ok(first.portfolio.reservations.length >= 1);
    assert.deepEqual(first, second);
  });

  it("runs through the real application, view-model, and geometry pipeline", () => {
    const scenario = createDemoPlanningScenario();
    const { planningResult } = recomputePlanning(scenario);
    const viewModel = buildTimelineViewModel({ ...scenario, planningResult });
    const geometry = buildTimelineGeometry({
      viewModel,
      viewport: {
        width: 2160,
        teamLaneHeight: 100,
        timeAxisHeight: 56,
      },
    });

    assert.equal(geometry.teams.length, scenario.portfolio.teams.length);
    assert.ok(geometry.timeAxis.months.length >= 2);
    assert.ok(geometry.height > 0);
    assert.ok(
      geometry.teams.some((team) =>
        team.days.some((day) => day.allocations.length > 0),
      ),
    );
    assert.ok(
      viewModel.teams.some((team) =>
        team.capacities.some(
          (day) => serializeQuantity(day.reservedCapacity) !== "0/1",
        ),
      ),
    );
    assert.ok(
      viewModel.teams.some((team) =>
        team.capacities.some(
          (day) => serializeQuantity(day.effectiveCapacity) === "0/1",
        ),
      ),
    );
  });
});
