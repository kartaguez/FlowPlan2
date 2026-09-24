import {
  civilDatesInclusive,
  createCapacity,
  serializeQuantity,
  type Capacity,
  type CivilDate,
  type ProjectId,
} from "../../../domain/index.js";
import type {
  TimelineAllocation,
  TimelineHorizon,
  TimelineProject,
  TimelineTeam,
  TimelineViewModel,
} from "../timelineViewModel.js";
import type {
  TimelineAllocationGeometry,
  TimelineDayGeometry,
  TimelineDateGeometry,
  TimelineGeometry,
  TimelineGeometryViewport,
  TimelineMonthGeometry,
  TimelineProjectMarkerGeometry,
  TimelineProjectMarkerKind,
  TimelineRectGeometry,
  TimelineTeamGeometry,
  TimelineTimeAxisGeometry,
  TimelineYearGeometry,
} from "./timelineGeometry.js";
import { GEOMETRY_EPSILON } from "./geometryNumbers.js";

const MARKER_KIND_ORDER: Readonly<Record<TimelineProjectMarkerKind, number>> =
  Object.freeze({
    "earliest-start": 0,
    "objective-end": 1,
    "mandatory-deadline": 2,
  });
const MONTH_LABELS = Object.freeze([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]);

export interface BuildTimelineGeometryInput {
  readonly viewModel: TimelineViewModel;
  readonly viewport: TimelineGeometryViewport;
}

export function buildTimelineGeometry(
  input: BuildTimelineGeometryInput,
): TimelineGeometry {
  const teamHeaderHeight = input.viewport.teamHeaderHeight ?? 0;
  const teamProjectionBandHeight = input.viewport.teamProjectionBandHeight ?? 0;
  const globalMetricsHeight = input.viewport.globalMetricsHeight ?? 0;
  const teamCollectionActionsHeight = input.viewport.teamCollectionActionsHeight ?? 0;
  validatePositiveFinite(input.viewport.width, "Viewport width");
  validatePositiveFinite(
    input.viewport.teamLaneHeight,
    "Team lane height",
  );
  validateNonNegativeFinite(teamHeaderHeight, "Team header height");
  validateNonNegativeFinite(teamProjectionBandHeight, "Team projection band height");
  validateNonNegativeFinite(globalMetricsHeight, "Global metrics height");
  validateNonNegativeFinite(teamCollectionActionsHeight, "Team collection actions height");
  validatePositiveFinite(input.viewport.timeAxisHeight, "Time axis height");
  const timeAxisLabelHeight = input.viewport.timeAxisLabelHeight ?? 0;
  validateNonNegativeFinite(timeAxisLabelHeight, "Time axis label height");
  if (timeAxisLabelHeight >= input.viewport.timeAxisHeight) {
    throw new TypeError("Time axis label height must leave room for year and month rows.");
  }

  const expectedDates = datesInHorizon(input.viewModel.horizon);
  const priorityByProjectId = indexProjectPriorities(input.viewModel.projects);
  const projectsById = new Map(
    input.viewModel.projects.map((project) => [project.id, project]),
  );
  const dayIndexByDate = new Map(
    expectedDates.map((date, index) => [date, index]),
  );
  const dayWidth = input.viewport.width / expectedDates.length;
  const dates = Object.freeze(
    expectedDates.map(
      (date, index) =>
        Object.freeze({
          date,
          x: index * dayWidth,
          width: dayWidth,
        }) satisfies TimelineDateGeometry,
    ),
  );
  const timeAxis = buildTimeAxisGeometry(
    expectedDates,
    dayWidth,
    input.viewport.width,
    input.viewport.timeAxisHeight,
    timeAxisLabelHeight,
  );
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

    const y =
      input.viewport.timeAxisHeight +
      globalMetricsHeight +
      teamCollectionActionsHeight +
      teamHeaderHeight +
      teamProjectionBandHeight +
      teamIndex *
        (teamHeaderHeight + teamProjectionBandHeight + input.viewport.teamLaneHeight);
    const laneBottom = y + input.viewport.teamLaneHeight;
    const allocationsByDate = indexAllocationsByDate(
      team,
      expectedDates,
      priorityByProjectId,
    );
    const markers = buildProjectMarkers(
      team,
      projectsById,
      priorityByProjectId,
      dayIndexByDate,
      dayWidth,
      y,
      input.viewport.teamLaneHeight,
    );
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
      const allocations = buildAllocationGeometries(
        allocationsByDate.get(capacity.date) ?? [],
        priorityByProjectId,
        projectRegion,
        capacity.projectCapacity,
        pixelsPerCapacityUnit,
      );

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
        allocations,
        reservationSegments: buildReservationSegments(
          team,
          capacity.date,
          reservedRegion,
        ),
      }) satisfies TimelineDayGeometry;
    });

    return Object.freeze({
      teamId: team.id,
      x: 0,
      y,
      width: input.viewport.width,
      height: input.viewport.teamLaneHeight,
      projectionBand: freezeRect({ x: 0, y: y - teamProjectionBandHeight,
        width: input.viewport.width, height: teamProjectionBandHeight }),
      days: Object.freeze(days),
      markers,
    }) satisfies TimelineTeamGeometry;
  });

  return Object.freeze({
    width: input.viewport.width,
    height:
      input.viewport.timeAxisHeight +
      globalMetricsHeight +
      teamCollectionActionsHeight +
      input.viewModel.teams.length *
        (teamHeaderHeight + teamProjectionBandHeight + input.viewport.teamLaneHeight),
    dayWidth,
    teamHeaderHeight,
    teamProjectionBandHeight,
    globalMetricsHeight,
    teamCollectionActionsHeight,
    dates,
    timeAxis,
    maxEffectiveCapacity,
    pixelsPerCapacityUnit,
    teams: Object.freeze(teams),
  });
}

