import { projectCurrentBase } from "../session/projectCurrentRaf.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createCivilDate, createConsumedWorkload, consumedWorkloadFromSerialized, createPortfolio, createProject, createReservation, serializeQuantity, snapshotId,
  type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV1, encodeFlowplanBackupV2, encodeFlowplanBackupV3,
  encodeFlowplanBackupV4, encodeFlowplanBackupV5 } from "./flowplanBackupV1.js";
import { createPlanningSession } from "../session/planningSession.js";
import { reconstructActuals } from "../../domain/index.js";

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("; "));
  return result.value;
}
const d = (text: string) => valid(createCivilDate(text));
const c = (text: string) => valid(createConsumedWorkload(text));

test("V5 snapshot history round-trips exactly and rejects forged partitions", () => {
  const state = createDemoPlanningScenario();
  const old = state.portfolio.projects[0]!;
  const snapshot = { snapshotId: snapshotId("project", old.id, 1), version: 1,
    knowledgeDate: d("2025-01-06"), participation: old.requirements.map((row) => row.teamId), retiredZeroTeams: [],
    raf: old.requirements.map((row) => ({ teamId: row.teamId, amount: row.remainingWorkload })),
    coverage: { actualsFrom: d("2025-01-04"), actualsThrough: d("2025-01-05"), periods: [
      { periodId: "p1", from: d("2025-01-04"), through: d("2025-01-04"),
        consumed: old.requirements.map((row) => ({ teamId: row.teamId, amount: valid(consumedWorkloadFromSerialized("1/2")) })) },
      { periodId: "p2", from: d("2025-01-05"), through: d("2025-01-05"),
        consumed: old.requirements.map((row) => ({ teamId: row.teamId, amount: c("3") })) },
    ] },
  };
  const project = valid(createProject({ ...old, snapshots: [snapshot] }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const document = encodeFlowplanBackupV5({ ...state, portfolio }, "2025-01-06T00:00:00.000Z");
  const restored = decodeFlowplanBackup(document);
  assert.equal(JSON.parse(document).version, 5);
  assert.equal(restored.portfolio.projects[0]?.snapshots?.[0]?.coverage?.periods[0]?.periodId, "p1");
  assert.equal(serializeQuantity(restored.portfolio.projects[0]!.snapshots![0]!.coverage!.periods[0]!.consumed[0]!.amount), "1/2");
  assert.equal(encodeFlowplanBackupV5(restored, "2025-01-06T00:00:00.000Z"), document);
  const forged = JSON.parse(document);
  forged.data.portfolio.projects[0].snapshots[0].coverage.periods[1].from = "2025-01-06";
  assert.throws(() => decodeFlowplanBackup(JSON.stringify(forged)));
});

test("V4 imports as lossless pending legacy and stays separate after first V5 snapshot", () => {
  const state = createDemoPlanningScenario();
  const old = state.portfolio.projects[0]!;
  const withLegacy = valid(createProject({ ...old, actuals: { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-02"), teams: old.requirements.map((row) => ({
      teamId: row.teamId, cumulativeConsumed: c("1"), remainingWorkload: row.remainingWorkload })) },
  ] }, requirements: old.requirements.map((row) => ({ ...row, rafAuthority: "latest-actuals" as const })) }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? withLegacy : item) }));
  const migrated = decodeFlowplanBackup(encodeFlowplanBackupV4({ ...state, portfolio }));
  const pending = decodeFlowplanBackup(encodeFlowplanBackupV5(migrated));
  assert.equal(pending.portfolio.projects[0]?.legacyV4Actuals?.records.length, 1);
  assert.equal(pending.portfolio.projects[0]?.snapshots, undefined);
  assert.equal(JSON.parse(encodeFlowplanBackupV5(pending)).data.portfolio.projects[0].migrationStatus, "legacy-pending");
  const session = createPlanningSession(pending, { today: () => d("2025-01-06") });
  const pendingProject = pending.portfolio.projects[0]!;
  const teamIds = pendingProject.requirements.map((row) => row.teamId);
  const legacyBefore = encodeFlowplanBackupV5(pending);
  assert.equal(session.dispatch({ kind: "update-project", projectId: pendingProject.id,
    name: `${pendingProject.name} revised`,
    ...(pendingProject.programId ? { programId: pendingProject.programId } : {}),
    ...(pendingProject.priorityFamilyId ? { priorityFamilyId: pendingProject.priorityFamilyId } : {}),
    ...(pendingProject.earliestStartDate ? { earliestStartDate: pendingProject.earliestStartDate } : {}),
    ...(pendingProject.objectiveEndDate ? { objectiveEndDate: pendingProject.objectiveEndDate } : {}),
    ...(pendingProject.mandatoryDeadline ? { mandatoryDeadline: pendingProject.mandatoryDeadline } : {}),
    teamRequirements: pendingProject.requirements.map((row) => ({ teamId: row.teamId,
      remainingWorkload: row.remainingWorkload, ...(row.dailyCap ? { dailyCap: row.dailyCap } : {}) })),
  }).ok, true);
  assert.deepEqual(JSON.parse(encodeFlowplanBackupV5(session.getState())).data.portfolio.projects[0].legacyV4Actuals,
    JSON.parse(legacyBefore).data.portfolio.projects[0].legacyV4Actuals);
  const before = reconstructActuals(pending.portfolio, pending.planning.workingPattern).contributions
    .filter((item) => item.sourceId === pendingProject.id);
  assert.equal(before.some((item) => item.recordIndex === 0), true);
  assert.equal(session.dispatch({ kind: "replace-project-actuals", base: projectCurrentBase(session.getState().portfolio.projects[0]!), projectId: pendingProject.id, baseVersion: 0,
    intent: { kind: "reconcile" },
    teamRequirements: pendingProject.requirements.map((row) => ({ teamId: row.teamId,
      ...(row.dailyCap ? { dailyCap: row.dailyCap } : {}) })),
    current: { participation: teamIds, retiredZeroTeams: [],
      raf: pendingProject.requirements.map((row) => ({ teamId: row.teamId, amount: row.remainingWorkload })),
      coverage: { actualsFrom: d("2025-01-01"), actualsThrough: d("2025-01-02"), periods: [
        { periodId: "reconciled", from: d("2025-01-01"), through: d("2025-01-02"),
          consumed: teamIds.map((teamId) => ({ teamId, amount: c("3") })) },
      ] } },
    evidence: { consumedCells: teamIds.map((teamId) => ({ periodId: "reconciled", teamId })), rafTeams: teamIds },
  }).ok, true);
  const afterState = session.getState();
  const after = reconstructActuals(afterState.portfolio, afterState.planning.workingPattern).contributions
    .filter((item) => item.sourceId === pendingProject.id);
  assert.equal(after.every((item) => item.snapshotId === snapshotId("project", pendingProject.id, 1)), true);
  assert.equal(after.some((item) => item.recordIndex !== undefined), false);
  const reconciled = decodeFlowplanBackup(encodeFlowplanBackupV5(afterState));
  assert.equal(reconciled.portfolio.projects[0]?.legacyV4Actuals?.records.length, 1);
  const source = JSON.parse(legacyBefore).data.portfolio.projects[0].legacyV4Actuals;
  const preserved = JSON.parse(encodeFlowplanBackupV5(reconciled)).data.portfolio.projects[0].legacyV4Actuals;
  assert.deepEqual(preserved, source);
  assert.equal(JSON.parse(encodeFlowplanBackupV5(reconciled)).data.portfolio.projects[0].migrationStatus, "reconciled");
});

