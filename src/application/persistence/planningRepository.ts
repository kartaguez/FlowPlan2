import type { PlanningSessionState } from "../session/planningSession.js";
import type { PlanningBackupDataset } from "../backup/planningBackupDataset.js";
import type { PlanningInputsDto } from "../backup/planningInputCodec.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { HistoricalIdentities } from "./historicalIdentities.js";

export interface RepositoryToken {
  readonly generation: string;
  readonly revision: number;
  readonly currentRevision: number;
  readonly historyRevision: number;
}
export interface SnapshotMetadata {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly inputsSchemaVersion: number;
  readonly forecastSchemaVersion: number;
  readonly horizon: Readonly<{ from: string; through: string }>;
  readonly bytes: number;
  readonly digest: string;
}
export interface CurrentRecord {
  readonly state: PlanningSessionState;
  readonly token: RepositoryToken;
  readonly identities: HistoricalIdentities;
  readonly snapshotCount: number;
}
export interface RepositoryInfo {
  readonly token: RepositoryToken | null;
  readonly snapshotCount: number;
  readonly legacySourceFingerprintAtMigration: string | null;
  readonly acknowledgedLegacyFingerprint: string | null;
}
export interface StagedImport { readonly generation: string; readonly digest: string }
export interface SnapshotPage {
  readonly items: readonly SnapshotMetadata[];
  readonly next: Readonly<{ createdAt: string; snapshotId: string }> | null;
}
export type PersistenceErrorCode = "CONFLICT" | "NOT_FOUND" | "QUOTA" | "CORRUPT" | "UNAVAILABLE" | "BLOCKED" | "INVALID" | "LEGACY_CONFLICT";
export class PersistenceError extends Error {
  constructor(readonly code: PersistenceErrorCode, message: string, options?: ErrorOptions) { super(message, options); this.name = "PersistenceError"; }
}
export function sameToken(a: RepositoryToken | null, b: RepositoryToken | null): boolean {
  return a === null ? b === null : b !== null && a.generation === b.generation && a.revision === b.revision && a.currentRevision === b.currentRevision && a.historyRevision === b.historyRevision;
}
/** Application port: no browser, UI, physical database or remote transport types. */
export interface PlanningRepository {
  readonly readInfo: () => Promise<RepositoryInfo>;
  readonly readCurrent: () => Promise<CurrentRecord>;
  readonly readLegacySource: () => Promise<string | null>;
  readonly writeCurrent: (current: PlanningInputsDto, expected: RepositoryToken, operationId: string) => Promise<RepositoryToken>;
  readonly listSnapshotMetadata: (token: RepositoryToken, after?: SnapshotPage["next"], limit?: number) => Promise<SnapshotPage>;
  readonly readSnapshot: (id: string, token: RepositoryToken) => Promise<PortfolioSnapshot>;
  readonly createSnapshot: (snapshot: PortfolioSnapshot, capturedCurrentRevision: number, expected: RepositoryToken, operationId: string) => Promise<RepositoryToken>;
  readonly deleteSnapshot: (id: string, expected: RepositoryToken, operationId: string) => Promise<RepositoryToken>;
  readonly inspectPortableDocument: (document: string) => Promise<Readonly<{ current: PlanningSessionState; repairs: readonly string[] }>>;
  readonly stagePortableDocument: (document: string, stageId: string) => Promise<StagedImport>;
  readonly stageImport: (dataset: PlanningBackupDataset, stageId: string) => Promise<StagedImport>;
  readonly activateImport: (stage: StagedImport, expected: RepositoryToken | null, operationId: string, legacy?: Readonly<{ fingerprint: string; document: string | null }>) => Promise<RepositoryToken>;
  readonly listUnfinishedStages: () => Promise<readonly StagedImport[]>;
  readonly discardStage: (stage: StagedImport) => Promise<void>;
  readonly acknowledgeLegacy: (fingerprint: string, document: string | null, expected: RepositoryToken) => Promise<void>;
  readonly fingerprint: (document: string | null) => Promise<string>;
  readonly close: () => void;
}
