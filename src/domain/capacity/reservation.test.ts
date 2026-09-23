import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCapacityPeriod,
  createCivilDate,
  createFirmCapacityReservation,
  createPlanningHorizon,
  createReservationId,
  createReservationRatio,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  createWorkingPattern,
  isOverReserved,
  projectCapacity as calculateProjectCapacity,
  quantityToDecimalString,
  reservedCapacity as calculateReservedCapacity,
  serializeQuantity,
  totalReservationRatio,
  type DomainResult,
  type FirmCapacityReservation,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("firm capacity reservations", () => {
  const date = (value: string) => must(createCivilDate(value));
  const teamId = must(createTeamId("team-a"));
  const rendered = (value: Parameters<typeof quantityToDecimalString>[0]) =>
    must(quantityToDecimalString(value));
  const workingPattern = must(
    createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] }),
  );
  const reservedCapacity = (
    team: Parameters<typeof calculateReservedCapacity>[0],
    day: Parameters<typeof calculateReservedCapacity>[1],
    reservations: Parameters<typeof calculateReservedCapacity>[2],
  ) => calculateReservedCapacity(team, day, reservations, workingPattern);
  const projectCapacity = (
    team: Parameters<typeof calculateProjectCapacity>[0],
    day: Parameters<typeof calculateProjectCapacity>[1],
    reservations: Parameters<typeof calculateProjectCapacity>[2],
  ) => calculateProjectCapacity(team, day, reservations, workingPattern);

  function makeTeam(dailyCapacity: string) {
    return must(
      createTeam({
        id: teamId,
        name: "Team A",
        capacitySchedule: must(
          createTeamCapacitySchedule({
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
    assert.equal(createReservationRatio("0").ok, true);
    assert.equal(createReservationRatio("1").ok, true);
    assert.equal(createReservationRatio("-0.1").ok, false);
    assert.equal(createReservationRatio("1.1").ok, false);
  });

  it("rejects reversed intervals and includes both bounds", () => {
    const invalid = createFirmCapacityReservation({
      id: must(createReservationId("bad")),
      teamId,
      label: "bad",
      start: date("2025-02-01"),
      end: date("2025-01-01"),
      ratio: must(createReservationRatio("0.2")),
    });
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.equal(invalid.errors[0]?.code, "INVALID_RESERVATION_INTERVAL");
    }

    const item = reservation("bounded", "0.2");
    assert.equal(
      rendered(totalReservationRatio(teamId, date("2025-01-01"), [item])),
      "0.2",
    );
    assert.equal(
      rendered(totalReservationRatio(teamId, date("2025-01-31"), [item])),
      "0.2",
    );
    assert.equal(
      rendered(totalReservationRatio(teamId, date("2025-02-01"), [item])),
      "0",
    );
  });

  it("does not couple reservations to planning horizons", () => {
    const horizon = must(
      createPlanningHorizon({
        start: date("2025-06-01"),
        end: date("2025-06-30"),
      }),
    );
    const outside = reservation("outside", "0.2", "2024-01-01", "2024-01-31");
    assert.equal(horizon.start, "2025-06-01");
    assert.equal(outside.start, "2024-01-01");
  });

  it("exposes over-reservation without capping its diagnostics", () => {
    const team = makeTeam("3.2");
    const reservations = [reservation("one", "0.7"), reservation("two", "0.6")];
    const day = date("2025-01-15");
    assert.equal(rendered(totalReservationRatio(teamId, day, reservations)), "1.3");
    assert.equal(rendered(reservedCapacity(team, day, reservations)), "4.16");
    assert.equal(rendered(projectCapacity(team, day, reservations)), "0");
    assert.equal(isOverReserved(teamId, day, reservations), true);
  });

  it("keeps reservation arithmetic exact", () => {
    const team = makeTeam("3.2");
    const reservations = [reservation("twenty-percent", "0.20")];
    const day = date("2025-01-15");
    assert.equal(
      serializeQuantity(reservedCapacity(team, day, reservations)),
      "16/25",
    );
    assert.equal(rendered(reservedCapacity(team, day, reservations)), "0.64");
    assert.equal(
      serializeQuantity(projectCapacity(team, day, reservations)),
      "64/25",
    );
    assert.equal(rendered(projectCapacity(team, day, reservations)), "2.56");
  });

  it("aggregates multiple exact reservations before deriving project capacity", () => {
    const team = makeTeam("4");
    const day = date("2025-01-15");
    const quarter = [reservation("quarter", "0.25")];
    assert.equal(serializeQuantity(reservedCapacity(team, day, quarter)), "1/1");
    assert.equal(serializeQuantity(projectCapacity(team, day, quarter)), "3/1");
    const combined = [
      reservation("combined-quarter", "0.25"),
      reservation("combined-half", "0.5"),
    ];
    assert.equal(serializeQuantity(reservedCapacity(team, day, combined)), "3/1");
    assert.equal(serializeQuantity(projectCapacity(team, day, combined)), "1/1");
  });

  it("supports over-reservation at nine million without an intermediate overflow", () => {
    const team = makeTeam("9000000");
    const reservations = [reservation("one", "1"), reservation("two", "1")];
    const day = date("2025-01-15");
    assert.equal(rendered(totalReservationRatio(teamId, day, reservations)), "2");
    assert.equal(
      rendered(reservedCapacity(team, day, reservations)),
      "18000000",
    );
    assert.equal(rendered(projectCapacity(team, day, reservations)), "0");
    assert.equal(isOverReserved(teamId, day, reservations), true);
  });

  it("supports exact values far beyond JavaScript safe integers", () => {
    const huge = "900719925474099312345678901234567890";
    const team = makeTeam(huge);
    const reservations = [reservation("full", "1")];
    const day = date("2025-01-15");
    assert.equal(rendered(reservedCapacity(team, day, reservations)), huge);
    assert.equal(rendered(projectCapacity(team, day, reservations)), "0");
  });
});
