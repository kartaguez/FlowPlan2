import {
  catalogNameKey, createColor, createPriorityFamily,
  createProgram, normalizeCatalogName, suggestColor,
  type Color, type Portfolio, type Program, type ProgramId,
  type PriorityFamily, type PriorityFamilyId, type Project, type Reservation,
} from "../../domain/index.js";

export interface GroupingEdit {
  readonly programId?: ProgramId;
  readonly programName?: string;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly priorityFamilyName?: string;
  readonly color?: Color;
  readonly colorChanged?: boolean;
}

export class GroupingResolutionError extends Error {}

export function resolveGrouping(portfolio: Portfolio, edit: GroupingEdit, entityId: string,
  previous?: { readonly programId?: ProgramId; readonly ownColor?: Color },
  historicalProgramIds: ReadonlySet<ProgramId> = new Set(), historicalFamilyIds: ReadonlySet<PriorityFamilyId> = new Set()) {
  let programs = [...portfolio.programs];
  let families = [...portfolio.priorityFamilies];
  const requestedProgram = normalizeCatalogName(edit.programName ?? "");
  const requestedFamily = normalizeCatalogName(edit.priorityFamilyName ?? "");
  if (edit.programName !== undefined && !requestedProgram) throw new GroupingResolutionError("Program name must not be empty.");
  if (edit.priorityFamilyName !== undefined && !requestedFamily) throw new GroupingResolutionError("Pas name must not be empty.");
  let program = programs.find((p) => p.id === edit.programId);
  if (!program && requestedProgram) program = programs.find((p) => catalogNameKey(p.name) === catalogNameKey(requestedProgram));
  if (!program && requestedProgram) {
    const ids = new Set([...programs.map((p) => p.id), ...historicalProgramIds]);
    let suffix = 1;
    let id = `program-${suffix}`;
    while (ids.has(id as ProgramId)) id = `program-${++suffix}`;
    const usedColors = programs.map((p) => p.color).concat(
      portfolio.projects.map((p) => p.ownColor).filter((v): v is string => !!v),
      portfolio.reservations.map((r) => r.ownColor).filter((v): v is string => !!v));
    const created = createProgram({ id: id as ProgramId,
      name: requestedProgram, color: edit.color ?? suggestColor(id, usedColors) });
    if (!created.ok) throw new GroupingResolutionError(created.errors[0]?.message);
    program = created.value;
    programs.push(program);
  }
  if (program && edit.colorChanged && edit.color !== undefined) {
    const validated = createColor(edit.color);
    if (!validated.ok) throw new GroupingResolutionError(validated.errors[0]?.message);
    program = Object.freeze({ ...program, color: validated.value });
    programs = programs.map((item) => item.id === program!.id ? program! : item);
  }
  let family = families.find((p) => p.id === edit.priorityFamilyId);
  if (!family && requestedFamily) family = families.find((p) => catalogNameKey(p.name) === catalogNameKey(requestedFamily));
  if (!family && requestedFamily) {
    const ids = new Set([...families.map((p) => p.id), ...historicalFamilyIds]);
    let suffix = 1;
    let id = `pas-${suffix}`;
    while (ids.has(id as PriorityFamilyId)) id = `pas-${++suffix}`;
    const created = createPriorityFamily({ id: id as PriorityFamilyId, name: requestedFamily });
    if (!created.ok) throw new GroupingResolutionError(created.errors[0]?.message);
    family = created.value;
    families.push(family);
  }
  if (edit.programId !== undefined && !program) throw new GroupingResolutionError("Selected Program no longer exists and has no known name.");
  if (edit.priorityFamilyId !== undefined && !family) throw new GroupingResolutionError("Selected Pas no longer exists and has no known name.");
  const ownColor = !program
    ? edit.color ?? (previous?.programId === undefined ? previous?.ownColor : undefined)
      ?? suggestColor(`${entityId}:own`, programs.map((p) => p.color)
        .concat(portfolio.projects.map((p) => p.ownColor).filter((v): v is string => !!v),
          portfolio.reservations.map((r) => r.ownColor).filter((v): v is string => !!v)))
    : undefined;
  return { programs, priorityFamilies: families,
    ...(program ? { programId: program.id } : {}),
    ...(family ? { priorityFamilyId: family.id } : {}),
    ...(ownColor ? { ownColor } : {}) };
}

export function pruneCatalogs(portfolio: Pick<Portfolio, "programs" | "priorityFamilies"> & {
  readonly projects: readonly Project[]; readonly reservations: readonly Reservation[];
}): { programs: readonly Program[]; priorityFamilies: readonly PriorityFamily[] } {
  const programIds = new Set([...portfolio.projects.map((p) => p.programId), ...portfolio.reservations.map((r) => r.programId)]);
  const familyIds = new Set([...portfolio.projects.map((p) => p.priorityFamilyId), ...portfolio.reservations.map((r) => r.priorityFamilyId)]);
  return { programs: portfolio.programs.filter((p) => programIds.has(p.id)),
    priorityFamilies: portfolio.priorityFamilies.filter((p) => familyIds.has(p.id)) };
}
