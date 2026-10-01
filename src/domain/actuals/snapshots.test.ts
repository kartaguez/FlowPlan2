import assert from "node:assert/strict";
import test from "node:test";
import { createCivilDate } from "../model/date.js";
import { createConsumedWorkload, createProjectId, createRemainingWorkload, createReservationId, createTeamId } from "../model/scalars.js";
import { createProjectActualsSnapshot, createReservationActualsSnapshot, createSnapshotHistory, snapshotId, type ProjectActualsSnapshot } from "./snapshots.js";
import { replaceProjectSnapshot, replaceReservationSnapshot } from "./transition.js";

function valid<T>(result: { ok: true; value: T } | { ok: false; errors: readonly unknown[] }): T {
  assert.equal(result.ok, true, JSON.stringify(result.ok ? [] : result.errors));
  return result.value;
}
const d = (value: string) => valid(createCivilDate(value));
const p = valid(createProjectId("p"));
const r = valid(createReservationId("r"));
const a = valid(createTeamId("a"));
const b = valid(createTeamId("b"));
const c = (value: string) => valid(createConsumedWorkload(value));
const raf = (value: string) => valid(createRemainingWorkload(value));
const day = d("2026-10-01");
const coverage = (value: string) => ({ actualsFrom: day, actualsThrough: day,
  periods: [{ periodId: "period-1", from: day, through: day, consumed: [{ teamId: a, amount: c(value) }] }] });
const project = (version: number, state: Omit<ProjectActualsSnapshot, "snapshotId" | "version" | "knowledgeDate">): ProjectActualsSnapshot =>
  ({ ...state, snapshotId: snapshotId("project", p, version), version, knowledgeDate: day });

test("absence, RAF-only zero and covered explicit zero remain distinct", () => {
  const zero = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("0") }] });
  const covered = project(1, { ...zero, coverage: coverage("0") });
  assert.equal(createSnapshotHistory([], p, "project").ok, true);
  assert.equal(valid(createProjectActualsSnapshot(zero, p)).coverage, undefined);
  assert.equal(valid(createProjectActualsSnapshot(covered, p)).coverage?.periods[0]?.consumed.length, 1);
  assert.equal(createReservationActualsSnapshot({ snapshotId: snapshotId("reservation", r, 1), version: 1,
    knowledgeDate: day, participation: [a], retiredZeroTeams: [], coverage: coverage("0") }, r).ok, true);
});

test("partition, quantities, future date, history order and immutability", () => {
  const first = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("2") }], coverage: coverage("3") });
  const frozen = valid(createProjectActualsSnapshot(first, p));
  assert.equal(Object.isFrozen(frozen.coverage?.periods[0]?.consumed), true);
  assert.equal(createProjectActualsSnapshot({ ...first, coverage: { ...coverage("3"), actualsThrough: d("2026-10-02") } }, p).ok, false);
  assert.equal(createProjectActualsSnapshot({ ...first, coverage: { ...coverage("3"), periods: [
    { ...coverage("3").periods[0]!, consumed: [{ teamId: a, amount: c("3") }, { teamId: a, amount: c("1") }] }] } }, p).ok, false);
  assert.equal(createSnapshotHistory([first, { ...first, version: 3, snapshotId: snapshotId("project", p, 3) }], p, "project").ok, false);
});

test("same day version, no-op, stale base, changed value and explicit RAF", () => {
  const first = valid(replaceProjectSnapshot(p, [], { baseVersion: 0, knowledgeDate: day, intent: { kind: "initial" },
    current: { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("2") }], coverage: coverage("3") },
    evidence: { consumedCells: [{ periodId: "period-1", teamId: a }], rafTeams: [a] } }));
  const noop = valid(replaceProjectSnapshot(p, first, { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("2") }], coverage: coverage("3") },
    evidence: { consumedCells: [] } }));
  assert.equal(noop, first);
  assert.equal(replaceProjectSnapshot(p, first, { baseVersion: 0, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("2") }] },
    evidence: { consumedCells: [] } }).ok, false);
  const changed = valid(replaceProjectSnapshot(p, first, { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("1") }], coverage: {
      ...coverage("4"), periods: [{ ...coverage("4").periods[0]!, periodId: "period-2" }] } },
    evidence: { consumedCells: [{ periodId: "period-2", teamId: a }], rafTeams: [a] } }));
  assert.equal(changed.at(-1)?.version, 2);
  assert.equal(changed.at(-1)?.snapshotId, "project:p:v2");
});

