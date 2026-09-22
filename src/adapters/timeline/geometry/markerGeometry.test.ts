import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  civilDatesInclusive,
  createCapacity,
  createCivilDate,
  createProjectId,
  createRemainingWorkload,
  createTeamId,
  type DomainResult,
} from "../../../domain/index.js";
import {
  buildTimelineGeometry,
  type TimelineProjectTeamState,
  type TimelineTeam,
  type TimelineViewModel,
} from "../../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));
const workload = (value: string) => must(createRemainingWorkload(value));

function makeViewModel(): TimelineViewModel {
  const start = date("2025-01-01");
  const end = date("2025-01-05");
  const dates = civilDatesInclusive(start, end);
  const firstProjectId = must(createProjectId("project-first"));
  const secondProjectId = must(createProjectId("project-second"));
  const firstTeamId = must(createTeamId("team-a"));
  const secondTeamId = must(createTeamId("team-b"));
  const thirdTeamId = must(createTeamId("team-c"));
  const state = (
    teamId: typeof firstTeamId,
    projectId = firstProjectId,
  ): TimelineProjectTeamState => ({
    projectId,
    teamId,
    complete: false,
    deadlineStatus: "UNFEASIBLE",
    remainingUnplannedWorkload: workload("2"),
  });
  const team = (
    id: typeof firstTeamId,
    projectStates: readonly TimelineProjectTeamState[],
  ): TimelineTeam => ({
    id,
    label: id,
    allocations: [],
    projectStates,
    capacities: dates.map((currentDate) => ({
      date: currentDate,
      effectiveCapacity: capacity("2"),
      reservedCapacity: capacity("0"),
      projectCapacity: capacity("2"),
      overReserved: false,
    })),
  });

  return {
    horizon: { start, end },
    projects: [
      {
        id: firstProjectId,
        label: "First",
        priorityIndex: 0,
        earliestStartDate: date("2025-01-03"),
        objectiveEndDate: date("2025-01-04"),
        mandatoryDeadline: date("2025-01-05"),
      },
      {
        id: secondProjectId,
        label: "Second",
        priorityIndex: 1,
        earliestStartDate: date("2024-12-31"),
        objectiveEndDate: date("2025-01-02"),
        mandatoryDeadline: date("2025-01-06"),
      },
    ],
    teams: [
      team(firstTeamId, [state(firstTeamId), state(firstTeamId, secondProjectId)]),
      team(secondTeamId, [state(secondTeamId)]),
      team(thirdTeamId, []),
    ],
    diagnostics: [],
  };
}

const build = (viewModel = makeViewModel()) =>
  buildTimelineGeometry({
    viewModel,
    viewport: { width: 500, teamLaneHeight: 100, timeAxisHeight: 56 },
  });

describe("TimelineGeometry project markers", () => {
  it("centers each project date in its daily column and preserves marker kinds", () => {
    const markers = build().teams[0]!.markers;

    assert.deepEqual(
      markers.map(({ kind, date: markerDate, x }) => ({
        kind,
        date: markerDate,
        x,
      })),
      [
        { kind: "earliest-start", date: "2025-01-03", x: 250 },
        { kind: "objective-end", date: "2025-01-04", x: 350 },
        { kind: "mandatory-deadline", date: "2025-01-05", x: 450 },
        { kind: "objective-end", date: "2025-01-02", x: 150 },
      ],
    );
  });

  it("bounds markers to their team lane", () => {
    const [firstTeam, secondTeam] = build().teams;

    assert.ok(firstTeam);
    assert.ok(secondTeam);
    assert.ok(
      firstTeam.markers.every(
        (marker) => marker.y1 === 56 && marker.y2 === 156,
      ),
    );
    assert.ok(
      secondTeam.markers.every(
        (marker) => marker.y1 === 156 && marker.y2 === 256,
      ),
    );
  });

  it("repeats project markers only on teams containing its project state", () => {
    const geometry = build();
    const firstProjectId = geometry.teams[0]!.markers[0]!.projectId;

    assert.equal(
      geometry.teams[0]!.markers.filter(
        (marker) => marker.projectId === firstProjectId,
      ).length,
      3,
    );
    assert.equal(
      geometry.teams[1]!.markers.filter(
        (marker) => marker.projectId === firstProjectId,
      ).length,
      3,
    );
    assert.deepEqual(geometry.teams[2]!.markers, []);
  });

  it("omits dates outside the horizon instead of clamping them", () => {
    const secondProjectMarkers = build().teams[0]!.markers.filter(
      (marker) => marker.projectId === must(createProjectId("project-second")),
    );

    assert.deepEqual(
      secondProjectMarkers.map((marker) => marker.kind),
      ["objective-end"],
    );
  });

  it("preserves deadline status only on mandatory deadline markers", () => {
    const markers = build().teams[0]!.markers;
    const deadline = markers.find(
      (marker) => marker.kind === "mandatory-deadline",
    );

    assert.equal(deadline?.deadlineStatus, "UNFEASIBLE");
    assert.ok(
      markers
        .filter((marker) => marker.kind !== "mandatory-deadline")
        .every((marker) => marker.deadlineStatus === undefined),
    );
  });

  it("rejects unknown and duplicate project states", () => {
    const viewModel = makeViewModel();
    const team = viewModel.teams[0]!;
    const unknownState = {
      ...team.projectStates[0]!,
      projectId: must(createProjectId("unknown-project")),
    };
    const unknown: TimelineViewModel = {
      ...viewModel,
      teams: [{ ...team, projectStates: [unknownState] }, ...viewModel.teams.slice(1)],
    };
    const duplicate: TimelineViewModel = {
      ...viewModel,
      teams: [
        {
          ...team,
          projectStates: [team.projectStates[0]!, team.projectStates[0]!],
        },
        ...viewModel.teams.slice(1),
      ],
    };

    assert.throws(() => build(unknown), TypeError);
    assert.throws(() => build(duplicate), TypeError);
  });

  it("freezes marker collections and marker objects", () => {
    const geometry = build();

    assert.ok(geometry.teams.every((team) => Object.isFrozen(team.markers)));
    assert.ok(
      geometry.teams.every((team) => team.markers.every(Object.isFrozen)),
    );
  });
});
