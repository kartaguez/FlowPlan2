import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  createCapacity,
  createCivilDate,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../../domain/index.js";
import {
  buildTimelineGeometry,
  type TimelineViewModel,
} from "../../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));

interface DaySpec {
  readonly effective: string;
  readonly reserved: string;
  readonly project: string;
  readonly overReserved?: boolean;
}

function makeViewModel(teamDays: readonly (readonly DaySpec[])[]): TimelineViewModel {
  const start = date("2025-01-01");
  const dayCount = teamDays[0]?.length ?? 1;
  const end = must(addDays(start, dayCount - 1));

  return {
    horizon: { start, end },
    projects: [],
    diagnostics: [],
    teams: teamDays.map((days, teamIndex) => ({
      id: must(createTeamId(`team-${teamIndex + 1}`)),
      label: `Team ${teamIndex + 1}`,
      allocations: [],
      projectStates: [],
      capacities: days.map((day, dayIndex) => ({
        date: must(addDays(start, dayIndex)),
        effectiveCapacity: capacity(day.effective),
        reservedCapacity: capacity(day.reserved),
        projectCapacity: capacity(day.project),
        overReserved: day.overReserved ?? false,
      })),
    })),
  };
}

const day = (
  effective: string,
  reserved = "0",
  project = effective,
  overReserved = false,
): DaySpec => ({ effective, reserved, project, overReserved });

