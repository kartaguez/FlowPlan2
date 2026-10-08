import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProjectHistoryViewModel, historyDayIndex } from "./buildProjectHistoryViewModel.js";
import { historyFixture } from "./historyTestFixture.js";
import { rationalToCanonicalString } from "../../domain/model/rational.js";
import { civilDayDifference, createCivilDate } from "../../domain/model/date.js";
import { decodeFlowplanBackup, encodeFlowplanBackupV7 } from "../backup/flowplanBackupV1.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";

describe("Project History pure projection", () => {
  it("has no substituted horizon or projects for an empty collection", () => {
    assert.deepEqual(buildProjectHistoryViewModel([]), { snapshots: [], referenceSnapshotId: null, horizon: null, projects: [] });
  });
  it("orders equal timestamps by ID, uses historical labels, skips absent predecessors and remains immutable", () => {
    const first = historyFixture("a"); const id = first.forecast.projects[0]!.projectId;
    const absent = historyFixture("b", (dto) => { dto.portfolio.projects = dto.portfolio.projects.filter((p) => p.id !== id);
      dto.portfolio.priorityOrder = dto.portfolio.priorityOrder.filter((p) => p !== id);
      const used = [...dto.portfolio.projects, ...dto.portfolio.reservations];
      dto.portfolio.programs = dto.portfolio.programs.filter((p) => used.some((r) => r.programId === p.id));
      dto.portfolio.priorityFamilies = dto.portfolio.priorityFamilies.filter((p) => used.some((r) => r.priorityFamilyId === p.id));
    });
    const last = historyFixture("c", (dto) => { dto.portfolio.projects[0]!.name = "Historical rename";
      dto.portfolio.projects[0]!.isActive = false; dto.portfolio.priorityOrder.reverse(); });
    const vm = buildProjectHistoryViewModel([last, absent, first]);
    assert.deepEqual(vm.snapshots.map((s) => s.snapshotId), ["a", "b", "c"]);
    const project = vm.projects.find((p) => p.metadata.id === id)!;
    assert.equal(project.metadata.name, "Historical rename"); assert.equal(project.rows.length, 3);
    assert.equal(project.rows[1]!.kind, "absent");
    const row = project.rows[2]!; assert.equal(row.kind, "present"); if (row.kind !== "present") return;
    assert.equal(row.comparison!.previousSnapshotId, "a"); assert.equal(row.comparison!.activationChanged, true);
    assert.equal(row.forecastStatus, "inactive"); assert.equal(row.comparison!.end.delta, null);
    assert.equal(Object.isFrozen(row.comparison!.eac.delta), true); assert.equal(Object.isFrozen(project.rows), true);
    assert.throws(() => { (row.metadata as any).name = "current"; });
  });
  it("distinguishes legacy unavailable and available sparse empty without replaying an unknown engine", () => {
    const legacy = historyFixture("a", () => {}, 1);
    const empty = historyFixture("b", (dto) => { dto.portfolio.projects[0]!.earliestStartDate = "2027-01-01" as any; });
    const source = createDemoPlanningScenario();
    const loaded = decodeFlowplanBackup(encodeFlowplanBackupV7({ ...source, portfolioSnapshots: [legacy, empty] }));
    const vm = buildProjectHistoryViewModel(loaded.portfolioSnapshots!);
    const rows = vm.projects.find((p) => p.metadata.id === legacy.forecast.projects[0]!.projectId)!.rows;
    assert.equal(rows[0]!.kind, "present"); assert.equal(rows[1]!.kind, "present");
    if (rows[0]!.kind !== "present" || rows[1]!.kind !== "present") return;
    assert.equal(rows[0]!.profile, "unavailable-legacy"); assert.equal(rows[0]!.forecastStatus, "daily allocations unavailable");
    assert.equal(rows[1]!.profile, "available"); assert.equal(rows[1]!.days.length, 0);
    assert.equal(rows[1]!.forecastStatus, "no allocation within horizon");
  });
  it("preserves exact EAC deltas and daily sums instead of substituting allocated Forecast for RAF", () => {
    const first = historyFixture("a");
    const last = historyFixture("b", (dto) => { dto.portfolio.projects[0]!.requirements[0]!.remainingWorkload = "1000/3"; });
    const row = buildProjectHistoryViewModel([first, last]).projects.find((p) => p.metadata.id === first.forecast.projects[0]!.projectId)!.rows[1]!;
    assert.equal(row.kind, "present"); if (row.kind !== "present") return;
    assert.equal(rationalToCanonicalString(row.comparison!.eac.delta), "835/3");
    assert.equal(row.metrics.endAbsenceReason, "incomplete-within-horizon");
    assert.equal(row.forecastStatus, "allocated");
    assert.equal(historyDayIndex(row.days, row.days[0]!.date), 0);
    assert.equal(rationalToCanonicalString(row.days[0]!.total), rationalToCanonicalString(row.days[0]!.forecast));
  });
  it("orders disappeared Projects after reference members and uses the reference horizon even for schema 1", () => {
    const first = historyFixture("a");
    const last = historyFixture("b", (dto) => { dto.planning.endDate = "2025-01-08" as any; dto.portfolio.projects = [];
      dto.portfolio.priorityOrder = []; dto.portfolio.programs = dto.portfolio.programs.filter((p) => dto.portfolio.reservations.some((r) => r.programId === p.id));
      dto.portfolio.priorityFamilies = dto.portfolio.priorityFamilies.filter((p) => dto.portfolio.reservations.some((r) => r.priorityFamilyId === p.id)); }, 1);
    const vm = buildProjectHistoryViewModel([first, last]);
    assert.equal(vm.horizon!.through, "2025-01-08"); assert.equal(vm.projects.length, first.forecast.projects.length);
    assert.ok(vm.projects.every((p) => p.rows[1]!.kind === "absent"));
  });
  it("compares civil days across leap days and DST without local Date arithmetic", () => {
    const date = (text: string) => { const r = createCivilDate(text); assert.ok(r.ok); return r.value; };
    assert.equal(civilDayDifference(date("2024-03-01"), date("2024-02-28")), 2);
    assert.equal(civilDayDifference(date("2026-03-29"), date("2026-03-30")), -1);
  });
});

