import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCapacityException,
  createCapacityPeriod,
  createCivilDate,
  createMaxParallelProjects,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  createWorkingPattern,
  effectiveCapacity,
  quantityToDecimalString,
  type DomainResult,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("team capacity schedule", () => {
  const date = (value: string) => must(createCivilDate(value));
  const capacity = (value: string) => must(createCapacity(value));
  const rendered = (value: ReturnType<typeof effectiveCapacity>) =>
    must(quantityToDecimalString(value));

  function makeTeam() {
    const schedule = must(
      createTeamCapacitySchedule({
        workingPattern: must(
          createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }),
        ),
        periods: [
          must(
            createCapacityPeriod({
              start: date("2025-01-01"),
              end: date("2025-01-10"),
              dailyCapacity: capacity("3.2"),
            }),
          ),
        ],
        exceptions: [
          must(
            createCapacityException({
              date: date("2025-01-04"),
              capacity: capacity("2"),
            }),
          ),
          must(
            createCapacityException({
              date: date("2025-01-06"),
              capacity: capacity("0"),
            }),
          ),
          must(
            createCapacityException({
              date: date("2025-02-01"),
              capacity: capacity("1"),
            }),
          ),
        ],
      }),
    );
    return must(
      createTeam({
        id: must(createTeamId("team-a")),
        name: "Team A",
        maxParallelProjects: must(createMaxParallelProjects(2)),
        capacitySchedule: schedule,
      }),
    );
  }

  it("uses working days, inclusive period bounds, and zero in gaps", () => {
    const team = makeTeam();
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-01"))), "3.2");
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-10"))), "3.2");
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-11"))), "0");
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-13"))), "0");
  });

  it("gives absolute priority to exceptions", () => {
    const team = makeTeam();
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-04"))), "2");
    assert.equal(rendered(effectiveCapacity(team, date("2025-02-01"))), "1");
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-06"))), "0");
    assert.equal(rendered(effectiveCapacity(team, date("2025-01-06"))), "0");
  });

  it("rejects overlapping periods and duplicate exception dates", () => {
    const first = must(
      createCapacityPeriod({
        start: date("2025-01-01"),
        end: date("2025-01-10"),
        dailyCapacity: capacity("1"),
      }),
    );
    const overlap = must(
      createCapacityPeriod({
        start: date("2025-01-10"),
        end: date("2025-01-12"),
        dailyCapacity: capacity("2"),
      }),
    );
    const exception = must(
      createCapacityException({
        date: date("2025-01-03"),
        capacity: capacity("1"),
      }),
    );
    const result = createTeamCapacitySchedule({
      workingPattern: must(createWorkingPattern({ workingWeekdays: [1] })),
      periods: [overlap, first],
      exceptions: [exception, exception],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code }) => code),
        [
          "OVERLAPPING_CAPACITY_PERIODS",
          "DUPLICATE_CAPACITY_EXCEPTION_DATE",
        ],
      );
    }
  });

  it("sorts only periods and exceptions in defensive copies", () => {
    const late = must(
      createCapacityPeriod({
        start: date("2025-02-01"),
        end: date("2025-02-02"),
        dailyCapacity: capacity("1"),
      }),
    );
    const early = must(
      createCapacityPeriod({
        start: date("2025-01-01"),
        end: date("2025-01-02"),
        dailyCapacity: capacity("1"),
      }),
    );
    const source = [late, early];
    const schedule = must(
      createTeamCapacitySchedule({
        workingPattern: must(createWorkingPattern({ workingWeekdays: [] })),
        periods: source,
        exceptions: [],
      }),
    );
    source.reverse();
    assert.deepEqual(
      schedule.periods.map((period) => period.start),
      ["2025-01-01", "2025-02-01"],
    );
    assert.equal(Object.isFrozen(schedule.periods), true);
  });
});