function buildReservationSegments(
  team: TimelineTeam,
  date: CivilDate,
  region: TimelineRectGeometry,
): readonly import("./timelineGeometry.js").TimelineReservationSegmentGeometry[] {
  const contributions = (team.reservationContributions ?? []).filter((entry) =>
    entry.date === date && capacityToGeometryNumber(entry.capacity) > 0,
  );
  const total = contributions.reduce((sum, entry) => sum + capacityToGeometryNumber(entry.capacity), 0);
  if (total === 0 || region.height <= 0) return Object.freeze([]);
  let usedHeight = 0;
  return Object.freeze(contributions.map((entry, index) => {
    const height = index === contributions.length - 1
      ? Math.max(0, region.height - usedHeight)
      : region.height * capacityToGeometryNumber(entry.capacity) / total;
    const segment = Object.freeze({
      reservationId: entry.reservationId,
      teamId: entry.teamId,
      date,
      capacity: entry.capacity,
      x: region.x,
      y: region.y + usedHeight,
      width: region.width,
      height,
    });
    usedHeight += height;
    return segment;
  }));
}

function buildProjectMarkers(
  team: TimelineTeam,
  projectsById: ReadonlyMap<ProjectId, TimelineProject>,
  priorityByProjectId: ReadonlyMap<ProjectId, number>,
  dayIndexByDate: ReadonlyMap<CivilDate, number>,
  dayWidth: number,
  y: number,
  height: number,
): readonly TimelineProjectMarkerGeometry[] {
  const markers: TimelineProjectMarkerGeometry[] = [];
  const seenProjectIds = new Set<ProjectId>();

  for (const state of team.projectStates) {
    if (state.teamId !== team.id) {
      throw new TypeError(
        `Project state ${state.projectId} references a different team.`,
      );
    }
    if (seenProjectIds.has(state.projectId)) {
      throw new TypeError(
        `Duplicate project state ${state.projectId} for team ${team.id}.`,
      );
    }
    seenProjectIds.add(state.projectId);
    const project = projectsById.get(state.projectId);
    if (project === undefined) {
      throw new TypeError(
        `Project state references unknown project ${state.projectId}.`,
      );
    }

    addProjectMarker(
      markers,
      project.earliestStartDate,
      "earliest-start",
      project,
      team,
      state.deadlineStatus,
      dayIndexByDate,
      dayWidth,
      y,
      height,
    );
    addProjectMarker(
      markers,
      project.objectiveEndDate,
      "objective-end",
      project,
      team,
      state.deadlineStatus,
      dayIndexByDate,
      dayWidth,
      y,
      height,
    );
    addProjectMarker(
      markers,
      project.mandatoryDeadline,
      "mandatory-deadline",
      project,
      team,
      state.deadlineStatus,
      dayIndexByDate,
      dayWidth,
      y,
      height,
    );
  }

  markers.sort((left, right) => {
    const priorityDifference =
      requireProjectPriority(priorityByProjectId, left.projectId) -
      requireProjectPriority(priorityByProjectId, right.projectId);
    if (priorityDifference !== 0) return priorityDifference;
    const kindDifference =
      MARKER_KIND_ORDER[left.kind] - MARKER_KIND_ORDER[right.kind];
    return kindDifference !== 0
      ? kindDifference
      : left.date.localeCompare(right.date);
  });
  return Object.freeze(markers);
}

