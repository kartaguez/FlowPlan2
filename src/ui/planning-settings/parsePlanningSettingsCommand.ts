import type { UpdatePlanningSettingsCommand } from "../../application/index.js";
import {
  compareCivilDates,
  createCivilDate,
  createWorkingPattern,
  type DomainError,
} from "../../domain/index.js";

export interface PlanningSettingsFormValues {
  readonly startDate: string;
  readonly endDate: string;
  readonly workingWeekdays: readonly number[];
  readonly maxParallelProjects: string;
}

export type PlanningSettingsParseResult =
  | Readonly<{ ok: true; command: UpdatePlanningSettingsCommand }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export function parsePlanningSettingsCommand(
  values: PlanningSettingsFormValues,
): PlanningSettingsParseResult {
  const errors: DomainError[] = [];
  const start = createCivilDate(values.startDate.trim(), "planning.startDate");
  const end = createCivilDate(values.endDate.trim(), "planning.endDate");
  if (!start.ok) errors.push(...start.errors);
  if (!end.ok) errors.push(...end.errors);
  if (start.ok && end.ok && compareCivilDates(start.value, end.value) > 0) {
    errors.push(
      error(
        "INVALID_PLANNING_HORIZON",
        "planning.endDate",
        "Planning end date must be on or after its start date.",
      ),
    );
  }
  const workingPattern = createWorkingPattern({
    workingWeekdays: values.workingWeekdays,
  });
  if (!workingPattern.ok) errors.push(...workingPattern.errors);
  if (workingPattern.ok && workingPattern.value.workingWeekdays.length === 0) {
    errors.push(error("EMPTY_WORKING_WEEK", "planning.workingWeekdays", "At least one working weekday is required."));
  }
  const parallel = values.maxParallelProjects.trim();
  let maxParallelProjects: number | undefined;
  if (/^[1-9]\d*$/.test(parallel)) {
    const parsed = Number(parallel);
    if (Number.isSafeInteger(parsed)) maxParallelProjects = parsed;
  }
  if (maxParallelProjects === undefined) {
    errors.push(error("INVALID_MAX_PARALLEL_PROJECTS", "planning.maxParallelProjects", "Maximum parallel projects must be a positive safe integer."));
  }
  if (!start.ok || !end.ok || !workingPattern.ok || maxParallelProjects === undefined || errors.length > 0) {
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }
  return Object.freeze({
    ok: true,
    command: Object.freeze({
      kind: "update-planning-settings",
      startDate: start.value,
      endDate: end.value,
      workingPattern: workingPattern.value,
      maxParallelProjects,
    }),
  });
}

function error(code: string, path: string, message: string): DomainError {
  return Object.freeze({ code, path, message });
}
