import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { effectiveColor, type ProjectId, type ReservationId } from "../../domain/index.js";
import { createPlanningSession, type PlanningSessionState, type UpdateProjectCommand, type UpdateReservationCommand } from "./planningSession.js";

const projectEdit = (state: PlanningSessionState, id: ProjectId,
  changes: Record<string, unknown> = {}): UpdateProjectCommand => {
  const project = state.portfolio.projects.find((item) => item.id === id)!;
  return { kind: "update-project", projectId: id, name: project.name,
    ...(project.programId ? { programId: project.programId } : {}),
    ...(project.priorityFamilyId ? { priorityFamilyId: project.priorityFamilyId } : {}),
    teamRequirements: project.requirements.map((r) => ({ teamId: r.teamId,
      remainingWorkload: r.remainingWorkload, ...(r.dailyCap ? { dailyCap: r.dailyCap } : {}) })),
    ...changes };
};
const reservationEdit = (state: PlanningSessionState, id: ReservationId,
  changes: Record<string, unknown> = {}): UpdateReservationCommand => {
  const reservation = state.portfolio.reservations.find((item) => item.id === id)!;
  return { kind: "update-reservation", reservationId: id, name: reservation.name,
    startDate: reservation.startDate, endDate: reservation.endDate,
    ...(reservation.programId ? { programId: reservation.programId } : {}),
    ...(reservation.priorityFamilyId ? { priorityFamilyId: reservation.priorityFamilyId } : {}),
    teamAllocations: reservation.teamAllocations.map((a) => ({ teamId: a.teamId,
      ...(a.amount.kind === "ratio" ? { kind: "ratio" as const, ratio: a.amount.ratio }
        : { kind: "fixed-daily" as const, dailyCapacity: a.amount.dailyCapacity }) })),
    ...changes };
};

describe("usage-driven grouping and colors", () => {
  it("normalizes, deduplicates across Projects and Reservations, and prunes last users", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const atlas = session.getState().portfolio.projects[0]!.id;
    const run = session.getState().portfolio.reservations[0]!.id;
    const first = session.dispatch(projectEdit(session.getState(), atlas, {
      programId: undefined, programName: "  Finance   Ops  ",
      priorityFamilyId: undefined, priorityFamilyName: "  Delivery   pas ", }));
    assert.equal(first.ok, true);
    const program = session.getState().portfolio.programs.find((p) => p.name === "Finance Ops")!;
    const family = session.getState().portfolio.priorityFamilies.find((p) => p.name === "Delivery pas")!;
    const second = session.dispatch(reservationEdit(session.getState(), run, {
      programName: "finance ops", priorityFamilyName: "delivery PAS" }));
    assert.equal(second.ok, true);
    assert.equal(session.getState().portfolio.reservations[0]!.programId, program.id);
    assert.equal(session.getState().portfolio.reservations[0]!.priorityFamilyId, family.id);
    assert.equal(session.dispatch(projectEdit(session.getState(), atlas, {
      programId: undefined, priorityFamilyId: undefined })).ok, true);
    assert.equal(session.getState().portfolio.programs.some((p) => p.id === program.id), true);
    assert.equal(session.dispatch({ kind: "remove-reservation", reservationId: run }).ok, true);
    assert.equal(session.getState().portfolio.programs.some((p) => p.id === program.id), false);
    assert.equal(session.getState().portfolio.priorityFamilies.some((p) => p.id === family.id), false);
  });

  it("keeps inactive references but excludes their forecast, and applies only explicit color edits", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const state = session.getState();
    const atlas = state.portfolio.projects[0]!.id;
    const boreal = state.portfolio.projects[1]!.id;
    const phoenix = state.portfolio.programs[0]!.id;
    const stale = projectEdit(state, boreal, { color: "#123456", colorChanged: false });
    assert.equal(session.dispatch(projectEdit(state, atlas, { color: "#ABCDEF", colorChanged: true })).ok, true);
    assert.equal(session.dispatch(stale).ok, true);
    assert.equal(session.getState().portfolio.programs[0]!.color, "#ABCDEF");
    assert.equal(effectiveColor(session.getState().portfolio, session.getState().portfolio.projects[1]!), "#ABCDEF");
    assert.equal(session.dispatch({ kind: "set-project-active", projectId: boreal, isActive: false }).ok, true);
    assert.equal(session.dispatch(projectEdit(session.getState(), atlas, { programId: undefined })).ok, true);
    assert.equal(session.getState().portfolio.programs.some((p) => p.id === phoenix), true);
    assert.equal(session.getState().portfolio.projects[0]!.ownColor !== undefined, true);
  });

  it("recreates a vanished draft selection with a new ID, then deduplicates a late Apply", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const initial = session.getState();
    const atlas = initial.portfolio.projects[0]!.id;
    const boreal = initial.portfolio.projects[1]!.id;
    const run = initial.portfolio.reservations[0]!.id;
    const oldId = initial.portfolio.programs[0]!.id;
    const stale = reservationEdit(initial, run, { programId: oldId, programName: "Phoenix", color: "#112233", colorChanged: true });
    assert.equal(session.dispatch(projectEdit(session.getState(), atlas, { programId: undefined })).ok, true);
    assert.equal(session.dispatch(projectEdit(session.getState(), boreal, { programId: undefined })).ok, true);
    assert.equal(session.getState().portfolio.programs.some((p) => p.id === oldId), false);
    assert.equal(session.dispatch(stale).ok, true);
    const replacement = session.getState().portfolio.programs[0]!;
    assert.notEqual(replacement.id, oldId);
    assert.equal(replacement.color, "#112233");
    const late = reservationEdit(initial, initial.portfolio.reservations[1]!.id,
      { programId: oldId, programName: "phoenix", color: "#445566", colorChanged: true });
    assert.equal(session.dispatch(late).ok, true);
    assert.equal(session.getState().portfolio.programs.length, 1);
    assert.equal(session.getState().portfolio.programs[0]!.color, "#445566");
  });
});
