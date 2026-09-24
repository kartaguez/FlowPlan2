import type {
  TimelineProject,
  TimelineReservation,
  TimelineTeam,
  TimelineViewModel,
} from "../../adapters/index.js";
import {
  serializeQuantity,
  rationalOf,
  type ProjectId,
  type ReservationId,
  type Rational,
  type TeamId,
} from "../../domain/index.js";
import type { TimelineHit } from "./timelineHitTesting.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";
import { formatPercentageForEditing } from "../../application/session/editableQuantity.js";

export interface TimelineInteractionLookup {
  readonly projectsById: ReadonlyMap<ProjectId, TimelineProject>;
  readonly teamsById: ReadonlyMap<TeamId, TimelineTeam>;
  readonly reservationsById: ReadonlyMap<ReservationId, TimelineReservation>;
}

export function createTimelineInteractionLookup(
  viewModel: TimelineViewModel,
): TimelineInteractionLookup {
  return Object.freeze({
    projectsById: indexUnique(viewModel.projects, "project"),
    teamsById: indexUnique(viewModel.teams, "team"),
    reservationsById: indexUnique(viewModel.reservations ?? [], "reservation"),
  });
}

export interface RenderTimelineTooltipInput {
  readonly container: HTMLElement;
  readonly lookup: TimelineInteractionLookup;
  readonly hit: TimelineHit | undefined;
  readonly clientX: number;
  readonly clientY: number;
  readonly getProjectProgress?: (projectId: ProjectId) => Rational | undefined;
}

export function renderTimelineTooltip(
  input: RenderTimelineTooltipInput,
): void {
  if (input.hit === undefined || input.hit.kind === "team" || input.hit.kind === "project-marker") {
    input.container.hidden = true;
    input.container.textContent = "";
    return;
  }
  input.container.textContent = tooltipLines(input.lookup, input.hit, input.getProjectProgress).join("\n");
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
  if (hit.kind === "reservation") {
    const reservation = lookup.reservationsById.get(hit.reservationId);
    if (reservation === undefined) throw new TypeError(`Unknown reservation ${hit.reservationId}.`);
    return Object.freeze([reservation.label, team.label, hit.date]);
  }

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
    case "reservation":
      return "Selected reservation";
  }
}

function tooltipLines(
  lookup: TimelineInteractionLookup,
  hit: Extract<TimelineHit, { kind: "allocation" | "reservation" }>,
  getProjectProgress?: (projectId: ProjectId) => Rational | undefined,
): readonly string[] {
  const team = lookup.teamsById.get(hit.teamId);
  if (team === undefined) throw new TypeError(`Unknown timeline team ${hit.teamId}.`);
  if (hit.kind === "reservation") {
    const reservation = lookup.reservationsById.get(hit.reservationId);
    const allocation = reservation?.teamAllocations.find((item) => item.teamId === hit.teamId);
    if (reservation === undefined || allocation === undefined) throw new TypeError("Unknown reservation allocation.");
    const amount = allocation.amount.kind === "ratio"
      ? `Ratio: ${formatPercentageForEditing(serializeQuantity(allocation.amount.ratio))}%`
      : `Fixed daily: ${formatCursorMd(rationalOf(allocation.amount.dailyCapacity))}`;
    return [reservation.label, `Team: ${team.label}`,
      `Period: ${reservation.startDate} – ${reservation.endDate}`, amount];
  }
  const project = lookup.projectsById.get(hit.projectId);
  const state = team.projectStates.find((item) => item.projectId === hit.projectId);
  if (project === undefined || state?.initialWorkload === undefined) throw new TypeError("Unknown Project requirement.");
  return [project.label,
    `Charge: ${formatCursorMd(rationalOf(state.initialWorkload))}`,
    `Objective end: ${project.objectiveEndDate ?? "—"}`,
    `Estimated end: ${project.estimatedWithinHorizon === false ? "not estimated within horizon" : project.estimatedEndDate ?? "—"}`,
    `Progress: ${formatCursorPercent(getProjectProgress?.(project.id))}`];
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
  T extends { readonly id: ProjectId | TeamId | ReservationId },
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
