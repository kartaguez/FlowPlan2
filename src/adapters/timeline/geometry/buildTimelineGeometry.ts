import {
  civilDatesInclusive,
  type CivilDate,
} from "../../../domain/index.js";
import type {
  TimelineHorizon,
  TimelineViewModel,
} from "../timelineViewModel.js";
import type {
  TimelineDayGeometry,
  TimelineGeometry,
  TimelineGeometryViewport,
  TimelineTeamGeometry,
} from "./timelineGeometry.js";

export interface BuildTimelineGeometryInput {
  readonly viewModel: TimelineViewModel;
  readonly viewport: TimelineGeometryViewport;
}

export function buildTimelineGeometry(
  input: BuildTimelineGeometryInput,
): TimelineGeometry {
  validatePositiveFinite(input.viewport.width, "Viewport width");
  validatePositiveFinite(
    input.viewport.teamLaneHeight,
    "Team lane height",
  );

  const expectedDates = datesInHorizon(input.viewModel.horizon);
  const dayWidth = input.viewport.width / expectedDates.length;
  const teams = input.viewModel.teams.map((team, teamIndex) => {
    if (team.capacities.length !== expectedDates.length) {
      throw new TypeError(
        `Team ${team.id} must provide exactly one capacity per horizon day.`,
      );
    }

    const y = teamIndex * input.viewport.teamLaneHeight;
    const days = team.capacities.map((capacity, dayIndex) => {
      if (capacity.date !== expectedDates[dayIndex]) {
        throw new TypeError(
          `Team ${team.id} capacity dates must match the horizon in order.`,
        );
      }

      return Object.freeze({
        date: capacity.date,
        x: dateToX(capacity.date, input.viewModel.horizon, dayWidth),
        y,
        width: dayWidth,
        height: input.viewport.teamLaneHeight,
        effectiveCapacity: capacity.effectiveCapacity,
        reservedCapacity: capacity.reservedCapacity,
        projectCapacity: capacity.projectCapacity,
        overReserved: capacity.overReserved,
      }) satisfies TimelineDayGeometry;
    });

    return Object.freeze({
      teamId: team.id,
      x: 0,
      y,
      width: input.viewport.width,
      height: input.viewport.teamLaneHeight,
      days: Object.freeze(days),
    }) satisfies TimelineTeamGeometry;
  });

  return Object.freeze({
    width: input.viewport.width,
    height: input.viewModel.teams.length * input.viewport.teamLaneHeight,
    dayWidth,
    teams: Object.freeze(teams),
  });
}

export function dateToX(
  date: CivilDate,
  horizon: TimelineHorizon,
  dayWidth: number,
): number {
  validatePositiveFinite(dayWidth, "Day width");
  const dates = datesInHorizon(horizon);
  const dayIndex = dates.indexOf(date);
  if (dayIndex < 0) {
    throw new TypeError(`Date ${date} is outside the timeline horizon.`);
  }
  return dayIndex * dayWidth;
}

function datesInHorizon(horizon: TimelineHorizon): readonly CivilDate[] {
  const dates = civilDatesInclusive(horizon.start, horizon.end);
  if (dates.length === 0) {
    throw new TypeError("Timeline horizon must contain at least one day.");
  }
  return dates;
}

function validatePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive finite number.`);
  }
}
