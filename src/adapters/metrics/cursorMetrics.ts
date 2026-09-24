import {
  addRationals,
  compareCivilDates,
  divideRationals,
  isZero,
  rationalFromInteger,
  rationalOf,
  type CivilDate,
  type PlanningHorizon,
  type PlanningResult,
  type Portfolio,
  type ProgramId,
  type ProjectId,
  type PriorityFamilyId,
  type Rational,
  type TeamId,
} from "../../domain/index.js";

export interface CalculateCursorMetricsInput {
  readonly portfolio: Portfolio;
  readonly planningResult: PlanningResult;
  readonly horizon: PlanningHorizon;
  readonly selectedDate: CivilDate;
}

export interface CursorTeamMetrics {
  readonly teamId: TeamId;
  readonly effectiveCapacity: Rational;
  readonly requestedReservedCapacity: Rational;
  readonly allocatedCapacity: Rational;
  readonly utilization: Rational | undefined;
}

export interface CursorProgressMetrics {
  readonly baselineRAF: Rational;
  readonly allocatedWorkload: Rational;
  readonly progress: Rational;
}

export interface CursorProjectMetrics extends CursorProgressMetrics {
  readonly projectId: ProjectId;
}

export interface CursorProgramMetrics extends CursorProgressMetrics {
  readonly programId: ProgramId;
}

export interface CursorPriorityFamilyMetrics extends CursorProgressMetrics {
  readonly priorityFamilyId: PriorityFamilyId;
}

export interface CursorMetricsProjection {
  readonly selectedDate: CivilDate;
  readonly teams: readonly CursorTeamMetrics[];
  readonly projects: readonly CursorProjectMetrics[];
  readonly programs: readonly CursorProgramMetrics[];
  readonly priorityFamilies: readonly CursorPriorityFamilyMetrics[];
}

const ZERO = rationalFromInteger(0n);
const ONE = rationalFromInteger(1n);

function ratioOrOne(numerator: Rational, denominator: Rational): Rational {
  if (isZero(denominator)) return ONE;
  const result = divideRationals(numerator, denominator);
  if (!result.ok) throw new TypeError("Non-zero metric denominator was rejected.");
  return result.value;
}

function inSelectedInterval(date: CivilDate, input: CalculateCursorMetricsInput): boolean {
  return compareCivilDates(date, input.horizon.start) >= 0 &&
    compareCivilDates(date, input.selectedDate) <= 0;
}

