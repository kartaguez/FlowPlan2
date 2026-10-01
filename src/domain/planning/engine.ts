import { dailyCapacitySnapshot } from "../capacity/calculations.js";
import {
  civilDatesInclusive,
  compareCivilDates,
  type CivilDate,
} from "../model/date.js";
import type {
  Portfolio,
  Project,
  ProjectTeamRequirement,
  Team,
} from "../model/entities.js";
import {
  addRationals,
  compareRationals,
  createRational,
  divideRationals,
  isZero,
  minRational,
  multiplyRationals,
  rationalFromInteger,
  subtractRationals,
  type Rational,
} from "../model/rational.js";
import type { DomainResult } from "../model/result.js";
import {
  capacityFromRational,
  rationalOf,
  remainingWorkloadFromRational,
  type MaxParallelProjects,
} from "../model/scalars.js";
import type {
  DeadlineStatus,
  PlanningDiagnostic,
  PlanningInput,
  PlanningResult,
  ProjectAllocation,
  ProjectDeadlineStatusByDate,
  ProjectTeamPlanningResult,
  TeamDayAdmission,
  TeamDayCapacity,
  TeamPlanningResult,
} from "./contracts.js";

interface ProjectTeamState {
  readonly project: Project;
  readonly requirement: ProjectTeamRequirement;
  remaining: Rational;
  planned: Rational;
  readonly allocations: ProjectAllocation[];
  lastAllocationDate?: CivilDate;
  deadlineStatus?: DeadlineStatus;
  readonly deadlineStatuses?: ProjectDeadlineStatusByDate[];
}

const ZERO = rationalFromInteger(0n);

function unwrapProvenQuantity<T>(result: DomainResult<T>): T {
  if (!result.ok) {
    throw new TypeError("A planning calculation violated its proven invariant.");
  }
  return result.value;
}

const NORMAL_ALLOCATION_QUANTUM = unwrapProvenQuantity(
  createRational(1n, 2n, "normalAllocationQuantum"),
);

function projectsForTeam(
  portfolio: Portfolio,
  team: Team,
): ProjectTeamState[] {
  const projectsById = new Map(
    portfolio.projects.map((project) => [project.id, project]),
  );
  const states: ProjectTeamState[] = [];

  for (const projectId of portfolio.priorityOrder) {
    const project = projectsById.get(projectId);
    const requirement = project?.requirements.find(
      (candidate) => candidate.teamId === team.id,
    );
    if (!project || !project.isActive || !requirement) continue;

    states.push({
      project,
      requirement,
      remaining: rationalOf(requirement.remainingWorkload),
      planned: ZERO,
      allocations: [],
      ...(project.mandatoryDeadline
        ? { deadlineStatus: "PENDING" as const, deadlineStatuses: [] }
        : {}),
    });
  }

  return states;
}

function selectAdmittedProjects(
  date: CivilDate,
  availableCapacity: Rational,
  maximumProjects: MaxParallelProjects,
  states: readonly ProjectTeamState[],
): readonly ProjectTeamState[] {
  if (isZero(availableCapacity)) return Object.freeze([]);

  const admitted: ProjectTeamState[] = [];

  for (const state of states) {
    if (isZero(state.remaining)) continue;
    if (
      state.project.earliestStartDate &&
      compareCivilDates(date, state.project.earliestStartDate) < 0
    ) {
      continue;
    }
    if (state.requirement.dailyCap) {
      const dailyCap = rationalOf(state.requirement.dailyCap);
      if (isZero(dailyCap)) continue;
    }

    admitted.push(state);
    if (admitted.length === maximumProjects) break;
  }

  return Object.freeze(admitted);
}

function normalAllocationIncrement(
  remainingCapacity: Rational,
  state: ProjectTeamState,
  allocatedToday: Rational,
): Rational {
  let maximumAbsorbable = minRational(remainingCapacity, state.remaining);

  if (state.requirement.dailyCap) {
    const remainingDailyCap = subtractRationals(
      rationalOf(state.requirement.dailyCap),
      allocatedToday,
    );
    maximumAbsorbable = minRational(maximumAbsorbable, remainingDailyCap);
  }

  if (compareRationals(maximumAbsorbable, NORMAL_ALLOCATION_QUANTUM) >= 0) {
    return NORMAL_ALLOCATION_QUANTUM;
  }
  if (
    !isZero(state.remaining) &&
    compareRationals(state.remaining, maximumAbsorbable) <= 0
  ) {
    return state.remaining;
  }
  return ZERO;
}

