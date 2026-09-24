import type {
  Capacity,
  CivilDate,
  DeadlineStatus,
  PlanningDiagnosticCode,
  ProjectId,
  ReservationId,
  ReservationAmount,
  RemainingWorkload,
  TeamId,
} from "../../domain/index.js";

export interface TimelineViewModel {
  readonly horizon: TimelineHorizon;
  readonly teams: readonly TimelineTeam[];
  readonly projects: readonly TimelineProject[];
  readonly diagnostics: readonly TimelineDiagnostic[];
  readonly reservations?: readonly TimelineReservation[];
}

export interface TimelineReservation {
  readonly id: ReservationId;
  readonly label: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly Readonly<{ teamId: TeamId; amount: ReservationAmount }>[];
}

export interface TimelineReservationContribution {
  readonly reservationId: ReservationId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly capacity: Capacity;
}

export interface TimelineHorizon {
  readonly start: CivilDate;
  readonly end: CivilDate;
}

export interface TimelineProject {
  readonly id: ProjectId;
  readonly label: string;
  /** Zero is the highest presentation priority. */
  readonly priorityIndex: number;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly estimatedEndDate?: CivilDate;
  readonly estimatedWithinHorizon?: boolean;
}

export interface TimelineTeam {
  readonly id: TeamId;
  readonly label: string;
  readonly capacities: readonly TimelineCapacityDay[];
  readonly allocations: readonly TimelineAllocation[];
  readonly projectStates: readonly TimelineProjectTeamState[];
  readonly reservationContributions?: readonly TimelineReservationContribution[];
}

export interface TimelineCapacityDay {
  readonly date: CivilDate;
  readonly effectiveCapacity: Capacity;
  readonly reservedCapacity: Capacity;
  readonly projectCapacity: Capacity;
  readonly overReserved: boolean;
}

export interface TimelineAllocation {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly date: CivilDate;
  readonly workload: Capacity;
}

export interface TimelineProjectTeamState {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly complete: boolean;
  readonly projectedEndDate?: CivilDate;
  readonly deadlineStatus?: DeadlineStatus;
  readonly remainingUnplannedWorkload: RemainingWorkload;
  readonly initialWorkload?: RemainingWorkload;
}

export interface TimelineDiagnostic {
  readonly code: PlanningDiagnosticCode;
  readonly teamId?: TeamId;
  readonly teamLabel?: string;
  readonly projectId?: ProjectId;
  readonly projectLabel?: string;
  readonly date?: CivilDate;
}
