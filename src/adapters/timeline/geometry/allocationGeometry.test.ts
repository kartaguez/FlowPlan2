import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  addDays,
  capacityFromSerialized,
  createCapacity,
  createCivilDate,
  createProjectId,
  createTeamId,
  serializeQuantity,
  type Capacity,
  type DomainResult,
  type ProjectId,
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

function capacity(value: string): Capacity {
  return value.includes("/")
    ? must(capacityFromSerialized(value))
    : must(createCapacity(value));
}

interface DaySpec {
  readonly effective: string;
  readonly reserved?: string;
  readonly project?: string;
  readonly overReserved?: boolean;
}

interface AllocationSpec {
  readonly teamIndex: number;
  readonly referencedTeamIndex?: number;
  readonly projectIndex?: number;
  readonly projectId?: ProjectId;
  readonly dayIndex: number;
  readonly workload: string;
}

interface ScenarioInput {
  readonly teamDays: readonly (readonly DaySpec[])[];
  readonly projectPriorities: readonly number[];
  readonly allocations?: readonly AllocationSpec[];
}

function makeScenario(input: ScenarioInput): TimelineViewModel {
  const start = date("2025-01-01");
  const dayCount = input.teamDays[0]?.length ?? 1;
  const teamIds = input.teamDays.map((_, index) =>
    must(createTeamId(`team-${index + 1}`)),
  );
  const projectIds = input.projectPriorities.map((_, index) =>
    must(createProjectId(`project-${index + 1}`)),
  );

  return {
    horizon: { start, end: must(addDays(start, dayCount - 1)) },
    projects: projectIds.map((id, index) => ({
      id,
      label: id,
      priorityIndex: input.projectPriorities[index]!,
    })),
    diagnostics: [],
    teams: input.teamDays.map((days, teamIndex) => ({
      id: teamIds[teamIndex]!,
      label: teamIds[teamIndex]!,
      projectStates: [],
      capacities: days.map((day, dayIndex) => ({
        date: must(addDays(start, dayIndex)),
        effectiveCapacity: capacity(day.effective),
        reservedCapacity: capacity(day.reserved ?? "0"),
        projectCapacity: capacity(day.project ?? day.effective),
        overReserved: day.overReserved ?? false,
      })),
      allocations: (input.allocations ?? [])
        .filter((allocation) => allocation.teamIndex === teamIndex)
        .map((allocation) => ({
          projectId:
            allocation.projectId ?? projectIds[allocation.projectIndex ?? 0]!,
          teamId: teamIds[allocation.referencedTeamIndex ?? teamIndex]!,
          date: must(addDays(start, allocation.dayIndex)),
          workload: capacity(allocation.workload),
        })),
    })),
  };
}

const geometryFor = (viewModel: TimelineViewModel, laneHeight = 100) =>
  buildTimelineGeometry({
    viewModel,
    viewport: { width: 300, teamLaneHeight: laneHeight },
  });

