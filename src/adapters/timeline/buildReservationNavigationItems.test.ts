import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  capacityFromSerialized, createCapacityException, createCapacityPeriod, createCivilDate,
  createPortfolio, createReservation, createReservationId, createReservationTeamAllocation,
  createTeam, createTeamCapacitySchedule, createTeamId, createWorkingPattern,
  reservationRatioFromSerialized, type DomainResult, type Reservation,
} from "../../domain/index.js";
import { buildReservationNavigationItems } from "./buildReservationNavigationItems.js";

function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const date = (value: string) => must(createCivilDate(value));
const teamId = must(createTeamId("alpha"));
const pattern = must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] }));
const team = must(createTeam({ id: teamId, name: "Alpha",
  capacitySchedule: must(createTeamCapacitySchedule({
    periods: [must(createCapacityPeriod({ start: date("2025-01-01"), end: date("2025-01-31"),
      dailyCapacity: must(capacityFromSerialized("1/3")) }))],
    exceptions: [must(createCapacityException({ date: date("2025-01-02"),
      capacity: must(capacityFromSerialized("1/2")) }))],
  })) }));
const ratio = must(createReservationTeamAllocation({ teamId,
  amount: { kind: "ratio", ratio: must(reservationRatioFromSerialized("1/1")) } }));
const fixed = must(createReservationTeamAllocation({ teamId,
  amount: { kind: "fixed-daily", dailyCapacity: must(capacityFromSerialized("2/5")) } }));
function reservation(id: string, name: string, start: string, end: string,
  allocations: readonly (typeof ratio)[] = []): Reservation {
  return must(createReservation({ id: must(createReservationId(id)), name,
    startDate: date(start), endDate: date(end), teamAllocations: allocations }));
}

describe("Reservation navigation order", () => {
  it("uses start, end, full inclusive exact request, name, and ID in that order", () => {
    const early = reservation("early", "Z", "2024-12-31", "2025-01-01");
    const short = reservation("short", "Z", "2025-01-01", "2025-01-01");
    const large = reservation("large", "Z", "2025-01-01", "2025-01-02", [ratio]);
    const smaller = reservation("smaller", "Z", "2025-01-01", "2025-01-02", [fixed]);
    const alpha = reservation("alpha-id", "A", "2025-01-01", "2025-01-02");
    const tieB = reservation("b-id", "Same", "2025-01-01", "2025-01-02");
    const tieA = reservation("a-id", "Same", "2025-01-01", "2025-01-02");
    const portfolio = must(createPortfolio({ teams: [team], projects: [], programs: [],
      priorityFamilies: [], priorityOrder: [],
      reservations: [tieB, smaller, short, alpha, large, early, tieA] }));
    assert.deepEqual(buildReservationNavigationItems(portfolio, pattern).map((item) => item.id),
      [early.id, short.id, large.id, smaller.id, alpha.id, tieA.id, tieB.id]);
    assert.deepEqual(portfolio.reservations.map((item) => item.id),
      [tieB.id, smaller.id, short.id, alpha.id, large.id, early.id, tieA.id]);
  });
});
