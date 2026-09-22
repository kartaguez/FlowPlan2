import { describe, expect, it } from "vitest";
import {
  createCapacity,
  createCapacityPeriod,
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
  isOverReserved,
  projectCapacity,
  quantityToDecimalString,
  reservedCapacity,
  serializeQuantity,
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
  const rendered = (value: Parameters<typeof quantityToDecimalString>[0]) =>
    must(quantityToDecimalString(value));

  function makeTeam(dailyCapacity: string) {
    return must(
      createTeam({
        id: teamId,
        name: "Team A",
        maxParallelProjects: must(createMaxParallelProjects(1)),
        capacitySchedule: must(
          createTeamCapacitySchedule({
            workingPattern: must(
              createWorkingPattern({
                workingWeekdays: [1, 2, 3, 4, 5, 6, 7],
              }),
            ),
            periods: [
              must(
                createCapacityPeriod({
                  start: date("2025-01-01"),
                  end: date("2025-12-31"),
                  dailyCapacity: must(createCapacity(dailyCapacity)),
                }),
              ),
            ],
            exceptions: [],
          }),
        ),
      }),
    );
  }

  function reservation(
    id: string,
    ratio: string,
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
    expect(createReservationRatio("0").ok).toBe(true);
    expect(createReservationRatio("1").ok).toBe(true);
    expect(createReservationRatio("-0.1").ok).toBe(false);
    expect(createReservationRatio("1.1").ok).toBe(false);
  });

  it("rejects reversed intervals and includes both bounds", () => {
    expect(
      createFirmCapacityReservation({
        id: must(createReservationId("bad")),
        teamId,
        label: "bad",
        start: date("2025-02-01"),
        end: date("2025-01-01"),
        ratio: must(createReservationRatio("0.2")),
      }),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_RESERVATION_INTERVAL" }],
    });

    const item = reservation("bounded", "0.2");
    expect(
      rendered(totalReservationRatio(teamId, date("2025-01-01"), [item])),
    ).toBe("0.2");
    expect(
      rendered(totalReservationRatio(teamId, date("2025-01-31"), [item])),
    ).toBe("0.2");
    expect(
      rendered(totalReservationRatio(teamId, date("2025-02-01"), [item])),
    ).toBe("0");
  });

  it("does not couple reservations to planning horizons", () => {
    const horizon = must(
      createPlanningHorizon({
        start: date("2025-06-01"),
        end: date("2025-06-30"),
      }),
    );
    const outside = reservation("outside", "0.2", "2024-01-01", "2024-01-31");
    expect(horizon.start).toBe("2025-06-01");
    expect(outside.start).toBe("2024-01-01");
  });

  it("exposes over-reservation without capping its diagnostics", () => {
    const team = makeTeam("3.2");
    const reservations = [reservation("one", "0.7"), reservation("two", "0.6")];
    const day = date("2025-01-15");
    expect(rendered(totalReservationRatio(teamId, day, reservations))).toBe(
      "1.3",
    );
    expect(rendered(reservedCapacity(team, day, reservations))).toBe("4.16");
    expect(rendered(projectCapacity(team, day, reservations))).toBe("0");
    expect(isOverReserved(teamId, day, reservations)).toBe(true);
  });

  it("keeps reservation arithmetic exact", () => {
    const team = makeTeam("3.2");
    const reservations = [reservation("twenty-percent", "0.20")];
    const day = date("2025-01-15");
    expect(serializeQuantity(reservedCapacity(team, day, reservations))).toBe(
      "16/25",
    );
    expect(rendered(reservedCapacity(team, day, reservations))).toBe("0.64");
    expect(serializeQuantity(projectCapacity(team, day, reservations))).toBe(
      "64/25",
    );
    expect(rendered(projectCapacity(team, day, reservations))).toBe("2.56");
  });

  it("supports over-reservation at nine million without an intermediate overflow", () => {
    const team = makeTeam("9000000");
    const reservations = [reservation("one", "1"), reservation("two", "1")];
    const day = date("2025-01-15");
    expect(rendered(totalReservationRatio(teamId, day, reservations))).toBe(
      "2",
    );
    expect(rendered(reservedCapacity(team, day, reservations))).toBe(
      "18000000",
    );
    expect(rendered(projectCapacity(team, day, reservations))).toBe("0");
    expect(isOverReserved(teamId, day, reservations)).toBe(true);
  });

  it("supports exact values far beyond JavaScript safe integers", () => {
    const huge = "900719925474099312345678901234567890";
    const team = makeTeam(huge);
    const reservations = [reservation("full", "1")];
    const day = date("2025-01-15");
    expect(rendered(reservedCapacity(team, day, reservations))).toBe(huge);
    expect(rendered(projectCapacity(team, day, reservations))).toBe("0");
  });
});
