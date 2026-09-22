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

function allocateSequentiallyToAdmittedProjects(
  date: CivilDate,
  availableCapacity: Rational,
  admitted: readonly ProjectTeamState[],
): void {
  let remainingCapacity = availableCapacity;

  for (const state of admitted) {
    if (isZero(remainingCapacity)) break;

    let allocation = minRational(remainingCapacity, state.remaining);
    if (state.requirement.dailyCap) {
      allocation = minRational(
        allocation,
        rationalOf(state.requirement.dailyCap),
      );
    }
    if (isZero(allocation)) continue;

    const workload = unwrapProvenQuantity(capacityFromRational(allocation));
    state.allocations.push(Object.freeze({ date, workload }));
    state.remaining = subtractRationals(state.remaining, allocation);
    state.planned = addRationals(state.planned, allocation);
    state.lastAllocationDate = date;
    remainingCapacity = subtractRationals(remainingCapacity, allocation);
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
    allocateSequentiallyToAdmittedProjects(
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
 * Phase 2B daily admission with a deliberately temporary sequential consumer.
 * This is not the final deadline, sharing, quantization, or redistribution
 * policy.
 */
export function planPortfolio(input: PlanningInput): PlanningResult {
  return Object.freeze({
    teamPlans: Object.freeze(
      input.portfolio.teams.map((team) => planTeam(input, team)),
    ),
  });
}
