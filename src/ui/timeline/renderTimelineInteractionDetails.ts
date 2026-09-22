import type {
  TimelineProject,
  TimelineTeam,
  TimelineViewModel,
} from "../../adapters/index.js";
import {
  serializeQuantity,
  type ProjectId,
  type TeamId,
} from "../../domain/index.js";
import type { TimelineHit } from "./timelineHitTesting.js";

export interface TimelineInteractionLookup {
  readonly projectsById: ReadonlyMap<ProjectId, TimelineProject>;
  readonly teamsById: ReadonlyMap<TeamId, TimelineTeam>;
}

export function createTimelineInteractionLookup(
  viewModel: TimelineViewModel,
): TimelineInteractionLookup {
  return Object.freeze({
    projectsById: indexUnique(viewModel.projects, "project"),
    teamsById: indexUnique(viewModel.teams, "team"),
  });
}

export interface RenderTimelineTooltipInput {
  readonly container: HTMLElement;
  readonly lookup: TimelineInteractionLookup;
  readonly hit: TimelineHit | undefined;
  readonly clientX: number;
  readonly clientY: number;
}

export function renderTimelineTooltip(
  input: RenderTimelineTooltipInput,
): void {
  if (input.hit === undefined) {
    input.container.hidden = true;
    input.container.textContent = "";
    return;
  }
  input.container.textContent = describeHit(input.lookup, input.hit).join("\n");
  input.container.style.left = `${input.clientX + 12}px`;
  input.container.style.top = `${input.clientY + 12}px`;
  input.container.hidden = false;
}

export interface RenderTimelineSelectionSummaryInput {
  readonly container: HTMLElement;
  readonly lookup: TimelineInteractionLookup;
  readonly selected: TimelineHit | undefined;
}

export function renderTimelineSelectionSummary(
  input: RenderTimelineSelectionSummaryInput,
): void {
  const document = input.container.ownerDocument;
  if (input.selected === undefined) {
    const empty = document.createElement("p");
    empty.textContent = "No timeline selection.";
    input.container.replaceChildren(empty);
    return;
  }

  const heading = document.createElement("h3");
  heading.className = "timeline-selection-summary-heading";
  heading.textContent = selectionHeading(input.selected);
  const details = describeHit(input.lookup, input.selected).map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  });
  input.container.replaceChildren(heading, ...details);
}

function describeHit(
  lookup: TimelineInteractionLookup,
  hit: TimelineHit,
): readonly string[] {
  const team = lookup.teamsById.get(hit.teamId);
  if (team === undefined) throw new TypeError(`Unknown timeline team ${hit.teamId}.`);
  if (hit.kind === "team") return Object.freeze([team.label]);

  const project = lookup.projectsById.get(hit.projectId);
  if (project === undefined) {
    throw new TypeError(`Unknown timeline project ${hit.projectId}.`);
  }
  if (hit.kind === "allocation") {
    const allocation = team.allocations.find(
      (candidate) =>
        candidate.projectId === hit.projectId && candidate.date === hit.date,
    );
    if (allocation === undefined) {
      throw new TypeError("Allocation hit has no semantic allocation.");
    }
    return Object.freeze([
      project.label,
      team.label,
      hit.date,
      `Workload: ${serializeQuantity(allocation.workload)}`,
    ]);
  }

  const lines = [project.label, team.label, markerKindLabel(hit.markerKind), hit.date];
  if (hit.markerKind === "mandatory-deadline") {
    const state = team.projectStates.find(
      (candidate) => candidate.projectId === hit.projectId,
    );
    if (state?.deadlineStatus !== undefined) {
      lines.push(`Deadline status: ${state.deadlineStatus}`);
    }
  }
  return Object.freeze(lines);
}

function selectionHeading(hit: TimelineHit): string {
  switch (hit.kind) {
    case "allocation":
      return "Selected allocation";
    case "project-marker":
      return "Selected project marker";
    case "team":
      return "Selected team";
  }
}

function markerKindLabel(
  kind: Extract<TimelineHit, { kind: "project-marker" }>["markerKind"],
): string {
  switch (kind) {
    case "earliest-start":
      return "Earliest start";
    case "objective-end":
      return "Objective end";
    case "mandatory-deadline":
      return "Mandatory deadline";
  }
}

function indexUnique<
  T extends { readonly id: ProjectId | TeamId },
>(items: readonly T[], label: string): ReadonlyMap<T["id"], T> {
  const indexed = new Map<T["id"], T>();
  for (const item of items) {
    if (indexed.has(item.id)) {
      throw new TypeError(`Duplicate timeline ${label} ${item.id}.`);
    }
    indexed.set(item.id, item);
  }
  return indexed;
}
