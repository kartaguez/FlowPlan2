import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  civilDatesInclusive,
  createCapacity,
  createCivilDate,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../../domain/index.js";
import {
  buildTimelineGeometry,
  dateToX,
  type BuildTimelineGeometryInput,
  type TimelineViewModel,
} from "../../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));

function makeViewModel(
  start: string,
  end: string,
  teamIds: readonly string[] = ["team-a"],
  options: {
    readonly dailyCapacity?: string;
    readonly overReserved?: boolean;
  } = {},
): TimelineViewModel {
  const horizon = { start: date(start), end: date(end) };
  const dates = civilDatesInclusive(horizon.start, horizon.end);
  return {
    horizon,
    projects: [],
    diagnostics: [],
    teams: teamIds.map((id) => {
      const teamId = must(createTeamId(id));
      return {
        id: teamId,
        label: id,
        allocations: [],
        projectStates: [],
        capacities: dates.map((currentDate) => ({
          date: currentDate,
          effectiveCapacity: capacity(options.dailyCapacity ?? "1.5"),
          reservedCapacity: capacity("0"),
          projectCapacity: capacity(options.dailyCapacity ?? "1.5"),
          overReserved: options.overReserved ?? false,
        })),
      };
    }),
  };
}

function buildInput(
  viewModel: TimelineViewModel,
  width: number,
  teamLaneHeight = 80,
  timeAxisHeight = 40,
): BuildTimelineGeometryInput {
  return { viewModel, viewport: { width, teamLaneHeight, timeAxisHeight } };
}

