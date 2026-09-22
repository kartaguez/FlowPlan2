import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  createRemainingWorkload,
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import type {
  TimelineProjectTeamState,
  TimelineViewModel,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));
const workload = (value: string) => must(createRemainingWorkload(value));

function makeTimelineViewModel(): TimelineViewModel {
  const firstTeamId = must(createTeamId("team-a"));
  const secondTeamId = must(createTeamId("team-b"));
  const firstProjectId = must(createProjectId("project-a"));
  const secondProjectId = must(createProjectId("project-b"));
  const firstDate = date("2025-01-06");
  const secondDate = date("2025-01-07");

  return {
    horizon: { start: firstDate, end: secondDate },
    projects: [
      {
        id: firstProjectId,
        label: "Project A",
        priorityIndex: 0,
        earliestStartDate: firstDate,
        objectiveEndDate: secondDate,
        mandatoryDeadline: secondDate,
      },
      { id: secondProjectId, label: "Project B", priorityIndex: 1 },
    ],
    teams: [
      {
        id: firstTeamId,
        label: "Team A",
        capacities: [
          {
            date: firstDate,
            effectiveCapacity: capacity("2"),
            reservedCapacity: capacity("0.5"),
            projectCapacity: capacity("1.5"),
            overReserved: false,
          },
        ],
        allocations: [
          {
            projectId: firstProjectId,
            teamId: firstTeamId,
            date: firstDate,
            workload: capacity("1.5"),
          },
        ],
        projectStates: [
          {
            projectId: firstProjectId,
            teamId: firstTeamId,
            complete: true,
            projectedEndDate: firstDate,
            deadlineStatus: "FEASIBLE",
            remainingUnplannedWorkload: workload("0"),
          },
        ],
      },
      {
        id: secondTeamId,
        label: "Team B",
        capacities: [
          {
            date: firstDate,
            effectiveCapacity: capacity("1"),
            reservedCapacity: capacity("0"),
            projectCapacity: capacity("1"),
            overReserved: false,
          },
        ],
        allocations: [
          {
            projectId: secondProjectId,
            teamId: secondTeamId,
            date: firstDate,
            workload: capacity("1"),
          },
        ],
        projectStates: [
          {
            projectId: secondProjectId,
            teamId: secondTeamId,
            complete: false,
            remainingUnplannedWorkload: workload("2"),
          },
        ],
      },
    ],
    diagnostics: [
      {
        code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        teamId: secondTeamId,
        teamLabel: "Team B",
        projectId: secondProjectId,
        projectLabel: "Project B",
        date: secondDate,
      },
    ],
  };
}

describe("TimelineViewModel contract", () => {
  it("can represent projects, teams, capacities, daily allocations, states and diagnostics", () => {
    const viewModel = makeTimelineViewModel();

    assert.equal(viewModel.teams.length, 2);
    assert.equal(viewModel.projects.length, 2);
    assert.equal(viewModel.teams[0]?.capacities.length, 1);
    assert.equal(viewModel.teams[0]?.allocations.length, 1);
    assert.equal(viewModel.teams[0]?.projectStates.length, 1);
    assert.equal(viewModel.diagnostics.length, 1);
  });

  it("preserves exact domain quantities without converting them to numbers", () => {
    const viewModel = makeTimelineViewModel();
    const day = viewModel.teams[0]?.capacities[0];
    const allocation = viewModel.teams[0]?.allocations[0];
    assert.ok(day);
    assert.ok(allocation);

    assert.equal(serializeQuantity(day.projectCapacity), "3/2");
    assert.equal(serializeQuantity(allocation.workload), "3/2");
    assert.equal(typeof allocation.workload, "object");
  });

  it("represents all temporal project metadata with a presentation priority index", () => {
    const project = makeTimelineViewModel().projects[0];
    assert.ok(project);

    assert.equal(project.priorityIndex, 0);
    assert.equal(project.earliestStartDate, date("2025-01-06"));
    assert.equal(project.objectiveEndDate, date("2025-01-07"));
    assert.equal(project.mandatoryDeadline, date("2025-01-07"));
  });

  it("allows independent project-team states for the same project", () => {
    const projectId = must(createProjectId("shared-project"));
    const firstTeamId = must(createTeamId("team-a"));
    const secondTeamId = must(createTeamId("team-b"));
    const states: readonly TimelineProjectTeamState[] = [
      {
        projectId,
        teamId: firstTeamId,
        complete: true,
        projectedEndDate: date("2025-01-06"),
        remainingUnplannedWorkload: workload("0"),
      },
      {
        projectId,
        teamId: secondTeamId,
        complete: false,
        deadlineStatus: "UNFEASIBLE",
        remainingUnplannedWorkload: workload("1.5"),
      },
    ];

    assert.equal(states[0]?.complete, true);
    assert.equal(states[1]?.complete, false);
    assert.equal(states[1]?.deadlineStatus, "UNFEASIBLE");
    assert.equal(
      serializeQuantity(states[1]!.remainingUnplannedWorkload),
      "3/2",
    );
  });

  it("keeps diagnostics semantic, with joined identities but no UI message", () => {
    const diagnostic = makeTimelineViewModel().diagnostics[0];
    assert.ok(diagnostic);

    assert.equal(diagnostic.code, "PROJECT_REMAINS_UNPLANNED_AT_HORIZON");
    assert.equal(diagnostic.teamLabel, "Team B");
    assert.equal(diagnostic.projectLabel, "Project B");
    assert.equal(diagnostic.date, date("2025-01-07"));
    assert.equal(Object.hasOwn(diagnostic, "message"), false);
    assert.equal(Object.hasOwn(diagnostic, "severity"), false);
  });

  it("imports only domain types and declares no geometric or DOM fields", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/adapters/timeline/timelineViewModel.ts"),
      "utf8",
    );
    const importPaths = [...source.matchAll(/from "([^"]+)"/g)].map(
      (match) => match[1],
    );

    assert.deepEqual(importPaths, ["../../domain/index.js"]);
    assert.doesNotMatch(
      source,
      /readonly (?:x|y|width|height|top|left|right|bottom|pixelsPerDay|path|points|transform|viewBox|hitbox|boundingBox):/,
    );
    assert.doesNotMatch(source, /SVGElement|HTMLElement|\bDOM\b/);
  });
});
