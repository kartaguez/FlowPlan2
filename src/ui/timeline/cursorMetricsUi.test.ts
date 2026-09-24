import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCursorMetrics } from "../../adapters/index.js";
import { rationalFromInteger, rationalToCanonicalString } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { buildCursorMetricsViewModel } from "./buildCursorMetricsViewModel.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";
import { createCursorProgressSurface } from "./renderCursorProgress.js";
import { formatProjectionDate } from "./renderTimelineCursor.js";
import { renderCursorCapacityMetrics, renderCursorTeamMetrics } from "./renderCursorTeamMetrics.js";

class FakeDocument {
  createElement(tagName: string): FakeElement { return new FakeElement(this, tagName); }
}
class FakeElement {
  readonly childNodes: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, () => void>();
  readonly classList = { toggle: () => {} };
  className = "";
  textContent: string | null = null;
  type = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...items: FakeElement[]): void { this.childNodes.push(...items); }
  replaceChildren(...items: FakeElement[]): void { this.childNodes.splice(0, this.childNodes.length, ...items); }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(name: string, callback: EventListener): void { this.listeners.set(name, callback as () => void); }
  click(): void { this.listeners.get("click")?.(); }
}

function run() {
  const state = createDemoPlanningScenario();
  const projection = buildPlanningSessionProjection({
    state,
    geometryViewport: { width: 1200, teamLaneHeight: 100, teamHeaderHeight: 152, timeAxisHeight: 56 },
  });
  const metrics = calculateCursorMetrics({
    portfolio: projection.portfolio,
    planningResult: projection.planningResult,
    horizon: projection.horizon,
    selectedDate: projection.horizon.end,
  });
  return { projection, metrics };
}

