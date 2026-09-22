import {
  effectiveCapacity,
  isOverReserved,
  projectCapacity,
  reservedCapacity,
} from "../capacity/calculations.js";
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
  isZero,
  minRational,
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
  PlanningInput,
  PlanningResult,
  ProjectAllocation,
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
    if (!project || !requirement) continue;

    states.push({
      project,
      requirement,
      remaining: rationalOf(requirement.remainingWorkload),
      planned: ZERO,
      allocations: [],
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

function allocateFairlyToAdmittedProjects(
  date: CivilDate,
  availableCapacity: Rational,
  admitted: readonly ProjectTeamState[],
): void {
  let remainingCapacity = availableCapacity;
  const dailyAllocations = new Map<ProjectTeamState, Rational>();
  let allocationMade: boolean;

  do {
    allocationMade = false;

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
  });
}

function planTeam(input: PlanningInput, team: Team): TeamPlanningResult {
  const states = projectsForTeam(input.portfolio, team);
  const dayCapacities: TeamDayCapacity[] = [];
  const dayAdmissions: TeamDayAdmission[] = [];

  for (const date of civilDatesInclusive(
    input.horizon.start,
    input.horizon.end,
  )) {
    const effective = effectiveCapacity(team, date);
    const reserved = reservedCapacity(
      team,
      date,
      input.portfolio.reservations,
    );
    const available = projectCapacity(
      team,
      date,
      input.portfolio.reservations,
    );
    dayCapacities.push(
      Object.freeze({
        date,
        effectiveCapacity: effective,
        reservedCapacity: reserved,
        projectCapacity: available,
        overReserved: isOverReserved(
          team.id,
          date,
          input.portfolio.reservations,
        ),
      }),
    );

    const admitted = selectAdmittedProjects(
      date,
      rationalOf(available),
      team.maxParallelProjects,
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
    allocateFairlyToAdmittedProjects(
      date,
      rationalOf(available),
      admitted,
    );
  }

  return Object.freeze({
    teamId: team.id,
    dayCapacities: Object.freeze(dayCapacities),
    dayAdmissions: Object.freeze(dayAdmissions),
    projectPlans: Object.freeze(states.map((state) => projectResult(team, state))),
  });
}

/**
 * Phase 2C daily admission with normal fair sharing. Deadline-constrained
 * consumption remains outside this phase.
 */
export function planPortfolio(input: PlanningInput): PlanningResult {
  return Object.freeze({
    teamPlans: Object.freeze(
      input.portfolio.teams.map((team) => planTeam(input, team)),
    ),
  });
}
