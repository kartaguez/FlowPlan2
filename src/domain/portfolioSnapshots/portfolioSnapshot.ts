import { createCivilDate, type CivilDate } from "../model/date.js";
import type { Portfolio, Project } from "../model/entities.js";
import { addRationals, rationalFromInteger, rationalToCanonicalString } from "../model/rational.js";
import { consumedWorkloadFromSerialized, rationalOf, serializeQuantity } from "../model/scalars.js";

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue | undefined };
export type ActualsSource = Readonly<{ kind: "project" | "reservation"; objectId: string }> & (
  Readonly<{ source: "none" | "legacy-v4" }> | Readonly<{ source: "snapshot"; snapshotId: string }>);
export interface HistoricalProjectForecast {
  readonly projectId: string;
  readonly actuals: string;
  readonly actualsKnowledge: "none" | "uncovered" | "covered" | "legacy-v4";
  readonly raf: string;
  readonly eac: string;
  readonly priorityPosition: number;
  readonly estimatedStartDate: CivilDate | null;
  readonly startAbsenceReason: "no-activity" | null;
  readonly estimatedEndDate: CivilDate | null;
  readonly endAbsenceReason: "inactive" | "incomplete-within-horizon" | "no-allocation" | null;
}
export interface PortfolioSnapshot {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly inputsSchemaVersion: 1;
  readonly inputs: JsonValue;
  readonly actualsSources: readonly ActualsSource[];
  readonly forecast: Readonly<{ forecastSchemaVersion: 1; engineVersion: string; projects: readonly HistoricalProjectForecast[] }>;
}

/** No cursor or horizon clipping: totals are complete object knowledge. */
export function projectExactTotals(project: Project) {
  const current = project.snapshots?.at(-1);
  const legacy = project.legacyV4Actuals ?? project.actuals;
  let actual = rationalFromInteger(0n);
  const actualsKnowledge = current ? current.coverage ? "covered" : "uncovered" : legacy ? "legacy-v4" : "none";
  if (current) {
    for (const period of current.coverage?.periods ?? []) for (const row of period.consumed) actual = addRationals(actual, rationalOf(row.amount));
  } else if (legacy) {
    const latest = new Map<string, ReturnType<typeof rationalOf>>();
    for (const record of legacy.records) for (const row of record.teams) latest.set(row.teamId, rationalOf(row.cumulativeConsumed));
    for (const amount of latest.values()) actual = addRationals(actual, amount);
  }
  const raf = project.requirements.reduce((sum, row) => addRationals(sum, rationalOf(row.remainingWorkload)), rationalFromInteger(0n));
  return { actuals: rationalToCanonicalString(actual), actualsKnowledge, raf: rationalToCanonicalString(raf), eac: rationalToCanonicalString(addRationals(actual, raf)) } as const;
}

export function assertCanonicalTimestamp(value: unknown): asserts value is string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError("Timestamp must be canonical UTC ISO.");
}
export function assertSnapshotId(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\u0000-\u001f]/.test(value)) throw new TypeError("Invalid snapshotId.");
}
export function immutableCopy<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(immutableCopy)) as T;
  if (value !== null && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, immutableCopy(item)]))) as T;
  return value;
}
function fields(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) throw new TypeError("Invalid Portfolio Snapshot structure.");
}
function civil(value: unknown) {
  if (typeof value !== "string" || !createCivilDate(value).ok) throw new TypeError("Invalid historical date.");
}

