import type { Capacity, CivilDate, TeamId } from "../../../domain/index.js";

export interface TimelineGeometryViewport {
  readonly width: number;
  readonly teamLaneHeight: number;
}

export interface TimelineGeometry {
  readonly width: number;
  readonly height: number;
  readonly dayWidth: number;
  readonly teams: readonly TimelineTeamGeometry[];
}

export interface TimelineTeamGeometry {
  readonly teamId: TeamId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly days: readonly TimelineDayGeometry[];
}

export interface TimelineDayGeometry {
  readonly date: CivilDate;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly effectiveCapacity: Capacity;
  readonly reservedCapacity: Capacity;
  readonly projectCapacity: Capacity;
  readonly overReserved: boolean;
}
