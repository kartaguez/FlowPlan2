import type { DomainError } from "../../domain/index.js";
import type { PlanningSessionProjection } from "./buildPlanningSessionProjection.js";

export type PlanningProjectionDispatchResult =
  | Readonly<{ ok: true; projection: PlanningSessionProjection }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;
