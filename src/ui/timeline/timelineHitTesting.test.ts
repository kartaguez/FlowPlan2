import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry } from "../../adapters/index.js";
import {
  createCivilDate,
  createCapacity,
  createProjectId,
  createReservationId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import { hitTestTimelineGeometry } from "./timelineHitTesting.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const teamId = must(createTeamId("team-alpha"));
const firstProjectId = must(createProjectId("project-one"));
const secondProjectId = must(createProjectId("project-two"));
const firstDate = must(createCivilDate("2025-01-01"));
const secondDate = must(createCivilDate("2025-01-02"));
const reservationId = must(createReservationId("reservation-run"));

function geometry(): TimelineGeometry {
  return {
    width: 600,
    height: 156,
    timeAxis: { height: 56 },
    teams: [
      {
        teamId,
        x: 0,
        y: 56,
        width: 600,
        height: 100,
        markers: [
          {
            projectId: firstProjectId,
            teamId,
            date: firstDate,
            kind: "earliest-start",
            x: 150,
            y1: 56,
            y2: 156,
          },
          {
            projectId: secondProjectId,
            teamId,
            date: firstDate,
            kind: "mandatory-deadline",
            x: 150,
            y1: 56,
            y2: 156,
          },
        ],
        days: [
          {
            date: firstDate,
            x: 0,
            y: 56,
            width: 300,
            height: 100,
            allocations: [
              {
                projectId: firstProjectId,
                teamId,
                date: firstDate,
                x: 0,
                y: 106,
                width: 300,
                height: 50,
              },
            ],
            reservationSegments: [{ reservationId, teamId, date: firstDate,
              capacity: must(createCapacity("1")), x: 0, y: 56, width: 300, height: 30 }],
          },
          {
            date: secondDate,
            x: 300,
            y: 56,
            width: 300,
            height: 100,
            allocations: [
              {
                projectId: secondProjectId,
                teamId,
                date: secondDate,
                x: 300,
                y: 106,
                width: 300,
                height: 50,
              },
            ],
          },
        ],
      },
    ],
  } as unknown as TimelineGeometry;
}

describe("hitTestTimelineGeometry", () => {
  it("keeps distinct Actual sources and exact amounts on the same Team and day", () => {
    const base = geometry();
    const team = base.teams[0]!;
    const day = team.days[0]!;
    const firstAmount = must(createCapacity("10"));
    const secondAmount = must(createCapacity("2.5"));
    const reservationAmount = must(createCapacity("1"));
    const withActuals = { ...base, teams: [{ ...team, days: [{ ...day,
      actualSegments: [
        { sourceKind: "project" as const, sourceId: firstProjectId, sourceLabel: "First",
          teamId, date: firstDate, capacity: firstAmount, x: 0, y: 56, width: 300, height: 10 },
        { sourceKind: "project" as const, sourceId: secondProjectId, sourceLabel: "Second",
          teamId, date: firstDate, capacity: secondAmount, x: 0, y: 66, width: 300, height: 10 },
        { sourceKind: "reservation" as const, sourceId: reservationId, sourceLabel: "Run",
          teamId, date: firstDate, capacity: reservationAmount, x: 0, y: 86, width: 300, height: 10 },
      ],
    }, ...team.days.slice(1)] }] } as TimelineGeometry;
    const hit = (y: number) => hitTestTimelineGeometry({ geometry: withActuals, x: 50, y,
      markerHitTolerance: 4 });
    assert.deepEqual(hit(60), { kind: "actual", sourceKind: "project", sourceId: firstProjectId,
      sourceLabel: "First", teamId, date: firstDate, capacity: firstAmount });
    assert.deepEqual(hit(70), { kind: "actual", sourceKind: "project", sourceId: secondProjectId,
      sourceLabel: "Second", teamId, date: firstDate, capacity: secondAmount });
    assert.deepEqual(hit(90), { kind: "actual", sourceKind: "reservation", sourceId: reservationId,
      sourceLabel: "Run", teamId, date: firstDate, capacity: reservationAmount });
    assert.equal(hit(80)?.kind, "reservation");
  });
  it("hits an identifiable Reservation segment without replacing Team hits", () => {
    assert.deepEqual(hitTestTimelineGeometry({ geometry: geometry(), x: 50, y: 70,
      markerHitTolerance: 4 }), { kind: "reservation", reservationId, teamId, date: firstDate });
    assert.equal(hitTestTimelineGeometry({ geometry: geometry(), x: 50, y: 95,
      markerHitTolerance: 4 })?.kind, "team");
  });
  it("hits an allocation at its center", () => {
    assert.deepEqual(
      hitTestTimelineGeometry({
        geometry: geometry(),
        x: 450,
        y: 130,
        markerHitTolerance: 4,
      }),
      {
        kind: "allocation",
        projectId: secondProjectId,
        teamId,
        date: secondDate,
      },
    );
  });

  it("gives reverse-rendered markers priority over allocations", () => {
    assert.deepEqual(
      hitTestTimelineGeometry({
        geometry: geometry(),
        x: 153,
        y: 130,
        markerHitTolerance: 4,
      }),
      {
        kind: "project-marker",
        projectId: secondProjectId,
        teamId,
        date: firstDate,
        markerKind: "mandatory-deadline",
      },
    );
  });

  it("returns a team hit for an otherwise empty lane point", () => {
    assert.deepEqual(
      hitTestTimelineGeometry({
        geometry: geometry(),
        x: 500,
        y: 80,
        markerHitTolerance: 4,
      }),
      { kind: "team", teamId },
    );
  });

  it("returns no hit in the time axis or outside full geometry", () => {
    const timeline = geometry();
    for (const [x, y] of [
      [100, 20],
      [-1, 80],
      [601, 80],
      [100, -1],
      [100, 157],
    ]) {
      assert.equal(
        hitTestTimelineGeometry({
          geometry: timeline,
          x: x!,
          y: y!,
          markerHitTolerance: 4,
        }),
        undefined,
      );
    }
  });

  it("snaps ulp-scale boundary noise to the right half-open rectangle", () => {
    assert.deepEqual(
      hitTestTimelineGeometry({
        geometry: geometry(),
        x: 299.99999999999994,
        y: 130,
        markerHitTolerance: 0,
      }),
      {
        kind: "allocation",
        projectId: secondProjectId,
        teamId,
        date: secondDate,
      },
    );
  });

  it("does not snap a real difference larger than epsilon", () => {
    assert.deepEqual(
      hitTestTimelineGeometry({
        geometry: geometry(),
        x: 299.99,
        y: 130,
        markerHitTolerance: 0,
      }),
      {
        kind: "allocation",
        projectId: firstProjectId,
        teamId,
        date: firstDate,
      },
    );
  });
});
