import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { calculateCursorMetrics } from "../../adapters/index.js";
import { createPlanningSession } from "../../application/index.js";
import { decodeFlowplanBackup } from "../../application/backup/flowplanBackupV1.js";
import { createCivilDate, createConsumedWorkload, createRemainingWorkload, serializeQuantity } from "../../domain/index.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const geometryViewport = Object.freeze({
  width: 2160,
  teamLaneHeight: 100,
  timeAxisHeight: 56,
});

describe("buildPlanningSessionProjection", () => {
  it("recomputes and persists the split occupation after sequential Actuals appends", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    let document: string | null = null;
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport,
      backupStore: { read: () => document, write: (value) => { document = value; } } });
    const project = session.getState().portfolio.projects[0]!;
    const reservation = session.getState().portfolio.reservations[0]!;
    const day = createCivilDate("2025-01-06");
    const consumed = createConsumedWorkload("2");
    const reservationConsumed = createConsumedWorkload("1");
    const remaining = createRemainingWorkload("1");
    if (!day.ok || !consumed.ok || !reservationConsumed.ok || !remaining.ok) throw new Error("Invalid fixture.");
    const teamId = project.requirements[0]!.teamId;
    const before = dispatcher.getProjection().planningResult.teamPlans.find((item) => item.teamId === teamId)!
      .dayCapacities.find((item) => item.date === day.value)!;
    assert.equal(dispatcher.dispatch({ kind: "append-project-actuals", projectId: project.id,
      actualsFromDate: day.value, record: { actualsThroughDate: day.value,
        teams: project.requirements.map((requirement) => ({ teamId: requirement.teamId,
          cumulativeConsumed: consumed.value, remainingWorkload: remaining.value })) } }).ok, true);
    assert.equal(dispatcher.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      actualsFromDate: day.value, record: { actualsThroughDate: day.value,
        teams: reservation.teamAllocations.map((allocation) => ({ teamId: allocation.teamId,
          cumulativeConsumed: reservationConsumed.value })) } }).ok, true);
    const after = dispatcher.getProjection().planningResult.teamPlans.find((item) => item.teamId === teamId)!
      .dayCapacities.find((item) => item.date === day.value)!;
    assert.equal(serializeQuantity(before.projectActualCapacity), "0/1");
    assert.equal(serializeQuantity(after.projectActualCapacity), "2/1");
    assert.equal(serializeQuantity(after.reservationActualCapacity), "1/1");
    assert.equal(serializeQuantity(after.projectCapacity), "0/1");
    assert.ok(document);
    assert.equal(decodeFlowplanBackup(document).portfolio.projects[0]!.actuals?.records.length, 1);
    assert.equal(decodeFlowplanBackup(document).portfolio.reservations[0]!.actuals?.records.length, 1);
  });
  it("projects inactive historical Project and Reservation Actuals on a zero-capacity day", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const project = session.getState().portfolio.projects[0]!;
    const reservation = session.getState().portfolio.reservations[0]!;
    const day = createCivilDate("2025-01-04");
    const consumed = createConsumedWorkload("5");
    const zero = createConsumedWorkload("0");
    const remaining = createRemainingWorkload("1");
    if (!day.ok || !consumed.ok || !zero.ok || !remaining.ok) throw new Error("Invalid fixture.");
    const teamId = project.requirements[0]!.teamId;
    assert.equal(session.dispatch({ kind: "set-project-active", projectId: project.id, isActive: false }).ok, true);
    assert.equal(session.dispatch({ kind: "set-reservation-active", reservationId: reservation.id, isActive: false }).ok, true);
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: project.id,
      actualsFromDate: day.value, record: { actualsThroughDate: day.value,
        teams: project.requirements.map((requirement) => ({ teamId: requirement.teamId,
          cumulativeConsumed: requirement.teamId === teamId ? consumed.value : zero.value,
          remainingWorkload: remaining.value })) } }).ok, true);
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      actualsFromDate: day.value, record: { actualsThroughDate: day.value,
        teams: reservation.teamAllocations.map((allocation) => ({ teamId: allocation.teamId,
          cumulativeConsumed: allocation.teamId === teamId ? consumed.value : zero.value })) } }).ok, true);
    const projection = buildPlanningSessionProjection({ state: session.getState(), geometryViewport });
    const capacity = projection.planningResult.teamPlans.find((plan) => plan.teamId === teamId)!
      .dayCapacities.find((item) => item.date === day.value)!;
    assert.equal(serializeQuantity(capacity.effectiveCapacity), "0/1");
    assert.equal(serializeQuantity(capacity.projectActualCapacity), "5/1");
    assert.equal(serializeQuantity(capacity.reservationActualCapacity), "5/1");
    assert.equal(serializeQuantity(capacity.reservedCapacity), "0/1");
    assert.equal(serializeQuantity(capacity.actualOverCapacity), "10/1");
    assert.equal(serializeQuantity(capacity.reservationOverCapacity), "0/1");
    assert.deepEqual(projection.planningResult.diagnostics.filter((item) => item.teamId === teamId && item.date === day.value)
      .map((item) => item.code), ["TEAM_ACTUALS_OVER_CAPACITY"]);
    const geometry = projection.geometry.teams.find((item) => item.teamId === teamId)!
      .days.find((item) => item.date === day.value)!;
    assert.deepEqual(geometry.actualSegments?.map((item) => item.sourceKind), ["project", "reservation"]);
    assert.ok(geometry.actualSegments!.every((item) => item.height > 0 && item.sourceLabel));
    assert.ok(geometry.actualSegments!.reduce((sum, item) => sum + item.height, 0) <= geometry.height);
    const metrics = calculateCursorMetrics({ portfolio: projection.portfolio, horizon: projection.horizon,
      planningResult: projection.planningResult, selectedDate: day.value });
    const teamMetrics = metrics.teams.find((item) => item.teamId === teamId)!;
    assert.equal(teamMetrics.projectActualCapacity.numerator, 5n);
    assert.equal(teamMetrics.reservationActualCapacity.numerator, 5n);
  });
  it("builds planning, semantic view model, and full geometry deterministically", () => {
    const state = createDemoPlanningScenario();
    const first = buildPlanningSessionProjection({ state, geometryViewport });
    const second = buildPlanningSessionProjection({ state, geometryViewport });

    assert.deepEqual(first, second);
    assert.equal(first.planningResult.teamPlans.length, state.portfolio.teams.length);
    assert.deepEqual(
      first.viewModel.projects.map((project) => project.label),
      state.portfolio.priorityOrder.map(
        (projectId) =>
          state.portfolio.projects.find((project) => project.id === projectId)!.name,
      ),
    );
    assert.equal(first.geometry.width, geometryViewport.width);
    assert.equal(first.geometry.teams.length, state.portfolio.teams.length);
    assert.equal(Object.isFrozen(first), true);
    assert.strictEqual(first.portfolio, state.portfolio);
    assert.equal(first.horizon.start, state.planning.startDate);
    assert.equal(first.horizon.end, state.planning.endDate);
    const metrics = calculateCursorMetrics({
      portfolio: first.portfolio,
      horizon: first.horizon,
      planningResult: first.planningResult,
      selectedDate: state.planning.startDate,
    });
    assert.equal(metrics.selectedDate, state.planning.startDate);
  });

  it("is a deterministic DOM-free composition boundary", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/main/planning/buildPlanningSessionProjection.ts",
      ),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /HTMLElement|SVGElement|renderTimelineSvg|renderApp|createTimeline.*Controller/,
    );
  });
});
