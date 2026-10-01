import assert from "node:assert/strict";
import test from "node:test";
import { createCivilDate, createConsumedWorkload, createRemainingWorkload, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningSession, type ReplaceProjectActualsCommand,
  type ReplaceReservationActualsCommand } from "./planningSession.js";

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("; "));
  return result.value;
}
const d = (text: string) => valid(createCivilDate(text));
const c = (text: string) => valid(createConsumedWorkload(text));
const raf = (text: string) => valid(createRemainingWorkload(text));

test("Project membership, current RAF zero on retirement, reintroduction and rollback are atomic", () => {
  const state = createDemoPlanningScenario();
  const project = state.portfolio.projects[0]!;
  const [alpha, beta] = project.requirements;
  const gamma = state.portfolio.teams[2]!;
  assert.ok(alpha && beta);
  const session = createPlanningSession(state, { today: () => d("2025-01-06") });
  const initial: ReplaceProjectActualsCommand = { kind: "replace-project-actuals", projectId: project.id, baseVersion: 0,
    intent: { kind: "initial" },
    teamRequirements: project.requirements.map((row) => ({ teamId: row.teamId, ...(row.dailyCap ? { dailyCap: row.dailyCap } : {}) })),
    current: { participation: [alpha.teamId, beta.teamId], retiredZeroTeams: [],
      raf: [{ teamId: alpha.teamId, amount: raf("7") }, { teamId: beta.teamId, amount: raf("8") }],
      coverage: { actualsFrom: d("2025-01-04"), actualsThrough: d("2025-01-04"), periods: [
        { periodId: "first", from: d("2025-01-04"), through: d("2025-01-04"), consumed: [
          { teamId: alpha.teamId, amount: c("0") }, { teamId: beta.teamId, amount: c("0") }] },
      ] } },
    evidence: { consumedCells: [{ periodId: "first", teamId: alpha.teamId }, { periodId: "first", teamId: beta.teamId }],
      rafTeams: [alpha.teamId, beta.teamId] },
  };
  assert.equal(session.dispatch(initial).ok, true);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 1);
  const before = session.getState();
  const noOp = session.dispatch({ ...initial, baseVersion: 1 });
  assert.equal(noOp.ok, true);
  assert.equal(session.getState(), before);
  const add: ReplaceProjectActualsCommand = { ...initial, baseVersion: 1,
    intent: { kind: "membership" },
    teamRequirements: [...initial.teamRequirements, { teamId: gamma.id }],
    current: { participation: [alpha.teamId, beta.teamId, gamma.id], retiredZeroTeams: [],
      raf: [...initial.current.raf, { teamId: gamma.id, amount: raf("2") }],
      coverage: { ...initial.current.coverage!, periods: [{ ...initial.current.coverage!.periods[0]!, periodId: "added",
        consumed: [...initial.current.coverage!.periods[0]!.consumed, { teamId: gamma.id, amount: c("0") }] }] } },
    evidence: { consumedCells: [{ periodId: "added", teamId: gamma.id }], rafTeams: [gamma.id] },
  };
  assert.equal(session.dispatch(add, () => { throw new Error("write failed"); }).ok, false);
  assert.equal(session.getState(), before);
  assert.equal(session.dispatch(add).ok, true);
  const remove: ReplaceProjectActualsCommand = { ...add, baseVersion: 2,
    teamRequirements: add.teamRequirements.filter((row) => row.teamId !== alpha.teamId),
    current: { participation: [beta.teamId, gamma.id], retiredZeroTeams: [alpha.teamId],
      raf: add.current.raf.filter((row) => row.teamId !== alpha.teamId),
      coverage: { ...add.current.coverage!, periods: [{ ...add.current.coverage!.periods[0]!, periodId: "removed",
        consumed: add.current.coverage!.periods[0]!.consumed.filter((row) => row.teamId !== alpha.teamId) }] } },
    evidence: { consumedCells: [], retiredTeams: [alpha.teamId] },
  };
  assert.equal(session.dispatch(remove).ok, true);
  const retired = session.getState().portfolio.projects[0]!;
  assert.equal(retired.snapshots?.at(-1)?.retiredZeroTeams[0], alpha.teamId);
  assert.equal(retired.requirements.some((row) => row.teamId === alpha.teamId), false);
  assert.equal(serializeQuantity(retired.snapshots![0]!.raf[0]!.amount), "7/1");
  const reintroduce: ReplaceProjectActualsCommand = { ...initial, baseVersion: 3,
    intent: { kind: "membership" },
    teamRequirements: add.teamRequirements,
    current: { participation: [alpha.teamId, beta.teamId, gamma.id], retiredZeroTeams: [],
      raf: [{ teamId: alpha.teamId, amount: raf("0") }, ...remove.current.raf],
      coverage: { ...remove.current.coverage!, periods: [{ ...remove.current.coverage!.periods[0]!, periodId: "reintroduced",
        consumed: [{ teamId: alpha.teamId, amount: c("0") }, ...remove.current.coverage!.periods[0]!.consumed] }] } },
    evidence: { consumedCells: [{ periodId: "reintroduced", teamId: alpha.teamId }], rafTeams: [alpha.teamId] },
  };
  assert.equal(session.dispatch(reintroduce).ok, true);
  assert.equal(session.getState().portfolio.projects[0]?.snapshots?.length, 4);
});

