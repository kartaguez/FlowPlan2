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
