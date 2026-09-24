import type { TeamId } from "../../domain/index.js";
import type { CursorCapacityMetrics } from "../../adapters/index.js";
import type { CursorTeamMetricsViewModel } from "./buildCursorMetricsViewModel.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";

export function renderCursorTeamMetrics(
  containers: ReadonlyMap<TeamId, HTMLElement>,
  teams: readonly CursorTeamMetricsViewModel[],
): void {
  for (const team of teams) {
    const container = containers.get(team.teamId);
    if (!container) throw new TypeError(`Missing metrics container for Team ${team.teamId}.`);
    renderCursorCapacityMetrics(container, team);
  }
}

export function renderCursorCapacityMetrics(container: HTMLElement, metrics: CursorCapacityMetrics): void {
  const document = container.ownerDocument;
  const values: readonly (readonly [string, string])[] = [
    ["Capacity", formatCursorMd(metrics.effectiveCapacity)],
    ["Occupied", formatCursorMd(metrics.occupiedCapacity)],
    ["Occupancy", formatCursorPercent(metrics.utilization)],
    ["Over-reservation", formatCursorPercent(metrics.overReservationRatio)],
  ];
  container.replaceChildren(...values.map(([label, value]) => {
    const cell = document.createElement("span");
    cell.className = "capacity-metric";
    const caption = document.createElement("span");
    caption.className = "capacity-metric-label";
    caption.textContent = label;
    const amount = document.createElement("strong");
    amount.className = "capacity-metric-value";
    amount.textContent = value;
    cell.append(caption, amount);
    return cell;
  }));
}
