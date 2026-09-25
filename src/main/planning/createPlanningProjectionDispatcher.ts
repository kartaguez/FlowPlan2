import type { PlanningCommand, PlanningSession } from "../../application/index.js";
import type { TimelineGeometryViewport } from "../../adapters/index.js";
import type { DomainError } from "../../domain/index.js";
import type { PlanningBackupStore } from "../../infrastructure/backup/localPlanningBackup.js";
import { encodeFlowplanBackupV1 } from "../../application/backup/flowplanBackupV1.js";
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
  readonly backupStore?: PlanningBackupStore;
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
      const previousState = input.session.getState();
      let candidateProjection: PlanningSessionProjection | undefined;
      const result = input.session.dispatch(command, (candidate) => {
        candidateProjection = buildProjection({ state: candidate, geometryViewport: input.geometryViewport });
        input.backupStore?.write(encodeFlowplanBackupV1(candidate));
      });
      if (!result.ok) return result;
      if (result.state === previousState) return Object.freeze({ ok: true, projection });
      projection = candidateProjection!;
      return Object.freeze({ ok: true, projection });
    },
  });
}
