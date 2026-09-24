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
import { createTimelineInteractionLookup, renderTimelineTooltip } from "../../ui/timeline/renderTimelineInteractionDetails.js";

describe("demo planning bootstrap", () => {
  it("provides a deterministic multi-team, multi-project domain scenario", () => {
    const first = createDemoPlanningScenario();
    const second = createDemoPlanningScenario();

    assert.ok(first.portfolio.teams.length >= 2);
    assert.ok(first.portfolio.projects.length >= 3);
    assert.deepEqual(
      first.portfolio.projects.map(({ programId, priorityFamilyId }) => [programId !== undefined, priorityFamilyId !== undefined]),
      [[true, true], [true, false], [false, true], [false, false]],
    );
    assert.deepEqual(first.portfolio.programs.map(({ name }) => name), ["Phoenix"]);
    assert.deepEqual(first.portfolio.priorityFamilies.map(({ name }) => name), ["Strategic", "Regulatory"]);
    assert.ok(
      first.planning.startDate.slice(0, 7) !==
        first.planning.endDate.slice(0, 7),
    );
    assert.ok(first.portfolio.reservations.length >= 1);
    assert.ok(first.portfolio.reservations.some((reservation) => reservation.teamAllocations.length >= 2));
    assert.ok(first.portfolio.reservations.some((reservation) =>
      reservation.teamAllocations.some((allocation) => allocation.amount.kind === "ratio") &&
      reservation.teamAllocations.some((allocation) => allocation.amount.kind === "fixed-daily"),
    ));
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
      workingPattern: scenario.planning.workingPattern,
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
    assert.ok(geometry.teams.some((team) => team.days.some((day) => (day.reservationSegments?.length ?? 0) > 0)));
    for (const team of geometry.teams) for (const day of team.days) {
      const region = day.capacityTube.reservedRegion;
      for (const segment of day.reservationSegments ?? []) {
        assert.ok(segment.y >= region.y);
        assert.ok(segment.y + segment.height <= region.y + region.height + 1e-9);
        assert.equal(segment.x, region.x);
        assert.equal(segment.width, region.width);
      }
    }
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

  it("projects actual demo completion dates into Project tooltips", () => {
    const scenario = createDemoPlanningScenario();
    const horizon = must(createPlanningHorizon({ start: scenario.planning.startDate,
      end: scenario.planning.endDate }));
    const { planningResult } = recomputePlanning({ portfolio: scenario.portfolio, horizon,
      workingPattern: scenario.planning.workingPattern,
      maxParallelProjects: scenario.planning.maxParallelProjects });
    const viewModel = buildTimelineViewModel({ portfolio: scenario.portfolio, horizon,
      planningResult, workingPattern: scenario.planning.workingPattern });
    const lookup = createTimelineInteractionLookup(viewModel);
    const expected = new Map([
      ["project-atlas", "2025-03-11"], ["project-cobalt", "2025-03-14"],
      ["project-boreal", "not estimated within horizon"],
      ["project-delta", "not estimated within horizon"],
    ]);
    for (const [id, end] of expected) {
      const project = viewModel.projects.find((item) => item.id === id)!;
      const team = viewModel.teams.find((item) => item.projectStates.some((state) => state.projectId === id))!;
      const container = { hidden: true, textContent: "", style: { left: "", top: "" } };
      renderTimelineTooltip({ container: container as unknown as HTMLElement, lookup,
        hit: { kind: "allocation", projectId: project.id, teamId: team.id,
          date: horizon.start }, clientX: 0, clientY: 0 });
      assert.match(container.textContent, new RegExp(`Estimated end: ${end}`));
    }
  });
});

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
