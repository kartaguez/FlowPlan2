import type {
  Capacity,
  CivilDate,
  DeadlineStatus,
  ProjectId,
  ReservationId,
  TeamId,
} from "../../../domain/index.js";

export interface TimelineGeometryViewport {
  readonly width: number;
  readonly teamLaneHeight: number;
  readonly teamHeaderHeight?: number;
  readonly timeAxisHeight: number;
  readonly timeAxisLabelHeight?: number;
  readonly globalMetricsHeight?: number;
}

export interface TimelineGeometry {
  readonly width: number;
  readonly height: number;
  readonly dayWidth: number;
  readonly teamHeaderHeight: number;
  readonly globalMetricsHeight?: number;
  readonly dates: readonly TimelineDateGeometry[];
  readonly timeAxis: TimelineTimeAxisGeometry;
  readonly maxEffectiveCapacity: Capacity;
  readonly pixelsPerCapacityUnit: number;
  readonly teams: readonly TimelineTeamGeometry[];
}

export interface TimelineDateGeometry {
  readonly date: CivilDate;
  readonly x: number;
  readonly width: number;
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
  readonly markers: readonly TimelineProjectMarkerGeometry[];
}

export type TimelineProjectMarkerKind =
  | "earliest-start"
  | "objective-end"
  | "mandatory-deadline";

export interface TimelineProjectMarkerGeometry {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly kind: TimelineProjectMarkerKind;
  readonly x: number;
  readonly y1: number;
  readonly y2: number;
  readonly deadlineStatus?: DeadlineStatus;
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
  readonly reservationSegments?: readonly TimelineReservationSegmentGeometry[];
}

export interface TimelineReservationSegmentGeometry extends TimelineRectGeometry {
  readonly reservationId: ReservationId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly capacity: Capacity;
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
