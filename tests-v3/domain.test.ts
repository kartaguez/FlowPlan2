import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { allocate } from "../src-v3/domain/allocate.js";
import { decimalToString, parseDecimal } from "../src-v3/domain/decimal.js";
import { createPlanning, dateOrdinal, type PlanningInput, type ProjectInput } from "../src-v3/domain/planning.js";

const projectA: ProjectInput = { id: "a", name: "Projet", earliestStart: "2026-10-12", etc: "4", priority: "1" };
const projectB: ProjectInput = { id: "b", name: "Projet", earliestStart: "2026-10-12", etc: "5", priority: "2" };

function input(changes: Partial<PlanningInput> = {}): PlanningInput {
  return {
    name: "Planning",
    startDate: "2026-10-12",
    endDate: "2026-10-14",
    team: { id: "team", name: "Équipe", dailyCapacity: "3" },
    projects: [projectA, projectB],
    ...changes,
  };
}

function projection(value: PlanningInput) {
  const result = createPlanning(value);
  if (!result.ok) assert.fail(JSON.stringify(result.errors));
  return allocate(result.planning);
}

function allocations(value: ReturnType<typeof projection>) {
  return value.days.map(day => day.allocations.map(allocation => `${allocation.projectId}:${allocation.quantity}`));
}

test("A/B: capacité résiduelle le même jour et dates réellement allouées", () => {
  const result = projection(input());
  assert.deepEqual(allocations(result), [["a:3"], ["a:1", "b:2"], ["b:3"]]);
  assert.deepEqual(result.days.map(day => [day.available, day.allocated, day.unused]), [["3", "3", "0"], ["3", "3", "0"], ["3", "3", "0"]]);
  assert.deepEqual(result.projects.map(p => [p.projectId, p.initialEtc, p.planned, p.unplanned, p.estimatedStart, p.estimatedFinish, p.fullyPlanned]), [
    ["a", "4", "4", "0", "2026-10-12", "2026-10-13", true],
    ["b", "5", "5", "0", "2026-10-13", "2026-10-14", true],
  ]);
});

test("le plus petit rang numérique passe en premier, même si la saisie est inversée", () => {
  const changed = input({ projects: [{ ...projectA, priority: "2" }, { ...projectB, priority: "1" }] });
  assert.deepEqual(allocations(projection(changed)), [["b:3"], ["b:2", "a:1"], ["a:3"]]);
  assert.deepEqual(projection(input({ projects: [projectB, projectA] })), projection(input()));
});

test("un projet prioritaire éligible plus tard préempte le moins prioritaire", () => {
  const result = projection(input({ projects: [
    { ...projectA, earliestStart: "2026-10-13", etc: "3" },
    { ...projectB, etc: "6" },
  ] }));
  assert.deepEqual(allocations(result), [["b:3"], ["a:3"], ["b:3"]]);
});

test("week-end : lignes présentes avec capacité et allocations nulles", () => {
  const result = projection(input({ startDate: "2026-10-16", endDate: "2026-10-19", projects: [{ ...projectA, earliestStart: "2026-10-16", etc: "8" }] }));
  assert.deepEqual(result.days.map(day => [day.date, day.available, day.allocated]), [
    ["2026-10-16", "3", "3"], ["2026-10-17", "0", "0"],
    ["2026-10-18", "0", "0"], ["2026-10-19", "3", "3"],
  ]);
  assert.equal(result.projects[0]?.estimatedFinish, null);
});

test("horizon insuffisant et projet sans allocation n'ont pas de fin estimée", () => {
  const result = projection(input({ endDate: "2026-10-12", projects: [projectA, { ...projectB, earliestStart: "2026-10-13" }] }));
  assert.deepEqual(result.projects.map(p => [p.planned, p.unplanned, p.estimatedStart, p.estimatedFinish]), [
    ["3", "1", "2026-10-12", null], ["0", "5", null, null],
  ]);
});

test("ETC nul : aucune allocation, fin au début au plus tôt même après l'horizon", () => {
  const result = projection(input({ projects: [{ ...projectA, etc: "0", earliestStart: "2026-10-20" }] }));
  assert.deepEqual(allocations(result), [[], [], []]);
  assert.deepEqual(result.projects[0], {
    projectId: "a", initialEtc: "0", planned: "0", unplanned: "0",
    estimatedStart: null, estimatedFinish: "2026-10-20", fullyPlanned: true,
  });
});