describe("buildTimelineGeometry", () => {
  it("maps an inclusive three-day horizon to three equal columns", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-03");
    const geometry = buildTimelineGeometry(buildInput(viewModel, 300));

    assert.equal(geometry.dayWidth, 100);
    assert.deepEqual(
      geometry.teams[0]?.days.map((day) => day.x),
      [0, 100, 200],
    );
    assert.equal(
      dateToX(date("2025-01-03"), viewModel.horizon, geometry.dayWidth),
      200,
    );
  });

  it("uses the complete viewport width for a one-day horizon", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-01-01", "2025-01-01"), 500),
    );

    assert.equal(geometry.dayWidth, 500);
    assert.equal(geometry.teams[0]?.days[0]?.x, 0);
    assert.equal(geometry.teams[0]?.days[0]?.width, 500);
  });

  it("allows fractional pixel columns to end at the viewport edge", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-01-01", "2025-01-03"), 100),
    );
    const lastDay = geometry.teams[0]?.days[2];
    assert.ok(lastDay);

    assert.ok(Math.abs(lastDay.x + lastDay.width - 100) < 1e-9);
  });

  it("builds one complete month segment inside a single-month horizon", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-01-01", "2025-01-31"), 620),
    );

    assert.deepEqual(
      geometry.timeAxis.months.map(({ year, month, label, x, width }) => ({
        year,
        month,
        label,
        x,
        width,
      })),
      [{ year: 2025, month: 1, label: "Jan", x: 0, width: 620 }],
    );
    assert.deepEqual(
      geometry.timeAxis.years.map(({ year, label, x, width }) => ({
        year,
        label,
        x,
        width,
      })),
      [{ year: 2025, label: "2025", x: 0, width: 620 }],
    );
  });

  it("clips month segments to a partial horizon", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-01-20", "2025-02-10"), 220),
    );

    assert.equal(geometry.dayWidth, 10);
    assert.deepEqual(
      geometry.timeAxis.months.map(({ label, x, width }) => ({
        label,
        x,
        width,
      })),
      [
        { label: "Jan", x: 0, width: 120 },
        { label: "Feb", x: 120, width: 100 },
      ],
    );
  });

  it("builds independent month and year segments across a year boundary", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-12-20", "2026-01-10"), 220),
    );

    assert.deepEqual(
      geometry.timeAxis.months.map(({ year, month, label, x, width }) => ({
        year,
        month,
        label,
        x,
        width,
      })),
      [
        { year: 2025, month: 12, label: "Dec", x: 0, width: 120 },
        { year: 2026, month: 1, label: "Jan", x: 120, width: 100 },
      ],
    );
    assert.deepEqual(
      geometry.timeAxis.years.map(({ year, label, x, width }) => ({
        year,
        label,
        x,
        width,
      })),
      [
        { year: 2025, label: "2025", x: 0, width: 120 },
        { year: 2026, label: "2026", x: 120, width: 100 },
      ],
    );
  });

  it("places team lanes below the explicit time header", () => {
    const geometry = buildTimelineGeometry(
      buildInput(
        makeViewModel("2025-01-01", "2025-01-01", ["team-a", "team-b"]),
        300,
        80,
        50,
      ),
    );

    assert.equal(geometry.timeAxis.height, 50);
    assert.deepEqual(
      geometry.teams.map((team) => team.y),
      [50, 130],
    );
    assert.equal(geometry.height, 210);
  });

  it("stacks team lanes vertically and computes their total height", () => {
    const geometry = buildTimelineGeometry(
      buildInput(
        makeViewModel("2025-01-01", "2025-01-01", [
          "team-a",
          "team-b",
          "team-c",
        ]),
        300,
        80,
      ),
    );

    assert.deepEqual(
      geometry.teams.map((team) => team.y),
      [40, 120, 200],
    );
    assert.equal(geometry.height, 280);
    assert.ok(
      geometry.teams.every(
        (team) =>
          team.x === 0 &&
          team.width === 300 &&
          team.height === 80 &&
          team.days.every((day) => day.y === team.y && day.height === 80),
      ),
    );
  });

  it("preserves the TimelineViewModel team order", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-01", [
      "team-c",
      "team-a",
      "team-b",
    ]);

    assert.deepEqual(
      buildTimelineGeometry(buildInput(viewModel, 300)).teams.map(
        (team) => team.teamId,
      ),
      viewModel.teams.map((team) => team.id),
    );
  });

  it("preserves exact capacity objects without converting them to numbers", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-01", [
      "team-a",
    ]);
    const source = viewModel.teams[0]!.capacities[0]!.projectCapacity;
    const projected = buildTimelineGeometry(
      buildInput(viewModel, 300),
    ).teams[0]!.days[0]!.projectCapacity;

    assert.strictEqual(projected, source);
    assert.equal(serializeQuantity(projected), "3/2");
    assert.equal(typeof projected, "object");
  });

  it("projects over-reservation without transformation", () => {
    const geometry = buildTimelineGeometry(
      buildInput(
        makeViewModel("2025-01-01", "2025-01-01", ["team-a"], {
          overReserved: true,
        }),
        300,
      ),
    );

    assert.equal(geometry.teams[0]?.days[0]?.overReserved, true);
  });

  it("rejects non-positive and non-finite viewport dimensions", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-01");
    const invalidViewports = [
      { width: 0, teamLaneHeight: 80, timeAxisHeight: 40 },
      { width: Number.NaN, teamLaneHeight: 80, timeAxisHeight: 40 },
      { width: 300, teamLaneHeight: -1, timeAxisHeight: 40 },
      {
        width: 300,
        teamLaneHeight: Number.POSITIVE_INFINITY,
        timeAxisHeight: 40,
      },
      { width: 300, teamLaneHeight: 80, timeAxisHeight: 0 },
      {
        width: 300,
        teamLaneHeight: 80,
        timeAxisHeight: Number.NaN,
      },
    ];

    for (const viewport of invalidViewports) {
      assert.throws(
        () => buildTimelineGeometry({ viewModel, viewport }),
        TypeError,
      );
    }
  });

  it("rejects missing capacity days and dates outside the expected sequence", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-03");
    const team = viewModel.teams[0]!;
    const missingDay: TimelineViewModel = {
      ...viewModel,
      teams: [{ ...team, capacities: team.capacities.slice(0, 2) }],
    };
    const wrongSequence: TimelineViewModel = {
      ...viewModel,
      teams: [
        {
          ...team,
          capacities: [
            team.capacities[0]!,
            { ...team.capacities[1]!, date: date("2025-01-03") },
            team.capacities[2]!,
          ],
        },
      ],
    };

    assert.throws(
      () => buildTimelineGeometry(buildInput(missingDay, 300)),
      TypeError,
    );
    assert.throws(
      () => buildTimelineGeometry(buildInput(wrongSequence, 300)),
      TypeError,
    );
  });

  it("is deterministic for the same input", () => {
    const input = buildInput(
      makeViewModel("2025-01-01", "2025-01-03", ["team-a", "team-b"]),
      275,
    );

    assert.deepEqual(
      buildTimelineGeometry(input),
      buildTimelineGeometry(input),
    );
  });

  it("does not mutate the TimelineViewModel or its collections", () => {
    const viewModel = makeViewModel("2025-01-01", "2025-01-03");
    const teams = viewModel.teams;
    const capacities = viewModel.teams[0]!.capacities;
    const projects = viewModel.projects;
    const diagnostics = viewModel.diagnostics;

    buildTimelineGeometry(buildInput(viewModel, 300));

    assert.strictEqual(viewModel.teams, teams);
    assert.strictEqual(viewModel.teams[0]!.capacities, capacities);
    assert.strictEqual(viewModel.projects, projects);
    assert.strictEqual(viewModel.diagnostics, diagnostics);
  });

  it("freezes the complete geometry tree", () => {
    const geometry = buildTimelineGeometry(
      buildInput(
        makeViewModel("2025-01-01", "2025-01-03", ["team-a", "team-b"]),
        300,
      ),
    );

    assert.equal(Object.isFrozen(geometry), true);
    assert.equal(Object.isFrozen(geometry.timeAxis), true);
    assert.equal(Object.isFrozen(geometry.timeAxis.years), true);
    assert.equal(Object.isFrozen(geometry.timeAxis.months), true);
    assert.ok(geometry.timeAxis.years.every(Object.isFrozen));
    assert.ok(geometry.timeAxis.months.every(Object.isFrozen));
    assert.equal(Object.isFrozen(geometry.teams), true);
    assert.ok(geometry.teams.every(Object.isFrozen));
    for (const team of geometry.teams) {
      assert.equal(Object.isFrozen(team.days), true);
      assert.ok(team.days.every(Object.isFrozen));
    }
  });

  it("does not expose root-level allocation or project-surface geometry", () => {
    const geometry = buildTimelineGeometry(
      buildInput(makeViewModel("2025-01-01", "2025-01-01"), 300),
    );

    for (const property of [
      "allocations",
      "projectSurfaces",
      "projectRects",
      "stack",
    ]) {
      assert.equal(Object.hasOwn(geometry, property), false);
      assert.equal(Object.hasOwn(geometry.teams[0]!, property), false);
    }
  });

  it("uses only CivilDate helpers and allowed adapter dependencies", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/adapters/timeline/geometry/buildTimelineGeometry.ts",
      ),
      "utf8",
    );
    const importPaths = [...source.matchAll(/from "([^"]+)"/g)].map(
      (match) => match[1],
    );

    assert.deepEqual(importPaths, [
      "../../../domain/index.js",
      "../timelineViewModel.js",
      "./timelineGeometry.js",
    ]);
    assert.doesNotMatch(source, /new Date|Date\.parse|getTime|86400000/);
  });
});
