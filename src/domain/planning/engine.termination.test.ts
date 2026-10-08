import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recomputePlanning } from "../../application/planning/recomputePlanning.js";
import {
  createCapacity, createCapacityPeriod, createCivilDate, createDailyCap,
  createMaxParallelProjects, createPlanningHorizon, createPortfolio,
  createProject, createProjectId, createProjectTeamRequirement,
  createRemainingWorkload, createReservation, createReservationId,
  createReservationTeamAllocation, createTeam, createTeamCapacitySchedule,
  createTeamId, createWorkingPattern, serializeQuantity, type DomainResult,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const date = (value: string) => must(createCivilDate(value));

interface Case {
  readonly name: string;
  readonly capacity: string;
  readonly laterCapacity?: string;
  readonly workload: string;
  readonly deadline: string;
  readonly earliest?: string;
  readonly dailyCap?: string;
  readonly reserved?: string;
  readonly secondWorkload?: string;
  readonly maxParallel?: number;
  readonly end?: string;
  readonly diagnostic?: string;
}

function run(example: Case) {
  const teamId = must(createTeamId("team-termination"));
  const end = date(example.end ?? "2025-01-03");
  const periods = example.laterCapacity === undefined
    ? [must(createCapacityPeriod({ start: date("2025-01-01"), end,
      dailyCapacity: must(createCapacity(example.capacity)) }))]
    : [must(createCapacityPeriod({ start: date("2025-01-01"), end: date("2025-01-01"),
      dailyCapacity: must(createCapacity(example.capacity)) })),
      must(createCapacityPeriod({ start: date("2025-01-02"), end,
        dailyCapacity: must(createCapacity(example.laterCapacity)) }))];
  const team = must(createTeam({ id: teamId, name: "Team",
    capacitySchedule: must(createTeamCapacitySchedule({ periods, exceptions: [] })) }));
  const project = (id: string, workload: string, mandatory: boolean) => must(createProject({
    id: must(createProjectId(id)), name: id,
    ...(mandatory ? { objectiveEndDate: date(example.deadline), mandatoryDeadline: date(example.deadline) } : {}),
    ...(example.earliest ? { earliestStartDate: date(example.earliest) } : {}),
    requirements: [must(createProjectTeamRequirement({ teamId,
      remainingWorkload: must(createRemainingWorkload(workload)),
      ...(example.dailyCap ? { dailyCap: must(createDailyCap(example.dailyCap)) } : {}) }))],
  }));
  const projects = [project("mandatory", example.workload, true),
    ...(example.secondWorkload ? [project("concurrent", example.secondWorkload, false)] : [])];
  const reservations = example.reserved === undefined ? [] : [must(createReservation({
    id: must(createReservationId("reservation")), name: "Reservation",
    startDate: date("2025-01-01"), endDate: end,
    teamAllocations: [must(createReservationTeamAllocation({ teamId,
      amount: { kind: "fixed-daily", dailyCapacity: must(createCapacity(example.reserved)) } }))],
  }))];
  const portfolio = must(createPortfolio({ teams: [team], projects, reservations,
    programs: [], priorityFamilies: [], priorityOrder: projects.map((item) => item.id) }));
  const result = recomputePlanning({ portfolio,
    horizon: must(createPlanningHorizon({ start: date("2025-01-01"), end })),
    workingPattern: must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] })),
    maxParallelProjects: must(createMaxParallelProjects(example.maxParallel ?? 2)), projectActualsKnowledge: portfolio.projects.map(project => ({ projectId: project.id, actualsThrough: null })), actualOccupation: [] }).planningResult;
  assert.equal(result.teamPlans[0]!.dayCapacities.length, example.end === "2025-01-01" ? 1 : 3);
  assert.equal(result.teamPlans[0]!.projectPlans.length, projects.length);
  if (example.diagnostic) assert.ok(result.diagnostics.some((item) => item.code === example.diagnostic), example.name);
  return result;
}

describe("Planning Engine termination under mandatory deadlines", () => {
  const cases: Case[] = [
    { name: "feasible mandatory Project", capacity: "2", workload: "3", deadline: "2025-01-03" },
    { name: "impossible mandatory deadline", capacity: "1", workload: "9", deadline: "2025-01-02", diagnostic: "DEADLINE_UNFEASIBLE" },
    { name: "no capacity", capacity: "0", workload: "3", deadline: "2025-01-02", diagnostic: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON" },
    { name: "partial zero-capacity period", capacity: "0", laterCapacity: "1", workload: "3", deadline: "2025-01-03" },
    { name: "Reservation consumes capacity", capacity: "1", reserved: "1", workload: "3", deadline: "2025-01-02" },
    { name: "Reservation over-reserves", capacity: "1", reserved: "2", workload: "3", deadline: "2025-01-02", diagnostic: "TEAM_OVER_RESERVED" },
    { name: "concurrent Projects", capacity: "2", workload: "3", secondWorkload: "3", deadline: "2025-01-03" },
    { name: "earliest start after objective", capacity: "2", workload: "3", earliest: "2025-01-03", deadline: "2025-01-02", diagnostic: "DEADLINE_MISSED" },
    { name: "horizon ends with RAF", capacity: "1", workload: "100", deadline: "2025-01-03", diagnostic: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON" },
    { name: "dailyCap with one parallel Project", capacity: "2", workload: "3", secondWorkload: "3", dailyCap: "0.5", maxParallel: 1, deadline: "2025-01-03" },
  ];
  for (const example of cases) it(example.name, () => { run(example); });

  it("batches a valid billion-unit fair allocation after mandatory admission", () => {
    const result = run({ name: "large exact capacity", capacity: "1000000000",
      workload: "1", secondWorkload: "1000000000", deadline: "2025-01-01", end: "2025-01-01" });
    const concurrent = result.teamPlans[0]!.projectPlans[1]!;
    assert.equal(serializeQuantity(concurrent.plannedWorkload), "999999999/1");
    assert.equal(result.teamPlans[0]!.projectPlans[0]!.complete, true);
  });
});