/** Inputs are validated separately through the shared boundary, never by the engine. */
export function createPortfolioSnapshot(value: unknown, historicalPortfolio: Portfolio): PortfolioSnapshot {
  fields(value, ["snapshotId", "createdAt", "inputsSchemaVersion", "inputs", "actualsSources", "forecast"]);
  assertSnapshotId(value.snapshotId); assertCanonicalTimestamp(value.createdAt);
  if (value.inputsSchemaVersion !== 1) throw new TypeError("Unknown inputs schema.");
  if (!Array.isArray(value.actualsSources)) throw new TypeError("Invalid Actuals sources.");
  const owners = [...historicalPortfolio.projects.map((p) => ({ kind: "project", object: p })), ...historicalPortfolio.reservations.map((r) => ({ kind: "reservation", object: r }))];
  if (owners.length !== value.actualsSources.length) throw new TypeError("Missing Actuals source.");
  const seen = new Set<string>();
  for (const source of value.actualsSources) {
    fields(source, ["kind", "objectId", "source", ...(source?.source === "snapshot" ? ["snapshotId"] : [])]);
    const key = `${source.kind}:${source.objectId}`;
    const owner = owners.find((o) => o.kind === source.kind && o.object.id === source.objectId);
    if (!owner || seen.has(key)) throw new TypeError("Unknown/duplicate Actuals owner.");
    seen.add(key);
    const current = owner.object.snapshots?.at(-1);
    const legacy = owner.object.legacyV4Actuals ?? owner.object.actuals;
    if (source.source !== (current ? "snapshot" : legacy ? "legacy-v4" : "none") || (current && source.snapshotId !== current.snapshotId)) throw new TypeError("Actuals source mismatch.");
  }
  fields(value.forecast, ["forecastSchemaVersion", "engineVersion", "projects"]);
  if (value.forecast.forecastSchemaVersion !== 1 || typeof value.forecast.engineVersion !== "string" || !value.forecast.engineVersion.trim() || !Array.isArray(value.forecast.projects)) throw new TypeError("Unknown forecast schema/engine.");
  if (value.forecast.projects.length !== historicalPortfolio.projects.length) throw new TypeError("Forecast Project count mismatch.");
  const projectIds = new Set<string>();
  for (const row of value.forecast.projects) {
    fields(row, ["projectId", "actuals", "actualsKnowledge", "raf", "eac", "priorityPosition", "estimatedStartDate", "startAbsenceReason", "estimatedEndDate", "endAbsenceReason"]);
    const project = historicalPortfolio.projects.find((p) => p.id === row.projectId);
    if (!project || projectIds.has(project.id)) throw new TypeError("Unknown/duplicate forecast Project.");
    projectIds.add(project.id);
    for (const key of ["actuals", "raf", "eac"] as const) {
      const q = typeof row[key] === "string" ? consumedWorkloadFromSerialized(row[key]) : undefined;
      if (!q?.ok || serializeQuantity(q.value) !== row[key]) throw new TypeError(`Invalid exact ${key}.`);
    }
    const totals = projectExactTotals(project);
    if (Object.entries(totals).some(([k, v]) => row[k] !== v)) throw new TypeError("Historical totals mismatch.");
    if (row.priorityPosition !== historicalPortfolio.priorityOrder.indexOf(project.id) + 1) throw new TypeError("Historical priority mismatch.");
    if (row.estimatedStartDate === null) {
      if (row.startAbsenceReason !== "no-activity") throw new TypeError("Missing start reason.");
    } else { civil(row.estimatedStartDate); if (row.startAbsenceReason !== null) throw new TypeError("Unexpected start reason."); }
    if (row.estimatedEndDate === null) {
      if (!(project.isActive ? ["incomplete-within-horizon", "no-allocation"] : ["inactive"]).includes(row.endAbsenceReason as string)) throw new TypeError("Invalid end reason.");
    } else { civil(row.estimatedEndDate); if (!project.isActive || row.endAbsenceReason !== null) throw new TypeError("Unexpected end date/reason."); }
    if (row.estimatedStartDate !== null && row.estimatedEndDate !== null && String(row.estimatedStartDate) > String(row.estimatedEndDate)) throw new TypeError("End precedes activity.");
  }
  return immutableCopy(value) as unknown as PortfolioSnapshot;
}
export function comparePortfolioSnapshots(a: PortfolioSnapshot, b: PortfolioSnapshot): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.snapshotId < b.snapshotId ? -1 : a.snapshotId > b.snapshotId ? 1 : 0;
}
