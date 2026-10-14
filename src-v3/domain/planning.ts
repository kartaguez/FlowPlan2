import { parseDecimal, type Decimal } from "./decimal.js";

export interface TeamInput {
  readonly id: string;
  readonly name: string;
  readonly dailyCapacity: string;
}

export interface ProjectInput {
  readonly id: string;
  readonly name: string;
  readonly earliestStart: string;
  readonly etc: string;
  readonly priority: string;
}

export interface PlanningInput {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly team: TeamInput;
  readonly projects: readonly ProjectInput[];
}

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly dailyCapacity: Decimal;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly earliestStart: string;
  readonly etc: Decimal;
  readonly priority: bigint;
}

export interface Planning {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly team: Team;
  readonly projects: readonly Project[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

export type PlanningResult =
  | { readonly ok: true; readonly planning: Planning }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

const DAY_MS = 86_400_000;

export function dateOrdinal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return date.getTime() / DAY_MS;
}

export function dateFromOrdinal(ordinal: number): string {
  return new Date(ordinal * DAY_MS).toISOString().slice(0, 10);
}

export function isWorkingDay(ordinal: number): boolean {
  const weekday = ((ordinal + 4) % 7 + 7) % 7;
  return weekday !== 0 && weekday !== 6;
}

export function createPlanning(input: PlanningInput): PlanningResult {
  const errors: ValidationError[] = [];
  const requireText = (value: string, field: string): string => {
    const trimmed = value.trim();
    if (!trimmed) errors.push({ field, message: "Champ obligatoire" });
    return trimmed;
  };
  const requireDate = (value: string, field: string): number | null => {
    const ordinal = dateOrdinal(value);
    if (ordinal === null) errors.push({ field, message: "Date invalide (AAAA-MM-JJ)" });
    return ordinal;
  };
  const requireDecimal = (value: string, field: string): Decimal | null => {
    const decimal = parseDecimal(value.trim());
    if (!decimal) errors.push({ field, message: "Décimal positif ou nul attendu" });
    return decimal;
  };

  const name = requireText(input.name, "name");
  const start = requireDate(input.startDate, "startDate");
  const end = requireDate(input.endDate, "endDate");
  if (start !== null && end !== null && end < start) {
    errors.push({ field: "endDate", message: "La fin précède le début" });
  }

  const teamId = requireText(input.team.id, "team.id");
  const teamName = requireText(input.team.name, "team.name");
  const capacity = requireDecimal(input.team.dailyCapacity, "team.dailyCapacity");

  const ids = new Set<string>();
  const priorities = new Set<bigint>();
  const projects: Project[] = [];
  input.projects.forEach((project, index) => {
    const field = `projects.${index}`;
    const id = requireText(project.id, `${field}.id`);
    const projectName = requireText(project.name, `${field}.name`);
    const earliest = requireDate(project.earliestStart, `${field}.earliestStart`);
    const etc = requireDecimal(project.etc, `${field}.etc`);
    const priorityText = project.priority.trim();
    const parsedPriority = /^\d+$/.test(priorityText) ? BigInt(priorityText) : null;
    const priority = parsedPriority !== null && parsedPriority > 0n ? parsedPriority : null;
    if (priority === null) errors.push({ field: `${field}.priority`, message: "Rang entier positif attendu" });
    if (id) {
      if (ids.has(id)) errors.push({ field: `${field}.id`, message: "Identifiant de projet déjà utilisé" });
      ids.add(id);
    }
    if (priority !== null) {
      if (priorities.has(priority)) errors.push({ field: `${field}.priority`, message: "Rang de priorité déjà utilisé" });
      priorities.add(priority);
    }
    if (start !== null && earliest !== null && earliest < start) {
      errors.push({ field: `${field}.earliestStart`, message: "Date antérieure au début du planning" });
    }
    if (earliest !== null && etc !== null && priority !== null) {
      projects.push(Object.freeze({ id, name: projectName, earliestStart: project.earliestStart, etc, priority }));
    }
  });

  if (errors.length > 0 || capacity === null) return { ok: false, errors: Object.freeze(errors) };
  const team: Team = Object.freeze({ id: teamId, name: teamName, dailyCapacity: capacity });
  const planning: Planning = Object.freeze({
    name,
    startDate: input.startDate,
    endDate: input.endDate,
    team,
    projects: Object.freeze(projects),
  });
  return { ok: true, planning };
}
