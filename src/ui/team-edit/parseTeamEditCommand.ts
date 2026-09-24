import type {
  UpdateTeamCapacityPeriod,
  UpdateTeamCapacityPeriodsCommand,
} from "../../application/index.js";
import { parseExactQuantityInput } from "../../application/index.js";
import {
  capacityFromSerialized,
  createCivilDate,
  unavailabilityRatioFromSerialized,
  type Capacity,
  type CivilDate,
  type DomainError,
  type TeamId,
  type UnavailabilityRatio,
} from "../../domain/index.js";
import { percentageToSerializedRatio } from "../../application/session/exactPercentage.js";

export interface TeamEditFormValues {
  readonly teamId: TeamId;
  readonly name: string;
  readonly capacityPeriods: readonly TeamCapacityPeriodFormValues[];
}

export interface TeamCapacityPeriodFormValues {
  readonly index: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly capacity: string;
  readonly capacityExact: string;
  readonly capacityDirty: boolean;
  readonly unavailabilityPercent: string;
  readonly unavailabilityExact: string;
  readonly unavailabilityDirty: boolean;
}

export type TeamEditCommandParseResult =
  | Readonly<{ ok: true; command: UpdateTeamCapacityPeriodsCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parseTeamEditCommand(
  values: TeamEditFormValues,
): TeamEditCommandParseResult {
  const parsed = parseTeamCapacityPeriodRows(values.capacityPeriods);
  if (!parsed.ok) return parsed;
  return Object.freeze({
    ok: true,
    command: Object.freeze({
      kind: "update-team-capacity-periods",
      teamId: values.teamId,
      capacityPeriods: parsed.capacityPeriods,
    }),
  });
}

export function parseTeamCapacityPeriodRows(
  rows: readonly TeamCapacityPeriodFormValues[],
): Readonly<{ ok: true; capacityPeriods: readonly UpdateTeamCapacityPeriod[] }> |
  Readonly<{ ok: false; errors: readonly DomainError[] }> {
  const errors: DomainError[] = [];
  const capacityPeriods = rows.map((period) =>
    parsePeriod(period, errors),
  );
  if (
    errors.length > 0 ||
    capacityPeriods.some((period) => period === undefined)
  ) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }
  return Object.freeze({
    ok: true,
    capacityPeriods: Object.freeze(capacityPeriods as readonly UpdateTeamCapacityPeriod[]),
  });
}

function parsePeriod(
  values: TeamCapacityPeriodFormValues,
  errors: DomainError[],
): UpdateTeamCapacityPeriod | undefined {
  const path = `team.capacityPeriods[${values.index}]`;
  const startDate = parseDate(values.startDate, `${path}.startDate`, errors);
  const endDate = parseDate(values.endDate, `${path}.endDate`, errors);
  const capacity = parseCapacity(
    values.capacity,
    values.capacityExact,
    values.capacityDirty,
    `${path}.capacity`,
    errors,
  );
  const unavailability = parseUnavailabilityPercent(
    values.unavailabilityPercent,
    values.unavailabilityExact,
    values.unavailabilityDirty,
    `${path}.unavailability`,
    errors,
  );
  if (
    startDate === undefined ||
    endDate === undefined ||
    capacity === undefined ||
    unavailability === undefined
  ) {
    return undefined;
  }
  return Object.freeze({
    startDate,
    endDate,
    capacity,
    unavailability,
  });
}

function parseDate(
  raw: string,
  path: string,
  errors: DomainError[],
): CivilDate | undefined {
  const result = createCivilDate(raw.trim(), path);
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function parseCapacity(
  raw: string,
  originalExact: string,
  dirty: boolean,
  path: string,
  errors: DomainError[],
): Capacity | undefined {
  const result = dirty
    ? (() => {
        const serialized = parseExactQuantityInput(raw);
        return serialized === undefined
          ? undefined
          : capacityFromSerialized(serialized, path);
      })()
    : capacityFromSerialized(originalExact, path);
  if (result === undefined) {
    errors.push(
      error(
        "INVALID_EXACT_QUANTITY",
        path,
        "Value must be a finite decimal or rational fraction.",
      ),
    );
    return undefined;
  }
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function parseUnavailabilityPercent(
  raw: string,
  originalExact: string,
  dirty: boolean,
  path: string,
  errors: DomainError[],
): UnavailabilityRatio | undefined {
  const serializedRatio = dirty
    ? percentageToSerializedRatio(raw)
    : originalExact;
  if (serializedRatio === undefined) {
    errors.push(
      error(
        "INVALID_UNAVAILABILITY_PERCENT",
        path,
        "Unavailability must be an exact percentage from 0 to 100.",
      ),
    );
    return undefined;
  }
  const result = unavailabilityRatioFromSerialized(serializedRatio, path);
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
