import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  createPlanningHorizon,
  createPortfolio,
  createProgram,
  createProgramId,
  createProject,
  createProjectId,
  createProjectTeamRequirement,
  createPriorityFamily,
  createPriorityFamilyId,
  createRemainingWorkload,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  rationalToCanonicalString,
  serializeQuantity,
  type CivilDate,
  type DomainResult,
  type PlanningResult,
  type Portfolio,
  type Project,
  type Rational,
  type Team,
  type TeamPlanningResult,
} from "../../domain/index.js";
import { calculateCursorMetrics, type CalculateCursorMetricsInput } from "./cursorMetrics.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));
const workload = (value: string) => must(createRemainingWorkload(value));
const exact = (value: Rational | undefined) =>
  value === undefined ? undefined : rationalToCanonicalString(value);
const first = date("2025-01-01");
const second = date("2025-01-02");
const third = date("2025-01-03");

function team(id: string): Team {
  return must(createTeam({
    id: must(createTeamId(id)),
    name: id,
    capacitySchedule: must(createTeamCapacitySchedule({ periods: [], exceptions: [] })),
  }));
}

function project(
  id: string,
  requirements: readonly Readonly<{ team: Team; raf: string }>[],
  programId?: Portfolio["programs"][number]["id"],
  priorityFamilyId?: Portfolio["priorityFamilies"][number]["id"],
): Project {
  return must(createProject({
    id: must(createProjectId(id)),
    name: id,
    ...(programId === undefined ? {} : { programId }),
    ...(priorityFamilyId === undefined ? {} : { priorityFamilyId }),
    requirements: requirements.map((item) => must(createProjectTeamRequirement({
      teamId: item.team.id,
      remainingWorkload: workload(item.raf),
    }))),
  }));
}

function day(on: CivilDate, effective: string, reserved: string) {
  return {
    date: on,
    effectiveCapacity: capacity(effective),
    reservedCapacity: capacity(reserved),
    projectCapacity: capacity("0"),
    overReserved: false,
  };
}

function projectPlan(
  item: Project,
  member: Team,
  allocations: readonly Readonly<{ date: CivilDate; value: string }>[],
): TeamPlanningResult["projectPlans"][number] {
  return {
    projectId: item.id,
    teamId: member.id,
    allocations: allocations.map((allocation) => ({
      date: allocation.date,
      workload: capacity(allocation.value),
    })),
    plannedWorkload: capacity("0"),
    remainingUnplannedWorkload: workload("0"),
    complete: false,
  };
}

function fixture(): CalculateCursorMetricsInput {
  const x = team("X");
  const y = team("Y");
  const grouped = must(createProgram({ id: must(createProgramId("grouped")), name: "Grouped" }));
  const zero = must(createProgram({ id: must(createProgramId("zero")), name: "Zero" }));
  const empty = must(createProgram({ id: must(createProgramId("empty")), name: "Empty" }));
  const pas = must(createPriorityFamily({
    id: must(createPriorityFamilyId("pas")), name: "PAS",
  }));
  const zeroPas = must(createPriorityFamily({
    id: must(createPriorityFamilyId("zero-pas")), name: "Zero PAS",
  }));
  const emptyPas = must(createPriorityFamily({
    id: must(createPriorityFamilyId("empty-pas")), name: "Empty PAS",
  }));
  const a = project("A", [{ team: x, raf: "10" }, { team: y, raf: "30" }], grouped.id, pas.id);
  const b = project("B", [{ team: x, raf: "2" }], grouped.id, pas.id);
  const z = project("Z", [{ team: y, raf: "0" }], zero.id, zeroPas.id);
  const portfolio = must(createPortfolio({
    teams: [x, y],
    projects: [a, b, z],
    programs: [grouped, zero, empty],
    priorityFamilies: [pas, zeroPas, emptyPas],
    priorityOrder: [a.id, b.id, z.id],
    reservations: [],
  }));
  const planningResult: PlanningResult = {
    teamPlans: [
      {
        teamId: y.id,
        dayCapacities: [day(first, "12", "0"), day(second, "12", "0")],
        dayAdmissions: [],
        projectPlans: [
          projectPlan(a, y, [{ date: first, value: "2" }, { date: second, value: "4" }]),
          projectPlan(z, y, []),
        ],
      },
      {
        teamId: x.id,
        dayCapacities: [day(first, "10", "1"), day(second, "10", "2")],
        dayAdmissions: [],
        projectPlans: [
          projectPlan(a, x, [{ date: first, value: "2" }, { date: second, value: "3" }]),
          projectPlan(b, x, [{ date: first, value: "1" }]),
        ],
      },
    ],
    diagnostics: [],
  };
  return {
    portfolio,
    horizon: must(createPlanningHorizon({ start: first, end: second })),
    planningResult,
    selectedDate: first,
  };
}

