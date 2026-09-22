import type {
  TimelineGeometry,
  TimelineRectGeometry,
} from "../../adapters/index.js";
import type { TimelineHit } from "./timelineHitTesting.js";

export type TimelineSelectionGeometry =
  | TimelineSelectionRectGeometry
  | TimelineSelectionLineGeometry;

export interface TimelineSelectionRectGeometry extends TimelineRectGeometry {
  readonly kind: "allocation" | "team";
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
  const team = geometry.teams.find((candidate) => candidate.teamId === hit.teamId);
  if (team === undefined) {
    throw new TypeError(`Selection references unknown team ${hit.teamId}.`);
  }

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
      throw new TypeError("Selection references unknown project marker geometry.");
    }
    return Object.freeze({
      kind: "project-marker",
      x: marker.x,
      y1: marker.y1,
      y2: marker.y2,
    });
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
  throw new TypeError("Selection references unknown allocation geometry.");
}
