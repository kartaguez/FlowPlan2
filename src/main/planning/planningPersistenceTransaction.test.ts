import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlanningSession } from "../../application/index.js";
import { decodeFlowplanBackupV1 } from "../../application/backup/flowplanBackupV1.js";
import { createUnavailabilityRatio } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const geometryViewport = { width: 2160, teamLaneHeight: 100, timeAxisHeight: 76 };

describe("planning persistence transaction", () => {
  it("does not consume Team or Project IDs while a candidate fails to commit", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const period = state.portfolio.teams[0]!.capacitySchedule.periods[0]!;
    const zero = createUnavailabilityRatio("0");
    if (!zero.ok) throw new Error("Invalid test quantity.");
    const team = { kind: "create-team" as const, name: "New Team", capacityPeriods: [{
      startDate: period.start, endDate: period.end, capacity: period.dailyCapacity, unavailability: zero.value,
    }] };
    const project = { kind: "create-project" as const, name: "New Project", teamRequirements: [{
      teamId: state.portfolio.teams[0]!.id,
      remainingWorkload: state.portfolio.projects[0]!.requirements[0]!.remainingWorkload,
    }] };
    const fail = () => { throw new Error("quota"); };
    assert.equal(session.dispatch(team, fail).ok, false);
    assert.equal(session.dispatch(project, fail).ok, false);
    assert.equal(session.dispatch(team).ok, true);
    assert.equal(session.dispatch(project).ok, true);
    assert.equal(session.getState().portfolio.teams.at(-1)!.id, "team-session-1");
    assert.equal(session.getState().portfolio.projects.at(-1)!.id, "project-session-1");
  });

  it("writes a complete candidate before publishing session and projection", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const before = session.getState();
    let document: string | null = null;
    let writes = 0;
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport,
      backupStore: { read: () => document, write: (next) => {
        assert.strictEqual(session.getState(), before);
        document = next; writes += 1;
      } } });
    const initialProjection = dispatcher.getProjection();
    const same = dispatcher.dispatch({ kind: "reorder-project", projectId: state.portfolio.priorityOrder[0]!, targetPosition: 1 });
    assert.equal(same.ok, true);
    assert.equal(writes, 0);
    assert.strictEqual(dispatcher.getProjection(), initialProjection);
    const moved = dispatcher.dispatch({ kind: "reorder-project", projectId: state.portfolio.priorityOrder[1]!, targetPosition: 1 });
    assert.equal(moved.ok, true);
    assert.equal(writes, 1);
    assert.deepEqual(decodeFlowplanBackupV1(document!).portfolio.priorityOrder, session.getState().portfolio.priorityOrder);
    assert.notStrictEqual(dispatcher.getProjection(), initialProjection);
  });

  it("keeps session, projection and next generated ID unchanged on a failed write", () => {
    const state = createDemoPlanningScenario();
    const session = createPlanningSession(state);
    const before = session.getState();
    let fail = true;
    let document = "old";
    const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport,
      backupStore: { read: () => document, write: (next) => {
        if (fail) throw new Error("quota");
        document = next;
      } } });
    const projection = dispatcher.getProjection();
    const command = { kind: "create-reservation" as const, name: "New", startDate: state.planning.startDate,
      endDate: state.planning.endDate, teamAllocations: [] };
    assert.equal(dispatcher.dispatch(command).ok, false);
    assert.strictEqual(session.getState(), before);
    assert.strictEqual(dispatcher.getProjection(), projection);
    assert.equal(document, "old");
    fail = false;
    assert.equal(dispatcher.dispatch(command).ok, true);
    assert.equal(session.getState().portfolio.reservations.at(-1)!.id, "reservation-session-1");
    assert.deepEqual(decodeFlowplanBackupV1(document).portfolio.reservations.map((r) => r.id),
      session.getState().portfolio.reservations.map((r) => r.id));
  });
});