describe("calculateCursorMetrics", () => {
  it("includes the start date and selected date, then the entire run at the end", () => {
    const input = fixture();
    const atStart = calculateCursorMetrics(input);
    assert.equal(atStart.selectedDate, first);
    assert.deepEqual(atStart.teams.map((item) => [
      item.teamId,
      exact(item.effectiveCapacity),
      exact(item.requestedReservedCapacity),
      exact(item.allocatedCapacity),
      exact(item.utilization),
    ]), [
      ["X", "10/1", "1/1", "3/1", "2/5"],
      ["Y", "12/1", "0/1", "2/1", "1/6"],
    ]);
    assert.equal(exact(atStart.projects[0]!.progress), "1/10");

    const atEnd = calculateCursorMetrics({ ...input, selectedDate: second });
    assert.deepEqual(atEnd.teams.map((item) => [
      item.teamId,
      exact(item.effectiveCapacity),
      exact(item.requestedReservedCapacity),
      exact(item.allocatedCapacity),
      exact(item.utilization),
    ]), [
      ["X", "20/1", "3/1", "6/1", "9/20"],
      ["Y", "24/1", "0/1", "6/1", "1/4"],
    ]);
    assert.deepEqual(atEnd.projects.map((item) => [
      item.projectId, exact(item.baselineRAF), exact(item.allocatedWorkload), exact(item.progress),
    ]), [
      ["A", "40/1", "11/1", "11/40"],
      ["B", "2/1", "1/1", "1/2"],
      ["Z", "0/1", "0/1", "1/1"],
    ]);
    assert.deepEqual(atEnd.programs.map((item) => [item.programId, exact(item.progress)]), [
      ["grouped", "2/7"], ["zero", "1/1"],
    ]);
    assert.deepEqual(atEnd.priorityFamilies.map((item) => [
      item.priorityFamilyId, exact(item.progress),
    ]), [["pas", "2/7"], ["zero-pas", "1/1"]]);
    // The Project-percentage average would be 31/80, not 2/7.
    assert.notEqual(exact(atEnd.programs[0]!.progress), "31/80");
    assert.equal(Object.isFrozen(atEnd.projects), true);
  });

  it("rejects dates outside either horizon bound", () => {
    const input = fixture();
    assert.throws(() => calculateCursorMetrics({ ...input, selectedDate: date("2024-12-31") }),
      /outside the planning horizon/);
    assert.throws(() => calculateCursorMetrics({ ...input, selectedDate: date("2025-01-03") }),
      /outside the planning horizon/);
  });

  it("keeps over-reservation above 100% and zero-effective utilization undefined", () => {
    const input = fixture();
    const [x, y] = input.portfolio.teams;
    const planningResult: PlanningResult = {
      teamPlans: [
        {
          teamId: x!.id,
          dayCapacities: [day(first, "2", "3"), day(second, "0", "0")],
          dayAdmissions: [],
          projectPlans: input.planningResult.teamPlans[1]!.projectPlans.map((plan) => ({
            ...plan, allocations: [],
          })),
        },
        {
          teamId: y!.id,
          dayCapacities: [day(first, "0", "0"), day(second, "0", "0")],
          dayAdmissions: [],
          projectPlans: input.planningResult.teamPlans[0]!.projectPlans.map((plan) => ({
            ...plan, allocations: [],
          })),
        },
      ],
      diagnostics: [],
    };
    const metrics = calculateCursorMetrics({ ...input, planningResult });
    assert.equal(exact(metrics.teams[0]!.utilization), "3/2");
    assert.equal(exact(metrics.teams[0]!.overReservedCapacity), "1/1");
    assert.equal(exact(metrics.teams[0]!.overReservationRatio), "1/2");
    assert.equal(metrics.teams[1]!.utilization, undefined);
    assert.equal(metrics.teams[1]!.overReservationRatio, undefined);
  });

  it("keeps an exact fractional daily excess even when effective capacity is zero", () => {
    const input = fixture();
    const x = input.portfolio.teams[0]!;
    const plan = input.planningResult.teamPlans[1]!;
    const result = calculateCursorMetrics({
      ...input,
      planningResult: {
        ...input.planningResult,
        teamPlans: input.planningResult.teamPlans.map((candidate) => candidate.teamId === x.id ? {
          ...plan,
          dayCapacities: [day(first, "0", "0.125")],
          projectPlans: plan.projectPlans.map((projectPlan) => ({ ...projectPlan, allocations: [] })),
        } : candidate),
      },
    });
    assert.equal(exact(result.teams[0]!.overReservedCapacity), "1/8");
    assert.equal(result.teams[0]!.overReservationRatio, undefined);
  });

  it("sums daily over-reservation without compensation from unused days", () => {
    const input = fixture();
    const [x, y] = input.portfolio.teams;
    const planningResult: PlanningResult = {
      teamPlans: [
        {
          ...input.planningResult.teamPlans[1]!,
          teamId: x!.id,
          dayCapacities: [day(first, "10", "15"), day(second, "10", "2"), day(third, "10", "3")],
          projectPlans: input.planningResult.teamPlans[1]!.projectPlans.map((plan) => ({ ...plan, allocations: [] })),
        },
        {
          ...input.planningResult.teamPlans[0]!,
          teamId: y!.id,
          dayCapacities: [day(first, "0", "0"), day(second, "0", "0"), day(third, "0", "0")],
          projectPlans: input.planningResult.teamPlans[0]!.projectPlans.map((plan) => ({ ...plan, allocations: [] })),
        },
      ],
      diagnostics: [],
    };
    const horizon = must(createPlanningHorizon({ start: first, end: third }));
    const atFirst = calculateCursorMetrics({ ...input, horizon, planningResult });
    assert.equal(exact(atFirst.teams[0]!.overReservedCapacity), "5/1");
    assert.equal(exact(atFirst.teams[0]!.overReservationRatio), "1/2");
    const atEnd = calculateCursorMetrics({ ...input, horizon, planningResult, selectedDate: third });
    assert.equal(exact(atEnd.teams[0]!.effectiveCapacity), "30/1");
    assert.equal(exact(atEnd.teams[0]!.requestedReservedCapacity), "20/1");
    assert.equal(exact(atEnd.teams[0]!.overReservedCapacity), "5/1");
    assert.equal(exact(atEnd.teams[0]!.overReservationRatio), "1/6");
  });

  it("preserves non-terminating fractions and reaches exact completion", () => {
    const input = fixture();
    const x = input.portfolio.teams[0]!;
    const sole = project("third", [{ team: x, raf: "3" }]);
    const portfolio = must(createPortfolio({
      ...input.portfolio, projects: [sole], priorityOrder: [sole.id],
    }));
    const planningResult: PlanningResult = {
      teamPlans: [
        {
          teamId: x.id,
          dayCapacities: [day(first, "3", "0"), day(second, "3", "0")],
          dayAdmissions: [],
          projectPlans: [projectPlan(sole, x, [
            { date: first, value: "1" }, { date: second, value: "2" },
          ])],
        },
        { teamId: input.portfolio.teams[1]!.id, dayCapacities: [], dayAdmissions: [], projectPlans: [] },
      ],
      diagnostics: [],
    };
    const partial = calculateCursorMetrics({ ...input, portfolio, planningResult });
    assert.equal(exact(partial.projects[0]!.progress), "1/3");
    assert.equal(exact(partial.teams[0]!.utilization), "1/3");
    const complete = calculateCursorMetrics({ ...input, portfolio, planningResult, selectedDate: second });
    assert.equal(exact(complete.projects[0]!.progress), "1/1");
  });

  it("is deterministic and leaves its inputs unchanged", () => {
    const input = fixture();
    const requirement = input.portfolio.projects[0]!.requirements[0]!;
    const dayCapacity = input.planningResult.teamPlans[0]!.dayCapacities[0]!;
    const firstResult = calculateCursorMetrics(input);
    assert.deepEqual(calculateCursorMetrics(input), firstResult);
    assert.strictEqual(input.portfolio.projects[0]!.requirements[0], requirement);
    assert.strictEqual(input.planningResult.teamPlans[0]!.dayCapacities[0], dayCapacity);
    assert.equal(serializeQuantity(requirement.remainingWorkload), "10/1");
    assert.equal(serializeQuantity(dayCapacity.effectiveCapacity), "12/1");
  });

  it("fails fast on missing or ambiguous Project/Team plans", () => {
    const input = fixture();
    const [firstPlan, secondPlan] = input.planningResult.teamPlans;
    assert.throws(() => calculateCursorMetrics({
      ...input,
      planningResult: { teamPlans: [firstPlan!, { ...secondPlan!, projectPlans: [] }], diagnostics: [] },
    }), /Missing Project\/Team plan/);
    assert.throws(() => calculateCursorMetrics({
      ...input,
      planningResult: {
        teamPlans: [firstPlan!, {
          ...secondPlan!, projectPlans: [secondPlan!.projectPlans[0]!, ...secondPlan!.projectPlans],
        }],
        diagnostics: [],
      },
    }), /Invalid Project\/Team plan/);
    assert.throws(() => calculateCursorMetrics({
      ...input,
      planningResult: { teamPlans: [firstPlan!, firstPlan!], diagnostics: [] },
    }), /teams do not match/);
    assert.throws(() => calculateCursorMetrics({
      ...input,
      planningResult: {
        teamPlans: [firstPlan!, {
          ...secondPlan!, projectPlans: [{
            ...secondPlan!.projectPlans[0]!,
            projectId: must(createProjectId("unknown")),
          }, ...secondPlan!.projectPlans.slice(1)],
        }],
        diagnostics: [],
      },
    }), /Invalid Project\/Team plan/);
  });
});
