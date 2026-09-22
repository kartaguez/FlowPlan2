import {
  GEOMETRY_EPSILON,
  snapToGeometryBoundary,
  type TimelineAllocationGeometry,
  type TimelineGeometry,
  type TimelineProjectMarkerGeometry,
  type TimelineProjectMarkerKind,
  type TimelineRectGeometry,
} from "../../adapters/index.js";
import type {
  CivilDate,
  ProjectId,
  TeamId,
} from "../../domain/index.js";

export interface TimelineAllocationHit {
  readonly kind: "allocation";
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
}

export interface TimelineProjectMarkerHit {
  readonly kind: "project-marker";
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly markerKind: TimelineProjectMarkerKind;
}

export interface TimelineTeamHit {
  readonly kind: "team";
  readonly teamId: TeamId;
}

export type TimelineHit =
  | TimelineAllocationHit
  | TimelineProjectMarkerHit
  | TimelineTeamHit;

export interface HitTestTimelineGeometryInput {
  readonly geometry: TimelineGeometry;
  readonly x: number;
  readonly y: number;
  readonly markerHitTolerance: number;
}

export function hitTestTimelineGeometry(
  input: HitTestTimelineGeometryInput,
): TimelineHit | undefined {
  if (
    !Number.isFinite(input.x) ||
    !Number.isFinite(input.y) ||
    !Number.isFinite(input.markerHitTolerance) ||
    input.markerHitTolerance < 0
  ) {
    throw new TypeError("Hit-test coordinates and tolerance must be finite.");
  }
  if (
    input.x < -GEOMETRY_EPSILON ||
    input.y < -GEOMETRY_EPSILON ||
    input.x > input.geometry.width + GEOMETRY_EPSILON ||
    input.y > input.geometry.height + GEOMETRY_EPSILON
  ) {
    return undefined;
  }

  const x = snapOuterCoordinate(input.x, 0, input.geometry.width);
  const y = snapOuterCoordinate(input.y, 0, input.geometry.height);
  const team = input.geometry.teams.find((candidate) =>
    containsPointHalfOpen(candidate, x, y),
  );
  if (team === undefined) return undefined;

  for (let index = team.markers.length - 1; index >= 0; index -= 1) {
    const marker = team.markers[index]!;
    if (
      containsHalfOpen(y, marker.y1, marker.y2) &&
      Math.abs(x - marker.x) <= input.markerHitTolerance
    ) {
      return freezeMarkerHit(marker);
    }
  }

  for (let dayIndex = team.days.length - 1; dayIndex >= 0; dayIndex -= 1) {
    const allocations = team.days[dayIndex]!.allocations;
    for (let index = allocations.length - 1; index >= 0; index -= 1) {
      const allocation = allocations[index]!;
      if (containsPointHalfOpen(allocation, x, y)) {
        return freezeAllocationHit(allocation);
      }
    }
  }

  return Object.freeze({ kind: "team", teamId: team.teamId });
}

function containsPointHalfOpen(
  rectangle: TimelineRectGeometry,
  x: number,
  y: number,
): boolean {
  return (
    containsHalfOpen(x, rectangle.x, rectangle.x + rectangle.width) &&
    containsHalfOpen(y, rectangle.y, rectangle.y + rectangle.height)
  );
}

function containsHalfOpen(value: number, start: number, end: number): boolean {
  const atStart = snapToGeometryBoundary(value, start);
  const normalized = snapToGeometryBoundary(atStart, end);
  return normalized >= start && normalized < end;
}

function snapOuterCoordinate(value: number, start: number, end: number): number {
  return snapToGeometryBoundary(
    snapToGeometryBoundary(value, start),
    end,
  );
}

function freezeAllocationHit(
  allocation: TimelineAllocationGeometry,
): TimelineAllocationHit {
  return Object.freeze({
    kind: "allocation",
    projectId: allocation.projectId,
    teamId: allocation.teamId,
    date: allocation.date,
  });
}

function freezeMarkerHit(
  marker: TimelineProjectMarkerGeometry,
): TimelineProjectMarkerHit {
  return Object.freeze({
    kind: "project-marker",
    projectId: marker.projectId,
    teamId: marker.teamId,
    date: marker.date,
    markerKind: marker.kind,
  });
}
