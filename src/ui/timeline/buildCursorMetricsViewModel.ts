import type { CursorCapacityMetrics, CursorMetricsProjection, TimelineViewModel } from "../../adapters/index.js";
import {
  subtractRationals,
  type Portfolio,
  type Rational,
  type TeamId,
  type CivilDate,
} from "../../domain/index.js";

export type CursorProgressView = "projects" | "programs" | "pas";

export interface CursorTeamMetricsViewModel extends CursorCapacityMetrics { readonly teamId: TeamId; }

export interface CursorProgressItemViewModel {
  readonly id: string;
  readonly name: string;
  readonly progress: Rational;
  readonly allocatedWorkload: Rational;
  readonly remainingWorkload: Rational;
  readonly baselineWorkload: Rational;
  readonly metadata: string;
  readonly estimatedEndDate?: CivilDate;
  readonly estimatedWithinHorizon: boolean;
}

export interface CursorMetricsViewModel {
  readonly global: CursorCapacityMetrics;
  readonly teams: readonly CursorTeamMetricsViewModel[];
  readonly projects: readonly CursorProgressItemViewModel[];
  readonly programs: readonly CursorProgressItemViewModel[];
  readonly pas: readonly CursorProgressItemViewModel[];
}

export function buildCursorMetricsViewModel(
  portfolio: Portfolio,
  metrics: CursorMetricsProjection,
  timeline: TimelineViewModel,
): CursorMetricsViewModel {
  const projectMetrics = new Map(metrics.projects.map((item) => [item.projectId, item]));
  const programMetrics = new Map(metrics.programs.map((item) => [item.programId, item]));
  const pasMetrics = new Map(metrics.priorityFamilies.map((item) => [item.priorityFamilyId, item]));
  const projects = new Map(portfolio.projects.map((item) => [item.id, item]));
  const projectedProjects = new Map(timeline.projects.map((project) => [project.id, project]));
  const programs = new Map(portfolio.programs.map((program) => [program.id, program.name]));
  const families = new Map(portfolio.priorityFamilies.map((family) => [family.id, family.name]));
  const groupEnd = (members: readonly typeof portfolio.projects[number][]) => {
    const projected = members.map((member) => projectedProjects.get(member.id));
    if (projected.some((member) => !member || !member.estimatedWithinHorizon || !member.estimatedEndDate)) {
      return { estimatedWithinHorizon: false } as const;
    }
    return {
      estimatedWithinHorizon: true,
      estimatedEndDate: projected.map((member) => member!.estimatedEndDate!).reduce((latest, date) => date > latest ? date : latest),
    } as const;
  };
  const item = (
    id: string,
    name: string,
    value: { readonly baselineRAF: Rational; readonly allocatedWorkload: Rational; readonly progress: Rational },
    metadata: string,
    end: { readonly estimatedWithinHorizon: boolean; readonly estimatedEndDate?: CivilDate },
  ): CursorProgressItemViewModel => Object.freeze({
    id,
    name,
    progress: value.progress,
    allocatedWorkload: value.allocatedWorkload,
    remainingWorkload: subtractRationals(value.baselineRAF, value.allocatedWorkload),
    baselineWorkload: value.baselineRAF,
    metadata,
    ...end,
  });
  return Object.freeze({
    global: metrics.global,
    teams: metrics.teams,
    projects: Object.freeze(portfolio.priorityOrder.map((id) => {
      const project = projects.get(id);
      const value = projectMetrics.get(id);
      if (!project || !value) throw new TypeError(`Missing cursor Project ${id}.`);
      const end = projectedProjects.get(id);
      if (!end) throw new TypeError(`Missing projected Project ${id}.`);
      const priority = portfolio.priorityOrder.indexOf(id) + 1;
      return item(id, project.name, value,
        `Priority ${priority} · Program ${project.programId ? programs.get(project.programId) : "—"} · PAS ${project.priorityFamilyId ? families.get(project.priorityFamilyId) : "—"}`,
        { estimatedWithinHorizon: end.estimatedWithinHorizon ?? false,
          ...(end.estimatedEndDate ? { estimatedEndDate: end.estimatedEndDate } : {}) });
    })),
    programs: Object.freeze(portfolio.programs.flatMap((program) => {
      const value = programMetrics.get(program.id);
      if (!value) return [];
      const members = portfolio.projects.filter((project) => project.programId === program.id);
      return [item(program.id, program.name, value, `${members.length} projects`, groupEnd(members))];
    })),
    pas: Object.freeze(portfolio.priorityFamilies.flatMap((family) => {
      const value = pasMetrics.get(family.id);
      if (!value) return [];
      const members = portfolio.projects.filter((project) => project.priorityFamilyId === family.id);
      return [item(family.id, family.name, value, `${members.length} projects`, groupEnd(members))];
    })),
  });
}
