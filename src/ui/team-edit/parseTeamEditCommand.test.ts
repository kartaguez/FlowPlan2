import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createTeamId,
  serializeQuantity,
  type DomainResult,
} from "../../domain/index.js";
import {
  parseTeamEditCommand,
  type TeamEditFormValues,
} from "./parseTeamEditCommand.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const teamId = must(createTeamId("team-alpha"));

function values(
  overrides: Partial<TeamEditFormValues> = {},
): TeamEditFormValues {
  return {
    teamId,
    name: "Team Alpha",
    maxParallelProjects: "2",
    workingWeekdays: [1, 2, 3, 4, 5],
    capacityPeriods: [
      {
        index: 0,
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        capacity: "3/2",
        unavailabilityPercent: "25",
      },
    ],
    ...overrides,
  };
}

describe("parseTeamEditCommand", () => {
  it("maps exact quantities, percentage, dates, and working weekdays", () => {
    const result = parseTeamEditCommand(values());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command.kind, "update-team");
    assert.equal(result.command.maxParallelProjects, 2);
    assert.deepEqual(result.command.workingPattern.workingWeekdays, [1, 2, 3, 4, 5]);
    assert.equal(result.command.capacityPeriods[0]?.startDate, "2025-01-01");
    assert.equal(result.command.capacityPeriods[0]?.endDate, "2025-01-31");
    assert.equal(
      serializeQuantity(result.command.capacityPeriods[0]!.capacity),
      "3/2",
    );
    assert.equal(
      serializeQuantity(result.command.capacityPeriods[0]!.unavailability),
      "1/4",
    );
  });

  it("validates max parallel as a safe positive integer", () => {
    for (const maxParallelProjects of ["1", "7"]) {
      assert.equal(parseTeamEditCommand(values({ maxParallelProjects })).ok, true);
    }
    for (const maxParallelProjects of ["0", "-1", "1.5", "nope", "999999999999999999999"]) {
      assert.equal(parseTeamEditCommand(values({ maxParallelProjects })).ok, false);
    }
  });

  it("accepts zero and exact positive capacities but rejects negative or invalid", () => {
    for (const capacity of ["0", "1.25", "5/3"]) {
      assert.equal(
        parseTeamEditCommand(
          values({ capacityPeriods: [{ ...values().capacityPeriods[0]!, capacity }] }),
        ).ok,
        true,
      );
    }
    for (const capacity of ["-1", "invalid"]) {
      assert.equal(
        parseTeamEditCommand(
          values({ capacityPeriods: [{ ...values().capacityPeriods[0]!, capacity }] }),
        ).ok,
        false,
      );
    }
  });

  it("parses exact percentage bounds without floating-point conversion", () => {
    for (const unavailabilityPercent of ["0", "25", "12.5", "100/3", "100"]) {
      assert.equal(
        parseTeamEditCommand(
          values({
            capacityPeriods: [
              { ...values().capacityPeriods[0]!, unavailabilityPercent },
            ],
          }),
        ).ok,
        true,
      );
    }
    for (const unavailabilityPercent of ["-0.1", "100.01", "101", "invalid"]) {
      assert.equal(
        parseTeamEditCommand(
          values({
            capacityPeriods: [
              { ...values().capacityPeriods[0]!, unavailabilityPercent },
            ],
          }),
        ).ok,
        false,
      );
    }
  });

  it("validates CivilDate fields and permits an empty working week", () => {
    assert.equal(parseTeamEditCommand(values({ workingWeekdays: [] })).ok, true);
    for (const field of ["startDate", "endDate"] as const) {
      const result = parseTeamEditCommand(
        values({
          capacityPeriods: [
            { ...values().capacityPeriods[0]!, [field]: "2025-02-30" },
          ],
        }),
      );
      assert.equal(result.ok, false);
    }
    assert.equal(
      parseTeamEditCommand(values({ workingWeekdays: [1, 1] })).ok,
      false,
    );
  });

  it("aggregates errors and uses no JavaScript Date or lossy float parsing", async () => {
    const result = parseTeamEditCommand(
      values({
        name: " ",
        maxParallelProjects: "1.5",
        workingWeekdays: [8],
        capacityPeriods: [
          {
            index: 0,
            startDate: "bad",
            endDate: "bad",
            capacity: "bad",
            unavailabilityPercent: "bad",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.length >= 7);
    const source = await readFile(
      resolve(process.cwd(), "src/ui/team-edit/parseTeamEditCommand.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /new Date|Date\.parse|Date\.now|parseFloat/);
    assert.doesNotMatch(source, /Number\([^)]*capacity|Number\([^)]*unavailability/);
  });
});