function fullQuantumRounds(available: Rational, quantum: Rational): bigint {
  return (available.numerator * quantum.denominator) /
    (available.denominator * quantum.numerator);
}

/** Apply whole fair-sharing rounds at once; one round gives every eligible Project 0.5. */
function allocateCompleteRounds(
  remainingCapacity: Rational,
  admitted: readonly ProjectTeamState[],
  dailyAllocations: Map<ProjectTeamState, Rational>,
): Rational | undefined {
  const eligible: ProjectTeamState[] = [];
  let maximumRounds: bigint | undefined;
  for (const state of admitted) {
    const allocatedToday = dailyAllocations.get(state) ?? ZERO;
    let absorbable = state.remaining;
    if (state.requirement.dailyCap) {
      absorbable = minRational(absorbable,
        subtractRationals(rationalOf(state.requirement.dailyCap), allocatedToday));
    }
    if (compareRationals(absorbable, NORMAL_ALLOCATION_QUANTUM) < 0) {
      // A final sub-quantum completion must keep its original position in the next pass.
      if (!isZero(state.remaining) && compareRationals(state.remaining, absorbable) <= 0) return undefined;
      continue;
    }
    eligible.push(state);
    const rounds = fullQuantumRounds(absorbable, NORMAL_ALLOCATION_QUANTUM);
    maximumRounds = maximumRounds === undefined || rounds < maximumRounds ? rounds : maximumRounds;
  }
  if (eligible.length === 0 || maximumRounds === undefined) return undefined;
  const roundCapacity = multiplyRationals(NORMAL_ALLOCATION_QUANTUM,
    rationalFromInteger(BigInt(eligible.length)));
  const capacityRounds = fullQuantumRounds(remainingCapacity, roundCapacity);
  const rounds = maximumRounds < capacityRounds ? maximumRounds : capacityRounds;
  if (rounds === 0n) return undefined;
  const perProject = multiplyRationals(NORMAL_ALLOCATION_QUANTUM, rationalFromInteger(rounds));
  for (const state of eligible) addDailyAllocation(state, perProject, dailyAllocations);
  return subtractRationals(remainingCapacity,
    multiplyRationals(perProject, rationalFromInteger(BigInt(eligible.length))));
}

function allocateFairlyToAdmittedProjects(
  availableCapacity: Rational,
  admitted: readonly ProjectTeamState[],
  dailyAllocations: Map<ProjectTeamState, Rational>,
): Rational {
  let remainingCapacity = availableCapacity;
  let allocationMade: boolean;

  do {
    allocationMade = false;

    const afterCompleteRounds = allocateCompleteRounds(remainingCapacity, admitted, dailyAllocations);
    if (afterCompleteRounds !== undefined) {
      remainingCapacity = afterCompleteRounds;
      allocationMade = true;
      continue;
    }

    for (const state of admitted) {
      if (isZero(remainingCapacity)) break;

      const allocatedToday = dailyAllocations.get(state) ?? ZERO;
      const increment = normalAllocationIncrement(
        remainingCapacity,
        state,
        allocatedToday,
      );
      if (isZero(increment)) continue;

      dailyAllocations.set(state, addRationals(allocatedToday, increment));
      state.remaining = subtractRationals(state.remaining, increment);
      remainingCapacity = subtractRationals(remainingCapacity, increment);
      allocationMade = true;
    }
  } while (allocationMade && !isZero(remainingCapacity));

  return remainingCapacity;
}

