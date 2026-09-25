import type { PlanningSessionState } from "../session/planningSession.js";
import {
  capacityFromSerialized, createCapacityException, createCapacityPeriod,
  createCivilDate, createMaxParallelProjects, createPlanningHorizon,
  createPortfolio, createPriorityFamily, createPriorityFamilyId, createProgram,
  createProgramId, createProject, createProjectId, createProjectTeamRequirement,
  createReservation, createReservationId, createReservationTeamAllocation,
  createTeam, createTeamCapacitySchedule, createTeamId, createWorkingPattern,
  dailyCapFromSerialized, remainingWorkloadFromSerialized,
  reservationRatioFromSerialized, serializeQuantity, unavailabilityRatioFromSerialized,
  type DomainQuantity, type DomainResult,
} from "../../domain/index.js";

export class InvalidFlowplanBackup extends Error {
  constructor(message: string) { super(message); this.name = "InvalidFlowplanBackup"; }
}

function valid<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new InvalidFlowplanBackup(result.errors.map((e) => `${e.path}: ${e.message}`).join(" "));
  return result.value;
}
function object(value: unknown, path: string, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new InvalidFlowplanBackup(`${path} must be an object.`);
  const data = value as Record<string, unknown>;
  if (required.some((key) => !Object.hasOwn(data, key)) || Object.keys(data).some((key) => !required.includes(key) && !optional.includes(key))) {
    throw new InvalidFlowplanBackup(`${path} has missing or unsupported fields.`);
  }
  return data;
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new InvalidFlowplanBackup(`${path} must be an array.`);
  return value;
}
function string(value: unknown, path: string): string {
  if (typeof value !== "string") throw new InvalidFlowplanBackup(`${path} must be a string.`);
  return value;
}
function name(value: unknown, path: string): string {
  const text = string(value, path);
  if (text.trim().length === 0) throw new InvalidFlowplanBackup(`${path} must not be empty.`);
  return text;
}
function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new InvalidFlowplanBackup(`${path} must be a safe integer.`);
  return value;
}
function date(value: unknown, path: string) { return valid(createCivilDate(string(value, path), path)); }
function quantity<T extends DomainQuantity>(value: unknown, path: string, parse: (value: string, path: string) => DomainResult<T>): T {
  const encoded = string(value, path);
  const parsed = valid(parse(encoded, path));
  if (serializeQuantity(parsed) !== encoded) throw new InvalidFlowplanBackup(`${path} must be canonical.`);
  return parsed;
}

export function encodeFlowplanBackupV1(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  const data = {
    planning: {
      startDate: state.planning.startDate, endDate: state.planning.endDate,
      workingWeekdays: [...state.planning.workingPattern.workingWeekdays],
      maxParallelProjects: state.planning.maxParallelProjects,
    },
    portfolio: {
      teams: state.portfolio.teams.map((team) => ({
        id: team.id, name: team.name,
        capacitySchedule: {
          periods: team.capacitySchedule.periods.map((p) => ({
            start: p.start, end: p.end, dailyCapacity: serializeQuantity(p.dailyCapacity),
            ...(p.unavailabilityRatio === undefined ? {} : { unavailabilityRatio: serializeQuantity(p.unavailabilityRatio) }),
          })),
          exceptions: team.capacitySchedule.exceptions.map((e) => ({ date: e.date, capacity: serializeQuantity(e.capacity) })),
        },
      })),
      projects: state.portfolio.projects.map((project) => ({
        id: project.id, name: project.name,
        ...(project.programId === undefined ? {} : { programId: project.programId }),
        ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyId: project.priorityFamilyId }),
        ...(project.earliestStartDate === undefined ? {} : { earliestStartDate: project.earliestStartDate }),
        ...(project.objectiveEndDate === undefined ? {} : { objectiveEndDate: project.objectiveEndDate }),
        ...(project.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: project.mandatoryDeadline }),
        requirements: project.requirements.map((r) => ({
          teamId: r.teamId, remainingWorkload: serializeQuantity(r.remainingWorkload),
          ...(r.dailyCap === undefined ? {} : { dailyCap: serializeQuantity(r.dailyCap) }),
        })),
      })),
      programs: state.portfolio.programs.map((p) => ({ id: p.id, name: p.name })),
      priorityFamilies: state.portfolio.priorityFamilies.map((p) => ({ id: p.id, name: p.name })),
      priorityOrder: [...state.portfolio.priorityOrder],
      reservations: state.portfolio.reservations.map((r) => ({
        id: r.id, name: r.name, startDate: r.startDate, endDate: r.endDate,
        teamAllocations: r.teamAllocations.map((a) => ({ teamId: a.teamId, amount: a.amount.kind === "ratio"
          ? { kind: "ratio", ratio: serializeQuantity(a.amount.ratio) }
          : { kind: "fixed-daily", dailyCapacity: serializeQuantity(a.amount.dailyCapacity) } })),
      })),
    },
  };
  return JSON.stringify({ format: "flowplan", version: 1, exportedAt, data }, null, 2);
}