test("new Team values need evidence, retirement carries explicit zero", () => {
  const first = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("5") }], coverage: coverage("0") });
  const next = { participation: [a, b], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("5") }, { teamId: b, amount: raf("0") }],
    coverage: { ...coverage("0"), periods: [{ ...coverage("0").periods[0]!, periodId: "period-2", consumed: [
      { teamId: a, amount: c("0") }, { teamId: b, amount: c("0") }] }] } };
  assert.equal(replaceProjectSnapshot(p, [first], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } }, current: next,
    evidence: { consumedCells: [], rafTeams: [b] } }).ok, false);
  const added = valid(replaceProjectSnapshot(p, [first], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } }, current: next,
    evidence: { consumedCells: [{ periodId: "period-2", teamId: b }], rafTeams: [b] } }));
  assert.equal(replaceProjectSnapshot(p, added, { baseVersion: 2, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: { participation: [b], retiredZeroTeams: [a], raf: [{ teamId: b, amount: raf("0") }],
      coverage: { ...coverage("0"), periods: [{ ...coverage("0").periods[0]!, periodId: "period-3", consumed: [{ teamId: b, amount: c("0") }] }] } },
    evidence: { consumedCells: [], retiredTeams: [a] } }).ok, true);
});

test("first Reservation snapshot needs coverage", () => {
  assert.equal(replaceReservationSnapshot(r, [], { baseVersion: 0, knowledgeDate: day, intent: { kind: "initial" },
    current: { participation: [a], retiredZeroTeams: [] }, evidence: { consumedCells: [] } }).ok, false);
});

test("split requires every nonzero result, while an all-zero zone propagates exactly", () => {
  const from = d("2026-09-30");
  const initial = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("1") }],
    coverage: { actualsFrom: from, actualsThrough: day, periods: [
      { periodId: "original", from, through: day, consumed: [{ teamId: a, amount: c("5") }] },
    ] } });
  const split = (first: string, second: string) => ({ participation: [a], retiredZeroTeams: [],
    raf: [{ teamId: a, amount: raf("1") }], coverage: { actualsFrom: from, actualsThrough: day, periods: [
      { periodId: "left", from, through: from, consumed: [{ teamId: a, amount: c(first) }] },
      { periodId: "right", from: day, through: day, consumed: [{ teamId: a, amount: c(second) }] },
    ] } });
  assert.equal(replaceProjectSnapshot(p, [initial], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: split("3", "4"), evidence: { consumedCells: [{ periodId: "left", teamId: a }] } }).ok, false);
  const replaced = valid(replaceProjectSnapshot(p, [initial], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: split("3", "4"), evidence: { consumedCells: [
      { periodId: "left", teamId: a }, { periodId: "right", teamId: a }] } }));
  assert.equal(replaced.length, 2);
  assert.equal(replaced[0]!.coverage!.periods[0]!.periodId, "original");
  const zeroInitial = project(1, { ...initial, coverage: { ...initial.coverage!, periods: [
    { ...initial.coverage!.periods[0]!, consumed: [{ teamId: a, amount: c("0") }] }] } });
  assert.equal(replaceProjectSnapshot(p, [zeroInitial], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current: split("0", "0"), evidence: { consumedCells: [] } }).ok, true);
});

test("reordering unchanged period rows and Team cells is a no-op", () => {
  const from = d("2026-09-30");
  const first = project(1, { participation: [a, b], retiredZeroTeams: [],
    raf: [{ teamId: a, amount: raf("1") }, { teamId: b, amount: raf("2") }],
    coverage: { actualsFrom: from, actualsThrough: day, periods: [
      { periodId: "left", from, through: from, consumed: [{ teamId: a, amount: c("1") }, { teamId: b, amount: c("2") }] },
      { periodId: "right", from: day, through: day, consumed: [{ teamId: a, amount: c("3") }, { teamId: b, amount: c("4") }] },
    ] } });
  const current = { participation: [a, b], retiredZeroTeams: [], raf: [...first.raf].reverse(),
    coverage: { ...first.coverage!, periods: [...first.coverage!.periods].reverse().map((period) => ({
      ...period, consumed: [...period.consumed].reverse(),
    })) } };
  assert.equal(valid(replaceProjectSnapshot(p, [first], { baseVersion: 1, knowledgeDate: day, intent: { kind: "replace", editedZone: { from: d("0000-01-01"), through: day } },
    current, evidence: { consumedCells: [] } })).length, 1);
});