function addProjectMarker(
  markers: TimelineProjectMarkerGeometry[],
  date: CivilDate | undefined,
  kind: TimelineProjectMarkerKind,
  project: TimelineProject,
  team: TimelineTeam,
  deadlineStatus: TimelineProjectMarkerGeometry["deadlineStatus"],
  dayIndexByDate: ReadonlyMap<CivilDate, number>,
  dayWidth: number,
  y: number,
  height: number,
): void {
  if (date === undefined) return;
  const dayIndex = dayIndexByDate.get(date);
  if (dayIndex === undefined) return;

  markers.push(
    Object.freeze({
      projectId: project.id,
      teamId: team.id,
      date,
      kind,
      x: (dayIndex + 0.5) * dayWidth,
      y1: y,
      y2: y + height,
      ...(kind === "mandatory-deadline" && deadlineStatus !== undefined
        ? { deadlineStatus }
        : {}),
    }),
  );
}

function buildTimeAxisGeometry(
  dates: readonly CivilDate[],
  dayWidth: number,
  width: number,
  height: number,
  labelHeight: number,
): TimelineTimeAxisGeometry {
  const rowHeight = (height - labelHeight) / 2;
  const years = buildTimeSegments(dates, dayWidth, labelHeight, rowHeight, "year");
  const months = buildTimeSegments(
    dates,
    dayWidth,
    labelHeight + rowHeight,
    rowHeight,
    "month",
  );

  return Object.freeze({
    x: 0,
    y: 0,
    width,
    height,
    projectionBand: freezeRect({ x: 0, y: 0, width, height: labelHeight }),
    years: Object.freeze(years) as readonly TimelineYearGeometry[],
    months: Object.freeze(months) as readonly TimelineMonthGeometry[],
  });
}

function buildTimeSegments(
  dates: readonly CivilDate[],
  dayWidth: number,
  y: number,
  height: number,
  kind: "year" | "month",
): readonly (TimelineYearGeometry | TimelineMonthGeometry)[] {
  const segments: (TimelineYearGeometry | TimelineMonthGeometry)[] = [];
  let startIndex = 0;

  while (startIndex < dates.length) {
    const startDate = dates[startIndex]!;
    const year = civilDateYear(startDate);
    const month = civilDateMonth(startDate);
    let endIndex = startIndex + 1;
    while (
      endIndex < dates.length &&
      civilDateYear(dates[endIndex]!) === year &&
      (kind === "year" || civilDateMonth(dates[endIndex]!) === month)
    ) {
      endIndex += 1;
    }

    const x = startIndex * dayWidth;
    const segmentWidth = (endIndex - startIndex) * dayWidth;
    const common = {
      x,
      y,
      width: segmentWidth,
      height,
      labelX: x + segmentWidth / 2,
      labelY: y + height / 2,
    };
    segments.push(
      Object.freeze(
        kind === "year"
          ? { ...common, year, label: String(year) }
          : {
              ...common,
              year,
              month,
              label: requireMonthLabel(month),
            },
      ),
    );
    startIndex = endIndex;
  }

  return segments;
}

function civilDateYear(date: CivilDate): number {
  return Number(date.slice(0, 4));
}

function civilDateMonth(date: CivilDate): number {
  return Number(date.slice(5, 7));
}

