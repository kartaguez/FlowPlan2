import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTimelineGeometry, buildTimelineViewModel } from "../../adapters/index.js";
import { recomputePlanning } from "../../application/index.js";
import {
  createPlanningHorizon,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "./createDemoPlanningScenario.js";

describe("demo planning bootstrap", () => {
  it("provides a deterministic multi-team, multi-project domain scenario", () => {
    const first = createDemoPlanningScenario();
    const second = createDemoPlanningScenario();

    assert.ok(first.portfolio.teams.length >= 2);
    assert.ok(first.portfolio.projects.length >= 3);
    assert.ok(
      first.planning.startDate.slice(0, 7) !==
        first.planning.endDate.slice(0, 7),
    );
    assert.ok(first.portfolio.reservations.length >= 1);
    assert.deepEqual(first, second);
  });

  it("runs through the real application, view-model, and geometry pipeline", () => {
    const scenario = createDemoPlanningScenario();
    const horizon = must(
      createPlanningHorizon({
        start: scenario.planning.startDate,
        end: scenario.planning.endDate,
      }),
    );
    const { planningResult } = recomputePlanning({
      portfolio: scenario.portfolio,
      horizon,
      workingPattern: scenario.planning.workingPattern,
      maxParallelProjects: scenario.planning.maxParallelProjects,
    });
    const viewModel = buildTimelineViewModel({
      portfolio: scenario.portfolio,
      horizon,
      planningResult,
    });
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
    assert.ok(
      geometry.teams.some((team) =>
        team.markers.some((marker) => marker.kind === "earliest-start"),
      ),
    );
    assert.ok(
      geometry.teams.some((team) =>
        team.markers.some((marker) => marker.kind === "objective-end"),
      ),
    );
    assert.ok(
      geometry.teams.some((team) =>
        team.markers.some(
          (marker) => marker.kind === "mandatory-deadline",
        ),
      ),
    );
    assert.ok(
      viewModel.diagnostics.some(
        (diagnostic) => diagnostic.code === "TEAM_OVER_RESERVED",
      ),
    );
  });
});

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