describe("TimelineGeometry daily project allocation stacking", () => {
  it("stacks two projects bottom-up and fills the project region", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }]],
        projectPriorities: [0, 1],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "1" },
        ],
      }),
    );
    const day = geometry.teams[0]!.days[0]!;
    const [first, second] = day.allocations;
    assert.ok(first);
    assert.ok(second);

    assert.equal(first.height, 50);
    assert.equal(first.y + first.height, 100);
    assert.equal(second.height, 50);
    assert.equal(second.y + second.height, first.y);
    assert.equal(second.y, day.capacityTube.projectRegion.y);
  });

  it("stacks workloads 1, 0.5 and 0.5 in priority order", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }]],
        projectPriorities: [0, 1, 2],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "0.5" },
          { teamIndex: 0, projectIndex: 2, dayIndex: 0, workload: "0.5" },
        ],
      }),
    );
    const allocations = geometry.teams[0]!.days[0]!.allocations;

    assert.deepEqual(
      allocations.map((allocation) => [
        allocation.priorityIndex,
        allocation.y,
        allocation.height,
      ]),
      [
        [0, 50, 50],
        [1, 25, 25],
        [2, 0, 25],
      ],
    );
  });

  it("leaves unused project capacity empty above a bottom-anchored stack", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }]],
        projectPriorities: [0, 1],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "0.5" },
          { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "0.5" },
        ],
      }),
    );
    const currentDay = geometry.teams[0]!.days[0]!;
    const stackTop = currentDay.allocations.at(-1)!.y;

    assert.equal(stackTop, 50);
    assert.equal(currentDay.capacityTube.projectRegion.y, 0);
    assert.equal(
      currentDay.allocations[0]!.y + currentDay.allocations[0]!.height,
      100,
    );
  });

  it("preserves an exact one-third workload while deriving its pixel height", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "1" }]],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1/3" },
        ],
      }),
      90,
    );
    const allocation = geometry.teams[0]!.days[0]!.allocations[0]!;

    assert.equal(serializeQuantity(allocation.workload), "1/3");
    assert.ok(Math.abs(allocation.height - 30) < 1e-9);
  });

  it("sorts source allocations by project priority before stacking", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "3" }]],
      projectPriorities: [0, 1, 2],
      allocations: [
        { teamIndex: 0, projectIndex: 2, dayIndex: 0, workload: "1" },
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
        { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "1" },
      ],
    });
    const sourceOrder = viewModel.teams[0]!.allocations.map(
      (allocation) => allocation.projectId,
    );
    const allocations = geometryFor(viewModel).teams[0]!.days[0]!.allocations;

    assert.deepEqual(sourceOrder, [
      viewModel.projects[2]!.id,
      viewModel.projects[0]!.id,
      viewModel.projects[1]!.id,
    ]);
    assert.deepEqual(
      allocations.map((allocation) => allocation.projectId),
      viewModel.projects.map((project) => project.id),
    );
    assert.deepEqual(
      allocations.map((allocation) => allocation.priorityIndex),
      [0, 1, 2],
    );
  });

  it("keeps allocations on adjacent days as distinct rectangles", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "1" }, { effective: "1" }]],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 0, dayIndex: 1, workload: "1" },
        ],
      }),
    );

    assert.equal(geometry.teams[0]!.days[0]!.allocations.length, 1);
    assert.equal(geometry.teams[0]!.days[1]!.allocations.length, 1);
    assert.notEqual(
      geometry.teams[0]!.days[0]!.allocations[0],
      geometry.teams[0]!.days[1]!.allocations[0],
    );
  });

  it("does not bridge a day without an allocation", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [
          [{ effective: "1" }, { effective: "1" }, { effective: "1" }],
        ],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 0, dayIndex: 2, workload: "1" },
        ],
      }),
    );

    assert.deepEqual(
      geometry.teams[0]!.days.map((currentDay) =>
        currentDay.allocations.map((allocation) => allocation.projectId),
      ),
      [
        [geometry.teams[0]!.days[0]!.allocations[0]!.projectId],
        [],
        [geometry.teams[0]!.days[2]!.allocations[0]!.projectId],
      ],
    );
  });

  it("projects the same project independently for multiple teams", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }], [{ effective: "2" }]],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 1, projectIndex: 0, dayIndex: 0, workload: "0.5" },
        ],
      }),
    );
    const first = geometry.teams[0]!.days[0]!.allocations[0]!;
    const second = geometry.teams[1]!.days[0]!.allocations[0]!;

    assert.equal(first.projectId, second.projectId);
    assert.notEqual(first.teamId, second.teamId);
    assert.equal(first.height, 50);
    assert.equal(second.height, 25);
    assert.notEqual(first.y, second.y);
  });

  it("rejects an allocation whose team differs from its containing team", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1" }], [{ effective: "1" }]],
      projectPriorities: [0],
      allocations: [
        {
          teamIndex: 0,
          referencedTeamIndex: 1,
          projectIndex: 0,
          dayIndex: 0,
          workload: "1",
        },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects an allocation for an unknown project", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1" }]],
      projectPriorities: [0],
      allocations: [
        {
          teamIndex: 0,
          projectId: must(createProjectId("unknown")),
          dayIndex: 0,
          workload: "1",
        },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects an allocation outside the horizon", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1" }]],
      projectPriorities: [0],
      allocations: [
        { teamIndex: 0, projectIndex: 0, dayIndex: 1, workload: "1" },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects a zero-workload allocation", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1" }]],
      projectPriorities: [0],
      allocations: [
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "0" },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects allocations that exceed the exact daily project capacity", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1", project: "1" }]],
      projectPriorities: [0, 1],
      allocations: [
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
        { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "0.5" },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects a positive allocation when project capacity is zero", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "1", reserved: "1", project: "0" }]],
      projectPriorities: [0],
      allocations: [
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "0.5" },
      ],
    });

    assert.throws(() => geometryFor(viewModel), TypeError);
  });

  it("rejects duplicate project allocations and ambiguous priorities", () => {
    const duplicateAllocation = makeScenario({
      teamDays: [[{ effective: "2" }]],
      projectPriorities: [0],
      allocations: [
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "0.5" },
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "0.5" },
      ],
    });
    const duplicatePriority = makeScenario({
      teamDays: [[{ effective: "2" }]],
      projectPriorities: [0, 0],
    });

    assert.throws(() => geometryFor(duplicateAllocation), TypeError);
    assert.throws(() => geometryFor(duplicatePriority), TypeError);
  });

  it("is deterministic and does not mutate source collections", () => {
    const viewModel = makeScenario({
      teamDays: [[{ effective: "2" }, { effective: "2" }]],
      projectPriorities: [0, 1],
      allocations: [
        { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "0.5" },
        { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
      ],
    });
    const projects = viewModel.projects;
    const teams = viewModel.teams;
    const allocations = viewModel.teams[0]!.allocations;
    const capacities = viewModel.teams[0]!.capacities;

    assert.deepEqual(geometryFor(viewModel), geometryFor(viewModel));
    assert.strictEqual(viewModel.projects, projects);
    assert.strictEqual(viewModel.teams, teams);
    assert.strictEqual(viewModel.teams[0]!.allocations, allocations);
    assert.strictEqual(viewModel.teams[0]!.capacities, capacities);
    assert.deepEqual(
      allocations.map((allocation) => allocation.projectId),
      [viewModel.projects[1]!.id, viewModel.projects[0]!.id],
    );
  });

  it("freezes daily allocation collections and geometries", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "1" }]],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
        ],
      }),
    );
    const allocations = geometry.teams[0]!.days[0]!.allocations;

    assert.equal(Object.isFrozen(allocations), true);
    assert.ok(allocations.every(Object.isFrozen));
  });

  it("keeps rectangle area proportional to workload at fixed day width", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }]],
        projectPriorities: [0, 1],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "0.5" },
        ],
      }),
    );
    const [first, second] = geometry.teams[0]!.days[0]!.allocations;
    assert.ok(first);
    assert.ok(second);

    const firstArea = first.width * first.height;
    const secondArea = second.width * second.height;
    assert.ok(Math.abs(firstArea - secondArea * 2) < 1e-9);
  });

  it("uses the same allocation scale on every team", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "2" }], [{ effective: "4" }]],
        projectPriorities: [0],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 1, projectIndex: 0, dayIndex: 0, workload: "1" },
        ],
      }),
    );

    assert.equal(
      geometry.teams[0]!.days[0]!.allocations[0]!.height,
      geometry.teams[1]!.days[0]!.allocations[0]!.height,
    );
  });

  it("keeps project allocations inside projectRegion below reservations", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [[{ effective: "4", reserved: "1", project: "3" }]],
        projectPriorities: [0, 1],
        allocations: [
          { teamIndex: 0, projectIndex: 0, dayIndex: 0, workload: "1" },
          { teamIndex: 0, projectIndex: 1, dayIndex: 0, workload: "1" },
        ],
      }),
    );
    const currentDay = geometry.teams[0]!.days[0]!;
    const reservationBottom =
      currentDay.capacityTube.reservedRegion.y +
      currentDay.capacityTube.reservedRegion.height;

    assert.ok(
      currentDay.allocations.every(
        (allocation) =>
          allocation.y >= currentDay.capacityTube.projectRegion.y &&
          allocation.y >= reservationBottom &&
          allocation.y + allocation.height <=
            currentDay.capacityTube.projectRegion.y +
              currentDay.capacityTube.projectRegion.height,
      ),
    );
  });

  it("produces no allocation geometry for an over-reserved empty day", () => {
    const geometry = geometryFor(
      makeScenario({
        teamDays: [
          [{ effective: "3", reserved: "4.2", project: "0", overReserved: true }],
        ],
        projectPriorities: [0],
      }),
    );

    assert.deepEqual(geometry.teams[0]!.days[0]!.allocations, []);
  });

  it("declares no continuous surfaces, paths, polygons, or renderer fields", async () => {
    const contractSource = await readFile(
      resolve(
        process.cwd(),
        "src/adapters/timeline/geometry/timelineGeometry.ts",
      ),
      "utf8",
    );

    assert.doesNotMatch(
      contractSource,
      /\b(?:path|polygon|points|segments|continuousSurface|fill|stroke|color)\b/,
    );
  });
});