test("V1 through V5 backups all preflight into a stable V5 state", () => {
  const state = createDemoPlanningScenario();
  const date = "2025-01-06T00:00:00.000Z";
  for (const encode of [encodeFlowplanBackupV1, encodeFlowplanBackupV2, encodeFlowplanBackupV3,
    encodeFlowplanBackupV4, encodeFlowplanBackupV5]) {
    const original = encode(state, date);
    const migrated = decodeFlowplanBackup(original);
    const target = encodeFlowplanBackupV5(migrated, date);
    const again = decodeFlowplanBackup(target);
    assert.equal(encodeFlowplanBackupV5(again, date), target);
    assert.equal(JSON.parse(target).version, 5);
  }
});

test("V5 refuses future Actuals, dangling historical Teams and forged version gaps", () => {
  const state = createDemoPlanningScenario();
  const old = state.portfolio.projects[0]!;
  const snapshot = { snapshotId: snapshotId("project", old.id, 1), version: 1,
    knowledgeDate: d("2025-01-06"), participation: old.requirements.map((row) => row.teamId), retiredZeroTeams: [],
    raf: old.requirements.map((row) => ({ teamId: row.teamId, amount: row.remainingWorkload })),
    coverage: { actualsFrom: d("2025-01-04"), actualsThrough: d("2025-01-04"), periods: [
      { periodId: "p1", from: d("2025-01-04"), through: d("2025-01-04"),
        consumed: old.requirements.map((row) => ({ teamId: row.teamId, amount: c("0") })) },
    ] } };
  const project = valid(createProject({ ...old, snapshots: [snapshot] }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const original = JSON.parse(encodeFlowplanBackupV5({ ...state, portfolio }));
  const mutated = (edit: (backup: any) => void) => {
    const copy = structuredClone(original); edit(copy);
    assert.throws(() => decodeFlowplanBackup(JSON.stringify(copy)));
  };
  mutated((backup) => { backup.data.portfolio.projects[0].snapshots[0].coverage.actualsThrough = "2025-01-07"; });
  mutated((backup) => { backup.data.portfolio.projects[0].snapshots[0].retiredZeroTeams = ["removed-team"]; });
  mutated((backup) => { backup.data.portfolio.projects[0].snapshots[0].version = 2;
    backup.data.portfolio.projects[0].snapshots[0].snapshotId = `project:${old.id}:v2`; });
});

test("V5 refuses a future knowledgeDate itself for Project and Reservation snapshots", () => {
  const state = createDemoPlanningScenario();
  const project = state.portfolio.projects[0]!;
  const reservation = state.portfolio.reservations[0]!;
  const through = d("2025-01-05");
  const projectWithSnapshot = valid(createProject({ ...project, snapshots: [{
    snapshotId: snapshotId("project", project.id, 1), version: 1, knowledgeDate: d("2025-01-06"),
    participation: project.requirements.map((row) => row.teamId), retiredZeroTeams: [],
    raf: project.requirements.map((row) => ({ teamId: row.teamId, amount: row.remainingWorkload })),
    coverage: { actualsFrom: through, actualsThrough: through, periods: [{
      periodId: "project-period", from: through, through,
      consumed: project.requirements.map((row) => ({ teamId: row.teamId, amount: c("0") })),
    }] },
  }] }));
  const reservationWithSnapshot = valid(createReservation({ ...reservation, snapshots: [{
    snapshotId: snapshotId("reservation", reservation.id, 1), version: 1, knowledgeDate: d("2025-01-06"),
    participation: reservation.teamAllocations.map((row) => row.teamId), retiredZeroTeams: [],
    coverage: { actualsFrom: through, actualsThrough: through, periods: [{
      periodId: "reservation-period", from: through, through,
      consumed: reservation.teamAllocations.map((row) => ({ teamId: row.teamId, amount: c("0") })),
    }] },
  }] }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((row) => row.id === project.id ? projectWithSnapshot : row),
    reservations: state.portfolio.reservations.map((row) => row.id === reservation.id ? reservationWithSnapshot : row),
  }));
  const document = JSON.parse(encodeFlowplanBackupV5({ ...state, portfolio }, "2025-01-06T00:00:00.000Z"));
  assert.doesNotThrow(() => decodeFlowplanBackup(JSON.stringify(document)));
  for (const kind of ["Project", "Reservation"] as const) {
    const forged = structuredClone(document);
    const target = kind === "Project" ? forged.data.portfolio.projects[0] : forged.data.portfolio.reservations[0];
    target.snapshots.push({ ...structuredClone(target.snapshots[0]),
      snapshotId: `${kind.toLowerCase()}:${target.id}:v2`, version: 2 });
    assert.doesNotThrow(() => decodeFlowplanBackup(JSON.stringify(forged)));
    target.snapshots[0].knowledgeDate = "2099-01-01";
    target.snapshots[1].knowledgeDate = "2099-01-02";
    assert.ok(target.snapshots[0].coverage.actualsThrough <= target.snapshots[0].knowledgeDate);
    assert.ok(target.snapshots[1].coverage.actualsThrough <= target.snapshots[1].knowledgeDate);
    assert.throws(() => decodeFlowplanBackup(JSON.stringify(forged)), /snapshots\[0\]\.knowledgeDate/,
      `${kind} historical knowledgeDate must not exceed exportedAt`);
  }
});

test("retained V4 evidence alone protects Project and Team identities", () => {
  const state = createDemoPlanningScenario();
  const old = state.portfolio.projects[0]!;
  const teamId = old.requirements[0]!.teamId;
  const legacy = { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-01"), teams: [{ teamId,
      cumulativeConsumed: c("1"), remainingWorkload: old.requirements[0]!.remainingWorkload }] },
  ] };
  const project = valid(createProject({ ...old, legacyV4Actuals: legacy }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const session = createPlanningSession({ ...state, portfolio });
  assert.equal(session.dispatch({ kind: "remove-project", projectId: old.id }).ok, false);
  assert.equal(session.dispatch({ kind: "remove-team", teamId }).ok, false);
  assert.equal(session.getState().portfolio.projects[0]?.legacyV4Actuals?.records.length, 1);
});

