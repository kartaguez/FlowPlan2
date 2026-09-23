export type { DomainError, DomainResult } from "./model/result.js";
export {
  divideRationals,
  parseDecimalRational,
  parseSerializedRational,
  rationalFromInteger,
  rationalToCanonicalString,
} from "./model/rational.js";
export {
  addDays,
  civilDatesInclusive,
  compareCivilDates,
  createCivilDate,
  isoWeekday,
  type CivilDate,
} from "./model/date.js";
export {
  capacityFromSerialized,
  capacityRatioFromSerialized,
  createCapacity,
  createCapacityRatio,
  createDailyCap,
  createMaxParallelProjects,
  createProjectId,
  createRemainingWorkload,
  createReservationId,
  createReservationRatio,
  createTeamId,
  createUnavailabilityRatio,
  dailyCapFromSerialized,
  quantityToDecimalString,
  remainingWorkloadFromSerialized,
  reservationRatioFromSerialized,
  unavailabilityRatioFromSerialized,
  serializeQuantity,
  type Capacity,
  type CapacityRatio,
  type DailyCap,
  type MaxParallelProjects,
  type ProjectId,
  type RemainingWorkload,
  type ReservationId,
  type ReservationRatio,
  type TeamId,
  type UnavailabilityRatio,
} from "./model/scalars.js";
export { createPlanningHorizon, type PlanningHorizon } from "./model/horizon.js";
export {
  createPortfolio,
  createProject,
  createProjectTeamRequirement,
  createTeam,
  type Portfolio,
  type Project,
  type ProjectTeamRequirement,
  type Team,
} from "./model/entities.js";
export {
  createCapacityException,
  createCapacityPeriod,
  createTeamCapacitySchedule,
  createWorkingPattern,
  isWorkingDay,
  type CapacityException,
  type CapacityPeriod,
  type IsoWeekday,
  type TeamCapacitySchedule,
  type WorkingPattern,
} from "./capacity/schedule.js";
export {
  createReservation,
  createReservationTeamAllocation,
  isReservationDateApplicable,
  reservationAllocationForTeam,
  type Reservation,
  type ReservationAmount,
  type ReservationTeamAllocation,
} from "./capacity/reservation.js";
export {
  effectiveCapacity,
  isOverReserved,
  projectCapacity,
  reservedCapacity,
  requestedReservationCapacity,
} from "./capacity/calculations.js";
export { planPortfolio } from "./planning/engine.js";
export type {
  PlanningInput,
  PlanningResult,
  DeadlineStatus,
  PlanningDiagnostic,
  PlanningDiagnosticCode,
  ProjectAllocation,
  ProjectDeadlineStatusByDate,
  ProjectTeamPlanningResult,
  TeamDayAdmission,
  TeamDayCapacity,
  TeamPlanningResult,
} from "./planning/contracts.js";
