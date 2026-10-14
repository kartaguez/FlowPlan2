import assert from "node:assert/strict";
import test from "node:test";
import { createAndProjectPlanning } from "../src-v3/application/usecases/createAndProjectPlanning.js";
import type { PlanningInput } from "../src-v3/domain/planning.js";

const input: PlanningInput = {
  name: "Session", startDate: "2026-10-12", endDate: "2026-10-14",
  team: { id: "team", name: "Équipe", dailyCapacity: "3" },
  projects: [
    { id: "a", name: "A", earliestStart: "2026-10-12", etc: "4", priority: "1" },
    { id: "b", name: "B", earliestStart: "2026-10-12", etc: "5", priority: "2" },
  ],
};

test("le Use Case construit et projette un planning valide", () => {
  const result = createAndProjectPlanning(input);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected success");
  assert.equal(result.planning.projects.length, 2);
  assert.deepEqual(result.projection.days.map(day => day.allocations.map(a => a.quantity)), [["3"], ["1", "2"], ["3"]]);
});

test("une saisie invalide retourne des erreurs de champs sans projection partielle", () => {
  const result = createAndProjectPlanning({ ...input, team: { ...input.team, dailyCapacity: "-2" } });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected errors");
  assert.ok(result.errors.some(error => error.field === "team.dailyCapacity"));
  assert.equal("projection" in result, false);
});

test("chaque appel repart du début avec les nouvelles priorités", () => {
  const first = createAndProjectPlanning(input);
  const changed = createAndProjectPlanning({ ...input, projects: [
    { ...input.projects[0]!, priority: "2" },
    { ...input.projects[1]!, priority: "1" },
  ] });
  assert.equal(first.ok, true);
  assert.equal(changed.ok, true);
  if (!first.ok || !changed.ok) throw new Error("Expected success");
  assert.equal(first.projection.days[0]?.allocations[0]?.projectId, "a");
  assert.equal(changed.projection.days[0]?.allocations[0]?.projectId, "b");
  assert.equal(first.projection.days[0]?.allocations[0]?.projectId, "a");
});
