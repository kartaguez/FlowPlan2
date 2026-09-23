import type { PlanningCommand, PlanningSession } from "../../application/index.js";
import type { TimelineGeometryViewport } from "../../adapters/index.js";
import type { DomainError } from "../../domain/index.js";
import {
  buildPlanningSessionProjection,
  type BuildPlanningSessionProjectionInput,
  type PlanningSessionProjection,
} from "./buildPlanningSessionProjection.js";

export interface PlanningProjectionDispatcher {
  readonly getProjection: () => PlanningSessionProjection;
  readonly dispatch: (
    command: PlanningCommand,
  ) => PlanningProjectionDispatchResult;
}

export type PlanningProjectionDispatchResult =
  | Readonly<{ ok: true; projection: PlanningSessionProjection }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface CreatePlanningProjectionDispatcherInput {
  readonly session: PlanningSession;
  readonly geometryViewport: TimelineGeometryViewport;
  readonly buildProjection?: (
    input: BuildPlanningSessionProjectionInput,
  ) => PlanningSessionProjection;
}

export function createPlanningProjectionDispatcher(
  input: CreatePlanningProjectionDispatcherInput,
): PlanningProjectionDispatcher {
  const buildProjection =
    input.buildProjection ?? buildPlanningSessionProjection;
  let projection = buildProjection({
    state: input.session.getState(),
    geometryViewport: input.geometryViewport,
  });

  return Object.freeze({
    getProjection: () => projection,
    dispatch: (command: PlanningCommand): PlanningProjectionDispatchResult => {
      const result = input.session.dispatch(command);
      if (!result.ok) return result;
      projection = buildProjection({
        state: result.state,
        geometryViewport: input.geometryViewport,
      });
      return Object.freeze({ ok: true, projection });
    },
  });
}
