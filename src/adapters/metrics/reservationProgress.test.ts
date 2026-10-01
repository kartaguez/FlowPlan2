import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCivilDate, createPortfolio, createReservation, createReservationTeamAllocation,
  createCapacity, createPlanningHorizon, createWorkingPattern, rationalToCanonicalString,
  type DomainResult,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { calculateReservationProgressQuantities } from "./cursorMetrics.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const date = (value: string) => must(createCivilDate(value));

describe("Reservation forecast progress quantities", () => {
  it("excludes demand beyond the inclusive planning horizon from the denominator", () => {
    const state = createDemoPlanningScenario();
    const original = state.portfolio.reservations[0]!;
    const team = state.portfolio.teams[0]!;
    const reservation = must(createReservation({
      id: original.id, name: original.name,
      startDate: date("2025-01-02"), endDate: date("2025-01-06"),
      teamAllocations: [must(createReservationTeamAllocation({ teamId: team.id,
        amount: { kind: "fixed-daily", dailyCapacity: must(createCapacity("1")) } }))],
    }));
    const portfolio = must(createPortfolio({ ...state.portfolio,
      reservations: [reservation, state.portfolio.reservations[1]!] }));
    const horizon = must(createPlanningHorizon({ start: date("2025-01-01"), end: date("2025-01-02") }));
    const workingPattern = must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }));
    const base = { portfolio, horizon, workingPattern, planningResult: { teamPlans: [], diagnostics: [] } };
    const atStart = calculateReservationProgressQuantities({ ...base, selectedDate: date("2025-01-01") })[0]!;
    const atEnd = calculateReservationProgressQuantities({ ...base, selectedDate: date("2025-01-02") })[0]!;
    assert.equal(rationalToCanonicalString(atStart.totalCharge), "1/1");
    assert.equal(rationalToCanonicalString(atStart.consumedAtProjectionDate), "0/1");
    assert.equal(rationalToCanonicalString(atEnd.totalCharge), "1/1");
    assert.equal(rationalToCanonicalString(atEnd.consumedAtProjectionDate), "1/1");
  });
});

// The group ratio must use total work, not an average of individual percentages.
it("weights a grouped Reservation with its Project and leaves Project progress unchanged", async () => {
  const domain = await import("../../domain/index.js");
  const teamId = must(domain.createTeamId("team-weighted"));
  const projectId = must(domain.createProjectId("project-weighted"));
  const reservationId = must(domain.createReservationId("reservation-weighted"));
  const programId = must(domain.createProgramId("program-weighted"));
  const familyId = must(domain.createPriorityFamilyId("pas-weighted"));
  const day = date("2025-01-01");
  const team = must(domain.createTeam({ id: teamId, name: "Team",
    capacitySchedule: must(domain.createTeamCapacitySchedule({ periods: [must(domain.createCapacityPeriod({
      start: day, end: day, dailyCapacity: must(domain.createCapacity("2")) }))], exceptions: [] })) }));
  const project = must(domain.createProject({ id: projectId, name: "Project", programId,
    priorityFamilyId: familyId, requirements: [must(domain.createProjectTeamRequirement({
      teamId, remainingWorkload: must(domain.createRemainingWorkload("9")) }))] }));
  const reservation = must(domain.createReservation({ id: reservationId, name: "Reservation",
    programId, priorityFamilyId: familyId, startDate: day, endDate: day,
    teamAllocations: [must(domain.createReservationTeamAllocation({ teamId,
      amount: { kind: "fixed-daily", dailyCapacity: must(domain.createCapacity("1")) } }))] }));
  const portfolio = must(domain.createPortfolio({ teams: [team], projects: [project], reservations: [reservation],
    programs: [must(domain.createProgram({ id: programId, name: "Program" }))],
    priorityFamilies: [must(domain.createPriorityFamily({ id: familyId, name: "Pas" }))],
    priorityOrder: [projectId] }));
  const planningResult = { teamPlans: [{ teamId,
    dayCapacities: [{ date: day, effectiveCapacity: must(domain.createCapacity("2")),
      reservedCapacity: must(domain.createCapacity("1")), projectCapacity: must(domain.createCapacity("1")), overReserved: false,
      projectActualCapacity: must(domain.createCapacity("0")), reservationActualCapacity: must(domain.createCapacity("0")),
      actualOverCapacity: must(domain.createCapacity("0")), reservationOverCapacity: must(domain.createCapacity("0")) }],
    dayAdmissions: [], projectPlans: [{ projectId, teamId,
      allocations: [{ date: day, workload: must(domain.createCapacity("1")) }],
      plannedWorkload: must(domain.createCapacity("1")),
      remainingUnplannedWorkload: must(domain.createRemainingWorkload("8")), complete: false }] }], diagnostics: [] };
  const { calculateCursorMetrics } = await import("./cursorMetrics.js");
  const metrics = calculateCursorMetrics({ portfolio, planningResult,
    horizon: must(domain.createPlanningHorizon({ start: day, end: day })), selectedDate: day,
    workingPattern: must(domain.createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] })) });
  assert.equal(domain.rationalToCanonicalString(metrics.projects[0]!.progress), "1/9");
  assert.equal(domain.rationalToCanonicalString(metrics.programs[0]!.progress), "1/5");
  assert.equal(domain.rationalToCanonicalString(metrics.priorityFamilies[0]!.progress), "1/5");
});