test("extension, changed-through RAF validation, edge erosion and total erosion", () => {
  const priorDay = d("2026-09-30");
  const base = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("5") }],
    coverage: coverage("2") });
  const prepended = valid(replaceProjectSnapshot(p, [base], { baseVersion: 1, knowledgeDate: day,
    intent: { kind: "extension" },
    current: { participation: [a], retiredZeroTeams: [], raf: base.raf,
      coverage: { actualsFrom: priorDay, actualsThrough: day, periods: [
        { periodId: "prepend", from: priorDay, through: priorDay, consumed: [{ teamId: a, amount: c("1") }] },
        ...base.coverage!.periods,
      ] } }, evidence: { consumedCells: [{ periodId: "prepend", teamId: a }] } }));
  assert.equal(prepended.at(-1)?.version, 2);
  const future = d("2026-10-02");
  assert.equal(replaceProjectSnapshot(p, prepended, { baseVersion: 2, knowledgeDate: day,
    intent: { kind: "extension" }, current: { participation: [a], retiredZeroTeams: [], raf: base.raf,
      coverage: { actualsFrom: priorDay, actualsThrough: future, periods: [
        ...prepended.at(-1)!.coverage!.periods,
        { periodId: "future", from: future, through: future, consumed: [{ teamId: a, amount: c("1") }] },
      ] } }, evidence: { consumedCells: [{ periodId: "future", teamId: a }], rafTeams: [a] } }).ok, false);
  assert.equal(replaceProjectSnapshot(p, prepended, { baseVersion: 2, knowledgeDate: day,
    intent: { kind: "erosion" }, current: { participation: [a], retiredZeroTeams: [], raf: base.raf },
    evidence: { consumedCells: [] } }).ok, false);
  const eroded = valid(replaceProjectSnapshot(p, prepended, { baseVersion: 2, knowledgeDate: day,
    intent: { kind: "erosion" }, current: { participation: [a], retiredZeroTeams: [], raf: base.raf },
    evidence: { consumedCells: [], rafTeams: [a] } }));
  assert.equal(eroded.at(-1)?.coverage, undefined);
  assert.equal(eroded.at(-1)?.raf[0]?.amount, base.raf[0]?.amount);
});

test("nonzero Project consumption blocks Team retirement even with explicit retirement confirmation", () => {
  const first = project(1, { participation: [a, b], retiredZeroTeams: [],
    raf: [{ teamId: a, amount: raf("2") }, { teamId: b, amount: raf("0") }],
    coverage: { actualsFrom: day, actualsThrough: day, periods: [
      { periodId: "start", from: day, through: day, consumed: [{ teamId: a, amount: c("1") }, { teamId: b, amount: c("0") }] },
    ] } });
  assert.equal(replaceProjectSnapshot(p, [first], { baseVersion: 1, knowledgeDate: day,
    intent: { kind: "membership" }, current: { participation: [b], retiredZeroTeams: [a],
      raf: [{ teamId: b, amount: raf("0") }], coverage: { ...first.coverage!, periods: [
        { periodId: "removed", from: day, through: day, consumed: [{ teamId: b, amount: c("0") }] },
      ] } }, evidence: { consumedCells: [], retiredTeams: [a] } }).ok, false);
});

test("tail append, whole-head erosion and whole-tail erosion preserve exact remaining periods", () => {
  const firstDay = d("2026-09-29");
  const middle = d("2026-09-30");
  const initial = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("4") }],
    coverage: { actualsFrom: firstDay, actualsThrough: middle, periods: [
      { periodId: "head", from: firstDay, through: firstDay, consumed: [{ teamId: a, amount: c("2") }] },
      { periodId: "middle", from: middle, through: middle, consumed: [{ teamId: a, amount: c("3") }] },
    ] } });
  const appended = valid(replaceProjectSnapshot(p, [initial], { baseVersion: 1, knowledgeDate: day,
    intent: { kind: "extension" }, current: { participation: [a], retiredZeroTeams: [], raf: initial.raf,
      coverage: { actualsFrom: firstDay, actualsThrough: day, periods: [
        ...initial.coverage!.periods,
        { periodId: "tail", from: day, through: day, consumed: [{ teamId: a, amount: c("5") }] },
      ] } }, evidence: { consumedCells: [{ periodId: "tail", teamId: a }], rafTeams: [a] } }));
  const withoutHead = valid(replaceProjectSnapshot(p, appended, { baseVersion: 2, knowledgeDate: day,
    intent: { kind: "erosion" }, current: { participation: [a], retiredZeroTeams: [], raf: initial.raf,
      coverage: { actualsFrom: middle, actualsThrough: day, periods: appended.at(-1)!.coverage!.periods.slice(1) } },
    evidence: { consumedCells: [] } }));
  assert.equal(withoutHead.at(-1)?.coverage?.periods[0]?.periodId, "middle");
  const withoutTail = valid(replaceProjectSnapshot(p, withoutHead, { baseVersion: 3, knowledgeDate: day,
    intent: { kind: "erosion" }, current: { participation: [a], retiredZeroTeams: [], raf: initial.raf,
      coverage: { actualsFrom: middle, actualsThrough: middle, periods: withoutHead.at(-1)!.coverage!.periods.slice(0, 1) } },
    evidence: { consumedCells: [], rafTeams: [a] } }));
  assert.equal(withoutTail.at(-1)?.coverage?.periods.length, 1);
  assert.equal(withoutTail.at(-1)?.coverage?.actualsThrough, middle);
});

test("history preflight refuses a reused period ID with changed facts", () => {
  const first = project(1, { participation: [a], retiredZeroTeams: [], raf: [{ teamId: a, amount: raf("1") }], coverage: coverage("1") });
  const forged = project(2, { participation: [a], retiredZeroTeams: [], raf: first.raf, coverage: coverage("2") });
  assert.equal(createSnapshotHistory([first, forged], p, "project").ok, false);
});
