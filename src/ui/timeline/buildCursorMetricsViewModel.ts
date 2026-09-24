import type { CursorMetricsProjection } from "../../adapters/index.js";
import {
  subtractRationals,
  type Portfolio,
  type Rational,
  type TeamId,
} from "../../domain/index.js";

export type CursorProgressView = "projects" | "programs" | "pas";

export interface CursorTeamMetricsViewModel {
  readonly teamId: TeamId;
  readonly effectiveCapacity: Rational;
  readonly requestedReservedCapacity: Rational;
  readonly allocatedCapacity: Rational;
  readonly utilization: Rational | undefined;
  readonly overReservedCapacity: Rational;
  readonly overReservationRatio: Rational | undefined;
}

export interface CursorProgressItemViewModel {
  readonly id: string;
  readonly name: string;
  readonly progress: Rational;
  readonly allocatedWorkload: Rational;
  readonly remainingWorkload: Rational;
}

export interface CursorMetricsViewModel {
  readonly teams: readonly CursorTeamMetricsViewModel[];
  readonly projects: readonly CursorProgressItemViewModel[];
  readonly programs: readonly CursorProgressItemViewModel[];
  readonly pas: readonly CursorProgressItemViewModel[];
}

export function buildCursorMetricsViewModel(
  portfolio: Portfolio,
  metrics: CursorMetricsProjection,
): CursorMetricsViewModel {
  const projectMetrics = new Map(metrics.projects.map((item) => [item.projectId, item]));
  const programMetrics = new Map(metrics.programs.map((item) => [item.programId, item]));
  const pasMetrics = new Map(metrics.priorityFamilies.map((item) => [item.priorityFamilyId, item]));
  const projects = new Map(portfolio.projects.map((item) => [item.id, item]));
  const item = (
    id: string,
    name: string,
    value: { readonly baselineRAF: Rational; readonly allocatedWorkload: Rational; readonly progress: Rational },
  ): CursorProgressItemViewModel => Object.freeze({
    id,
    name,
    progress: value.progress,
    allocatedWorkload: value.allocatedWorkload,
    remainingWorkload: subtractRationals(value.baselineRAF, value.allocatedWorkload),
  });
  return Object.freeze({
    teams: metrics.teams,
    projects: Object.freeze(portfolio.priorityOrder.map((id) => {
      const project = projects.get(id);
      const value = projectMetrics.get(id);
      if (!project || !value) throw new TypeError(`Missing cursor Project ${id}.`);
      return item(id, project.name, value);
    })),
    programs: Object.freeze(portfolio.programs.flatMap((program) => {
      const value = programMetrics.get(program.id);
      return value ? [item(program.id, program.name, value)] : [];
    })),
    pas: Object.freeze(portfolio.priorityFamilies.flatMap((family) => {
      const value = pasMetrics.get(family.id);
      return value ? [item(family.id, family.name, value)] : [];
    })),
  });
}
