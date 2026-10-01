import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTimelineViewModel, calculateCursorMetrics } from "../../adapters/index.js";
import { createPlanningSession } from "../../application/index.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV1, encodeFlowplanBackupV2 } from "../../application/backup/flowplanBackupV1.js";
import {
  createCapacity, createCapacityPeriod, createCivilDate, createMaxParallelProjects,
  createPortfolio, createProject, createProjectId, createProjectTeamRequirement,
  createRemainingWorkload, createReservation, createReservationId,
  createReservationTeamAllocation, createTeam, createTeamCapacitySchedule,
  createTeamId, createWorkingPattern, requestedReservationCapacity,
  rationalToCanonicalString, serializeQuantity, type DomainResult, type DomainQuantity,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const date = (value: string) => must(createCivilDate(value));
const quantity = (value: DomainQuantity) => serializeQuantity(value);
const viewport = { width: 900, teamLaneHeight: 100, timeAxisHeight: 76 };

function oneDayScenario() {
  const day = date("2025-01-06");
  const teamId = must(createTeamId("team-one"));
  const team = must(createTeam({ id: teamId, name: "One", capacitySchedule: must(createTeamCapacitySchedule({
    periods: [must(createCapacityPeriod({ start: day, end: day, dailyCapacity: must(createCapacity("2")) }))],
    exceptions: [],
  })) }));
  const project = (id: string) => must(createProject({ id: must(createProjectId(id)), name: id,
    requirements: [must(createProjectTeamRequirement({ teamId,
      remainingWorkload: must(createRemainingWorkload("4")) }))] }));
  const a = project("project-a");
  const b = project("project-b");
  const reservation = (id: string, amount: string) => must(createReservation({
    id: must(createReservationId(id)), name: id, startDate: day, endDate: day,
    teamAllocations: [must(createReservationTeamAllocation({ teamId,
      amount: { kind: "fixed-daily", dailyCapacity: must(createCapacity(amount)) } }))],
  }));
  const r = reservation("reservation-r", "1");
  const state = { planning: { startDate: day, endDate: day,
    workingPattern: must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] })),
    maxParallelProjects: must(createMaxParallelProjects(1)) },
    portfolio: must(createPortfolio({ teams: [team], projects: [a, b], programs: [], priorityFamilies: [],
      priorityOrder: [a.id, b.id], reservations: [r] })) };
  return { state, a, b, r, team, reservation };
}

