import type { TeamId } from "../../domain/index.js";
import type { CursorTeamMetricsViewModel } from "./buildCursorMetricsViewModel.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";

export function renderCursorTeamMetrics(
  containers: ReadonlyMap<TeamId, HTMLElement>,
  teams: readonly CursorTeamMetricsViewModel[],
): void {
  for (const team of teams) {
    const container = containers.get(team.teamId);
    if (!container) throw new TypeError(`Missing metrics container for Team ${team.teamId}.`);
    const document = container.ownerDocument;
    const values = [
      ["Effective", formatCursorMd(team.effectiveCapacity)],
      ["Reserved", formatCursorMd(team.requestedReservedCapacity)],
      ["Allocated", formatCursorMd(team.allocatedCapacity)],
      ["Utilization", formatCursorPercent(team.utilization)],
      ["Over-reservation", formatCursorMd(team.overReservedCapacity)],
      ["Over-reservation ratio", formatCursorPercent(team.overReservationRatio)],
    ];
    container.replaceChildren(...values.map(([label, value]) => {
      const line = document.createElement("span");
      line.className = "team-panel-metric";
      line.textContent = `${label}: ${value}`;
      return line;
    }));
  }
}
