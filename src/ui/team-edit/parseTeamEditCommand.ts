import type {
  UpdateTeamCapacityPeriod,
  UpdateTeamCommand,
} from "../../application/index.js";
import {
  capacityFromSerialized,
  createCapacity,
  createCivilDate,
  createWorkingPattern,
  unavailabilityRatioFromSerialized,
  type Capacity,
  type CivilDate,
  type DomainError,
  type TeamId,
  type UnavailabilityRatio,
} from "../../domain/index.js";

export interface TeamEditFormValues {
  readonly teamId: TeamId;
  readonly name: string;
  readonly maxParallelProjects: string;
  readonly workingWeekdays: readonly number[];
  readonly capacityPeriods: readonly TeamCapacityPeriodFormValues[];
}

export interface TeamCapacityPeriodFormValues {
  readonly index: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly capacity: string;
  readonly unavailabilityPercent: string;
}

export type TeamEditCommandParseResult =
  | Readonly<{ ok: true; command: UpdateTeamCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parseTeamEditCommand(
  values: TeamEditFormValues,
): TeamEditCommandParseResult {
  const errors: DomainError[] = [];
  const name = values.name.trim();
  if (name.length === 0) {
    errors.push(error("EMPTY_TEAM_NAME", "team.name", "Team name must not be empty."));
  }
  const maxParallelProjects = parsePositiveInteger(
    values.maxParallelProjects,
    "team.maxParallelProjects",
    errors,
  );
  const workingPattern = createWorkingPattern({
    workingWeekdays: values.workingWeekdays,
  });
  if (!workingPattern.ok) {
    errors.push(
      ...workingPattern.errors.map((entry) =>
        Object.freeze({
          ...entry,
          path: `team.workingPattern.${entry.path}`,
        }),
      ),
    );
  }
  const capacityPeriods = values.capacityPeriods.map((period) =>
    parsePeriod(period, errors),
  );
  if (
    errors.length > 0 ||
    maxParallelProjects === undefined ||
    !workingPattern.ok ||
    capacityPeriods.some((period) => period === undefined)
  ) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }
  return Object.freeze({
    ok: true,
    command: Object.freeze({
      kind: "update-team",
      teamId: values.teamId,
      name,
      maxParallelProjects,
      workingPattern: workingPattern.value,
      capacityPeriods: Object.freeze(
        capacityPeriods as readonly UpdateTeamCapacityPeriod[],
      ),
    }),
  });
}

function parsePositiveInteger(
  raw: string,
  path: string,
  errors: DomainError[],
): number | undefined {
  const value = raw.trim();
  if (!/^[1-9]\d*$/.test(value)) {
    errors.push(
      error(
        "INVALID_MAX_PARALLEL_PROJECTS",
        path,
        "Maximum parallel projects must be a positive integer.",
      ),
    );
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    errors.push(
      error(
        "INVALID_MAX_PARALLEL_PROJECTS",
        path,
        "Maximum parallel projects must be a safe positive integer.",
      ),
    );
    return undefined;
  }
  return parsed;
}

function parsePeriod(
  values: TeamCapacityPeriodFormValues,
  errors: DomainError[],
): UpdateTeamCapacityPeriod | undefined {
  const path = `team.capacityPeriods[${values.index}]`;
  const startDate = parseDate(values.startDate, `${path}.startDate`, errors);
  const endDate = parseDate(values.endDate, `${path}.endDate`, errors);
  const capacity = parseCapacity(values.capacity, `${path}.capacity`, errors);
  const unavailability = parseUnavailabilityPercent(
    values.unavailabilityPercent,
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
  path: string,
  errors: DomainError[],
): Capacity | undefined {
  const value = raw.trim();
  const result = value.includes("/")
    ? capacityFromSerialized(value, path)
    : createCapacity(value, path);
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function parseUnavailabilityPercent(
  raw: string,
  path: string,
  errors: DomainError[],
): UnavailabilityRatio | undefined {
  const serializedRatio = percentToSerializedRatio(raw.trim());
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

function percentToSerializedRatio(value: string): string | undefined {
  const fraction = /^([+-]?\d+)\/([1-9]\d*)$/.exec(value);
  if (fraction) {
    return `${fraction[1]}/${BigInt(fraction[2]!) * 100n}`;
  }
  const decimal = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!decimal) return undefined;
  const fractionDigits = decimal[3] ?? "";
  const numerator = BigInt(`${decimal[2]}${fractionDigits}`);
  const signedNumerator = decimal[1] === "-" ? -numerator : numerator;
  const denominator = 10n ** BigInt(fractionDigits.length) * 100n;
  return `${signedNumerator}/${denominator}`;
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
