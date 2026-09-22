import type { CivilDate } from "../model/date.js";
import type { PlanningHorizon } from "../model/horizon.js";
import type { Portfolio } from "../model/entities.js";
import type {
  Capacity,
  ProjectId,
  RemainingWorkload,
  TeamId,
} from "../model/scalars.js";

export interface PlanningInput {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
}

export interface TeamDayCapacity {
  readonly date: CivilDate;
  readonly effectiveCapacity: Capacity;
  readonly reservedCapacity: Capacity;
  readonly projectCapacity: Capacity;
  readonly overReserved: boolean;
}

export interface ProjectAllocation {
  readonly date: CivilDate;
  readonly workload: Capacity;
}

export interface ProjectTeamPlanningResult {
  readonly projectId: ProjectId;
  readonly teamId: TeamId;
  readonly allocations: readonly ProjectAllocation[];
  readonly plannedWorkload: Capacity;
  readonly remainingUnplannedWorkload: RemainingWorkload;
  readonly complete: boolean;
  readonly projectedEndDate?: CivilDate;
}

export interface TeamPlanningResult {
  readonly teamId: TeamId;
  readonly dayCapacities: readonly TeamDayCapacity[];
  readonly projectPlans: readonly ProjectTeamPlanningResult[];
}

export interface PlanningResult {
  readonly teamPlans: readonly TeamPlanningResult[];
}
