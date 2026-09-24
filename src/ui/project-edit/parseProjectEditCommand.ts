import type {
  UpdateProjectCommand,
  UpdateProjectTeamRequirement,
} from "../../application/index.js";
import { parseExactQuantityInput } from "../../application/index.js";
import {
  createCivilDate,
  createProgramId,
  createPriorityFamilyId,
  dailyCapFromSerialized,
  remainingWorkloadFromSerialized,
  type CivilDate,
  type DailyCap,
  type DomainError,
  type DomainResult,
  type ProjectId,
  type RemainingWorkload,
  type TeamId,
} from "../../domain/index.js";

export interface ProjectEditFormValues {
  readonly projectId: ProjectId;
  readonly projectCount: number;
  readonly name: string;
  readonly programId: string;
  readonly priorityFamilyId: string;
  readonly priorityPosition: string;
  readonly earliestStartDate: string;
  readonly objectiveEndDate: string;
  readonly mandatoryDeadline: string;
  readonly requirements: readonly ProjectRequirementFormValues[];
}

export interface ProjectRequirementFormValues {
  readonly teamId: TeamId;
  readonly remainingWorkload: string;
  readonly remainingWorkloadExact: string;
  readonly remainingWorkloadDirty: boolean;
  readonly dailyCapExact?: string;
}

export type ProjectEditCommandParseResult =
  | Readonly<{ ok: true; command: UpdateProjectCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parseProjectEditCommand(
  values: ProjectEditFormValues,
): ProjectEditCommandParseResult {
  const errors: DomainError[] = [];
  const name = values.name.trim();
  const programId = parseOptionalId(values.programId, createProgramId, "project.programId", errors);
  const priorityFamilyId = parseOptionalId(values.priorityFamilyId, createPriorityFamilyId, "project.priorityFamilyId", errors);
  if (name.length === 0) {
    errors.push(
      error(
        "EMPTY_PROJECT_LABEL",
        "project.name",
        "Project label must not be empty.",
      ),
    );
  }
  const priorityPosition = parsePriority(
    values.priorityPosition,
    values.projectCount,
    errors,
  );
  const earliestStartDate = parseOptionalDate(
    values.earliestStartDate,
    "project.earliestStartDate",
    errors,
  );
  const objectiveEndDate = parseOptionalDate(
    values.objectiveEndDate,
    "project.objectiveEndDate",
    errors,
  );
  const mandatoryDeadline = parseOptionalDate(
    values.mandatoryDeadline,
    "project.mandatoryDeadline",
    errors,
  );
  const teamRequirements = values.requirements.map((requirement) =>
    parseRequirement(requirement, errors),
  );
  if (
    errors.length > 0 ||
    priorityPosition === undefined ||
    teamRequirements.some((requirement) => requirement === undefined)
  ) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }

  return Object.freeze({
    ok: true,
    command: Object.freeze({
      kind: "update-project",
      projectId: values.projectId,
      name,
      ...(programId === undefined ? {} : { programId }),
      ...(priorityFamilyId === undefined ? {} : { priorityFamilyId }),
      priorityPosition,
      ...(earliestStartDate === undefined ? {} : { earliestStartDate }),
      ...(objectiveEndDate === undefined ? {} : { objectiveEndDate }),
      ...(mandatoryDeadline === undefined ? {} : { mandatoryDeadline }),
      teamRequirements: Object.freeze(
        teamRequirements as readonly UpdateProjectTeamRequirement[],
      ),
    }),
  });
}

function parseOptionalId<T>(
  raw: string,
  create: (value: string, path: string) => DomainResult<T>,
  path: string,
  errors: DomainError[],
): T | undefined {
  if (raw === "") return undefined;
  const result = create(raw, path);
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function parsePriority(
  raw: string,
  projectCount: number,
  errors: DomainError[],
): number | undefined {
  const value = raw.trim();
  if (!/^[1-9]\d*$/.test(value)) {
    errors.push(
      error(
        "INVALID_PROJECT_PRIORITY",
        "project.priority",
        `Priority position must be an integer from 1 to ${projectCount}.`,
      ),
    );
    return undefined;
  }
  const priority = Number(value);
  if (!Number.isSafeInteger(priority) || priority > projectCount) {
    errors.push(
      error(
        "PROJECT_PRIORITY_OUT_OF_RANGE",
        "project.priority",
        `Priority position must be an integer from 1 to ${projectCount}.`,
      ),
    );
    return undefined;
  }
  return priority;
}

function parseOptionalDate(
  raw: string,
  path: string,
  errors: DomainError[],
): CivilDate | undefined {
  const value = raw.trim();
  if (value.length === 0) return undefined;
  const result = createCivilDate(value, path);
  if (!result.ok) {
    errors.push(...result.errors);
    return undefined;
  }
  return result.value;
}

function parseRequirement(
  values: ProjectRequirementFormValues,
  errors: DomainError[],
): UpdateProjectTeamRequirement | undefined {
  const path = `requirements.${values.teamId}`;
  const remainingWorkload = parseRemainingWorkload(
    values.remainingWorkload,
    values.remainingWorkloadExact,
    values.remainingWorkloadDirty,
    `${path}.remainingWorkload`,
    errors,
  );
  const dailyCap = parseDailyCapExact(
    values.dailyCapExact,
    `${path}.dailyCap`,
    errors,
  );
  if (remainingWorkload === undefined || dailyCap === "invalid") {
    return undefined;
  }
  return Object.freeze({
    teamId: values.teamId,
    remainingWorkload,
    ...(dailyCap === undefined ? {} : { dailyCap }),
  });
}

function parseRemainingWorkload(
  raw: string,
  originalExact: string,
  dirty: boolean,
  path: string,
  errors: DomainError[],
): RemainingWorkload | undefined {
  const result = dirty
    ? (() => {
        const serialized = parseExactQuantityInput(raw);
        return serialized === undefined
          ? undefined
          : remainingWorkloadFromSerialized(serialized, path);
      })()
    : remainingWorkloadFromSerialized(originalExact, path);
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

function parseDailyCapExact(
  serialized: string | undefined,
  path: string,
  errors: DomainError[],
): DailyCap | undefined | "invalid" {
  if (serialized === undefined) return undefined;
  const result = dailyCapFromSerialized(serialized, path);
  if (!result.ok) {
    errors.push(...result.errors);
    return "invalid";
  }
  return result.value;
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
