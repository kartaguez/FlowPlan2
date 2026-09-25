import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  capacityFromSerialized, createCapacityException, createCapacityPeriod, createCivilDate,
  createPortfolio, createTeam, createTeamCapacitySchedule, unavailabilityRatioFromSerialized,
  serializeQuantity, type DomainResult,
} from "../../domain/index.js";
import { decodeFlowplanBackupV1, encodeFlowplanBackupV1 } from "./flowplanBackupV1.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function richState() {
  const base = createDemoPlanningScenario();
  const team = base.portfolio.teams[0]!;
  const period = must(createCapacityPeriod({
    start: must(createCivilDate("2025-04-01")), end: must(createCivilDate("2025-04-30")),
    dailyCapacity: must(capacityFromSerialized("1/3")),
    unavailabilityRatio: must(unavailabilityRatioFromSerialized("2/7")),
  }));
  const exception = must(createCapacityException({ date: must(createCivilDate("2025-02-03")),
    capacity: must(capacityFromSerialized("5/7")) }));
  const updated = must(createTeam({ id: team.id, name: team.name,
    capacitySchedule: must(createTeamCapacitySchedule({
      periods: [...team.capacitySchedule.periods, period], exceptions: [exception],
    })) }));
  return { planning: base.planning, portfolio: must(createPortfolio({ ...base.portfolio,
    teams: [updated, ...base.portfolio.teams.slice(1)] })) };
}

describe("FlowPlan backup V1", () => {
  it("round trips the complete business state and stable data independently of exportedAt", () => {
    const state = richState();
    const first = encodeFlowplanBackupV1(state, "2026-09-25T00:00:00.000Z");
    const second = encodeFlowplanBackupV1(state, "2026-09-26T00:00:00.000Z");
    assert.deepEqual(JSON.parse(first).data, JSON.parse(second).data);
    const restored = decodeFlowplanBackupV1(first);
    assert.deepEqual(JSON.parse(encodeFlowplanBackupV1(restored)).data, JSON.parse(first).data);
    assert.equal(serializeQuantity(restored.portfolio.teams[0]!.capacitySchedule.periods.at(-1)!.dailyCapacity), "1/3");
    assert.equal(serializeQuantity(restored.portfolio.teams[0]!.capacitySchedule.exceptions[0]!.capacity), "5/7");
    assert.deepEqual(restored.portfolio.priorityOrder, state.portfolio.priorityOrder);
    assert.equal(restored.portfolio.projects[0]!.programId, state.portfolio.projects[0]!.programId);
    assert.equal(serializeQuantity(restored.portfolio.projects[0]!.requirements[0]!.dailyCap!), "3/2");
    assert.deepEqual(restored.portfolio.reservations.flatMap((r) => r.teamAllocations.map((a) => a.amount.kind)).sort(),
      ["ratio", "fixed-daily", "fixed-daily", "fixed-daily"].sort());
  });

  it("rejects malformed containers and invalid business data", () => {
    const base = JSON.parse(encodeFlowplanBackupV1(richState()));
    const variants = [
      "{", JSON.stringify({ ...base, format: "other" }), JSON.stringify({ ...base, version: 2 }),
      JSON.stringify({ ...base, data: { ...base.data, portfolio: { teams: [] } } }),
      JSON.stringify({ ...base, data: { ...base.data, portfolio: { ...base.data.portfolio,
        projects: [{ ...base.data.portfolio.projects[0], name: " " }, ...base.data.portfolio.projects.slice(1)] } } }),
      JSON.stringify({ ...base, data: { ...base.data, portfolio: { ...base.data.portfolio,
        teams: [{ ...base.data.portfolio.teams[0], capacitySchedule: { periods: [], exceptions: [], unexpected: true } },
          ...base.data.portfolio.teams.slice(1)] } } }),
      JSON.stringify({ ...base, data: { ...base.data, portfolio: { ...base.data.portfolio,
        priorityOrder: ["unknown", ...base.data.portfolio.priorityOrder.slice(1)] } } }),
    ];
    variants.forEach((candidate) => assert.throws(() => decodeFlowplanBackupV1(candidate)));
  });
});