function deadlineAccessibleCapacity(
  state: ProjectTeamState,
  date: CivilDate,
  today: CivilDate,
  baseCapacityForDate: (date: CivilDate) => Rational,
  residualByDate: Map<CivilDate, Rational>,
  dailyAllocations: ReadonlyMap<ProjectTeamState, Rational>,
): Rational {
  let residual = residualByDate.get(date);
  if (residual === undefined) {
    residual = baseCapacityForDate(date);
    residualByDate.set(date, residual);
  }

  if (!state.requirement.dailyCap) return residual;

  const allocated = date === today ? dailyAllocations.get(state) ?? ZERO : ZERO;
  const remainingDailyCap = subtractRationals(
    rationalOf(state.requirement.dailyCap),
    allocated,
  );
  return minRational(residual, remainingDailyCap);
}

function subtractDeadlineCapacity(
  date: CivilDate,
  amount: Rational,
  residualByDate: Map<CivilDate, Rational>,
): void {
  const residual = residualByDate.get(date);
  if (residual === undefined) {
    throw new TypeError("Deadline capacity must be initialized before use.");
  }
  residualByDate.set(date, subtractRationals(residual, amount));
}

function addDailyAllocation(
  state: ProjectTeamState,
  increment: Rational,
  dailyAllocations: Map<ProjectTeamState, Rational>,
): void {
  if (isZero(increment)) return;
  dailyAllocations.set(
    state,
    addRationals(dailyAllocations.get(state) ?? ZERO, increment),
  );
  state.remaining = subtractRationals(state.remaining, increment);
}

function updateMissedDeadlineStatuses(
  date: CivilDate,
  team: Team,
  states: readonly ProjectTeamState[],
  diagnostics: PlanningDiagnostic[],
): void {
  for (const state of states) {
    const deadline = state.project.mandatoryDeadline;
    if (
      deadline &&
      !isZero(state.remaining) &&
      compareCivilDates(date, deadline) > 0
    ) {
      if (state.deadlineStatus !== "MISSED") {
        diagnostics.push(
          Object.freeze({
            code: "DEADLINE_MISSED",
            teamId: team.id,
            projectId: state.project.id,
            date,
          }),
        );
      }
      state.deadlineStatus = "MISSED";
    }
  }
}

function sumDeadlineAccessibility(
  state: ProjectTeamState,
  dates: readonly CivilDate[],
  today: CivilDate,
  baseCapacityForDate: (date: CivilDate) => Rational,
  residualByDate: Map<CivilDate, Rational>,
  dailyAllocations: ReadonlyMap<ProjectTeamState, Rational>,
): Rational {
  let total = ZERO;
  for (const date of dates) {
    total = addRationals(
      total,
      deadlineAccessibleCapacity(
        state,
        date,
        today,
        baseCapacityForDate,
        residualByDate,
        dailyAllocations,
      ),
    );
  }
  return total;
}

