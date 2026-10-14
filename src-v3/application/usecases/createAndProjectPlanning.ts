import { allocate, type Projection } from "../../domain/allocate.js";
import { createPlanning, type Planning, type PlanningInput, type ValidationError } from "../../domain/planning.js";

export type ProjectPlanningResult =
  | { readonly ok: true; readonly planning: Planning; readonly projection: Projection }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export function createAndProjectPlanning(input: PlanningInput): ProjectPlanningResult {
  const result = createPlanning(input);
  if (!result.ok) return result;
  return { ok: true, planning: result.planning, projection: allocate(result.planning) };
}