it("compares Programme and Pas IDs/labels including renames, None and date deltas", () => {
  const first = historyFixture("a");
  const renamed = historyFixture("b", (dto) => { dto.portfolio.programs[0]!.name = "Renamed historical Programme";
    dto.portfolio.priorityFamilies[0]!.name = "Renamed historical Pas";
    dto.portfolio.projects[0]!.earliestStartDate = "2025-02-03" as any; });
  const model = buildProjectHistoryViewModel([first, renamed]);
  const row = model.projects.find((p) => p.metadata.id === first.forecast.projects[0]!.projectId)!.rows[1]!;
  if (row.kind !== "present") throw new Error();
  assert.equal(row.comparison!.programChanged, true); assert.equal(row.comparison!.pasChanged, true);
  assert.equal(row.comparison!.start.delta, 33); assert.equal(row.comparison!.eac.delta.numerator, 0n);
  assert.equal(row.comparison!.previousMetadata.program!.id, row.metadata.program!.id);
  const none = historyFixture("c", (dto) => { const p = dto.portfolio.projects[0]!; delete p.programId; p.ownColor = "#123456" as any; delete p.priorityFamilyId;
    const used = [...dto.portfolio.projects, ...dto.portfolio.reservations];
    dto.portfolio.priorityFamilies = dto.portfolio.priorityFamilies.filter((f) => used.some((r) => r.priorityFamilyId === f.id)); });
  const next = buildProjectHistoryViewModel([first, none]).projects.find((p) => p.metadata.id === first.forecast.projects[0]!.projectId)!.rows[1]!;
  if (next.kind !== "present") throw new Error();
  assert.equal(next.metadata.program, null); assert.equal(next.metadata.pas, null); assert.equal(next.comparison!.programChanged, true);
});
