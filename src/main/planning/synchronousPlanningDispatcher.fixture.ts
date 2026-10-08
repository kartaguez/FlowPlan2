import type { PlanningProjectionDispatchResult } from "./planningProjectionDispatchResult.js";
import { immutableCopy } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import { historicalIdentities } from "../../application/persistence/historicalIdentities.js";
import { capturePortfolioSnapshot } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import { assertSnapshotId, type PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { PlanningCommand, PlanningSession } from "../../application/index.js";
import type { TimelineGeometryViewport } from "../../adapters/index.js";
import type { PlanningBackupStore } from "../../infrastructure/backup/localPlanningBackup.js";
import { encodeFlowplanBackupV7 } from "../../application/backup/flowplanBackupV1.js";
import {
  buildPlanningSessionProjection,
  type BuildPlanningSessionProjectionInput,
  type PlanningSessionProjection,
} from "./buildPlanningSessionProjection.js";

export interface PlanningProjectionDispatcher {
  readonly savePortfolioSnapshot: () => PlanningProjectionDispatchResult;
  readonly deletePortfolioSnapshot: (snapshotId: string) => PlanningProjectionDispatchResult;
  readonly getPortfolioSnapshots: () => readonly PortfolioSnapshot[];
  readonly getProjection: () => PlanningSessionProjection;
  readonly dispatch: (
    command: PlanningCommand,
  ) => PlanningProjectionDispatchResult;
}

export interface CreatePlanningProjectionDispatcherInput {
  readonly session: PlanningSession;
  readonly initialSnapshots?: readonly PortfolioSnapshot[] | undefined;
  readonly hasUnappliedChanges?: () => boolean;
  readonly now?: () => string;
  readonly snapshotId?: () => string;
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
  let snapshots = immutableCopy(input.initialSnapshots ?? []);
  input.session.setHistoricalIdentities(historicalIdentities(snapshots));
  let projectionState = input.session.getState();
  let projection = buildProjection({
    state: input.session.getState(),
    geometryViewport: input.geometryViewport,
  });

  const historyError = (cause: unknown): PlanningProjectionDispatchResult => ({ ok: false, errors: [{ code: "PORTFOLIO_SNAPSHOT_FAILED", path: "portfolioSnapshots", message: cause instanceof Error ? cause.message : "Portfolio snapshot failed." }] });
  const commitHistory = (next: readonly PortfolioSnapshot[]): PlanningProjectionDispatchResult => {
    try { input.backupStore?.write(encodeFlowplanBackupV7({ ...input.session.getState(), portfolioSnapshots: next })); }
    catch { return { ok: false, errors: [{ code: "COMMIT_FAILED", path: "portfolioSnapshots", message: "Portfolio history could not be saved." }] }; }
    snapshots = next;
    input.session.setHistoricalIdentities(historicalIdentities(next));
    return Object.freeze({ ok: true, projection });
  };
  return Object.freeze({
    getPortfolioSnapshots: () => snapshots,
    savePortfolioSnapshot: (): PlanningProjectionDispatchResult => {
      try {
        if (!input.hasUnappliedChanges || input.hasUnappliedChanges()) throw new TypeError("Apply or cancel all unapplied changes before saving.");
        const state = input.session.getState();
        if (state !== projectionState) throw new TypeError("Applied state and published projection differ.");
        const createdAt = (input.now ?? (() => new Date().toISOString()))();
        const snapshotId = (input.snapshotId ?? (() => crypto.randomUUID()))();
        if (snapshots.some((s) => s.snapshotId === snapshotId)) throw new TypeError("Duplicate Portfolio snapshotId.");
        const snapshot = capturePortfolioSnapshot(state, projection.planningResult, projection.actualsReconstruction, snapshotId, createdAt);
        return commitHistory([...snapshots, snapshot]);
      } catch (cause) { return historyError(cause); }
    },
    deletePortfolioSnapshot: (snapshotId: string): PlanningProjectionDispatchResult => {
      try {
        assertSnapshotId(snapshotId);
        if (!snapshots.some((s) => s.snapshotId === snapshotId)) throw new TypeError("Unknown Portfolio snapshotId.");
        return commitHistory(snapshots.filter((s) => s.snapshotId !== snapshotId));
      } catch (cause) { return historyError(cause); }
    },
    getProjection: () => projection,
    dispatch: (command: PlanningCommand): PlanningProjectionDispatchResult => {
      const previousState = input.session.getState();
      let candidateProjection: PlanningSessionProjection | undefined;
      const result = input.session.dispatch(command, (candidate) => {
        candidateProjection = buildProjection({ state: candidate, geometryViewport: input.geometryViewport });
        input.backupStore?.write(encodeFlowplanBackupV7({ ...candidate, portfolioSnapshots: snapshots }));
      });
      if (!result.ok) return result;
      if (result.state === previousState) return Object.freeze({ ok: true, projection });
      projection = candidateProjection!;
      projectionState = result.state;
      return Object.freeze({ ok: true, projection });
    },
  });
}