test("future-through V4 history remains lossless but cannot reconcile before its coverage date", () => {
  const state = createDemoPlanningScenario();
  const old = state.portfolio.projects[0]!;
  const actuals = { actualsFromDate: d("2025-01-01"), records: [
    { actualsThroughDate: d("2025-01-10"), teams: old.requirements.map((row) => ({ teamId: row.teamId,
      cumulativeConsumed: c("1"), remainingWorkload: row.remainingWorkload })) },
  ] };
  const project = valid(createProject({ ...old, actuals,
    requirements: old.requirements.map((row) => ({ ...row, rafAuthority: "latest-actuals" as const })) }));
  const portfolio = valid(createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item, index) => index === 0 ? project : item) }));
  const pending = decodeFlowplanBackup(encodeFlowplanBackupV4({ ...state, portfolio }));
  const session = createPlanningSession(pending, { today: () => d("2025-01-06") });
  const before = session.getState();
  const teamIds = project.requirements.map((row) => row.teamId);
  const result = session.dispatch({ kind: "replace-project-actuals", base: projectCurrentBase(session.getState().portfolio.projects[0]!), projectId: project.id, baseVersion: 0,
    intent: { kind: "reconcile" }, teamRequirements: project.requirements.map((row) => ({ teamId: row.teamId })),
    current: { participation: teamIds, retiredZeroTeams: [], raf: project.requirements.map((row) => ({
      teamId: row.teamId, amount: row.remainingWorkload })),
      coverage: { actualsFrom: d("2025-01-01"), actualsThrough: d("2025-01-10"), periods: [
        { periodId: "future", from: d("2025-01-01"), through: d("2025-01-10"),
          consumed: teamIds.map((teamId) => ({ teamId, amount: c("1") })) },
      ] } },
    evidence: { consumedCells: teamIds.map((teamId) => ({ periodId: "future", teamId })), rafTeams: teamIds },
  });
  assert.equal(result.ok, false);
  assert.equal(session.getState(), before);
  assert.equal(session.getState().portfolio.projects[0]?.legacyV4Actuals?.records[0]?.actualsThroughDate, d("2025-01-10"));
});