export function decodeFlowplanBackupV1(text: string): PlanningSessionState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  const envelope = object(parsed, "backup", ["format", "version", "exportedAt", "data"]);
  if (envelope.format !== "flowplan") throw new InvalidFlowplanBackup("Unknown format.");
  if (envelope.version !== 1) throw new InvalidFlowplanBackup("Unsupported version.");
  const exportedAt = string(envelope.exportedAt, "exportedAt");
  if (Number.isNaN(Date.parse(exportedAt)) || new Date(exportedAt).toISOString() !== exportedAt) throw new InvalidFlowplanBackup("Invalid exportedAt.");
  const data = object(envelope.data, "data", ["planning", "portfolio"]);
  const planning = object(data.planning, "planning", ["startDate", "endDate", "workingWeekdays", "maxParallelProjects"]);
  const horizon = valid(createPlanningHorizon({ start: date(planning.startDate, "planning.startDate"), end: date(planning.endDate, "planning.endDate") }));
  const weekdays = array(planning.workingWeekdays, "planning.workingWeekdays").map((v, i) => integer(v, `planning.workingWeekdays[${i}]`));
  if (weekdays.length === 0) throw new InvalidFlowplanBackup("Working week must not be empty.");
  const workingPattern = valid(createWorkingPattern({ workingWeekdays: weekdays }));
  const maxParallelProjects = valid(createMaxParallelProjects(integer(planning.maxParallelProjects, "planning.maxParallelProjects")));
  const source = object(data.portfolio, "portfolio", ["teams", "projects", "programs", "priorityFamilies", "priorityOrder", "reservations"]);
  const teams = array(source.teams, "teams").map((v, i) => {
    const t = object(v, `teams[${i}]`, ["id", "name", "capacitySchedule"]);
    const schedule = object(t.capacitySchedule, `teams[${i}].capacitySchedule`, ["periods", "exceptions"]);
    const periods = array(schedule.periods, "periods").map((v, j) => {
      const p = object(v, `periods[${j}]`, ["start", "end", "dailyCapacity"], ["unavailabilityRatio"]);
      return valid(createCapacityPeriod({ start: date(p.start, "period.start"), end: date(p.end, "period.end"),
        dailyCapacity: quantity(p.dailyCapacity, "period.dailyCapacity", capacityFromSerialized),
        ...(p.unavailabilityRatio === undefined ? {} : { unavailabilityRatio: quantity(p.unavailabilityRatio, "period.unavailabilityRatio", unavailabilityRatioFromSerialized) }) }));
    });
    const exceptions = array(schedule.exceptions, "exceptions").map((v, j) => {
      const e = object(v, `exceptions[${j}]`, ["date", "capacity"]);
      return valid(createCapacityException({ date: date(e.date, "exception.date"), capacity: quantity(e.capacity, "exception.capacity", capacityFromSerialized) }));
    });
    return valid(createTeam({ id: valid(createTeamId(string(t.id, "team.id"))), name: name(t.name, "team.name"),
      capacitySchedule: valid(createTeamCapacitySchedule({ periods, exceptions })) }));
  });
  const programs = array(source.programs, "programs").map((v) => {
    const p = object(v, "program", ["id", "name"]);
    return valid(createProgram({ id: valid(createProgramId(string(p.id, "program.id"))), name: name(p.name, "program.name") }));
  });
  const priorityFamilies = array(source.priorityFamilies, "priorityFamilies").map((v) => {
    const p = object(v, "priorityFamily", ["id", "name"]);
    return valid(createPriorityFamily({ id: valid(createPriorityFamilyId(string(p.id, "priorityFamily.id"))), name: name(p.name, "priorityFamily.name") }));
  });
  const projects = array(source.projects, "projects").map((v) => {
    const p = object(v, "project", ["id", "name", "requirements"], ["programId", "priorityFamilyId", "earliestStartDate", "objectiveEndDate", "mandatoryDeadline"]);
    const requirements = array(p.requirements, "requirements").map((v) => {
      const r = object(v, "requirement", ["teamId", "remainingWorkload"], ["dailyCap"]);
      return valid(createProjectTeamRequirement({ teamId: valid(createTeamId(string(r.teamId, "requirement.teamId"))),
        remainingWorkload: quantity(r.remainingWorkload, "requirement.remainingWorkload", remainingWorkloadFromSerialized),
        ...(r.dailyCap === undefined ? {} : { dailyCap: quantity(r.dailyCap, "requirement.dailyCap", dailyCapFromSerialized) }) }));
    });
    return valid(createProject({ id: valid(createProjectId(string(p.id, "project.id"))), name: name(p.name, "project.name"), requirements,
      ...(p.programId === undefined ? {} : { programId: valid(createProgramId(string(p.programId, "project.programId"))) }),
      ...(p.priorityFamilyId === undefined ? {} : { priorityFamilyId: valid(createPriorityFamilyId(string(p.priorityFamilyId, "project.priorityFamilyId"))) }),
      ...(p.earliestStartDate === undefined ? {} : { earliestStartDate: date(p.earliestStartDate, "project.earliestStartDate") }),
      ...(p.objectiveEndDate === undefined ? {} : { objectiveEndDate: date(p.objectiveEndDate, "project.objectiveEndDate") }),
      ...(p.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: date(p.mandatoryDeadline, "project.mandatoryDeadline") }) }));
  });
  const reservations = array(source.reservations, "reservations").map((v) => {
    const r = object(v, "reservation", ["id", "name", "startDate", "endDate", "teamAllocations"]);
    const teamAllocations = array(r.teamAllocations, "teamAllocations").map((v) => {
      const a = object(v, "allocation", ["teamId", "amount"]);
      const rawAmount = object(a.amount, "amount", ["kind"], ["ratio", "dailyCapacity"]);
      let amount;
      if (rawAmount.kind === "ratio") {
        object(a.amount, "amount", ["kind", "ratio"]);
        amount = { kind: "ratio" as const, ratio: quantity(rawAmount.ratio, "amount.ratio", reservationRatioFromSerialized) };
      } else if (rawAmount.kind === "fixed-daily") {
        object(a.amount, "amount", ["kind", "dailyCapacity"]);
        amount = { kind: "fixed-daily" as const, dailyCapacity: quantity(rawAmount.dailyCapacity, "amount.dailyCapacity", capacityFromSerialized) };
      } else throw new InvalidFlowplanBackup("Unknown reservation amount kind.");
      return valid(createReservationTeamAllocation({ teamId: valid(createTeamId(string(a.teamId, "allocation.teamId"))), amount }));
    });
    return valid(createReservation({ id: valid(createReservationId(string(r.id, "reservation.id"))), name: name(r.name, "reservation.name"),
      startDate: date(r.startDate, "reservation.startDate"), endDate: date(r.endDate, "reservation.endDate"), teamAllocations }));
  });
  const priorityOrder = array(source.priorityOrder, "priorityOrder").map((v) => valid(createProjectId(string(v, "priorityOrder.id"))));
  const portfolio = valid(createPortfolio({ teams, projects, programs, priorityFamilies, priorityOrder, reservations }));
  return Object.freeze({ portfolio, planning: Object.freeze({ startDate: horizon.start, endDate: horizon.end, workingPattern, maxParallelProjects }) });
}
