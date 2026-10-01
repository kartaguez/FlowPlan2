import assert from "node:assert/strict";
import test from "node:test";
import { createCivilDate, createConsumedWorkload, createPortfolio, createProject, createProjectActualsChronology,
  createReservation, createReservationActualsChronology, reconstructActuals, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV4, encodeFlowplanBackupV5 } from "../../application/backup/flowplanBackupV1.js";
import { createPlanningSession, type PlanningCommand } from "../../application/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("; "));
  return result.value;
}
const d = (text: string) => valid(createCivilDate(text));
const c = (text: string) => valid(createConsumedWorkload(text));

test("V4 legacy chronology alone retains cumulative validation and ambiguous missing-Team records", () => {
  const state = createDemoPlanningScenario();
  const [alpha, beta] = state.portfolio.projects[0]!.requirements;
  assert.ok(alpha && beta);
  const history = { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-01"), teams: [{ teamId: alpha.teamId, cumulativeConsumed: c("1"), remainingWorkload: alpha.remainingWorkload }] },
    { actualsThroughDate: d("2025-01-02"), teams: [] },
    { actualsThroughDate: d("2025-01-03"), teams: [{ teamId: alpha.teamId, cumulativeConsumed: c("2"), remainingWorkload: alpha.remainingWorkload }] },
  ] };
  assert.equal(createProjectActualsChronology(history).ok, true);
  assert.equal(createProjectActualsChronology({ ...history, records: [history.records[0]!,
    { ...history.records[2]!, teams: [{ ...history.records[2]!.teams[0]!, cumulativeConsumed: c("0") }] }] }).ok, false);
  const project = valid(createProject({ ...state.portfolio.projects[0]!, actuals: history,
    requirements: state.portfolio.projects[0]!.requirements.map((row) => ({ ...row, rafAuthority: "current-configuration" as const })) }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const legacy = reconstructActuals(portfolio, state.planning.workingPattern).contributions.filter((item) => item.sourceId === project.id);
  assert.equal(legacy.some((item) => item.recordIndex === 2 && serializeQuantity(item.amount) === "1/1"), true);
  const v4 = encodeFlowplanBackupV4({ ...state, portfolio });
  const v5 = encodeFlowplanBackupV5(decodeFlowplanBackup(v4));
  assert.equal(JSON.parse(v5).data.portfolio.projects[0].migrationStatus, "legacy-pending");
  assert.deepEqual(JSON.parse(v5).data.portfolio.projects[0].legacyV4Actuals.records,
    JSON.parse(v4).data.portfolio.projects[0].actuals.records);
  assert.deepEqual(decodeFlowplanBackup(v5).portfolio.projects[0]?.legacyV4Actuals?.records.length, 3);
});

test("V4 Reservation can omit Teams; only the legacy adapter computes exact later deltas", () => {
  const state = createDemoPlanningScenario();
  const reservation = state.portfolio.reservations[0]!;
  const teamId = reservation.teamAllocations[0]!.teamId;
  const history = { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-01"), teams: [{ teamId, cumulativeConsumed: c("1") }] },
    { actualsThroughDate: d("2025-01-02"), teams: [] },
    { actualsThroughDate: d("2025-01-03"), teams: [{ teamId, cumulativeConsumed: c("3") }] },
  ] };
  assert.equal(createReservationActualsChronology(history).ok, true);
  const updated = valid(createReservation({ ...reservation, actuals: history }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    reservations: state.portfolio.reservations.map((item, index) => index === 0 ? updated : item) }));
  const rows = reconstructActuals(portfolio, state.planning.workingPattern).contributions.filter((item) => item.sourceId === reservation.id);
  assert.equal(rows.filter((item) => item.recordIndex === 2).reduce((sum, item) => sum + Number(serializeQuantity(item.amount).split("/")[0]), 0), 2);
});

test("all V4 append business commands are refused without changing the candidate", () => {
  const state = createDemoPlanningScenario();
  const session = createPlanningSession(state);
  const before = session.getState();
  const project = state.portfolio.projects[0]!;
  const reservation = state.portfolio.reservations[0]!;
  const first = session.dispatch({ kind: "append-project-actuals", projectId: project.id,
    actualsFromDate: d("2025-01-01"), record: { actualsThroughDate: d("2025-01-01"), teams: [] } } as unknown as PlanningCommand);
  const second = session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
    actualsFromDate: d("2025-01-01"), record: { actualsThroughDate: d("2025-01-01"), teams: [] } } as unknown as PlanningCommand);
  assert.equal(first.ok, false); assert.equal(second.ok, false);
  if (!first.ok && !second.ok) {
    assert.equal(first.errors[0]?.code, "LEGACY_ACTUALS_READ_ONLY");
    assert.equal(second.errors[0]?.code, "LEGACY_ACTUALS_READ_ONLY");
  }
  assert.equal(session.getState(), before);
});