function allocateDeadlineProjects(
  today: CivilDate,
  availableCapacity: Rational,
  team: Team,
  baseCapacityForDate: (date: CivilDate) => Rational,
  admitted: readonly ProjectTeamState[],
  dailyAllocations: Map<ProjectTeamState, Rational>,
  diagnostics: PlanningDiagnostic[],
): Rational {
  const residualByDate = new Map<CivilDate, Rational>([
    [today, availableCapacity],
  ]);

  for (const [index, state] of admitted.entries()) {
    const deadline = state.project.mandatoryDeadline;
    if (!deadline) continue;

    const remainingBeforeAllocation = state.remaining;
    const datesToDeadline =
      compareCivilDates(today, deadline) <= 0
        ? civilDatesInclusive(today, deadline)
        : Object.freeze([]);

    let remainingAccessible = ZERO;
    if (
      state.deadlineStatus !== "UNFEASIBLE" &&
      state.deadlineStatus !== "MISSED"
    ) {
      remainingAccessible = sumDeadlineAccessibility(
        state,
        datesToDeadline,
        today,
        baseCapacityForDate,
        residualByDate,
        dailyAllocations,
      );
      if (
        compareRationals(remainingBeforeAllocation, remainingAccessible) <= 0
      ) {
        state.deadlineStatus = "FEASIBLE";
      } else {
        state.deadlineStatus = "UNFEASIBLE";
        diagnostics.push(
          Object.freeze({
            code: "DEADLINE_UNFEASIBLE",
            teamId: team.id,
            projectId: state.project.id,
            date: today,
          }),
        );
      }
    }

    if (state.deadlineStatus === "FEASIBLE") {
      const requiredRatio = unwrapProvenQuantity(
        divideRationals(
          remainingBeforeAllocation,
          remainingAccessible,
          "remainingAccessibleCapacity",
        ),
      );
      if (!admitted.slice(index + 1).some((later) => later.project.mandatoryDeadline)) {
        // No later mandatory Project reads the future residual trajectory.
        // Only today's allocation can affect this Team's committed plan.
        const accessibleToday = deadlineAccessibleCapacity(state, today, today,
          baseCapacityForDate, residualByDate, dailyAllocations);
        const increment = minRational(remainingBeforeAllocation,
          multiplyRationals(accessibleToday, requiredRatio));
        subtractDeadlineCapacity(today, increment, residualByDate);
        addDailyAllocation(state, increment, dailyAllocations);
        continue;
      }
      let projectedRemaining = remainingBeforeAllocation;

      for (const date of datesToDeadline) {
        const accessible = deadlineAccessibleCapacity(
          state,
          date,
          today,
          baseCapacityForDate,
          residualByDate,
          dailyAllocations,
        );
        const increment = minRational(
          projectedRemaining,
          multiplyRationals(accessible, requiredRatio),
        );
        subtractDeadlineCapacity(date, increment, residualByDate);
        projectedRemaining = subtractRationals(projectedRemaining, increment);
        if (date === today) {
          addDailyAllocation(state, increment, dailyAllocations);
        }
      }
      continue;
    }

    // UNFEASIBLE and MISSED have no future trajectory: admission today only
    // authorizes maximum consumption today.
    const accessibleToday = deadlineAccessibleCapacity(
      state,
      today,
      today,
      baseCapacityForDate,
      residualByDate,
      dailyAllocations,
    );
    const increment = minRational(remainingBeforeAllocation, accessibleToday);
    subtractDeadlineCapacity(today, increment, residualByDate);
    addDailyAllocation(state, increment, dailyAllocations);
  }

  return residualByDate.get(today) ?? ZERO;
}

function commitDailyAllocations(
  date: CivilDate,
  admitted: readonly ProjectTeamState[],
  dailyAllocations: ReadonlyMap<ProjectTeamState, Rational>,
): void {
  for (const state of admitted) {
    const dailyAllocation = dailyAllocations.get(state);
    if (!dailyAllocation || isZero(dailyAllocation)) continue;

    const workload = unwrapProvenQuantity(
      capacityFromRational(dailyAllocation),
    );
    state.allocations.push(Object.freeze({ date, workload }));
    state.planned = addRationals(state.planned, dailyAllocation);
    state.lastAllocationDate = date;
  }
}

function recordDeadlineStatuses(
  date: CivilDate,
  states: readonly ProjectTeamState[],
): void {
  for (const state of states) {
    if (!state.deadlineStatus || !state.deadlineStatuses) continue;
    state.deadlineStatuses.push(
      Object.freeze({ date, status: state.deadlineStatus }),
    );
  }
}

function projectResult(
  team: Team,
  state: ProjectTeamState,
): ProjectTeamPlanningResult {
  const complete = isZero(state.remaining);
  return Object.freeze({
    projectId: state.project.id,
    teamId: team.id,
    allocations: Object.freeze([...state.allocations]),
    plannedWorkload: unwrapProvenQuantity(
      capacityFromRational(state.planned, "plannedWorkload"),
    ),
    remainingUnplannedWorkload: unwrapProvenQuantity(
      remainingWorkloadFromRational(
        state.remaining,
        "remainingUnplannedWorkload",
      ),
    ),
    complete,
    ...(complete && state.lastAllocationDate
      ? { projectedEndDate: state.lastAllocationDate }
      : {}),
    ...(state.deadlineStatus && state.deadlineStatuses
      ? {
          deadlineStatus: state.deadlineStatus,
          deadlineStatuses: Object.freeze([...state.deadlineStatuses]),
        }
      : {}),
  });
}

