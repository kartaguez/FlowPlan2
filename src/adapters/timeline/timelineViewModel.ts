import type {
  Capacity,
  CivilDate,
  DeadlineStatus,
  PlanningDiagnosticCode,
  ProjectId,
  RemainingWorkload,
  TeamId,
} from "../../domain/index.js";

export interface TimelineViewModel {
  readonly horizon: TimelineHorizon;
  readonly teams: readonly TimelineTeam[];
  readonly projects: readonly TimelineProject[];
  readonly diagnostics: readonly TimelineDiagnostic[];
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
}

export interface TimelineTeam {
  readonly id: TeamId;
  readonly label: string;
  readonly capacities: readonly TimelineCapacityDay[];
  readonly allocations: readonly TimelineAllocation[];
  readonly projectStates: readonly TimelineProjectTeamState[];
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
}

export interface TimelineDiagnostic {
  readonly code: PlanningDiagnosticCode;
  readonly teamId?: TeamId;
  readonly teamLabel?: string;
  readonly projectId?: ProjectId;
  readonly projectLabel?: string;
  readonly date?: CivilDate;
}
