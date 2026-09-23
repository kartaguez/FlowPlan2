import type { CivilDate } from "../model/date.js";
import type { PlanningHorizon } from "../model/horizon.js";
import type { Portfolio } from "../model/entities.js";
import type { WorkingPattern } from "../capacity/schedule.js";
import type {
  Capacity,
  MaxParallelProjects,
  ProjectId,
  RemainingWorkload,
  TeamId,
} from "../model/scalars.js";

export interface PlanningInput {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
  readonly workingPattern: WorkingPattern;
  /** Shared value, enforced independently inside every team plan. */
  readonly maxParallelProjects: MaxParallelProjects;
}

export interface TeamDayCapacity {
  readonly date: CivilDate;
  readonly effectiveCapacity: Capacity;
  readonly reservedCapacity: Capacity;
  readonly projectCapacity: Capacity;
  readonly overReserved: boolean;
}

export interface TeamDayAdmission {
  readonly date: CivilDate;
  readonly admittedProjectIds: readonly ProjectId[];
}

export interface ProjectAllocation {
  readonly date: CivilDate;
  readonly workload: Capacity;
}

export type DeadlineStatus =
  | "PENDING"
  | "FEASIBLE"
  | "UNFEASIBLE"
  | "MISSED";

export interface ProjectDeadlineStatusByDate {
  readonly date: CivilDate;
  readonly status: DeadlineStatus;
}

export interface ProjectTeamPlanningResult {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly allocations: readonly ProjectAllocation[];
  readonly plannedWorkload: Capacity;
  readonly remainingUnplannedWorkload: RemainingWorkload;
  readonly complete: boolean;
  readonly projectedEndDate?: CivilDate;
  readonly deadlineStatus?: DeadlineStatus;
  readonly deadlineStatuses?: readonly ProjectDeadlineStatusByDate[];
}

export interface TeamPlanningResult {
  readonly teamId: TeamId;
  readonly dayCapacities: readonly TeamDayCapacity[];
  readonly dayAdmissions: readonly TeamDayAdmission[];
  readonly projectPlans: readonly ProjectTeamPlanningResult[];
}

export type PlanningDiagnosticCode =
  | "TEAM_OVER_RESERVED"
  | "PROJECT_REMAINS_UNPLANNED_AT_HORIZON"
  | "DEADLINE_UNFEASIBLE"
  | "DEADLINE_MISSED";

export interface PlanningDiagnostic {
  readonly code: PlanningDiagnosticCode;
  readonly teamId?: TeamId;
  readonly projectId?: ProjectId;
  readonly date?: CivilDate;
}

export interface PlanningResult {
  readonly teamPlans: readonly TeamPlanningResult[];
  readonly diagnostics: readonly PlanningDiagnostic[];
}