function requireMonthLabel(month: number): string {
  const label = MONTH_LABELS[month - 1];
  if (label === undefined) {
    throw new TypeError(`Invalid CivilDate month ${month}.`);
  }
  return label;
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

function indexProjectPriorities(
  projects: readonly TimelineProject[],
): ReadonlyMap<ProjectId, number> {
  const priorities = new Map<ProjectId, number>();
  const usedPriorityIndexes = new Set<number>();
  for (const project of projects) {
    if (priorities.has(project.id)) {
      throw new TypeError(`Duplicate timeline project ${project.id}.`);
    }
    if (
      !Number.isInteger(project.priorityIndex) ||
      project.priorityIndex < 0 ||
      usedPriorityIndexes.has(project.priorityIndex)
    ) {
      throw new TypeError(
        "Timeline project priority indexes must be unique non-negative integers.",
      );
    }
    priorities.set(project.id, project.priorityIndex);
    usedPriorityIndexes.add(project.priorityIndex);
  }
  return priorities;
}

function indexAllocationsByDate(
  team: TimelineTeam,
  expectedDates: readonly CivilDate[],
  priorityByProjectId: ReadonlyMap<ProjectId, number>,
): ReadonlyMap<CivilDate, readonly TimelineAllocation[]> {
  const expectedDateSet = new Set(expectedDates);
  const indexed = new Map<CivilDate, TimelineAllocation[]>();
  const projectIdsByDate = new Map<CivilDate, Set<ProjectId>>();

  for (const allocation of team.allocations) {
    if (allocation.teamId !== team.id) {
      throw new TypeError(
        `Allocation ${allocation.projectId} references a different team.`,
      );
    }
    if (!priorityByProjectId.has(allocation.projectId)) {
      throw new TypeError(
        `Allocation references unknown project ${allocation.projectId}.`,
      );
    }
    if (!expectedDateSet.has(allocation.date)) {
      throw new TypeError(
        `Allocation ${allocation.projectId} is outside the timeline horizon.`,
      );
    }
    if (serializedCapacityParts(allocation.workload).numerator === 0n) {
      throw new TypeError("Timeline allocations must have a positive workload.");
    }

    const allocatedProjects = projectIdsByDate.get(allocation.date) ?? new Set();
    if (allocatedProjects.has(allocation.projectId)) {
      throw new TypeError(
        `Duplicate allocation ${allocation.projectId} on ${allocation.date}.`,
      );
    }
    allocatedProjects.add(allocation.projectId);
    projectIdsByDate.set(allocation.date, allocatedProjects);
    const allocations = indexed.get(allocation.date) ?? [];
    allocations.push(allocation);
    indexed.set(allocation.date, allocations);
  }

  for (const allocations of indexed.values()) {
    allocations.sort(
      (left, right) =>
        requireProjectPriority(priorityByProjectId, left.projectId) -
        requireProjectPriority(priorityByProjectId, right.projectId),
    );
  }
  return indexed;
}

function buildAllocationGeometries(
  allocations: readonly TimelineAllocation[],
  priorityByProjectId: ReadonlyMap<ProjectId, number>,
  projectRegion: TimelineRectGeometry,
  projectCapacity: Capacity,
  pixelsPerCapacityUnit: number,
): readonly TimelineAllocationGeometry[] {
  let totalWorkload: CapacityRationalParts = {
    numerator: 0n,
    denominator: 1n,
  };
  for (const allocation of allocations) {
    totalWorkload = addCapacityParts(
      totalWorkload,
      serializedCapacityParts(allocation.workload),
    );
  }
  if (
    compareCapacityParts(
      totalWorkload,
      serializedCapacityParts(projectCapacity),
    ) > 0
  ) {
    throw new TypeError(
      "Daily allocations must not exceed the available project capacity.",
    );
  }

  const projectBottom = projectRegion.y + projectRegion.height;
  const tolerance = GEOMETRY_EPSILON * Math.max(1, projectRegion.height);
  let stackedHeight = 0;
  const geometries = allocations.map((allocation) => {
    const rawHeight = capacityToHeight(
      allocation.workload,
      pixelsPerCapacityUnit,
    );
    const nextHeight = stackedHeight + rawHeight;
    if (nextHeight > projectRegion.height + tolerance) {
      throw new TypeError(
        "Daily allocation geometry exceeds the project capacity region.",
      );
    }
    const clampedHeight = Math.min(nextHeight, projectRegion.height);
    const renderedHeight = clampedHeight - stackedHeight;
    const geometry = Object.freeze({
      projectId: allocation.projectId,
      teamId: allocation.teamId,
      date: allocation.date,
      workload: allocation.workload,
      priorityIndex: requireProjectPriority(
        priorityByProjectId,
        allocation.projectId,
      ),
      x: projectRegion.x,
      y: projectBottom - clampedHeight,
      width: projectRegion.width,
      height: renderedHeight,
    }) satisfies TimelineAllocationGeometry;
    validateNonNegativeFinite(geometry.y, "Allocation y");
    validateNonNegativeFinite(geometry.height, "Allocation height");
    stackedHeight = clampedHeight;
    return geometry;
  });
  return Object.freeze(geometries);
}

function requireProjectPriority(
  priorityByProjectId: ReadonlyMap<ProjectId, number>,
  projectId: ProjectId,
): number {
  const priority = priorityByProjectId.get(projectId);
  if (priority === undefined) {
    throw new TypeError(`Unknown timeline project ${projectId}.`);
  }
  return priority;
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

interface CapacityRationalParts {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function serializedCapacityParts(capacity: Capacity): CapacityRationalParts {
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

function addCapacityParts(
  left: CapacityRationalParts,
  right: CapacityRationalParts,
): CapacityRationalParts {
  return {
    numerator:
      left.numerator * right.denominator +
      right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  };
}

function compareCapacityParts(
  left: CapacityRationalParts,
  right: CapacityRationalParts,
): -1 | 0 | 1 {
  const leftProduct = left.numerator * right.denominator;
  const rightProduct = right.numerator * left.denominator;
  return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
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