describe("9I forecast activation", () => {
  it("defaults both entities active, preserves priority, and frees capacity across all four activity combinations", () => {
    const { state, a, b, r } = oneDayScenario();
    assert.equal(a.isActive, true);
    assert.equal(r.isActive, true);
    const session = createPlanningSession(state);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const inspect = () => {
      const projection = dispatcher.getProjection();
      const team = projection.planningResult.teamPlans[0]!;
      return { reserved: quantity(team.dayCapacities[0]!.reservedCapacity),
        a: team.projectPlans.find((plan) => plan.projectId === a.id),
        b: team.projectPlans.find((plan) => plan.projectId === b.id),
        projection };
    };
    assert.equal(inspect().reserved, "1/1");
    assert.equal(quantity(inspect().a!.plannedWorkload), "1/1");
    assert.equal(dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: false }).ok, true);
    assert.equal(quantity(dispatcher.getProjection().planningResult.teamPlans[0]!.projectPlans[0]!.plannedWorkload), "2/1");
    assert.equal(dispatcher.dispatch({ kind: "set-project-active", projectId: a.id, isActive: false }).ok, true);
    const bothInactive = dispatcher.getProjection();
    assert.deepEqual(bothInactive.portfolio.priorityOrder, [a.id, b.id]);
    assert.equal(bothInactive.planningResult.teamPlans[0]!.projectPlans.some((plan) => plan.projectId === a.id), false);
    assert.equal(quantity(bothInactive.planningResult.teamPlans[0]!.projectPlans[0]!.plannedWorkload), "2/1");
    assert.equal(dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: true }).ok, true);
    const onlyAInactive = dispatcher.getProjection();
    assert.equal(quantity(onlyAInactive.planningResult.teamPlans[0]!.projectPlans[0]!.plannedWorkload), "1/1");
    assert.equal(dispatcher.dispatch({ kind: "set-project-active", projectId: a.id, isActive: true }).ok, true);
    assert.equal(quantity(dispatcher.getProjection().planningResult.teamPlans[0]!.projectPlans[0]!.plannedWorkload), "1/1");
    const metrics = calculateCursorMetrics({ portfolio: dispatcher.getProjection().portfolio,
      planningResult: dispatcher.getProjection().planningResult,
      horizon: dispatcher.getProjection().horizon, selectedDate: state.planning.startDate });
    assert.equal(rationalToCanonicalString(metrics.teams[0]!.requestedReservedCapacity), "1/1");
  });

  it("removes a multi-Team Reservation from every Team while retaining its exact configuration and sort position", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const reservation = state.portfolio.reservations[0]!;
    const originalAllocations = reservation.teamAllocations;
    const previousOrder = state.portfolio.reservations.map((item) => item.id);
    const day = date("2025-01-20");
    const before = dispatcher.getProjection().planningResult.teamPlans.map((team) =>
      team.dayCapacities.find((item) => item.date === day)!.reservedCapacity);
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: reservation.id, isActive: false });
    const inactive = session.getState().portfolio.reservations[0]!;
    assert.deepEqual(inactive.teamAllocations, originalAllocations);
    assert.deepEqual(session.getState().portfolio.reservations.map((item) => item.id), previousOrder);
    const after = dispatcher.getProjection().planningResult.teamPlans.map((team) =>
      team.dayCapacities.find((item) => item.date === day)!.reservedCapacity);
    assert.notDeepEqual(after.map(quantity), before.map(quantity));
    assert.equal(dispatcher.getProjection().viewModel.teams.every((team) =>
      team.reservationContributions?.every((item) => item.reservationId !== reservation.id)), true);
    const alpha = state.portfolio.teams[0]!;
    assert.notEqual(quantity(requestedReservationCapacity(inactive, alpha, day, state.planning.workingPattern)), "0/1");
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: reservation.id, isActive: true });
    assert.deepEqual(dispatcher.getProjection().planningResult.teamPlans.map((team) =>
      quantity(team.dayCapacities.find((item) => item.date === day)!.reservedCapacity)), before.map(quantity));
  });

  it("retains an aggregate Team over-reservation while other active Reservations still exceed capacity", () => {
    const { state, reservation } = oneDayScenario();
    const high = reservation("reservation-high", "3");
    const extra = reservation("reservation-extra", "2");
    const portfolio = must(createPortfolio({ ...state.portfolio, reservations: [high, extra] }));
    const session = createPlanningSession({ ...state, portfolio });
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const over = () => dispatcher.getProjection().planningResult.diagnostics.some((item) => item.code === "TEAM_OVER_RESERVED");
    assert.equal(over(), true);
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: extra.id, isActive: false });
    assert.equal(over(), true);
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: high.id, isActive: false });
    assert.equal(over(), false);
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: extra.id, isActive: true });
    assert.equal(over(), false);
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: high.id, isActive: true });
    assert.equal(over(), true);
  });

  it("allows all Projects and Reservations to be inactive without hiding Portfolio entities", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const original = dispatcher.getProjection();
    for (const project of state.portfolio.projects) {
      dispatcher.dispatch({ kind: "set-project-active", projectId: project.id, isActive: false });
    }
    for (const reservation of state.portfolio.reservations) {
      dispatcher.dispatch({ kind: "set-reservation-active", reservationId: reservation.id, isActive: false });
    }
    const result = dispatcher.getProjection();
    assert.deepEqual(result.portfolio.priorityOrder, state.portfolio.priorityOrder);
    assert.deepEqual(result.portfolio.reservations.map((item) => item.id), state.portfolio.reservations.map((item) => item.id));
    assert.equal(result.planningResult.teamPlans.every((team) => team.projectPlans.length === 0), true);
    assert.equal(result.planningResult.teamPlans.every((team) => team.dayCapacities.every((day) =>
      quantity(day.reservedCapacity) === "0/1")), true);
    assert.equal(result.planningResult.diagnostics.length, 0);
    assert.equal(result.viewModel.projects.length, state.portfolio.projects.length);
    assert.equal(result.viewModel.teams.every((team) => team.allocations.length === 0 &&
      team.reservationContributions?.length === 0), true);
    assert.equal(result.geometry.teams.every((team) => team.days.every((day) =>
      day.reservationSegments?.length === 0 && day.allocations.length === 0)), true);
    assert.throws(() => buildTimelineViewModel({ portfolio: result.portfolio, horizon: result.horizon,
      planningResult: original.planningResult, workingPattern: state.planning.workingPattern }));
  });

  it("retains the derived #N badges when a middle Project is excluded", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const middle = state.portfolio.priorityOrder[1]!;
    dispatcher.dispatch({ kind: "set-project-active", projectId: middle, isActive: false });
    const projection = dispatcher.getProjection();
    assert.deepEqual(projection.portfolio.priorityOrder, state.portfolio.priorityOrder);
    assert.deepEqual(projection.viewModel.projects.map((project) => project.priorityIndex), [0, 1, 2, 3]);
    assert.equal(projection.planningResult.teamPlans.every((team) =>
      team.projectPlans.every((plan) => plan.projectId !== middle) &&
      team.dayAdmissions.every((day) => !day.admittedProjectIds.includes(middle))), true);
    dispatcher.dispatch({ kind: "set-project-active", projectId: middle, isActive: true });
    assert.equal(dispatcher.getProjection().planningResult.teamPlans.some((team) =>
      team.projectPlans.some((plan) => plan.projectId === middle)), true);
  });

  it("rejects a stale reserved-capacity result for an inactive Reservation", () => {
    const { state, r } = oneDayScenario();
    const session = createPlanningSession(state);
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport });
    const staleResult = dispatcher.getProjection().planningResult;
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: false });
    const current = dispatcher.getProjection();
    assert.throws(() => buildTimelineViewModel({ portfolio: current.portfolio,
      horizon: current.horizon, planningResult: staleResult,
      workingPattern: state.planning.workingPattern }), /inconsistent with active Reservations/);
  });

  it("does not allow inactive entities to bypass Portfolio structure", () => {
    const { state, a, r } = oneDayScenario();
    const unknownTeam = must(createTeamId("unknown-team"));
    const invalidProject = must(createProject({ ...a, isActive: false,
      requirements: [must(createProjectTeamRequirement({ teamId: unknownTeam,
        remainingWorkload: must(createRemainingWorkload("1")) }))] }));
    const invalidReservation = must(createReservation({ ...r, isActive: false,
      teamAllocations: [must(createReservationTeamAllocation({ teamId: unknownTeam,
        amount: { kind: "fixed-daily", dailyCapacity: must(createCapacity("1")) } }))] }));
    const result = createPortfolio({ ...state.portfolio,
      projects: [invalidProject, state.portfolio.projects[1]!], reservations: [invalidReservation] });
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.errors.map((error) => error.code).sort(),
      ["UNKNOWN_REQUIREMENT_TEAM", "UNKNOWN_RESERVATION_TEAM"]);
  });

  it("uses the same state and projection for both no-op commands, without writing", () => {
    const { state, a, r } = oneDayScenario();
    const session = createPlanningSession(state);
    let writes = 0;
    let builds = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport,
      backupStore: { read: () => null, write: () => { writes += 1; } },
      buildProjection: (input) => { builds += 1; return buildPlanningSessionProjection(input); } });
    const activeProjection = dispatcher.getProjection();
    assert.equal(dispatcher.dispatch({ kind: "set-project-active", projectId: a.id, isActive: true }).ok, true);
    assert.equal(dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: true }).ok, true);
    assert.strictEqual(dispatcher.getProjection(), activeProjection);
    assert.deepEqual([builds, writes], [1, 0]);
    dispatcher.dispatch({ kind: "set-project-active", projectId: a.id, isActive: false });
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: false });
    const inactiveProjection = dispatcher.getProjection();
    assert.deepEqual([builds, writes], [3, 2]);
    dispatcher.dispatch({ kind: "set-project-active", projectId: a.id, isActive: false });
    dispatcher.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: false });
    assert.strictEqual(dispatcher.getProjection(), inactiveProjection);
    assert.deepEqual([builds, writes], [3, 2]);
  });

  it("round trips strict V2 and migrates strict V1 to active entities", () => {
    const { state, a, r } = oneDayScenario();
    const session = createPlanningSession(state);
    session.dispatch({ kind: "set-project-active", projectId: a.id, isActive: false });
    session.dispatch({ kind: "set-reservation-active", reservationId: r.id, isActive: false });
    const v2 = encodeFlowplanBackupV2(session.getState());
    assert.equal(JSON.parse(v2).version, 2);
    const restored = decodeFlowplanBackup(v2);
    assert.equal(restored.portfolio.projects[0]!.isActive, false);
    assert.equal(restored.portfolio.reservations[0]!.isActive, false);
    assert.equal(restored.portfolio.projects[1]!.isActive, true);
    const v1 = encodeFlowplanBackupV1(state);
    const migrated = decodeFlowplanBackup(v1);
    assert.equal(migrated.portfolio.projects.every((item) => item.isActive), true);
    assert.equal(migrated.portfolio.reservations.every((item) => item.isActive), true);
    for (const collection of ["projects", "reservations"] as const) {
      const missing = JSON.parse(v2);
      delete missing.data.portfolio[collection][0].isActive;
      assert.throws(() => decodeFlowplanBackup(JSON.stringify(missing)));
      const invalid = JSON.parse(v2);
      invalid.data.portfolio[collection][0].isActive = "false";
      assert.throws(() => decodeFlowplanBackup(JSON.stringify(invalid)));
    }
    assert.throws(() => decodeFlowplanBackup(JSON.stringify({ ...JSON.parse(v2), version: 5 })));
  });
});