describe("cursor metrics UI", () => {
  it("formats exact Rational values with deterministic half-up rounding", () => {
    assert.equal(formatCursorMd({ numerator: 201n, denominator: 200n }), "1.01 MD");
    assert.equal(formatCursorMd({ numerator: -201n, denominator: 200n }), "-1.01 MD");
    assert.equal(formatCursorPercent({ numerator: 3n, denominator: 2n }), "150%");
    assert.equal(formatCursorPercent({ numerator: 4n, denominator: 3n }), "133.33%");
    assert.equal(formatCursorPercent(undefined), "N/A");
  });

  it("joins one card per Project, uses catalog order, and keeps negative remaining exact", () => {
    const { projection, metrics } = run();
    const model = buildCursorMetricsViewModel(projection.portfolio, metrics, projection.viewModel);
    assert.deepEqual(model.projects.map((item) => item.id), projection.portfolio.priorityOrder);
    assert.equal(model.projects.length, projection.portfolio.projects.length);
    const atlasCards = model.projects.filter((item) => item.id === "project-atlas");
    assert.equal(atlasCards.length, 1);
    assert.equal(rationalToCanonicalString(metrics.projects.find((item) => item.projectId === "project-atlas")!.baselineRAF), "85/1");
    assert.equal(rationalToCanonicalString(atlasCards[0]!.allocatedWorkload), rationalToCanonicalString(metrics.projects.find((item) => item.projectId === "project-atlas")!.allocatedWorkload));
    assert.deepEqual(model.programs.map((item) => item.id), metrics.programs.map((item) => item.programId));
    assert.deepEqual(model.pas.map((item) => item.id), metrics.priorityFamilies.map((item) => item.priorityFamilyId));
    const startMetrics = calculateCursorMetrics({
      portfolio: projection.portfolio,
      planningResult: projection.planningResult,
      horizon: projection.horizon,
      selectedDate: projection.horizon.start,
    });
    const atStart = buildCursorMetricsViewModel(projection.portfolio, startMetrics, projection.viewModel);
    assert.deepEqual(atStart.projects.map((item) => item.id), model.projects.map((item) => item.id));
    assert.deepEqual(atStart.programs.map((item) => item.id), model.programs.map((item) => item.id));
    assert.deepEqual(atStart.pas.map((item) => item.id), model.pas.map((item) => item.id));
    for (const group of model.programs) {
      const source = metrics.programs.find((item) => item.programId === group.id)!;
      assert.equal(rationalToCanonicalString(group.allocatedWorkload), rationalToCanonicalString(source.allocatedWorkload));
      assert.equal(rationalToCanonicalString(group.progress), rationalToCanonicalString(source.progress));
    }
    for (const group of model.pas) {
      const source = metrics.priorityFamilies.find((item) => item.priorityFamilyId === group.id)!;
      assert.equal(rationalToCanonicalString(group.allocatedWorkload), rationalToCanonicalString(source.allocatedWorkload));
    }
    const firstProject = model.projects[0]!;
    assert.match(firstProject.metadata, /^Priority 1 · Program /);
    assert.equal(rationalToCanonicalString(firstProject.baselineWorkload),
      rationalToCanonicalString(metrics.projects[0]!.baselineRAF));
    const program = projection.portfolio.programs[0]!;
    const members = projection.portfolio.projects.filter((project) => project.programId === program.id);
    const datedTimeline = { ...projection.viewModel, projects: projection.viewModel.projects.map((project) =>
      members.some((member) => member.id === project.id)
        ? { ...project, estimatedWithinHorizon: true, estimatedEndDate: project.id === members[0]!.id
          ? projection.horizon.start : projection.horizon.end }
        : project) };
    const datedGroup = buildCursorMetricsViewModel(projection.portfolio, metrics, datedTimeline)
      .programs.find((item) => item.id === program.id)!;
    assert.equal(datedGroup.estimatedEndDate, members.length > 1 ? projection.horizon.end : projection.horizon.start);
    const incompleteTimeline = { ...datedTimeline, projects: datedTimeline.projects.map((project) => {
      if (project.id !== members[0]!.id) return project;
      const { estimatedEndDate: _end, ...withoutEnd } = project;
      return { ...withoutEnd, estimatedWithinHorizon: false };
    }) };
    const incompleteGroup = buildCursorMetricsViewModel(projection.portfolio, metrics, incompleteTimeline)
      .programs.find((item) => item.id === program.id)!;
    assert.equal(incompleteGroup.estimatedWithinHorizon, false);
    assert.equal(incompleteGroup.estimatedEndDate, undefined);
    const withoutGroups = buildCursorMetricsViewModel(projection.portfolio, {
      ...metrics,
      programs: [],
      priorityFamilies: [],
    }, projection.viewModel);
    assert.deepEqual(withoutGroups.programs, []);
    assert.deepEqual(withoutGroups.pas, []);
    const first = metrics.projects[0]!;
    const excess = buildCursorMetricsViewModel(projection.portfolio, {
      ...metrics,
      projects: [{ ...first, allocatedWorkload: rationalFromInteger(999n) }, ...metrics.projects.slice(1)],
    }, projection.viewModel);
    assert.equal(excess.projects[0]!.allocatedWorkload.numerator, 999n);
    assert.ok(excess.projects[0]!.remainingWorkload.numerator < 0n);
    assert.equal(rationalToCanonicalString(model.projects[0]!.progress), rationalToCanonicalString(first.progress));
  });

  it("renders four matching Team and global values plus an exclusive progress view", () => {
    const { projection, metrics } = run();
    const model = buildCursorMetricsViewModel(projection.portfolio, metrics, projection.viewModel);
    const document = new FakeDocument();
    const teamContainers = new Map(projection.portfolio.teams.map((team) => [team.id, document.createElement("div") as unknown as HTMLElement]));
    renderCursorTeamMetrics(teamContainers, model.teams);
    for (const container of teamContainers.values()) {
      const children = (container as unknown as FakeElement).childNodes;
      assert.equal(children.length, 4);
      assert.deepEqual(children.map((cell) => cell.childNodes[0]!.textContent),
        ["Capacity", "Occupied", "Occupancy", "Over-reservation"]);
    }
    renderCursorTeamMetrics(teamContainers, [{
      ...model.teams[0]!,
      utilization: { numerator: 3n, denominator: 2n },
      overReservationRatio: undefined,
    }]);
    const firstTeam = (teamContainers.get(model.teams[0]!.teamId)! as unknown as FakeElement).childNodes;
    assert.equal(firstTeam[2]!.childNodes[1]!.textContent, "150%");
    assert.equal(firstTeam[3]!.childNodes[1]!.textContent, "N/A");
    const global = document.createElement("div");
    renderCursorCapacityMetrics(global as unknown as HTMLElement, model.global);
    assert.deepEqual(global.childNodes.map((cell) => cell.childNodes[0]!.textContent),
      ["Capacity", "Occupied", "Occupancy", "Over-reservation"]);
    assert.equal(global.childNodes[0]!.childNodes[1]!.textContent, formatCursorMd(model.global.effectiveCapacity));
    const root = document.createElement("section");
    let selected: string | undefined;
    const surface = createCursorProgressSurface(root as unknown as HTMLElement, (view) => { selected = view; });
    surface.render(model, "projects");
    assert.equal(root.childNodes[0]!.textContent, `Projected progress on ${formatProjectionDate(model.selectedDate)}`);
    const controls = root.childNodes[1]!;
    const cards = root.childNodes[2]!;
    assert.equal(cards.childNodes.length, model.projects.length);
    assert.equal(controls.childNodes[0]!.attributes.get("aria-pressed"), "true");
    const firstCard = cards.childNodes[0]!;
    assert.match(firstCard.className, /cursor-progress-card--/);
    assert.equal(firstCard.childNodes[0]!.childNodes[0]!.childNodes[1]!.textContent, model.projects[0]!.metadata);
    const load = firstCard.childNodes[1]!;
    assert.match(load.childNodes[0]!.childNodes[1]!.textContent!, /allocated to date/);
    assert.equal(load.childNodes[0]!.childNodes[2]!.textContent, formatCursorPercent(model.projects[0]!.progress));
    assert.equal(load.childNodes[1]!.attributes.get("role"), "progressbar");
    assert.equal(load.childNodes[1]!.attributes.get("aria-valuetext"), formatCursorPercent(model.projects[0]!.progress));
    controls.childNodes[1]!.click();
    assert.equal(selected, "programs");
    surface.render(model, "programs");
    assert.equal(cards.childNodes.length, model.programs.length);
    assert.equal(controls.childNodes[0]!.attributes.get("aria-pressed"), "false");
    assert.equal(controls.childNodes[1]!.attributes.get("aria-pressed"), "true");
    surface.render(model, "pas");
    assert.equal(cards.childNodes.length, model.pas.length);
    for (const view of ["projects", "programs", "pas"] as const) {
      surface.render(model, view);
      for (const card of cards.childNodes) {
        assert.equal(card.childNodes.length, 2);
        assert.equal(card.childNodes[1]!.childNodes[1]!.attributes.get("role"), "progressbar");
      }
    }
    const samples = model.projects.slice(0, 3).map((item, index) => ({
      ...item,
      progress: index === 0 ? rationalFromInteger(0n)
        : index === 1 ? { numerator: 1n, denominator: 2n }
          : rationalFromInteger(1n),
      estimatedWithinHorizon: index !== 0,
    }));
    surface.render({ ...model, projects: samples }, "projects");
    assert.deepEqual(cards.childNodes.map((card) => card.className.split("--")[1]),
      ["not-started", "in-progress", "completed"]);
    assert.match(cards.childNodes[0]!.childNodes[0]!.childNodes[1]!.className, /incomplete/);
    assert.deepEqual(cards.childNodes.map((card) => card.childNodes[1]!.childNodes[1]!.attributes.get("aria-valuenow")),
      ["0", "50", "100"]);
  });
});