export function calculateCursorMetrics(
  input: CalculateCursorMetricsInput,
): CursorMetricsProjection {
  if (
    compareCivilDates(input.selectedDate, input.horizon.start) < 0 ||
    compareCivilDates(input.selectedDate, input.horizon.end) > 0
  ) {
    throw new TypeError(`Selected date ${input.selectedDate} is outside the planning horizon.`);
  }

  const teamIds = new Set(input.portfolio.teams.map((team) => team.id));
  const projectById = new Map(input.portfolio.projects.map((project) => [project.id, project]));
  const plansByTeam = new Map(input.planningResult.teamPlans.map((plan) => [plan.teamId, plan]));
  if (plansByTeam.size !== input.planningResult.teamPlans.length ||
      plansByTeam.size !== teamIds.size ||
      input.planningResult.teamPlans.some((plan) => !teamIds.has(plan.teamId))) {
    throw new TypeError("Planning result teams do not match the Portfolio.");
  }

  const allocatedByProject = new Map<ProjectId, Rational>(
    input.portfolio.projects.map((project) => [project.id, ZERO]),
  );
  const teams: CursorTeamMetrics[] = [];

  for (const team of input.portfolio.teams) {
    const plan = plansByTeam.get(team.id)!;
    let effectiveCapacity = ZERO;
    let requestedReservedCapacity = ZERO;
    let allocatedCapacity = ZERO;

    for (const day of plan.dayCapacities) {
      if (!inSelectedInterval(day.date, input)) continue;
      effectiveCapacity = addRationals(effectiveCapacity, rationalOf(day.effectiveCapacity));
      requestedReservedCapacity = addRationals(
        requestedReservedCapacity,
        rationalOf(day.reservedCapacity),
      );
    }

    const seenProjects = new Set<ProjectId>();
    for (const projectPlan of plan.projectPlans) {
      const project = projectById.get(projectPlan.projectId);
      if (!project || projectPlan.teamId !== team.id ||
          !project.requirements.some((requirement) => requirement.teamId === team.id) ||
          seenProjects.has(project.id)) {
        throw new TypeError(`Invalid Project/Team plan ${projectPlan.projectId}/${team.id}.`);
      }
      seenProjects.add(project.id);
      for (const allocation of projectPlan.allocations) {
        if (!inSelectedInterval(allocation.date, input)) continue;
        const value = rationalOf(allocation.workload);
        allocatedCapacity = addRationals(allocatedCapacity, value);
        allocatedByProject.set(
          project.id,
          addRationals(allocatedByProject.get(project.id)!, value),
        );
      }
    }
    for (const project of input.portfolio.projects) {
      if (project.requirements.some((requirement) => requirement.teamId === team.id) &&
          !seenProjects.has(project.id)) {
        throw new TypeError(`Missing Project/Team plan ${project.id}/${team.id}.`);
      }
    }

    const utilization = isZero(effectiveCapacity)
      ? undefined
      : ratioOrOne(
          addRationals(requestedReservedCapacity, allocatedCapacity),
          effectiveCapacity,
        );
    teams.push(Object.freeze({
      teamId: team.id,
      effectiveCapacity,
      requestedReservedCapacity,
      allocatedCapacity,
      utilization,
    }));
  }

  const projects: CursorProjectMetrics[] = input.portfolio.projects.map((project) => {
    let baselineRAF = ZERO;
    for (const requirement of project.requirements) {
      baselineRAF = addRationals(baselineRAF, rationalOf(requirement.remainingWorkload));
    }
    const allocatedWorkload = allocatedByProject.get(project.id)!;
    return Object.freeze({
      projectId: project.id,
      baselineRAF,
      allocatedWorkload,
      progress: ratioOrOne(allocatedWorkload, baselineRAF),
    });
  });

  const metricsByProject = new Map(projects.map((metrics) => [metrics.projectId, metrics]));
  const programs: CursorProgramMetrics[] = [];
  for (const program of input.portfolio.programs) {
    const members = input.portfolio.projects.filter((project) => project.programId === program.id);
    if (members.length === 0) continue;
    let baselineRAF = ZERO;
    let allocatedWorkload = ZERO;
    for (const project of members) {
      const metrics = metricsByProject.get(project.id)!;
      baselineRAF = addRationals(baselineRAF, metrics.baselineRAF);
      allocatedWorkload = addRationals(allocatedWorkload, metrics.allocatedWorkload);
    }
    programs.push(Object.freeze({
      programId: program.id,
      baselineRAF,
      allocatedWorkload,
      progress: ratioOrOne(allocatedWorkload, baselineRAF),
    }));
  }

  const priorityFamilies: CursorPriorityFamilyMetrics[] = [];
  for (const family of input.portfolio.priorityFamilies) {
    const members = input.portfolio.projects.filter(
      (project) => project.priorityFamilyId === family.id,
    );
    if (members.length === 0) continue;
    let baselineRAF = ZERO;
    let allocatedWorkload = ZERO;
    for (const project of members) {
      const metrics = metricsByProject.get(project.id)!;
      baselineRAF = addRationals(baselineRAF, metrics.baselineRAF);
      allocatedWorkload = addRationals(allocatedWorkload, metrics.allocatedWorkload);
    }
    priorityFamilies.push(Object.freeze({
      priorityFamilyId: family.id,
      baselineRAF,
      allocatedWorkload,
      progress: ratioOrOne(allocatedWorkload, baselineRAF),
    }));
  }

  return Object.freeze({
    selectedDate: input.selectedDate,
    teams: Object.freeze(teams),
    projects: Object.freeze(projects),
    programs: Object.freeze(programs),
    priorityFamilies: Object.freeze(priorityFamilies),
  });
}
