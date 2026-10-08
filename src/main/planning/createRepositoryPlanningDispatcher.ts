import { encodePlanningInputs } from "../../application/backup/planningInputCodec.js";
import type { PlanningSession, PlanningCommand } from "../../application/session/planningSession.js";
import { capturePortfolioSnapshot } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import { PersistenceError, type PlanningRepository, type CurrentRecord } from "../../application/persistence/planningRepository.js";
import { buildPlanningSessionProjection, type PlanningSessionProjection } from "./buildPlanningSessionProjection.js";
import type { TimelineGeometryViewport } from "../../adapters/index.js";
import type { PlanningProjectionDispatchResult } from "./planningProjectionDispatchResult.js";

/** Async commit boundary: candidate and run remain private until repository commit completes. */
export function createRepositoryPlanningDispatcher(input: {
  repository: PlanningRepository; current: CurrentRecord; session: PlanningSession;
  geometryViewport: TimelineGeometryViewport; hasUnappliedChanges: () => boolean;
  beforeMutation?: () => Promise<void>; pending?: (value: boolean) => void;
  buildProjection?: typeof buildPlanningSessionProjection; now?: () => string; operationId?: () => string;
}) {
  const build = input.buildProjection ?? buildPlanningSessionProjection;
  let record = input.current, projectionState = input.session.getState();
  input.session.setHistoricalIdentities(record.identities);
  let projection: PlanningSessionProjection = build({ state: projectionState, geometryViewport: input.geometryViewport });
  let running = false;
  const error = (cause: unknown): PlanningProjectionDispatchResult => ({ ok: false, errors: [{ code: cause instanceof PersistenceError ? cause.code : "COMMIT_FAILED", path: "planning",
    message: cause instanceof Error ? cause.message : "Planning could not be saved; applied data and drafts were preserved." }] });
  const run = async (work: () => Promise<PlanningProjectionDispatchResult>): Promise<PlanningProjectionDispatchResult> => {
    if (running) return error(new PersistenceError("CONFLICT", "A planning operation is already in progress."));
    running = true; input.pending?.(true);
    try { await input.beforeMutation?.(); return await work(); }
    catch (cause) { return error(cause); }
    finally { running = false; input.pending?.(false); }
  };
  const id = () => (input.operationId ?? (() => crypto.randomUUID()))();
  return {
    getProjection: () => projection,
    getToken: () => record.token,
    isPending: () => running,
    dispatch: (command: PlanningCommand) => run(async () => {
      const previous = input.session.getState(), candidate = input.session.prepare(command);
      if (!candidate.ok) return candidate;
      if (candidate.state === previous) return { ok: true, projection } as const;
      const nextProjection = build({ state: candidate.state, geometryViewport: input.geometryViewport });
      const nextToken = await input.repository.writeCurrent(encodePlanningInputs(candidate.state), record.token, id());
      const result = input.session.publish(previous, candidate.state, command);
      if (!result.ok) throw new PersistenceError("CONFLICT", "Committed planning requires reload; the local session changed unexpectedly.");
      record = { ...record, state: result.state, token: nextToken }; projection = nextProjection; projectionState = result.state;
      return { ok: true, projection } as const;
    }),
    savePortfolioSnapshot: (): Promise<PlanningProjectionDispatchResult> => {
      if (input.hasUnappliedChanges()) return Promise.resolve(error(new PersistenceError("INVALID", "Apply or cancel all unapplied changes before saving.")));
      if (projectionState !== input.session.getState()) return Promise.resolve(error(new PersistenceError("CONFLICT", "Applied state and published run differ.")));
      const operationId = id(), createdAt = (input.now ?? (() => new Date().toISOString()))();
      let snapshot;
      try { snapshot = capturePortfolioSnapshot(projectionState, projection.planningResult, projection.actualsReconstruction, operationId, createdAt); }
      catch (cause) { return Promise.resolve(error(cause)); }
      const capturedRevision = record.token.currentRevision, expected = record.token;
      return run(async () => {
        if (input.hasUnappliedChanges() || projectionState !== input.session.getState()) throw new PersistenceError("CONFLICT", "Planning changed before snapshot commit.");
        const next = await input.repository.createSnapshot(snapshot, capturedRevision, expected, operationId);
        const current = await input.repository.readCurrent();
        // A foreign commit after ours is detected instead of rebasing dirty UI silently.
        if (current.token.revision !== next.revision) throw new PersistenceError("CONFLICT", "Snapshot was committed, but another tab changed the planning. Reload before continuing.");
        record = current; input.session.setHistoricalIdentities(current.identities);
        return { ok: true, projection } as const;
      });
    },
    deletePortfolioSnapshot: (snapshotId: string) => run(async () => {
      const next = await input.repository.deleteSnapshot(snapshotId, record.token, id());
      const current = await input.repository.readCurrent();
      if (current.token.revision !== next.revision) throw new PersistenceError("CONFLICT", "Deletion was committed, but another tab changed planning. Reload before continuing.");
      record = current; input.session.setHistoricalIdentities(current.identities);
      return { ok: true, projection } as const;
    }),
  };
}
