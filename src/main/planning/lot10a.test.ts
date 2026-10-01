import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPlanningSession } from "../../application/index.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV1, encodeFlowplanBackupV2, encodeFlowplanBackupV3, encodeFlowplanBackupV4 } from "../../application/backup/flowplanBackupV1.js";
import {
  createCivilDate, createConsumedWorkload, createRemainingWorkload,
  createCapacity, createCapacityException, createCapacityPeriod, createTeamCapacitySchedule, createTeam,
  createPortfolio, createProject, createProjectTeamRequirement, createProjectId,
  createTeamId, createWorkingPattern, createProjectActualsChronology,
  createReservationActualsChronology, reconstructActuals, serializeQuantity,
  transitionProjectRequirements,
  type DomainResult, type CivilDate, type Team,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import { createPlanningProjectionDispatcher } from "./createPlanningProjectionDispatcher.js";

const must = <T>(result: DomainResult<T>): T => {
  if (!result.ok) throw new Error(result.errors.map((error) => error.message).join(" "));
  return result.value;
};
const date = (value: string) => must(createCivilDate(value));
const consumed = (value: string) => must(createConsumedWorkload(value));
const raf = (value: string) => must(createRemainingWorkload(value));
const viewport = { width: 1800, teamLaneHeight: 100, timeAxisHeight: 76 };

describe("Lot 10A Actuals", () => {
  it("validates independent first and subsequent record boundaries and cumulative history", () => {
    const teamId = must(createTeamId("team"));
    const entry = (value: string) => ({ teamId, cumulativeConsumed: consumed(value), remainingWorkload: raf("1") });
    const valid = createProjectActualsChronology({ actualsFromDate: date("2025-01-04"), records: [
      { actualsThroughDate: date("2025-01-04"), teams: [entry("2")] },
      { actualsThroughDate: date("2025-01-05"), teams: [] },
      { actualsThroughDate: date("2025-01-06"), teams: [entry("3")] },
    ] });
    assert.equal(valid.ok, true);
    assert.equal(createProjectActualsChronology({ actualsFromDate: date("2025-01-04"), records: [
      { actualsThroughDate: date("2025-01-03"), teams: [entry("1")] },
    ] }).ok, false);
    assert.equal(createProjectActualsChronology({ actualsFromDate: date("2025-01-04"), records: [
      { actualsThroughDate: date("2025-01-04"), teams: [entry("1")] },
      { actualsThroughDate: date("2025-01-04"), teams: [entry("2")] },
    ] }).ok, false);
    assert.equal(createProjectActualsChronology({ actualsFromDate: date("2025-01-04"), records: [
      { actualsThroughDate: date("2025-01-04"), teams: [entry("2")] },
      { actualsThroughDate: date("2025-01-05"), teams: [] },
      { actualsThroughDate: date("2025-01-06"), teams: [entry("1")] },
    ] }).ok, false);
    assert.equal(createReservationActualsChronology({ actualsFromDate: date("2025-01-04"), records: [
      { actualsThroughDate: date("2025-01-04"), teams: [] },
      { actualsThroughDate: date("2025-01-05"), teams: [] },
    ] }).ok, true);
  });

  it("allows a one-day first interval, keeps cumulative history, and resets RAF authority on reintroduction", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const original = session.getState().portfolio.projects[0]!;
    const [alpha, beta] = original.requirements;
    assert.ok(alpha && beta);
    const first = { kind: "append-project-actuals" as const, projectId: original.id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"), teams: [
        { teamId: alpha.teamId, cumulativeConsumed: consumed("2"), remainingWorkload: raf("5") },
        { teamId: beta.teamId, cumulativeConsumed: consumed("1"), remainingWorkload: raf("6") },
      ] } };
    assert.equal(session.dispatch(first).ok, true);
    assert.equal(transitionProjectRequirements(session.getState().portfolio.projects[0]!, [
      { ...session.getState().portfolio.projects[0]!.requirements[0]!, rafAuthority: "current-configuration" },
      session.getState().portfolio.projects[0]!.requirements[1]!,
    ]).ok, false);
    assert.equal(session.dispatch({ kind: first.kind, projectId: first.projectId,
      record: { ...first.record, actualsThroughDate: date("2025-01-04") } }).ok, false);
    const current = () => session.getState().portfolio.projects[0]!;
    const edit = (requirements: readonly { teamId: typeof alpha.teamId; remainingWorkload: typeof alpha.remainingWorkload }[]) =>
      ({ kind: "update-project" as const, projectId: original.id, name: original.name,
        ...(original.programId === undefined ? {} : { programId: original.programId }),
        ...(original.priorityFamilyId === undefined ? {} : { priorityFamilyId: original.priorityFamilyId }),
        teamRequirements: requirements });
    assert.equal(session.dispatch(edit([{ teamId: alpha.teamId, remainingWorkload: raf("9") },
      { teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, false);
    assert.equal(session.dispatch(edit([{ teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, true);
    assert.equal(session.dispatch({ kind: "remove-team", teamId: alpha.teamId }).ok, false);
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: original.id,
      record: { actualsThroughDate: date("2025-01-05"), teams: [
        { teamId: beta.teamId, cumulativeConsumed: consumed("1"), remainingWorkload: raf("6") },
      ] } }).ok, true);
    assert.equal(session.dispatch(edit([{ teamId: alpha.teamId, remainingWorkload: raf("99") },
      { teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, true);
    assert.equal(current().requirements.find((r) => r.teamId === alpha.teamId)?.rafAuthority, "current-configuration");
    assert.equal(session.dispatch(edit([{ teamId: alpha.teamId, remainingWorkload: raf("88") },
      { teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, true);
    const restored = decodeFlowplanBackup(encodeFlowplanBackupV4(session.getState()));
    assert.equal(serializeQuantity(restored.portfolio.projects[0]!.requirements.find((r) => r.teamId === alpha.teamId)!.remainingWorkload), "88/1");
    assert.equal(restored.portfolio.projects[0]!.requirements.find((r) => r.teamId === alpha.teamId)?.rafAuthority, "current-configuration");
    const forged = JSON.parse(encodeFlowplanBackupV4(session.getState()));
    const alphaRequirement = forged.data.portfolio.projects[0].requirements.find((r: { teamId: string }) => r.teamId === alpha.teamId);
    alphaRequirement.rafAuthority = "latest-actuals";
    alphaRequirement.remainingWorkload = "5/1";
    assert.throws(() => decodeFlowplanBackup(JSON.stringify(forged)));
    assert.equal(createPlanningSession(restored).dispatch(edit([{ teamId: alpha.teamId, remainingWorkload: raf("87") },
      { teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, true);
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: original.id,
      record: { actualsThroughDate: date("2025-01-06"), teams: [
        { teamId: alpha.teamId, cumulativeConsumed: consumed("5"), remainingWorkload: raf("7") },
        { teamId: beta.teamId, cumulativeConsumed: consumed("1"), remainingWorkload: raf("6") },
      ] } }).ok, true);
    const contribution = reconstructActuals(session.getState().portfolio, session.getState().planning.workingPattern)
      .contributions.filter((item) => item.sourceId === original.id && item.teamId === alpha.teamId && item.recordIndex === 2);
    assert.deepEqual(contribution.map((item) => `${item.date}:${serializeQuantity(item.amount)}`), ["2025-01-06:3/1"]);
    assert.equal(current().requirements.find((r) => r.teamId === alpha.teamId)?.rafAuthority, "latest-actuals");
    assert.equal(session.dispatch(edit([{ teamId: alpha.teamId, remainingWorkload: raf("8") },
      { teamId: beta.teamId, remainingWorkload: raf("6") }])).ok, false);
    assert.equal(session.dispatch({ kind: "remove-project", projectId: original.id }).ok, false);
    assert.throws(() => encodeFlowplanBackupV1(session.getState()));
    assert.throws(() => encodeFlowplanBackupV2(session.getState()));
    assert.throws(() => encodeFlowplanBackupV3(session.getState()));
  });

  it("keeps Reservation records separate and accepts overlapping over-capacity Actuals", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const reservation = session.getState().portfolio.reservations[0]!;
    const project = session.getState().portfolio.projects[0]!;
    assert.equal(session.dispatch({ kind: "set-reservation-active", reservationId: reservation.id, isActive: false }).ok, true);
    assert.equal(session.dispatch({ kind: "set-project-active", projectId: project.id, isActive: false }).ok, true);
    const entries = reservation.teamAllocations.map((allocation) => ({ teamId: allocation.teamId, cumulativeConsumed: consumed("10") }));
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"), teams: entries } }).ok, true);
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: project.id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"),
        teams: project.requirements.map((r) => ({ teamId: r.teamId, cumulativeConsumed: consumed("10"), remainingWorkload: raf("1") })) } }).ok, true);
    const projection = reconstructActuals(session.getState().portfolio, session.getState().planning.workingPattern);
    const total = projection.teamDayTotals.find((item) => item.teamId === entries[0]!.teamId && item.date === date("2025-01-04"));
    assert.equal(serializeQuantity(total!.amount), "20/1");
    assert.equal(session.getState().portfolio.projects[0]?.isActive, false);
    assert.equal(session.getState().portfolio.reservations[0]?.isActive, false);
    assert.equal(session.dispatch({ kind: "remove-reservation", reservationId: reservation.id }).ok, false);
    assert.deepEqual(decodeFlowplanBackup(encodeFlowplanBackupV4(session.getState())).portfolio.reservations[0]!.actuals?.records.length, 1);
  });

  it("allows a zero-Team Reservation to advance its own chronology", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    assert.equal(session.dispatch({ kind: "create-reservation", name: "Empty", startDate: date("2025-01-01"),
      endDate: date("2025-01-31"), teamAllocations: [] }).ok, true);
    const id = session.getState().portfolio.reservations.at(-1)!.id;
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"), teams: [] } }).ok, true);
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: id,
      record: { actualsThroughDate: date("2025-01-05"), teams: [] } }).ok, true);
    assert.equal(session.getState().portfolio.reservations.at(-1)?.actuals?.records.length, 2);
  });

  it("resumes a Reservation Team cumulative after an absent record using only the new object interval", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const reservation = session.getState().portfolio.reservations[0]!;
    const [alpha, beta] = reservation.teamAllocations;
    assert.ok(alpha && beta);
    const edit = (allocations: typeof reservation.teamAllocations) => ({
      kind: "update-reservation" as const, reservationId: reservation.id, name: reservation.name,
      startDate: reservation.startDate, endDate: reservation.endDate,
      teamAllocations: allocations.map((item) => item.amount.kind === "ratio"
        ? { teamId: item.teamId, kind: "ratio" as const, ratio: item.amount.ratio }
        : { teamId: item.teamId, kind: "fixed-daily" as const, dailyCapacity: item.amount.dailyCapacity }),
    });
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"), teams: [
        { teamId: alpha.teamId, cumulativeConsumed: consumed("10") },
        { teamId: beta.teamId, cumulativeConsumed: consumed("10") },
      ] } }).ok, true);
    assert.equal(session.dispatch(edit([beta])).ok, true);
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      record: { actualsThroughDate: date("2025-01-05"), teams: [
        { teamId: beta.teamId, cumulativeConsumed: consumed("10") },
      ] } }).ok, true);
    assert.equal(session.dispatch(edit([alpha, beta])).ok, true);
    assert.equal(session.dispatch({ kind: "append-reservation-actuals", reservationId: reservation.id,
      record: { actualsThroughDate: date("2025-01-06"), teams: [
        { teamId: alpha.teamId, cumulativeConsumed: consumed("13") },
        { teamId: beta.teamId, cumulativeConsumed: consumed("10") },
      ] } }).ok, true);
    const resumed = reconstructActuals(session.getState().portfolio, session.getState().planning.workingPattern)
      .contributions.filter((item) => item.sourceId === reservation.id && item.teamId === alpha.teamId && item.recordIndex === 2);
    assert.deepEqual(resumed.map((item) => `${item.date}:${serializeQuantity(item.amount)}`), ["2025-01-06:3/1"]);
    assert.equal(session.getState().portfolio.reservations[0]?.actuals?.records[0]?.teams.length, 2);
  });

  it("uses positive exceptions as level-1 weights and zero exceptions as level-2 eligibility", () => {
    const teamId = must(createTeamId("test-team"));
    const projectId = must(createProjectId("test-project"));
    const pattern = must(createWorkingPattern({ workingWeekdays: [1] }));
    const make = (exceptionDate: CivilDate | undefined, exceptionCapacity: string, from: CivilDate, through: CivilDate): string[] => {
      const exceptions = exceptionDate === undefined ? [] : [must(createCapacityException({ date: exceptionDate,
        capacity: must(createCapacity(exceptionCapacity)) }))];
      const schedule = must(createTeamCapacitySchedule({ periods: [], exceptions }));
      const team: Team = must(createTeam({ id: teamId, name: "Test", capacitySchedule: schedule }));
      const project = must(createProject({ id: projectId, name: "Test", requirements: [must(createProjectTeamRequirement({ teamId, remainingWorkload: raf("0"), rafAuthority: "latest-actuals" }))],
        actuals: { actualsFromDate: from, records: [{ actualsThroughDate: through, teams: [{ teamId,
          cumulativeConsumed: consumed("2"), remainingWorkload: raf("0") }] }] } }));
      const portfolio = must(createPortfolio({ teams: [team], projects: [project], programs: [], priorityFamilies: [], priorityOrder: [projectId], reservations: [] }));
      return reconstructActuals(portfolio, pattern).contributions.map((item) => `${item.date}:${serializeQuantity(item.amount)}`);
    };
    assert.deepEqual(make(date("2025-01-05"), "3", date("2025-01-05"), date("2025-01-06")), ["2025-01-05:2/1", "2025-01-06:0/1"]);
    assert.deepEqual(make(date("2025-01-05"), "0", date("2025-01-05"), date("2025-01-06")), ["2025-01-05:1/1", "2025-01-06:1/1"]);
    assert.deepEqual(make(date("2025-01-05"), "0", date("2025-01-05"), date("2025-01-05")), ["2025-01-05:2/1"]);
    assert.deepEqual(make(undefined, "0", date("2025-01-05"), date("2025-01-06")), ["2025-01-05:0/1", "2025-01-06:2/1"]);
    assert.deepEqual(make(date("2025-01-06"), "0", date("2025-01-06"), date("2025-01-06")), ["2025-01-06:2/1"]);
    assert.deepEqual(make(date("2025-01-06"), "3", date("2025-01-06"), date("2025-01-06")), ["2025-01-06:2/1"]);
  });

  it("rebuilds old daily shape from current capacity knowledge without changing records", () => {
    const teamId = must(createTeamId("shape-team"));
    const projectId = must(createProjectId("shape-project"));
    const project = must(createProject({ id: projectId, name: "Shape", requirements: [must(createProjectTeamRequirement({
      teamId, remainingWorkload: raf("0"), rafAuthority: "latest-actuals",
    }))], actuals: { actualsFromDate: date("2025-01-06"), records: [{ actualsThroughDate: date("2025-01-07"),
      teams: [{ teamId, cumulativeConsumed: consumed("2"), remainingWorkload: raf("0") }] }] } }));
    const pattern = must(createWorkingPattern({ workingWeekdays: [1, 2] }));
    const shape = (capacityDay: string) => {
      const day = date(capacityDay);
      const schedule = must(createTeamCapacitySchedule({ periods: [must(createCapacityPeriod({
        start: day, end: day, dailyCapacity: must(createCapacity("1")),
      }))], exceptions: [] }));
      const team = must(createTeam({ id: teamId, name: "Shape", capacitySchedule: schedule }));
      const portfolio = must(createPortfolio({ teams: [team], projects: [project], programs: [], priorityFamilies: [],
        priorityOrder: [projectId], reservations: [] }));
      return reconstructActuals(portfolio, pattern).contributions.map((item) => `${item.date}:${serializeQuantity(item.amount)}`);
    };
    assert.deepEqual(shape("2025-01-06"), ["2025-01-06:2/1", "2025-01-07:0/1"]);
    assert.deepEqual(shape("2025-01-07"), ["2025-01-06:0/1", "2025-01-07:2/1"]);
    assert.equal(serializeQuantity(project.actuals!.records[0]!.teams[0]!.cumulativeConsumed), "2/1");
  });

  it("rejects malformed V4 history and RAF authority without changing legacy readability", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const project = session.getState().portfolio.projects[0]!;
    assert.equal(session.dispatch({ kind: "append-project-actuals", projectId: project.id,
      actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"),
        teams: project.requirements.map((r) => ({ teamId: r.teamId, cumulativeConsumed: consumed("1"), remainingWorkload: raf("2") })) } }).ok, true);
    const encoded = encodeFlowplanBackupV4(session.getState());
    const source = JSON.parse(encoded);
    const altered = (edit: (project: any) => void) => {
      const copy = structuredClone(source);
      edit(copy.data.portfolio.projects[0]);
      assert.throws(() => decodeFlowplanBackup(JSON.stringify(copy)));
    };
    altered((p) => { p.requirements[0].rafAuthority = "latest-actuals"; p.requirements[0].remainingWorkload = "3/1"; });
    altered((p) => { delete p.requirements[0].rafAuthority; });
    altered((p) => { p.actuals.records[0].teams[0].cumulativeConsumed = "2/2"; });
    altered((p) => { p.actuals.records[0].teams[0].teamId = "unknown-team"; });
    altered((p) => { p.actuals.records[0].actualsThroughDate = "2025-01-03"; });
    const legacy = createDemoPlanningScenario();
    for (const document of [encodeFlowplanBackupV1(legacy), encodeFlowplanBackupV2(legacy), encodeFlowplanBackupV3(legacy)]) {
      const restored = decodeFlowplanBackup(document);
      assert.ok(restored.portfolio.projects.every((item) => item.actuals === undefined));
    }
  });

  it("publishes neither append when projection or backup persistence fails", () => {
    for (const kind of ["project", "reservation"] as const) {
      for (const failure of ["projection", "backup"] as const) {
        const session = createPlanningSession(createDemoPlanningScenario());
        const before = session.getState();
        let document = "old";
        let fail = false;
        const dispatcher = createPlanningProjectionDispatcher({ session, geometryViewport: viewport,
          buildProjection: (input) => {
            if (fail && failure === "projection") throw new Error("projection failed");
            return buildPlanningSessionProjection(input);
          }, backupStore: { read: () => document, write: (next) => {
            if (fail && failure === "backup") throw new Error("backup failed");
            document = next;
          } } });
        const priorProjection = dispatcher.getProjection();
        const project = before.portfolio.projects[0]!;
        const reservation = before.portfolio.reservations[0]!;
        const command = kind === "project" ? { kind: "append-project-actuals" as const, projectId: project.id,
          actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"),
            teams: project.requirements.map((r) => ({ teamId: r.teamId, cumulativeConsumed: consumed("1"), remainingWorkload: raf("2") })) } }
          : { kind: "append-reservation-actuals" as const, reservationId: reservation.id,
            actualsFromDate: date("2025-01-04"), record: { actualsThroughDate: date("2025-01-04"),
              teams: reservation.teamAllocations.map((a) => ({ teamId: a.teamId, cumulativeConsumed: consumed("1") })) } };
        fail = true;
        assert.equal(dispatcher.dispatch(command).ok, false);
        assert.strictEqual(session.getState(), before);
        assert.strictEqual(dispatcher.getProjection(), priorProjection);
        assert.equal(document, "old");
      }
    }
  });
});
