import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCivilDate,
  createProjectId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import type { TimelineViewModel } from "../../adapters/index.js";
import { renderPlanningDiagnostics } from "./renderPlanningDiagnostics.js";

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

function viewModelWithDiagnostics(): TimelineViewModel {
  const teamId = must(createTeamId("team-gamma"));
  const projectId = must(createProjectId("project-cobalt"));
  return {
    horizon: {
      start: must(createCivilDate("2025-01-01")),
      end: must(createCivilDate("2025-03-31")),
    },
    projects: [],
    teams: [],
    diagnostics: [
      {
        code: "TEAM_OVER_RESERVED",
        teamId,
        teamLabel: "Team Gamma",
        date: must(createCivilDate("2025-02-10")),
      },
      {
        code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        projectId,
        projectLabel: "Project Cobalt",
      },
      {
        code: "DEADLINE_UNFEASIBLE",
        teamId,
        teamLabel: "Team Gamma",
        projectId,
        projectLabel: "Project Cobalt",
      },
      {
        code: "DEADLINE_MISSED",
        projectId,
        projectLabel: "Project Cobalt",
        date: must(createCivilDate("2025-03-15")),
      },
    ],
  };
}

function render(viewModel: TimelineViewModel): FakeElement {
  const container = new FakeDocument().createElement("section");
  renderPlanningDiagnostics({
    container: container as unknown as HTMLElement,
    diagnostics: viewModel.diagnostics,
  });
  return container;
}

describe("renderPlanningDiagnostics", () => {
  it("preserves source order and maps every public code to its UI message", () => {
    const container = render(viewModelWithDiagnostics());
    const diagnostics = withClass(container, "timeline-diagnostic");

    assert.deepEqual(
      diagnostics.map((item) => item.getAttribute("data-diagnostic-code")),
      [
        "TEAM_OVER_RESERVED",
        "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        "DEADLINE_UNFEASIBLE",
        "DEADLINE_MISSED",
      ],
    );
    assert.deepEqual(
      withClass(container, "timeline-diagnostic-message").map(
        (message) => message.textContent,
      ),
      [
        "Team Gamma — Team capacity is over-reserved. — 2025-02-10",
        "Project Cobalt — Project still has unplanned workload at the end of the horizon.",
        "Project Cobalt / Team Gamma — Mandatory deadline is currently unfeasible.",
        "Project Cobalt — Mandatory deadline has been missed. — 2025-03-15",
      ],
    );
  });

  it("renders raw diagnostic codes as inspectable metadata", () => {
    const container = render(viewModelWithDiagnostics());

    assert.deepEqual(
      withClass(container, "timeline-diagnostic-code").map(
        (code) => code.textContent,
      ),
      [
        "TEAM_OVER_RESERVED",
        "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        "DEADLINE_UNFEASIBLE",
        "DEADLINE_MISSED",
      ],
    );
  });

  it("renders an empty list for an empty category", () => {
    const viewModel = viewModelWithDiagnostics();
    const container = render({ ...viewModel, diagnostics: [] });

    assert.equal(withClass(container, "timeline-diagnostics-list").length, 1);
    assert.equal(withClass(container, "timeline-diagnostic").length, 0);
  });

  it("uses safe DOM construction without interaction handlers", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/ui/timeline/renderPlanningDiagnostics.ts",
      ),
      "utf8",
    );

    assert.doesNotMatch(source, /innerHTML/);
    assert.doesNotMatch(
      source,
      /addEventListener|onclick|onpointer|pointerdown|keydown|mouseenter|mousemove/,
    );
  });
});
