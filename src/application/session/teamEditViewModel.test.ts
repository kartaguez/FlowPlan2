import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTeamId, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildTeamEditViewModel } from "./teamEditViewModel.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("TeamEditViewModel", () => {
  it("projects team-global settings and position-identified existing periods", () => {
    const state = createDemoPlanningScenario();
    const team = state.portfolio.teams[0]!;
    const model = buildTeamEditViewModel(state, team.id)!;

    assert.equal(model.label, "Team Alpha");
    assert.equal(model.maxParallelProjects, 2);
    assert.deepEqual(model.workingWeekdays, [1, 2, 3, 4, 5]);
    assert.deepEqual(
      model.capacityPeriods.map((period) => ({
        index: period.index,
        start: period.startDate,
        end: period.endDate,
        capacity: period.capacity,
        unavailabilityPercent: period.unavailabilityPercent,
      })),
      [
        {
          index: 0,
          start: "2025-01-01",
          end: "2025-01-31",
          capacity: "3/1",
          unavailabilityPercent: "0",
        },
        {
          index: 1,
          start: "2025-02-01",
          end: "2025-03-31",
          capacity: "5/2",
          unavailabilityPercent: "0",
        },
      ],
    );
    assert.equal(Object.isFrozen(model.workingWeekdays), true);
    assert.equal(Object.isFrozen(model.capacityPeriods), true);
    assert.ok(model.capacityPeriods.every(Object.isFrozen));
    assert.equal(Object.isFrozen(model), true);
  });

  it("returns undefined for an unknown team", () => {
    const state = createDemoPlanningScenario();
    assert.equal(
      buildTeamEditViewModel(state, must(createTeamId("unknown-team"))),
      undefined,
    );
  });
});
