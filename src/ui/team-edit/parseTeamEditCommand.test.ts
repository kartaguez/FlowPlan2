import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTeamId, serializeQuantity, type DomainResult } from "../../domain/index.js";
import { parseTeamEditCommand, type TeamEditFormValues } from "./parseTeamEditCommand.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const teamId = must(createTeamId("team-a"));
const values = (overrides: Partial<TeamEditFormValues> = {}): TeamEditFormValues => ({
  teamId,
  name: "Team A",
  capacityPeriods: [
    {
      index: 0,
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      capacity: "8",
      capacityExact: "8/1",
      capacityDirty: false,
      unavailabilityPercent: "0",
      unavailabilityExact: "0/1",
      unavailabilityDirty: false,
    },
  ],
  ...overrides,
});

describe("parseTeamEditCommand", () => {
  it("builds only the team capacity-period command", () => {
    const result = parseTeamEditCommand(values());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command.kind, "update-team-capacity-periods");
    assert.equal(Object.hasOwn(result.command, "workingPattern"), false);
    assert.equal(Object.hasOwn(result.command, "maxParallelProjects"), false);
  });

  it("accepts an exact rational capacity and percentage", () => {
    const result = parseTeamEditCommand(values({
      capacityPeriods: [{
        ...values().capacityPeriods[0]!,
        capacity: "15/2",
        capacityDirty: true,
        unavailabilityPercent: "100/3",
        unavailabilityDirty: true,
      }],
    }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(serializeQuantity(result.command.capacityPeriods[0]!.capacity), "15/2");
    assert.equal(serializeQuantity(result.command.capacityPeriods[0]!.unavailability), "1/3");
  });

  it("preserves untouched exact thirds behind decimal display", () => {
    const result = parseTeamEditCommand(values({
      capacityPeriods: [{
        ...values().capacityPeriods[0]!,
        capacity: "0.333",
        capacityExact: "1/3",
        capacityDirty: false,
        unavailabilityPercent: "33.333",
        unavailabilityExact: "1/3",
        unavailabilityDirty: false,
      }],
    }));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(serializeQuantity(result.command.capacityPeriods[0]!.capacity), "1/3");
    assert.equal(serializeQuantity(result.command.capacityPeriods[0]!.unavailability), "1/3");
  });

  it("distinguishes an explicit decimal edit from an explicit fraction edit", () => {
    for (const [raw, expected] of [["0.333", "333/1000"], ["1/3", "1/3"]] as const) {
      const result = parseTeamEditCommand(values({
        capacityPeriods: [{ ...values().capacityPeriods[0]!, capacity: raw, capacityDirty: true }],
      }));
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(serializeQuantity(result.command.capacityPeriods[0]!.capacity), expected);
    }
  });

  it("rejects malformed rational syntax atomically", () => {
    for (const raw of ["1/0", "/3", "1/", "1/2/3", "abc"]) {
      const result = parseTeamEditCommand(values({
        capacityPeriods: [{ ...values().capacityPeriods[0]!, capacity: raw, capacityDirty: true }],
      }));
      assert.equal(result.ok, false);
    }
  });
});
