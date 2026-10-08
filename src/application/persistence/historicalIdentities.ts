import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { PlanningInputsDto } from "../backup/planningInputCodec.js";

export const IDENTITY_KINDS = ["teams", "projects", "reservations", "programs", "priorityFamilies"] as const;
export type IdentityKind = typeof IDENTITY_KINDS[number];
export type HistoricalIdentities = Readonly<Record<IdentityKind, readonly string[]>>;
export function emptyHistoricalIdentities(): HistoricalIdentities {
  return Object.freeze(Object.fromEntries(IDENTITY_KINDS.map(kind => [kind, Object.freeze([])]))) as unknown as HistoricalIdentities;
}
export function snapshotIdentities(snapshot: PortfolioSnapshot): HistoricalIdentities {
  const portfolio = (snapshot.inputs as unknown as PlanningInputsDto).portfolio;
  return Object.freeze(Object.fromEntries(IDENTITY_KINDS.map(kind => [kind,
    Object.freeze(portfolio[kind].map(object => String(object.id)))]))) as unknown as HistoricalIdentities;
}
export function historicalIdentities(snapshots: readonly PortfolioSnapshot[]): HistoricalIdentities {
  const refs = snapshots.map(snapshotIdentities);
  return Object.freeze(Object.fromEntries(IDENTITY_KINDS.map(kind => [kind,
    Object.freeze([...new Set(refs.flatMap(ref => ref[kind]))]) ]))) as unknown as HistoricalIdentities;
}
