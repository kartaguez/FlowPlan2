import type {
  TimelineGeometry,
  TimelineRectGeometry,
} from "../../adapters/index.js";
import type { TimelineHit } from "./timelineHitTesting.js";

export type TimelineSelectionGeometry =
  | TimelineSelectionRectGeometry
  | TimelineSelectionLineGeometry;

export interface TimelineSelectionRectGeometry extends TimelineRectGeometry {
  readonly kind: "allocation" | "team" | "reservation";
}

export interface TimelineSelectionLineGeometry {
  readonly kind: "project-marker";
  readonly x: number;
  readonly y1: number;
  readonly y2: number;
}

export function buildTimelineSelectionGeometry(
  geometry: TimelineGeometry,
  hit: TimelineHit,
): TimelineSelectionGeometry {
  const selection = findTimelineSelectionGeometry(geometry, hit);
  if (selection === undefined) {
    throw new TypeError("Selection references geometry that no longer exists.");
  }
  return selection;
}

function findTimelineSelectionGeometry(
  geometry: TimelineGeometry,
  hit: TimelineHit,
): TimelineSelectionGeometry | undefined {
  const team = geometry.teams.find((candidate) => candidate.teamId === hit.teamId);
  if (team === undefined) return undefined;

  if (hit.kind === "team") {
    return Object.freeze({
      kind: "team",
      x: team.x,
      y: team.y,
      width: team.width,
      height: team.height,
    });
  }

  if (hit.kind === "project-marker") {
    const marker = team.markers.find(
      (candidate) =>
        candidate.projectId === hit.projectId &&
        candidate.date === hit.date &&
        candidate.kind === hit.markerKind,
    );
    if (marker === undefined) {
      return undefined;
    }
    return Object.freeze({
      kind: "project-marker",
      x: marker.x,
      y1: marker.y1,
      y2: marker.y2,
    });
  }

  if (hit.kind === "reservation") {
    const segment = team.days.flatMap((day) => day.reservationSegments ?? []).find((candidate) =>
      candidate.reservationId === hit.reservationId && candidate.date === hit.date && candidate.height > 0,
    );
    return segment === undefined ? undefined : Object.freeze({ kind: "reservation", x: segment.x,
      y: segment.y, width: segment.width, height: segment.height });
  }

  for (const day of team.days) {
    const allocation = day.allocations.find(
      (candidate) =>
        candidate.projectId === hit.projectId &&
        candidate.date === hit.date,
    );
    if (allocation !== undefined) {
      return Object.freeze({
        kind: "allocation",
        x: allocation.x,
        y: allocation.y,
        width: allocation.width,
        height: allocation.height,
      });
    }
  }
  return undefined;
}

export function reconcileTimelineHit(
  geometry: TimelineGeometry,
  hit: TimelineHit | undefined,
): TimelineHit | undefined {
  if (hit === undefined) return undefined;
  return findTimelineSelectionGeometry(geometry, hit) === undefined
    ? undefined
    : hit;
}
