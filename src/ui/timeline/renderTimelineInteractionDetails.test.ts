import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineViewModel } from "../../adapters/index.js";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import {
  createTimelineInteractionLookup,
  renderTimelineSelectionSummary,
  renderTimelineTooltip,
} from "./renderTimelineInteractionDetails.js";
import type { TimelineHit } from "./timelineHitTesting.js";

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
  childNodes: FakeElement[] = [];
  className = "";
  hidden = false;
  textContent: string | null = null;
  readonly style = { left: "", top: "" };

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string,
  ) {}

  replaceChildren(...nodes: FakeElement[]): void {
    this.childNodes = [...nodes];
  }
}

const teamId = must(createTeamId("team-alpha"));
const projectId = must(createProjectId("project-atlas"));
const date = must(createCivilDate("2025-01-15"));

function fixture(): {
  viewModel: TimelineViewModel;
  allocation: TimelineHit;
  marker: TimelineHit;
  team: TimelineHit;
} {
  const viewModel = {
    projects: [{ id: projectId, label: "Project Atlas", priorityIndex: 0 }],
    teams: [
      {
        id: teamId,
        label: "Team Alpha",
        allocations: [
          {
            projectId,
            teamId,
            date,
            workload: must(createCapacity("1.5")),
          },
        ],
        projectStates: [
          { projectId, teamId, deadlineStatus: "UNFEASIBLE" },
        ],
      },
    ],
  } as unknown as TimelineViewModel;
  return {
    viewModel,
    allocation: { kind: "allocation", projectId, teamId, date },
    marker: {
      kind: "project-marker",
      projectId,
      teamId,
      date,
      markerKind: "mandatory-deadline",
    },
    team: { kind: "team", teamId },
  };
}

describe("timeline interaction details", () => {
  it("renders an exact allocation tooltip near the pointer", () => {
    const input = fixture();
    const container = new FakeDocument().createElement("div");

    renderTimelineTooltip({
      container: container as unknown as HTMLElement,
      lookup: createTimelineInteractionLookup(input.viewModel),
      hit: input.allocation,
      clientX: 100,
      clientY: 200,
    });

    assert.equal(
      container.textContent,
      "Project Atlas\nTeam Alpha\n2025-01-15\nWorkload: 3/2",
    );
    assert.equal(container.style.left, "112px");
    assert.equal(container.style.top, "212px");
    assert.equal(container.hidden, false);
  });

  it("renders marker status and hides a tooltip when hover clears", () => {
    const input = fixture();
    const container = new FakeDocument().createElement("div");
    const lookup = createTimelineInteractionLookup(input.viewModel);

    renderTimelineTooltip({
      container: container as unknown as HTMLElement,
      lookup,
      hit: input.marker,
      clientX: 0,
      clientY: 0,
    });
    assert.match(container.textContent ?? "", /Mandatory deadline/);
    assert.match(container.textContent ?? "", /Deadline status: UNFEASIBLE/);
    renderTimelineTooltip({
      container: container as unknown as HTMLElement,
      lookup,
      hit: undefined,
      clientX: 0,
      clientY: 0,
    });
    assert.equal(container.hidden, true);
    assert.equal(container.textContent, "");
  });

  it("renders accessible summaries for every hit kind and empty state", () => {
    const input = fixture();
    const container = new FakeDocument().createElement("section");
    const lookup = createTimelineInteractionLookup(input.viewModel);

    for (const [hit, heading] of [
      [input.allocation, "Selected allocation"],
      [input.marker, "Selected project marker"],
      [input.team, "Selected team"],
    ] as const) {
      renderTimelineSelectionSummary({
        container: container as unknown as HTMLElement,
        lookup,
        selected: hit,
      });
      assert.equal(container.childNodes[0]?.textContent, heading);
    }
    renderTimelineSelectionSummary({
      container: container as unknown as HTMLElement,
      lookup,
      selected: undefined,
    });
    assert.equal(container.childNodes[0]?.textContent, "No timeline selection.");
  });
});