test("Reservation membership and zero retirement share one snapshot transaction", () => {
  const state = createDemoPlanningScenario();
  const reservation = state.portfolio.reservations[0]!;
  const first = reservation.teamAllocations[0]!;
  const allocation = (teamId: typeof first.teamId, amount: typeof first.amount) => amount.kind === "ratio"
    ? { teamId, kind: "ratio" as const, ratio: amount.ratio }
    : { teamId, kind: "fixed-daily" as const, dailyCapacity: amount.dailyCapacity };
  const addedTeam = state.portfolio.teams.find((team) => !reservation.teamAllocations.some((row) => row.teamId === team.id))!;
  const session = createPlanningSession(state, { today: () => d("2025-01-06") });
  const initial: ReplaceReservationActualsCommand = { kind: "replace-reservation-actuals", reservationId: reservation.id,
    baseVersion: 0, intent: { kind: "initial" }, teamAllocations: reservation.teamAllocations.map((row) =>
      allocation(row.teamId, row.amount)),
    current: { participation: reservation.teamAllocations.map((row) => row.teamId), retiredZeroTeams: [],
      coverage: { actualsFrom: d("2025-01-04"), actualsThrough: d("2025-01-04"), periods: [
        { periodId: "r-first", from: d("2025-01-04"), through: d("2025-01-04"), consumed:
          reservation.teamAllocations.map((row) => ({ teamId: row.teamId, amount: c("0") })) },
      ] } },
    evidence: { consumedCells: reservation.teamAllocations.map((row) => ({ periodId: "r-first", teamId: row.teamId })) },
  };
  assert.equal(session.dispatch(initial).ok, true);
  const added: ReplaceReservationActualsCommand = { ...initial, baseVersion: 1, intent: { kind: "membership" },
    teamAllocations: [...initial.teamAllocations, allocation(addedTeam.id, first.amount)],
    current: { participation: [...initial.current.participation, addedTeam.id], retiredZeroTeams: [],
      coverage: { ...initial.current.coverage!, periods: [{ ...initial.current.coverage!.periods[0]!,
        periodId: "r-added", consumed: [...initial.current.coverage!.periods[0]!.consumed,
          { teamId: addedTeam.id, amount: c("0") }] }] } },
    evidence: { consumedCells: [{ periodId: "r-added", teamId: addedTeam.id }] },
  };
  assert.equal(session.dispatch(added).ok, true);
  const removed: ReplaceReservationActualsCommand = { ...added, baseVersion: 2,
    teamAllocations: added.teamAllocations.filter((row) => row.teamId !== first.teamId),
    current: { participation: added.current.participation.filter((id) => id !== first.teamId), retiredZeroTeams: [first.teamId],
      coverage: { ...added.current.coverage!, periods: [{ ...added.current.coverage!.periods[0]!, periodId: "r-removed",
        consumed: added.current.coverage!.periods[0]!.consumed.filter((row) => row.teamId !== first.teamId) }] } },
    evidence: { consumedCells: [], retiredTeams: [first.teamId] },
  };
  assert.equal(session.dispatch(removed).ok, true);
  const current = session.getState().portfolio.reservations[0]!;
  assert.equal(current.snapshots?.length, 3);
  assert.equal(current.teamAllocations.some((row) => row.teamId === first.teamId), false);
  assert.equal(current.snapshots?.at(-1)?.retiredZeroTeams.includes(first.teamId), true);
});
