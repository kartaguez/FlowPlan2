import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity, createCapacityPeriod, createCivilDate, createReservation,
  createReservationId, createReservationRatio, createReservationTeamAllocation,
  createTeam, createTeamCapacitySchedule, createTeamId, createUnavailabilityRatio,
  createWorkingPattern, isOverReserved, projectCapacity, reservedCapacity,
  capacityFromSerialized, reservationRatioFromSerialized,
  createPortfolio, createPlanningHorizon, createMaxParallelProjects, planPortfolio,
  serializeQuantity, type DomainResult, type Reservation,
} from "../index.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }

describe("global multi-team reservations", () => {
  const date = (value: string) => must(createCivilDate(value));
  const teamId = must(createTeamId("team-a"));
  const weekdays = must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }));
  const everyDay = must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] }));
  const team = (capacity: string, unavailability?: string) => must(createTeam({
    id: teamId, name: "Team A",
    capacitySchedule: must(createTeamCapacitySchedule({ periods: [must(createCapacityPeriod({
      start: date("2025-01-01"), end: date("2025-01-31"), dailyCapacity: must(createCapacity(capacity)),
      ...(unavailability === undefined ? {} : { unavailabilityRatio: must(createUnavailabilityRatio(unavailability)) }),
    }))], exceptions: [] })),
  }));
  const reservation = (id: string, kind: "ratio" | "fixed-daily", value: string, end = "2025-01-31"): Reservation => must(createReservation({
    id: must(createReservationId(id)), name: id, startDate: date("2025-01-01"), endDate: date(end),
    teamAllocations: [must(createReservationTeamAllocation({ teamId, amount: kind === "ratio"
      ? { kind, ratio: must(value.includes("/") ? reservationRatioFromSerialized(value) : createReservationRatio(value)) }
      : { kind, dailyCapacity: must(value.includes("/") ? capacityFromSerialized(value) : createCapacity(value)) } }))],
  }));

  it("owns global dates/name and rejects duplicate team allocations", () => {
    const allocation = must(createReservationTeamAllocation({ teamId, amount: { kind: "ratio", ratio: must(reservationRatioFromSerialized("1/3")) } }));
    assert.equal(createReservation({ id: must(createReservationId("duplicate")), name: " Run ", startDate: date("2025-01-01"), endDate: date("2025-01-31"), teamAllocations: [allocation, allocation] }).ok, false);
    assert.equal(createReservation({ id: must(createReservationId("reversed")), name: "Run", startDate: date("2025-02-01"), endDate: date("2025-01-01"), teamAllocations: [] }).ok, false);
  });

  it("mixes exact ratio and fixed daily requests", () => {
    const current = team("8"); const reservations = [reservation("quarter", "ratio", "1/4"), reservation("fixed", "fixed-daily", "3/2")];
    assert.equal(serializeQuantity(reservedCapacity(current, date("2025-01-15"), reservations, everyDay)), "7/2");
    assert.equal(serializeQuantity(projectCapacity(current, date("2025-01-15"), reservations, everyDay)), "9/2");
  });

  it("keeps fixed daily demand at 100% unavailability and reports over-reservation", () => {
    const unavailable = team("4", "1"); const reservations = [reservation("fixed", "fixed-daily", "1")]; const day = date("2025-01-15");
    assert.equal(serializeQuantity(reservedCapacity(unavailable, day, reservations, everyDay)), "1/1");
    assert.equal(serializeQuantity(projectCapacity(unavailable, day, reservations, everyDay)), "0/1");
    assert.equal(isOverReserved(unavailable, day, reservations, everyDay), true);
    const portfolio = must(createPortfolio({ teams: [unavailable], projects: [], priorityOrder: [], reservations }));
    const result = planPortfolio({
      portfolio,
      horizon: must(createPlanningHorizon({ start: day, end: day })),
      workingPattern: everyDay,
      maxParallelProjects: must(createMaxParallelProjects(1)),
    });
    assert.equal(result.diagnostics[0]?.code, "TEAM_OVER_RESERVED");
  });

  it("does not apply fixed daily without a capacity period or on a global non-working day", () => {
    const current = team("4"); const fixed = [reservation("fixed", "fixed-daily", "1", "2025-02-28")];
    assert.equal(serializeQuantity(reservedCapacity(current, date("2025-02-03"), fixed, weekdays)), "0/1");
    assert.equal(serializeQuantity(reservedCapacity(current, date("2025-01-04"), fixed, weekdays)), "0/1");
  });

  it("makes ratio demand zero at zero effective capacity", () => {
    const unavailable = team("4", "1");
    assert.equal(serializeQuantity(reservedCapacity(unavailable, date("2025-01-15"), [reservation("half", "ratio", "1/2")], everyDay)), "0/1");
  });

  it("does not clamp mixed requested capacity and bases diagnostics on the actual request", () => {
    const current = team("4"); const reservations = [reservation("ratio", "ratio", "3/4"), reservation("fixed", "fixed-daily", "2")]; const day = date("2025-01-15");
    assert.equal(serializeQuantity(reservedCapacity(current, day, reservations, everyDay)), "5/1");
    assert.equal(serializeQuantity(projectCapacity(current, day, reservations, everyDay)), "0/1");
    assert.equal(isOverReserved(current, day, reservations, everyDay), true);
  });
});
