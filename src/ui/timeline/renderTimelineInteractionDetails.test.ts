import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineViewModel } from "../../adapters/index.js";
import {
  createCapacity,
  createCivilDate,
  createProjectId,
  createReservationId,
  createReservationRatio,
  rationalFromInteger,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import {
  createTimelineInteractionLookup,
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
const reservationId = must(createReservationId("reservation-run"));

function fixture(): {
  viewModel: TimelineViewModel;
  allocation: TimelineHit;
  marker: TimelineHit;
  team: TimelineHit;
} {
  const viewModel = {
    projects: [{ id: projectId, label: "Project Atlas", priorityIndex: 0, estimatedWithinHorizon: true }],
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
          { projectId, teamId, deadlineStatus: "UNFEASIBLE", initialWorkload: must(createCapacity("4")) },
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
      "Project Atlas\nCharge: 4 MD\nObjective end: —\nEstimated end: —\nProgress: N/A",
    );
    assert.equal(container.style.left, "112px");
    assert.equal(container.style.top, "212px");
    assert.equal(container.hidden, false);
  });

  it("uses global Project end and exact cursor progress for any Team allocation", () => {
    const input = fixture();
    const viewModel = { ...input.viewModel, projects: [{ ...input.viewModel.projects[0]!,
      estimatedEndDate: must(createCivilDate("2025-01-20")), estimatedWithinHorizon: true }] };
    const container = new FakeDocument().createElement("div");
    renderTimelineTooltip({ container: container as unknown as HTMLElement,
      lookup: createTimelineInteractionLookup(viewModel), hit: input.allocation,
      clientX: 0, clientY: 0, getProjectProgress: () => rationalFromInteger(1n) });
    assert.match(container.textContent ?? "", /Estimated end: 2025-01-20/);
    assert.match(container.textContent ?? "", /Progress: 100%/);
    const unfinished = { ...viewModel, projects: [{ id: projectId, label: "Project Atlas",
      priorityIndex: 0, estimatedWithinHorizon: false }] };
    renderTimelineTooltip({ container: container as unknown as HTMLElement,
      lookup: createTimelineInteractionLookup(unfinished), hit: input.allocation,
      clientX: 0, clientY: 0, getProjectProgress: () => rationalFromInteger(1n) });
    assert.match(container.textContent ?? "", /Estimated end: not estimated within horizon/);
  });

  it("shows only real Reservation fields", () => {
    const input = fixture();
    const viewModel = { ...input.viewModel, reservations: [{ id: reservationId, label: "Run",
      startDate: date, endDate: date, teamAllocations: [{ teamId,
        amount: { kind: "ratio" as const, ratio: must(createReservationRatio("0.25")) } }] }] };
    const container = new FakeDocument().createElement("div");
    renderTimelineTooltip({ container: container as unknown as HTMLElement,
      lookup: createTimelineInteractionLookup(viewModel),
      hit: { kind: "reservation", reservationId, teamId, date }, clientX: 0, clientY: 0 });
    assert.match(container.textContent ?? "", /Run\nTeam: Team Alpha/);
    assert.match(container.textContent ?? "", /Ratio: 25%/);
    assert.doesNotMatch(container.textContent ?? "", /Progress|Estimated end|Objective end/);
    const fixed = { ...viewModel, reservations: [{ ...viewModel.reservations[0]!,
      teamAllocations: [{ teamId, amount: { kind: "fixed-daily" as const,
        dailyCapacity: must(createCapacity("1.5")) } }] }] };
    renderTimelineTooltip({ container: container as unknown as HTMLElement,
      lookup: createTimelineInteractionLookup(fixed),
      hit: { kind: "reservation", reservationId, teamId, date }, clientX: 0, clientY: 0 });
    assert.match(container.textContent ?? "", /Fixed daily: 1.5 MD/);
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
    assert.equal(container.hidden, true);
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

});
