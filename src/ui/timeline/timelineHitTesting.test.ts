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
