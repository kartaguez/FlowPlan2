import type { CivilDate } from "../model/date.js";
import type { Portfolio, Project } from "../model/entities.js";
import type { ProjectActualsKnowledge } from "../planning/contracts.js";

export interface ProjectActualsRange {
  readonly from: CivilDate;
  readonly through: CivilDate;
}

/** Coverage is knowledge, including zero days; never infer it from throughput. */
export function projectActualsRange(project: Project): ProjectActualsRange | null {
  const current = project.snapshots?.at(-1);
  if (current) return current.coverage ? { from: current.coverage.actualsFrom, through: current.coverage.actualsThrough } : null;
  const legacy = project.legacyV4Actuals ?? project.actuals;
  const last = legacy?.records.at(-1);
  return legacy && last ? { from: legacy.actualsFromDate, through: last.actualsThroughDate } : null;
}

/** Metadata only: zero throughput remains covered, and only the current source matters. */
export function projectActualsKnowledgeFromPortfolio(portfolio: Portfolio): readonly ProjectActualsKnowledge[] {
  return Object.freeze(portfolio.projects.map((project) => Object.freeze({
    projectId: project.id,
    actualsThrough: projectActualsRange(project)?.through ?? null,
  })));
}
