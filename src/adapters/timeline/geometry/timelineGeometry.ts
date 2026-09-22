import type {
  Capacity,
  CivilDate,
  ProjectId,
  TeamId,
} from "../../../domain/index.js";

export interface TimelineGeometryViewport {
  readonly width: number;
  readonly teamLaneHeight: number;
  readonly timeAxisHeight: number;
}

export interface TimelineGeometry {
  readonly width: number;
  readonly height: number;
  readonly dayWidth: number;
  readonly timeAxis: TimelineTimeAxisGeometry;
  readonly maxEffectiveCapacity: Capacity;
  readonly pixelsPerCapacityUnit: number;
  readonly teams: readonly TimelineTeamGeometry[];
}

export interface TimelineTimeAxisGeometry extends TimelineRectGeometry {
  readonly years: readonly TimelineYearGeometry[];
  readonly months: readonly TimelineMonthGeometry[];
}

export interface TimelineYearGeometry extends TimelineRectGeometry {
  readonly year: number;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
}

export interface TimelineMonthGeometry extends TimelineRectGeometry {
  readonly year: number;
  readonly month: number;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
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
  readonly capacityTube: TimelineCapacityTubeGeometry;
  readonly allocations: readonly TimelineAllocationGeometry[];
}

export interface TimelineAllocationGeometry {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly workload: Capacity;
  readonly priorityIndex: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TimelineCapacityTubeGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly projectRegion: TimelineRectGeometry;
  readonly reservedRegion: TimelineRectGeometry;
}

export interface TimelineRectGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
