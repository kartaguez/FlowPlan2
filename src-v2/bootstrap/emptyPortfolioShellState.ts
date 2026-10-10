/** Shell-only DTO. No Domain entity, Current manifest or persistence contract. */
export interface EmptyPortfolioShellState {
  readonly kind: "empty";
  readonly teams: readonly never[];
  readonly projects: readonly never[];
  readonly reservations: readonly never[];
  readonly snapshots: readonly never[];
}
export function createEmptyPortfolioShellState(): EmptyPortfolioShellState {
  return Object.freeze({
    kind: "empty",
    teams: Object.freeze([]),
    projects: Object.freeze([]),
    reservations: Object.freeze([]),
    snapshots: Object.freeze([]),
  });
}
