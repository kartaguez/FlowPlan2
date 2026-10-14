import { compareDecimal, decimalToString, minDecimal, subtractDecimal, ZERO, type Decimal } from "./decimal.js";
import { dateFromOrdinal, dateOrdinal, isWorkingDay, type Planning, type Project } from "./planning.js";

export interface Allocation {
  readonly projectId: string;
  readonly quantity: string;
}

export interface DayProjection {
  readonly date: string;
  readonly available: string;
  readonly allocated: string;
  readonly unused: string;
  readonly allocations: readonly Allocation[];
}

export interface ProjectProjection {
  readonly projectId: string;
  readonly initialEtc: string;
  readonly planned: string;
  readonly unplanned: string;
  readonly estimatedStart: string | null;
  readonly estimatedFinish: string | null;
  readonly fullyPlanned: boolean;
}

export interface Projection {
  readonly days: readonly DayProjection[];
  readonly projects: readonly ProjectProjection[];
}

interface Progress {
  readonly project: Project;
  remaining: Decimal;
  estimatedStart: string | null;
  estimatedFinish: string | null;
}

export function allocate(planning: Planning): Projection {
  const progress: Progress[] = [...planning.projects]
    .sort((a, b) => a.priority < b.priority ? -1 : a.priority > b.priority ? 1 : 0)
    .map(project => ({ project, remaining: project.etc, estimatedStart: null, estimatedFinish: null }));
  const days: DayProjection[] = [];
  const first = dateOrdinal(planning.startDate);
  const last = dateOrdinal(planning.endDate);
  if (first === null || last === null) throw new Error("Planning dates must be validated");

  for (let ordinal = first; ordinal <= last; ordinal++) {
    const date = dateFromOrdinal(ordinal);
    const available = isWorkingDay(ordinal) ? planning.team.dailyCapacity : ZERO;
    let unused = available;
    const allocations: Allocation[] = [];

    for (const item of progress) {
      if (compareDecimal(unused, ZERO) === 0) break;
      if (date < item.project.earliestStart || compareDecimal(item.remaining, ZERO) === 0) continue;
      const quantity = minDecimal(item.remaining, unused);
      item.remaining = subtractDecimal(item.remaining, quantity);
      unused = subtractDecimal(unused, quantity);
      if (item.estimatedStart === null) item.estimatedStart = date;
      if (compareDecimal(item.remaining, ZERO) === 0) item.estimatedFinish = date;
      allocations.push(Object.freeze({ projectId: item.project.id, quantity: decimalToString(quantity) }));
    }

    days.push(Object.freeze({
      date,
      available: decimalToString(available),
      allocated: decimalToString(subtractDecimal(available, unused)),
      unused: decimalToString(unused),
      allocations: Object.freeze(allocations),
    }));
  }

  const projects = progress.map((item): ProjectProjection => Object.freeze({
    projectId: item.project.id,
    initialEtc: decimalToString(item.project.etc),
    planned: decimalToString(subtractDecimal(item.project.etc, item.remaining)),
    unplanned: decimalToString(item.remaining),
    estimatedStart: item.estimatedStart,
    estimatedFinish: compareDecimal(item.project.etc, ZERO) === 0 ? item.project.earliestStart : item.estimatedFinish,
    fullyPlanned: compareDecimal(item.remaining, ZERO) === 0,
  }));

  return Object.freeze({ days: Object.freeze(days), projects: Object.freeze(projects) });
}
