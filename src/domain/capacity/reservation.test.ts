import { describe, expect, it } from "vitest";
import {
  createCapacity,
  createCivilDate,
  createFirmCapacityReservation,
  createMaxParallelProjects,
  createPlanningHorizon,
  createReservationId,
  createReservationRatio,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  createWorkingPattern,
  createCapacityPeriod,
  isOverReserved,
  projectCapacity,
  reservedCapacity,
  totalReservationRatio,
  type DomainResult,
  type FirmCapacityReservation,
} from "../index";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("firm capacity reservations", () => {
  const date = (value: string) => must(createCivilDate(value));
  const teamId = must(createTeamId("team-a"));

  const team = must(
    createTeam({
      id: teamId,
      name: "Team A",
      maxParallelProjects: must(createMaxParallelProjects(1)),
      capacitySchedule: must(
        createTeamCapacitySchedule({
          workingPattern: must(
            createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] }),
          ),
          periods: [
            must(
              createCapacityPeriod({
                start: date("2025-01-01"),
                end: date("2025-12-31"),
                dailyCapacity: must(createCapacity(3.2)),
              }),
            ),
          ],
          exceptions: [],
        }),
      ),
    }),
  );

  function reservation(
    id: string,
    ratio: number,
    start = "2025-01-01",
    end = "2025-01-31",
  ): FirmCapacityReservation {
    return must(
      createFirmCapacityReservation({
        id: must(createReservationId(id)),
        teamId,
        label: id,
        start: date(start),
        end: date(end),
        ratio: must(createReservationRatio(ratio)),
      }),
    );
  }

  it("accepts boundary ratios and rejects ratios outside zero to one", () => {
    expect(createReservationRatio(0).ok).toBe(true);
    expect(createReservationRatio(1).ok).toBe(true);
    expect(createReservationRatio(-0.1).ok).toBe(false);
    expect(createReservationRatio(1.1).ok).toBe(false);
  });

  it("rejects reversed intervals and includes both bounds", () => {
    expect(
      createFirmCapacityReservation({
        id: must(createReservationId("bad")),
        teamId,
        label: "bad",
        start: date("2025-02-01"),
        end: date("2025-01-01"),
        ratio: must(createReservationRatio(0.2)),
      }),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_RESERVATION_INTERVAL" }],
    });

    const item = reservation("bounded", 0.2);
    expect(totalReservationRatio(teamId, date("2025-01-01"), [item])).toBe(0.2);
    expect(totalReservationRatio(teamId, date("2025-01-31"), [item])).toBe(0.2);
    expect(totalReservationRatio(teamId, date("2025-02-01"), [item])).toBe(0);
  });

  it("does not couple reservations to planning horizons", () => {
    const horizon = must(
      createPlanningHorizon({
        start: date("2025-06-01"),
        end: date("2025-06-30"),
      }),
    );
    const outside = reservation("outside", 0.2, "2024-01-01", "2024-01-31");
    expect(horizon.start).toBe("2025-06-01");
    expect(outside.start).toBe("2024-01-01");
  });

  it("exposes over-reservation without capping its diagnostics", () => {
    const reservations = [reservation("one", 0.7), reservation("two", 0.6)];
    const day = date("2025-01-15");
    expect(totalReservationRatio(teamId, day, reservations)).toBe(1.3);
    expect(reservedCapacity(team, day, reservations)).toBe(4.16);
    expect(projectCapacity(team, day, reservations)).toBe(0);
    expect(isOverReserved(teamId, day, reservations)).toBe(true);
  });

  it("normalizes exact reservation arithmetic", () => {
    const reservations = [reservation("twenty-percent", 0.2)];
    const day = date("2025-01-15");
    expect(reservedCapacity(team, day, reservations)).toBe(0.64);
    expect(projectCapacity(team, day, reservations)).toBe(2.56);
  });
});