test("capacité nulle et date d'éligibilité après la fin : aucune allocation", () => {
  const zeroCapacity = projection(input({ team: { id: "team", name: "Équipe", dailyCapacity: "0" } }));
  assert.deepEqual(allocations(zeroCapacity), [[], [], []]);
  assert.ok(zeroCapacity.projects.every(p => p.estimatedStart === null && p.estimatedFinish === null));
  const late = projection(input({ projects: [{ ...projectA, earliestStart: "2026-10-15" }] }));
  assert.deepEqual(allocations(late), [[], [], []]);
});

test("décimales exactes sans pas imposé", () => {
  const result = projection(input({ endDate: "2026-10-12", team: { id: "team", name: "Équipe", dailyCapacity: "0.3" }, projects: [
    { ...projectA, etc: "0.1" }, { ...projectB, etc: "0.2" },
  ] }));
  assert.deepEqual(allocations(result), [["a:0.1", "b:0.2"]]);
  assert.equal(result.days[0]?.allocated, "0.3");
  assert.equal(result.days[0]?.unused, "0");
  assert.equal(decimalToString(parseDecimal("000.12500")!), "0.125");
});

test("zéro, un et plusieurs projets sont des cardinalités Domain valides", () => {
  const empty = projection(input({ projects: [] }));
  assert.equal(empty.projects.length, 0);
  assert.equal(empty.days.length, 3);
  assert.ok(empty.days.every(day => day.allocated === "0" && day.unused === "3"));
  assert.deepEqual(allocations(projection(input({ projects: [projectA] }))), [["a:3"], ["a:1"], []]);
  const many = projection(input({ endDate: "2026-10-12", projects: [
    { ...projectA, etc: "1", priority: "3" },
    { ...projectB, etc: "1", priority: "1" },
    { id: "c", name: "Projet", earliestStart: "2026-10-12", etc: "1", priority: "2" },
  ] }));
  assert.deepEqual(allocations(many), [["b:1", "c:1", "a:1"]]);
});

test("validation des dates, noms, identifiants, rangs et quantités", () => {
  const invalid = createPlanning(input({
    name: " ", startDate: "2026-02-30", endDate: "2026-01-01",
    team: { id: " ", name: "", dailyCapacity: "-1" },
    projects: [{ ...projectA, etc: "1e2", priority: "0" }],
  }));
  assert.equal(invalid.ok, false);
  if (invalid.ok) throw new Error("Expected validation errors");
  assert.deepEqual(new Set(invalid.errors.map(error => error.field)), new Set([
    "name", "startDate", "team.id", "team.name", "team.dailyCapacity", "projects.0.etc", "projects.0.priority",
  ]));
  const duplicates = createPlanning(input({ projects: [projectA, { ...projectB, id: "a", priority: "01", earliestStart: "2026-10-11" }] }));
  assert.equal(duplicates.ok, false);
  if (duplicates.ok) throw new Error("Expected validation errors");
  assert.deepEqual(new Set(duplicates.errors.map(error => error.field)), new Set([
    "projects.1.id", "projects.1.priority", "projects.1.earliestStart",
  ]));
  const reversed = createPlanning(input({ endDate: "2026-10-11" }));
  assert.equal(reversed.ok, false);
  if (reversed.ok) throw new Error("Expected validation errors");
  assert.ok(reversed.errors.some(error => error.field === "endDate"));
});

test("recalcul déterministe, entrées intactes, capacités et ETC respectés", () => {
  const source = Object.freeze(input({ projects: Object.freeze([Object.freeze({ ...projectA }), Object.freeze({ ...projectB })]) }));
  const before = JSON.stringify(source);
  const first = projection(source);
  assert.deepEqual(first, projection(source));
  assert.equal(JSON.stringify(source), before);
  for (const day of first.days) {
    const sum = day.allocations.reduce((total, allocation) => total + Number(allocation.quantity), 0);
    assert.ok(sum <= Number(day.available));
    assert.equal(sum, Number(day.allocated));
    assert.ok(day.allocations.every(allocation => Number(allocation.quantity) > 0));
  }
  for (const project of first.projects) assert.ok(Number(project.planned) <= Number(project.initialEtc));
});

test("horizon long : calcul quotidien intégral mesuré sans plafond métier", t => {
  const value = input({ startDate: "2025-01-01", endDate: "2034-12-31", projects: [{ ...projectA, earliestStart: "2025-01-01" }] });
  const started = performance.now();
  const result = projection(value);
  const elapsed = performance.now() - started;
  const count = dateOrdinal(value.endDate)! - dateOrdinal(value.startDate)! + 1;
  assert.equal(result.days.length, count);
  t.diagnostic(`V3 Domain: ${count} days calculated in ${elapsed.toFixed(1)} ms`);
});
