import { serializeQuantity, type Project, type TeamId } from "../../domain/index.js";

/** Immutable opening knowledge in RAM; never persisted as a version counter. */
export interface ProjectCurrentBase {
  readonly projectId: Project["id"];
  readonly source: string;
  readonly requirements: readonly Readonly<{ teamId: TeamId; raf: string; dailyCap: string | null }>[];
}
export function projectCurrentBase(project: Project): ProjectCurrentBase {
  const snapshot = project.snapshots?.at(-1), legacy = project.legacyV4Actuals ?? project.actuals;
  const source = snapshot ? JSON.stringify(["snapshot", snapshot.snapshotId, snapshot.version]) : legacy ? JSON.stringify(["legacy-v4", legacy.actualsFromDate,
    legacy.records.map(record => [record.actualsThroughDate, record.teams.map(row => [row.teamId, serializeQuantity(row.cumulativeConsumed), serializeQuantity(row.remainingWorkload)])]), project.legacyV4RafAuthority?.map(row => [row.teamId, row.authority]) ?? project.requirements.map(row => [row.teamId, row.rafAuthority ?? "current-configuration"])]) : "none";
  return Object.freeze({ projectId: project.id, source,
    requirements: Object.freeze(project.requirements.map(row => Object.freeze({ teamId: row.teamId, raf: serializeQuantity(row.remainingWorkload), dailyCap: row.dailyCap === undefined ? null : serializeQuantity(row.dailyCap) }))) });
}
export function validateProjectCurrentBase(project: Project, base: ProjectCurrentBase | undefined, targeted?: readonly TeamId[]) {
  const current = projectCurrentBase(project);
  const error = (code: string, path: string, message: string) => ({ code, path, message });
  if (!base || base.projectId !== project.id || !Array.isArray(base.requirements)) return [error("MISSING_PROJECT_BASE", "base", "An immutable published Project base is required.")];
  if (base.source !== current.source) return [error("STALE_PROJECT_SOURCE", "base.source", "Actuals source changed; review the draft.")];
  if (base.requirements.length !== current.requirements.length || base.requirements.some((row, i) => row.teamId !== current.requirements[i]?.teamId)) return [error("STALE_PROJECT_MEMBERSHIP", "base.requirements", "Project membership changed; review the draft.")];
  return current.requirements.flatMap((row, i) => {
    if (targeted && !targeted.includes(row.teamId)) return [];
    if (row.raf !== base.requirements[i]?.raf) return [error("STALE_CURRENT_RAF", `base.${row.teamId}`, "Current RAF changed; review the draft and renew its confirmation.")];
    if (!targeted && row.dailyCap !== base.requirements[i]?.dailyCap) return [error("STALE_PROJECT_PARAMETERS", `base.${row.teamId}`, "Forecast parameters changed; review the draft.")];
    return [];
  });
}