describe("TimelineGeometry capacity tubes", () => {
  it("uses the maximum effective capacity across every team and day", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([
        [day("1"), day("2")],
        [day("4"), day("3")],
      ]),
      viewport: { width: 200, teamLaneHeight: 100, timeAxisHeight: 40 },
    });

    assert.equal(serializeQuantity(geometry.maxEffectiveCapacity), "4/1");
    assert.equal(geometry.pixelsPerCapacityUnit, 25);
    assert.deepEqual(
      geometry.teams.flatMap((team) =>
        team.days.map((currentDay) => currentDay.capacityTube.height),
      ),
      [25, 50, 100, 75],
    );
  });

  it("makes capacities comparable across teams with one global scale", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("1")], [day("2")]]),
      viewport: { width: 100, teamLaneHeight: 100, timeAxisHeight: 40 },
    });
    const firstHeight = geometry.teams[0]!.days[0]!.capacityTube.height;
    const secondHeight = geometry.teams[1]!.days[0]!.capacityTube.height;

    assert.equal(secondHeight, firstHeight * 2);
    assert.equal(geometry.pixelsPerCapacityUnit, 50);
  });

  it("anchors every effective-capacity tube on the lane bottom", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("4")], [day("2")]]),
      viewport: { width: 100, teamLaneHeight: 80, timeAxisHeight: 40 },
    });
    const lane = geometry.teams[1]!;
    const tube = lane.days[0]!.capacityTube;

    assert.equal(lane.y, 120);
    assert.equal(tube.height, 40);
    assert.equal(tube.y, 160);
    assert.equal(tube.y + tube.height, lane.y + lane.height);
  });

  it("places the project region below the visible reservation region", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("4", "1", "3")]]),
      viewport: { width: 100, teamLaneHeight: 100, timeAxisHeight: 40 },
    });
    const tube = geometry.teams[0]!.days[0]!.capacityTube;

    assert.equal(tube.height, 100);
    assert.equal(tube.projectRegion.height, 75);
    assert.equal(tube.projectRegion.y, 65);
    assert.equal(tube.reservedRegion.height, 25);
    assert.equal(tube.reservedRegion.y, 40);
    assert.equal(
      tube.projectRegion.height + tube.reservedRegion.height,
      tube.height,
    );
  });

  it("derives pixel heights while preserving exact fractional capacities", () => {
    const viewModel = makeViewModel([[day("3", "1.5", "1.5")]]);
    const source = viewModel.teams[0]!.capacities[0]!;
    const tube = buildTimelineGeometry({
      viewModel,
      viewport: { width: 100, teamLaneHeight: 90, timeAxisHeight: 40 },
    }).teams[0]!.days[0]!.capacityTube;

    assert.equal(tube.height, 90);
    assert.equal(tube.projectRegion.height, 45);
    assert.equal(tube.reservedRegion.height, 45);
    assert.equal(serializeQuantity(source.reservedCapacity), "3/2");
    assert.equal(serializeQuantity(source.projectCapacity), "3/2");
  });

  it("clips over-reservation visually while retaining its exact business value", () => {
    const viewModel = makeViewModel([[day("3", "4.2", "0", true)]]);
    const source = viewModel.teams[0]!.capacities[0]!;
    const projected = buildTimelineGeometry({
      viewModel,
      viewport: { width: 100, teamLaneHeight: 90, timeAxisHeight: 40 },
    }).teams[0]!.days[0]!;

    assert.equal(projected.capacityTube.height, 90);
    assert.equal(projected.capacityTube.reservedRegion.height, 90);
    assert.equal(projected.capacityTube.projectRegion.height, 0);
    assert.equal(projected.overReserved, true);
    assert.strictEqual(projected.reservedCapacity, source.reservedCapacity);
    assert.equal(serializeQuantity(projected.reservedCapacity), "21/5");
  });

  it("handles an all-zero timeline without dividing by zero", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([
        [day("0"), day("0")],
        [day("0"), day("0")],
      ]),
      viewport: { width: 200, teamLaneHeight: 100, timeAxisHeight: 40 },
    });

    assert.equal(serializeQuantity(geometry.maxEffectiveCapacity), "0/1");
    assert.equal(geometry.pixelsPerCapacityUnit, 0);
    assert.ok(
      geometry.teams.every((team) =>
        team.days.every(
          (currentDay) =>
            currentDay.capacityTube.height === 0 &&
            currentDay.capacityTube.projectRegion.height === 0 &&
            currentDay.capacityTube.reservedRegion.height === 0,
        ),
      ),
    );
  });

  it("keeps a zero-capacity gap at its true horizontal date", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("2"), day("0"), day("2")]]),
      viewport: { width: 300, teamLaneHeight: 100, timeAxisHeight: 40 },
    });
    const days = geometry.teams[0]!.days;

    assert.deepEqual(
      days.map((currentDay) => currentDay.x),
      [0, 100, 200],
    );
    assert.deepEqual(
      days.map((currentDay) => currentDay.capacityTube.height),
      [100, 0, 100],
    );
  });

  it("rejects an exact capacity that cannot produce finite geometry", () => {
    const enormousCapacity = `1${"0".repeat(400)}`;
    const viewModel = makeViewModel([[day(enormousCapacity)]]);

    assert.throws(
      () =>
        buildTimelineGeometry({
          viewModel,
          viewport: { width: 100, teamLaneHeight: 100, timeAxisHeight: 40 },
        }),
      TypeError,
    );
  });

  it("is deterministic and does not mutate semantic capacity inputs", () => {
    const viewModel = makeViewModel([
      [day("1", "0.5", "0.5"), day("2")],
      [day("3"), day("4")],
    ]);
    const teams = viewModel.teams;
    const capacities = viewModel.teams.map((team) => team.capacities);
    const sourceQuantities = viewModel.teams.map((team) =>
      team.capacities.map((currentDay) => currentDay.effectiveCapacity),
    );
    const input = {
      viewModel,
      viewport: { width: 200, teamLaneHeight: 100, timeAxisHeight: 40 },
    };

    assert.deepEqual(buildTimelineGeometry(input), buildTimelineGeometry(input));
    assert.strictEqual(viewModel.teams, teams);
    viewModel.teams.forEach((team, index) => {
      assert.strictEqual(team.capacities, capacities[index]);
      team.capacities.forEach((currentDay, dayIndex) => {
        assert.strictEqual(
          currentDay.effectiveCapacity,
          sourceQuantities[index]![dayIndex],
        );
      });
    });
  });

  it("freezes tubes and both capacity regions", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("2", "0.5", "1.5")]]),
      viewport: { width: 100, teamLaneHeight: 100, timeAxisHeight: 40 },
    });
    const tube = geometry.teams[0]!.days[0]!.capacityTube;

    assert.equal(Object.isFrozen(tube), true);
    assert.equal(Object.isFrozen(tube.projectRegion), true);
    assert.equal(Object.isFrozen(tube.reservedRegion), true);
  });

  it("produces only finite, non-negative geometry numbers", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([
        [day("1", "0.25", "0.75"), day("2")],
        [day("3", "1", "2"), day("4", "1.5", "2.5")],
      ]),
      viewport: { width: 175, teamLaneHeight: 83, timeAxisHeight: 40 },
    });
    const numbers = [
      geometry.width,
      geometry.height,
      geometry.dayWidth,
      geometry.pixelsPerCapacityUnit,
      ...geometry.teams.flatMap((team) => [
        team.x,
        team.y,
        team.width,
        team.height,
        ...team.days.flatMap((currentDay) => [
          currentDay.x,
          currentDay.y,
          currentDay.width,
          currentDay.height,
          currentDay.capacityTube.x,
          currentDay.capacityTube.y,
          currentDay.capacityTube.width,
          currentDay.capacityTube.height,
          currentDay.capacityTube.projectRegion.x,
          currentDay.capacityTube.projectRegion.y,
          currentDay.capacityTube.projectRegion.width,
          currentDay.capacityTube.projectRegion.height,
          currentDay.capacityTube.reservedRegion.x,
          currentDay.capacityTube.reservedRegion.y,
          currentDay.capacityTube.reservedRegion.width,
          currentDay.capacityTube.reservedRegion.height,
        ]),
      ]),
    ];

    assert.ok(numbers.every((value) => Number.isFinite(value) && value >= 0));
  });

  it("still exposes no continuous project-surface geometry", () => {
    const geometry = buildTimelineGeometry({
      viewModel: makeViewModel([[day("2", "0.5", "1.5")]]),
      viewport: { width: 100, teamLaneHeight: 100, timeAxisHeight: 40 },
    });
    const dayGeometry = geometry.teams[0]!.days[0]!;

    for (const property of [
      "projectSurfaces",
      "allocationGeometries",
      "projectRects",
      "stackIndex",
    ]) {
      assert.equal(Object.hasOwn(geometry, property), false);
      assert.equal(Object.hasOwn(dayGeometry, property), false);
      assert.equal(Object.hasOwn(dayGeometry.capacityTube, property), false);
    }
  });
});
