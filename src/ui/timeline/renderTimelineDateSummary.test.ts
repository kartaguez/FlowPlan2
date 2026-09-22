import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import type { TimelineViewModel } from "../../adapters/index.js";
import { renderTimelineDateSummary } from "./renderTimelineDateSummary.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.childNodes = [...nodes];
  }
}

function descendants(root: FakeElement): FakeElement[] {
  return root.childNodes.flatMap((child) => [child, ...descendants(child)]);
}

function withClass(root: FakeElement, className: string): FakeElement[] {
  return descendants(root).filter((element) =>
    element.className.split(/\s+/).includes(className),
  );
}

function viewModel(): TimelineViewModel {
  const firstDate = must(createCivilDate("2025-01-01"));
  const secondDate = must(createCivilDate("2025-01-02"));
  const projectId = must(createProjectId("project-atlas"));
  const alphaId = must(createTeamId("team-alpha"));
  const betaId = must(createTeamId("team-beta"));
  const capacity = (value: string) => must(createCapacity(value));
  return {
    horizon: { start: firstDate, end: secondDate },
    projects: [
      { id: projectId, label: "Project Atlas", priorityIndex: 0 },
    ],
    teams: [
      {
        id: alphaId,
        label: "Team Alpha",
        projectStates: [],
        capacities: [
          {
            date: firstDate,
            effectiveCapacity: capacity("1.5"),
            reservedCapacity: capacity("0.5"),
            projectCapacity: capacity("1"),
            overReserved: false,
          },
          {
            date: secondDate,
            effectiveCapacity: capacity("0"),
            reservedCapacity: capacity("0"),
            projectCapacity: capacity("0"),
            overReserved: false,
          },
        ],
        allocations: [
          {
            projectId,
            teamId: alphaId,
            date: firstDate,
            workload: capacity("0.5"),
          },
        ],
      },
      {
        id: betaId,
        label: "Team Beta",
        projectStates: [],
        capacities: [firstDate, secondDate].map((date) => ({
          date,
          effectiveCapacity: capacity("0"),
          reservedCapacity: capacity("0"),
          projectCapacity: capacity("0"),
          overReserved: false,
        })),
        allocations: [],
      },
    ],
    diagnostics: [],
  };
}

function render(selectedDate: "2025-01-01" | "2025-01-02"): FakeElement {
  const container = new FakeDocument().createElement("section");
  renderTimelineDateSummary({
    container: container as unknown as HTMLElement,
    viewModel: viewModel(),
    selectedDate: must(createCivilDate(selectedDate)),
  });
  return container;
}

describe("renderTimelineDateSummary", () => {
  it("renders selected date and preserves team order", () => {
    const container = render("2025-01-01");

    assert.equal(
      withClass(container, "timeline-date-summary-heading")[0]?.textContent,
      "Selected date: 2025-01-01",
    );
    assert.deepEqual(
      withClass(container, "timeline-date-summary-team").map((team) =>
        team.getAttribute("data-team-id"),
      ),
      ["team-alpha", "team-beta"],
    );
  });

  it("renders exact capacities, project labels, and workloads", () => {
    const container = render("2025-01-01");

    assert.deepEqual(
      withClass(container, "timeline-date-summary-capacities").map(
        (element) => element.textContent,
      ),
      [
        "Effective 3/2 · Reserved 1/2 · Project 1/1",
        "Effective 0/1 · Reserved 0/1 · Project 0/1",
      ],
    );
    assert.equal(
      withClass(container, "timeline-date-summary-allocation")[0]?.textContent,
      "Project Atlas: 1/2",
    );
  });

  it("renders zero-capacity days and explicit no-allocation states", () => {
    const container = render("2025-01-02");

    assert.ok(
      withClass(container, "timeline-date-summary-capacities").every(
        (element) =>
          element.textContent ===
          "Effective 0/1 · Reserved 0/1 · Project 0/1",
      ),
    );
    assert.equal(
      withClass(container, "timeline-date-summary-allocation-empty").length,
      2,
    );
  });

  it("is deterministic for the same view model and selected date", () => {
    const texts = (root: FakeElement) =>
      descendants(root).map((element) => [element.className, element.textContent]);

    assert.deepEqual(texts(render("2025-01-01")), texts(render("2025-01-01")));
  });
});