function planTeam(
  input: PlanningInput,
  team: Team,
  diagnostics: PlanningDiagnostic[],
): TeamPlanningResult {
  const states = projectsForTeam(input.portfolio, team);
  const dayCapacities: TeamDayCapacity[] = [];
  const dayAdmissions: TeamDayAdmission[] = [];
  const occupation = new Map<CivilDate, NonNullable<PlanningInput["actualOccupation"]>[number]>();
  for (const row of input.actualOccupation ?? []) if (row.teamId === team.id) occupation.set(row.date, row);
  const snapshots = new Map<CivilDate, ReturnType<typeof dailyCapacitySnapshot>>();
  const snapshotForDate = (date: CivilDate) => {
    let snapshot = snapshots.get(date);
    if (!snapshot) {
      const actual = occupation.get(date);
      snapshot = dailyCapacitySnapshot(team, date, input.portfolio.reservations,
        input.workingPattern, actual?.projectActual, actual?.reservationActual);
      snapshots.set(date, snapshot);
    }
    return snapshot;
  };
  const baseCapacityForDate = (date: CivilDate) => rationalOf(snapshotForDate(date).projectCapacity);

  for (const date of civilDatesInclusive(
    input.horizon.start,
    input.horizon.end,
  )) {
    const snapshot = snapshotForDate(date);
    const available = snapshot.projectCapacity;
    const overReserved = compareRationals(rationalOf(snapshot.reservationOverCapacity), ZERO) > 0;
    dayCapacities.push(Object.freeze({ date, ...snapshot, overReserved }));
    if (compareRationals(rationalOf(snapshot.actualOverCapacity), ZERO) > 0) {
      diagnostics.push(Object.freeze({ code: "TEAM_ACTUALS_OVER_CAPACITY", teamId: team.id, date }));
    }
    if (overReserved) {
      diagnostics.push(Object.freeze({ code: "TEAM_OVER_RESERVED", teamId: team.id, date }));
    }
    updateMissedDeadlineStatuses(date, team, states, diagnostics);

    const admitted = selectAdmittedProjects(
      date,
      rationalOf(available),
      input.maxParallelProjects,
      states,
    );
    dayAdmissions.push(
      Object.freeze({
        date,
        admittedProjectIds: Object.freeze(
          admitted.map((state) => state.project.id),
        ),
      }),
    );
    const dailyAllocations = new Map<ProjectTeamState, Rational>();
    const remainingAfterDeadlines = allocateDeadlineProjects(
      date,
      rationalOf(available),
      team,
      baseCapacityForDate,
      admitted,
      dailyAllocations,
      diagnostics,
    );
    allocateFairlyToAdmittedProjects(
      remainingAfterDeadlines,
      admitted,
      dailyAllocations,
    );
    commitDailyAllocations(date, admitted, dailyAllocations);
    recordDeadlineStatuses(date, states);
  }

  const projectPlans = states.map((state) => projectResult(team, state));
  states.forEach((state) => {
    if (!isZero(state.remaining)) {
      diagnostics.push(
        Object.freeze({
          code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
          teamId: team.id,
          projectId: state.project.id,
        }),
      );
    }
  });

  return Object.freeze({
    teamId: team.id,
    dayCapacities: Object.freeze(dayCapacities),
    dayAdmissions: Object.freeze(dayAdmissions),
    projectPlans: Object.freeze(projectPlans),
  });
}

/**
 * Planning Engine V1: capacity, frozen daily admission, exact deadline
 * consumption, then normal fair sharing of the remaining capacity.
 */
export function planPortfolio(input: PlanningInput): PlanningResult {
  const diagnostics: PlanningDiagnostic[] = [];
  const teamIds = new Set(input.portfolio.teams.map((team) => team.id));
  const occupationKeys = new Set<string>();
  for (const row of input.actualOccupation ?? []) {
    const key = `${row.teamId}\u0000${row.date}`;
    if (!teamIds.has(row.teamId) || occupationKeys.has(key) ||
      compareRationals(rationalOf(row.projectActual), ZERO) < 0 ||
      compareRationals(rationalOf(row.reservationActual), ZERO) < 0) {
      throw new TypeError("Invalid actual occupation Team/date row.");
    }
    occupationKeys.add(key);
  }
  return Object.freeze({
    teamPlans: Object.freeze(
      input.portfolio.teams.map((team) =>
        planTeam(input, team, diagnostics),
      ),
    ),
    diagnostics: Object.freeze(diagnostics),
  });
}
