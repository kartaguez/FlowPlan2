import {
  civilDatesInclusive,
  createCapacity,
  serializeQuantity,
  type Capacity,
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
  TimelineRectGeometry,
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
  const maxEffectiveCapacity = findMaxEffectiveCapacity(input.viewModel);
  const maxEffectiveCapacityNumber = capacityToGeometryNumber(
    maxEffectiveCapacity,
  );
  const pixelsPerCapacityUnit =
    maxEffectiveCapacityNumber === 0
      ? 0
      : input.viewport.teamLaneHeight / maxEffectiveCapacityNumber;
  validateNonNegativeFinite(
    pixelsPerCapacityUnit,
    "Pixels per capacity unit",
  );
  const teams = input.viewModel.teams.map((team, teamIndex) => {
    if (team.capacities.length !== expectedDates.length) {
      throw new TypeError(
        `Team ${team.id} must provide exactly one capacity per horizon day.`,
      );
    }

    const y = teamIndex * input.viewport.teamLaneHeight;
    const laneBottom = y + input.viewport.teamLaneHeight;
    const days = team.capacities.map((capacity, dayIndex) => {
      if (capacity.date !== expectedDates[dayIndex]) {
        throw new TypeError(
          `Team ${team.id} capacity dates must match the horizon in order.`,
        );
      }

      const effectiveHeight = capacityToHeight(
        capacity.effectiveCapacity,
        pixelsPerCapacityUnit,
      );
      const projectHeight = capacityToHeight(
        capacity.projectCapacity,
        pixelsPerCapacityUnit,
      );
      const visibleReservedCapacity =
        compareCapacities(
          capacity.reservedCapacity,
          capacity.effectiveCapacity,
        ) <= 0
          ? capacity.reservedCapacity
          : capacity.effectiveCapacity;
      const reservedHeight = capacityToHeight(
        visibleReservedCapacity,
        pixelsPerCapacityUnit,
      );
      const tubeY = laneBottom - effectiveHeight;
      const projectRegion = freezeRect({
        x: dateToX(capacity.date, input.viewModel.horizon, dayWidth),
        y: laneBottom - projectHeight,
        width: dayWidth,
        height: projectHeight,
      });
      const reservedRegion = freezeRect({
        x: projectRegion.x,
        y: tubeY,
        width: dayWidth,
        height: reservedHeight,
      });

      return Object.freeze({
        date: capacity.date,
        x: projectRegion.x,
        y,
        width: dayWidth,
        height: input.viewport.teamLaneHeight,
        effectiveCapacity: capacity.effectiveCapacity,
        reservedCapacity: capacity.reservedCapacity,
        projectCapacity: capacity.projectCapacity,
        overReserved: capacity.overReserved,
        capacityTube: Object.freeze({
          x: projectRegion.x,
          y: tubeY,
          width: dayWidth,
          height: effectiveHeight,
          projectRegion,
          reservedRegion,
        }),
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
    maxEffectiveCapacity,
    pixelsPerCapacityUnit,
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

function findMaxEffectiveCapacity(viewModel: TimelineViewModel): Capacity {
  let maximum: Capacity | undefined;
  for (const team of viewModel.teams) {
    for (const day of team.capacities) {
      if (
        maximum === undefined ||
        compareCapacities(day.effectiveCapacity, maximum) > 0
      ) {
        maximum = day.effectiveCapacity;
      }
    }
  }

  if (maximum !== undefined) return maximum;
  const zero = createCapacity("0", "maxEffectiveCapacity");
  if (!zero.ok) {
    throw new TypeError("Unable to create the zero capacity reference.");
  }
  return zero.value;
}

function compareCapacities(left: Capacity, right: Capacity): -1 | 0 | 1 {
  const leftRational = serializedCapacityParts(left);
  const rightRational = serializedCapacityParts(right);
  const leftProduct = leftRational.numerator * rightRational.denominator;
  const rightProduct = rightRational.numerator * leftRational.denominator;
  return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
}

function capacityToHeight(
  capacity: Capacity,
  pixelsPerCapacityUnit: number,
): number {
  const height = capacityToGeometryNumber(capacity) * pixelsPerCapacityUnit;
  validateNonNegativeFinite(height, "Capacity height");
  return height;
}

// This conversion is presentation-only. Domain quantities remain exact.
function capacityToGeometryNumber(capacity: Capacity): number {
  const { numerator, denominator } = serializedCapacityParts(capacity);
  if (numerator === 0n) return 0;

  const numeratorText = numerator.toString();
  const denominatorText = denominator.toString();
  const significantDigits = 15;
  const numeratorHead = numeratorText.slice(0, significantDigits);
  const denominatorHead = denominatorText.slice(0, significantDigits);
  const exponent =
    numeratorText.length -
    numeratorHead.length -
    (denominatorText.length - denominatorHead.length);
  const value =
    (Number(numeratorHead) / Number(denominatorHead)) * 10 ** exponent;

  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(
      "Capacity cannot be represented as a positive finite geometry number.",
    );
  }
  return value;
}

function serializedCapacityParts(capacity: Capacity): {
  readonly numerator: bigint;
  readonly denominator: bigint;
} {
  const serialized = serializeQuantity(capacity);
  const match = /^(\d+)\/([1-9]\d*)$/.exec(serialized);
  if (!match) {
    throw new TypeError("Capacity has an invalid exact serialization.");
  }
  return {
    numerator: BigInt(match[1]!),
    denominator: BigInt(match[2]!),
  };
}

function freezeRect(rect: TimelineRectGeometry): TimelineRectGeometry {
  validateNonNegativeFinite(rect.x, "Rectangle x");
  validateNonNegativeFinite(rect.y, "Rectangle y");
  validateNonNegativeFinite(rect.width, "Rectangle width");
  validateNonNegativeFinite(rect.height, "Rectangle height");
  return Object.freeze(rect);
}

function validateNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative finite number.`);
  }
}
