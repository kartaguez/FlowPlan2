import type { PlanningSessionState } from "../session/planningSession.js";
import {
  capacityFromSerialized, createCapacityException, createCapacityPeriod,
  createCivilDate, createMaxParallelProjects, createPlanningHorizon,
  createPortfolio, createPriorityFamily, createPriorityFamilyId, createProgram,
  createProgramId, createProject, createProjectId, createProjectTeamRequirement,
  createReservation, createReservationId, createReservationTeamAllocation,
  createTeam, createTeamCapacitySchedule, createTeamId, createWorkingPattern,
  dailyCapFromSerialized, remainingWorkloadFromSerialized,
  consumedWorkloadFromSerialized,
  reservationRatioFromSerialized, serializeQuantity, unavailabilityRatioFromSerialized,
  type DomainQuantity, type DomainResult, createColor, suggestColor,
  type ProjectActualsChronology, type ReservationActualsChronology,
  type ProjectActualsSnapshot, type ReservationActualsSnapshot,
  type TeamId,
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

function decodeActuals(value: unknown, project: true): ProjectActualsChronology;
function decodeActuals(value: unknown, project: false): ReservationActualsChronology;
function decodeActuals(value: unknown, project: boolean): ProjectActualsChronology | ReservationActualsChronology {
  const chronology = object(value, "actuals", ["actualsFromDate", "records"]);
  const actualsFromDate = date(chronology.actualsFromDate, "actuals.actualsFromDate");
  const records = array(chronology.records, "actuals.records").map((item, index) => {
    const record = object(item, `actuals.records[${index}]`, ["actualsThroughDate", "teams"]);
    const actualsThroughDate = date(record.actualsThroughDate, `actuals.records[${index}].actualsThroughDate`);
    const teams = array(record.teams, `actuals.records[${index}].teams`).map((item, teamIndex) => {
      const path = `actuals.records[${index}].teams[${teamIndex}]`;
      const entry = object(item, path, ["teamId", "cumulativeConsumed", ...(project ? ["remainingWorkload"] : [])]);
      return { teamId: valid(createTeamId(string(entry.teamId, `${path}.teamId`))),
        cumulativeConsumed: quantity(entry.cumulativeConsumed, `${path}.cumulativeConsumed`, consumedWorkloadFromSerialized),
        ...(project ? { remainingWorkload: quantity(entry.remainingWorkload, `${path}.remainingWorkload`, remainingWorkloadFromSerialized) } : {}) };
    });
    return { actualsThroughDate, teams };
  });
  return { actualsFromDate, records } as ProjectActualsChronology | ReservationActualsChronology;
}

function decodeSnapshot(value: unknown, project: boolean, path: string): ProjectActualsSnapshot | ReservationActualsSnapshot {
  const source = object(value, path, ["snapshotId", "version", "knowledgeDate", "participation", "retiredZeroTeams", ...(project ? ["raf"] : [])], ["coverage"]);
  const participation = array(source.participation, `${path}.participation`).map((item, index) =>
    valid(createTeamId(string(item, `${path}.participation[${index}]`))));
  const retiredZeroTeams = array(source.retiredZeroTeams, `${path}.retiredZeroTeams`).map((item, index) =>
    valid(createTeamId(string(item, `${path}.retiredZeroTeams[${index}]`))));
  const coverage = source.coverage === undefined ? undefined : (() => {
    const item = object(source.coverage, `${path}.coverage`, ["actualsFrom", "actualsThrough", "periods"]);
    return { actualsFrom: date(item.actualsFrom, `${path}.coverage.actualsFrom`),
      actualsThrough: date(item.actualsThrough, `${path}.coverage.actualsThrough`),
      periods: array(item.periods, `${path}.coverage.periods`).map((period, periodIndex) => {
        const periodPath = `${path}.coverage.periods[${periodIndex}]`;
        const row = object(period, periodPath, ["periodId", "from", "through", "consumed"]);
        return { periodId: string(row.periodId, `${periodPath}.periodId`),
          from: date(row.from, `${periodPath}.from`), through: date(row.through, `${periodPath}.through`),
          consumed: array(row.consumed, `${periodPath}.consumed`).map((entry, entryIndex) => {
            const entryPath = `${periodPath}.consumed[${entryIndex}]`;
            const data = object(entry, entryPath, ["teamId", "amount"]);
            return { teamId: valid(createTeamId(string(data.teamId, `${entryPath}.teamId`))),
              amount: quantity(data.amount, `${entryPath}.amount`, consumedWorkloadFromSerialized) };
          }) };
      }) };
  })();
  const base = { snapshotId: string(source.snapshotId, `${path}.snapshotId`),
    version: integer(source.version, `${path}.version`), knowledgeDate: date(source.knowledgeDate, `${path}.knowledgeDate`),
    participation, retiredZeroTeams, ...(coverage === undefined ? {} : { coverage }) };
  if (!project) return base;
  return { ...base, raf: array(source.raf, `${path}.raf`).map((entry, index) => {
    const entryPath = `${path}.raf[${index}]`;
    const data = object(entry, entryPath, ["teamId", "amount"]);
    return { teamId: valid(createTeamId(string(data.teamId, `${entryPath}.teamId`))),
      amount: quantity(data.amount, `${entryPath}.amount`, remainingWorkloadFromSerialized) };
  }) };
}

function decodeProjectLegacy(value: unknown): Readonly<{ actuals: ProjectActualsChronology;
  authority: readonly Readonly<{ teamId: TeamId;
    authority: "latest-actuals" | "current-configuration" }>[] }> {
  const source = object(value, "legacyV4Actuals", ["actualsFromDate", "records", "rafAuthorityByTeam"]);
  const actuals = decodeActuals({ actualsFromDate: source.actualsFromDate, records: source.records }, true);
  const authority = array(source.rafAuthorityByTeam, "legacyV4Actuals.rafAuthorityByTeam").map((item, index) => {
    const path = `legacyV4Actuals.rafAuthorityByTeam[${index}]`;
    const row = object(item, path, ["teamId", "authority"]);
    const value = string(row.authority, `${path}.authority`);
    if (value !== "latest-actuals" && value !== "current-configuration") throw new InvalidFlowplanBackup(`${path}.authority is invalid.`);
    return { teamId: valid(createTeamId(string(row.teamId, `${path}.teamId`))),
      authority: value as "latest-actuals" | "current-configuration" };
  });
  if (new Set(authority.map((row) => row.teamId)).size !== authority.length) throw new InvalidFlowplanBackup("Duplicate legacy RAF authority Team.");
  return { actuals, authority };
}

function encodeSnapshot(snapshot: ProjectActualsSnapshot | ReservationActualsSnapshot) {
  return { snapshotId: snapshot.snapshotId, version: snapshot.version, knowledgeDate: snapshot.knowledgeDate,
    participation: [...snapshot.participation], retiredZeroTeams: [...snapshot.retiredZeroTeams],
    ...(snapshot.coverage === undefined ? {} : { coverage: {
      actualsFrom: snapshot.coverage.actualsFrom, actualsThrough: snapshot.coverage.actualsThrough,
      periods: snapshot.coverage.periods.map((period) => ({ periodId: period.periodId, from: period.from, through: period.through,
        consumed: period.consumed.map((row) => ({ teamId: row.teamId, amount: serializeQuantity(row.amount) })) })),
    } }),
    ...("raf" in snapshot ? { raf: snapshot.raf.map((row) => ({ teamId: row.teamId, amount: serializeQuantity(row.amount) })) } : {}),
  };
}

function encodeProjectLegacy(actuals: ProjectActualsChronology, authority: readonly Readonly<{ teamId: string; authority: string }>[]) {
  return { actualsFromDate: actuals.actualsFromDate,
    records: actuals.records.map((record) => ({ actualsThroughDate: record.actualsThroughDate,
      teams: record.teams.map((entry) => ({ teamId: entry.teamId,
        cumulativeConsumed: serializeQuantity(entry.cumulativeConsumed), remainingWorkload: serializeQuantity(entry.remainingWorkload) })) })),
    rafAuthorityByTeam: authority.map((entry) => ({ teamId: entry.teamId, authority: entry.authority })),
  };
}

function encodeReservationLegacy(actuals: ReservationActualsChronology) {
  return { actualsFromDate: actuals.actualsFromDate,
    records: actuals.records.map((record) => ({ actualsThroughDate: record.actualsThroughDate,
      teams: record.teams.map((entry) => ({ teamId: entry.teamId,
        cumulativeConsumed: serializeQuantity(entry.cumulativeConsumed) })) })),
  };
}

function encodeFlowplanBackupVersion(state: PlanningSessionState, version: 1 | 2 | 3 | 4 | 5, exportedAt: string): string {
  if (version < 5 && (state.portfolio.projects.some((p) => p.snapshots?.length) || state.portfolio.reservations.some((r) => r.snapshots?.length))) {
    throw new InvalidFlowplanBackup("V1–V4 backups cannot encode knowledge snapshots.");
  }
  if (version < 4 && (state.portfolio.projects.some((p) => p.actuals) || state.portfolio.reservations.some((r) => r.actuals))) {
    throw new InvalidFlowplanBackup("Legacy backup cannot encode Actuals.");
  }
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
        ...(version >= 2 ? { isActive: project.isActive } : {}),
        ...(project.programId === undefined ? {} : { programId: project.programId }),
        ...(version >= 3 && project.programId === undefined ? { ownColor: project.ownColor } : {}),
        ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyId: project.priorityFamilyId }),
        ...(project.earliestStartDate === undefined ? {} : { earliestStartDate: project.earliestStartDate }),
        ...(project.objectiveEndDate === undefined ? {} : { objectiveEndDate: project.objectiveEndDate }),
        ...(project.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: project.mandatoryDeadline }),
        ...(version === 4 && project.actuals ? { actuals: {
          actualsFromDate: project.actuals.actualsFromDate,
          records: project.actuals.records.map((record) => ({ actualsThroughDate: record.actualsThroughDate,
            teams: record.teams.map((entry) => ({ teamId: entry.teamId,
              cumulativeConsumed: serializeQuantity(entry.cumulativeConsumed), remainingWorkload: serializeQuantity(entry.remainingWorkload) })) })),
        } } : {}),
        ...(version === 5 ? {
          migrationStatus: project.snapshots?.length ? project.legacyV4Actuals || project.actuals ? "reconciled" : "native"
            : project.legacyV4Actuals || project.actuals ? "legacy-pending" : "none",
          ...(project.legacyV4Actuals || project.actuals ? { legacyV4Actuals: encodeProjectLegacy(
            (project.legacyV4Actuals ?? project.actuals)!, project.legacyV4RafAuthority ??
              project.requirements.map((row) => ({ teamId: row.teamId, authority: row.rafAuthority ?? "current-configuration" }))) } : {}),
          ...(project.snapshots?.length ? { snapshots: project.snapshots.map(encodeSnapshot) } : {}),
        } : {}),
        requirements: project.requirements.map((r) => ({
          teamId: r.teamId, remainingWorkload: serializeQuantity(r.remainingWorkload),
          ...(r.dailyCap === undefined ? {} : { dailyCap: serializeQuantity(r.dailyCap) }),
          ...(version === 4 ? { rafAuthority: r.rafAuthority ?? "current-configuration" } : {}),
        })),
      })),
      programs: state.portfolio.programs.map((p) => ({ id: p.id, name: p.name, ...(version >= 3 ? { color: p.color } : {}) })),
      priorityFamilies: state.portfolio.priorityFamilies.map((p) => ({ id: p.id, name: p.name })),
      priorityOrder: [...state.portfolio.priorityOrder],
      reservations: state.portfolio.reservations.map((r) => ({
        id: r.id, name: r.name, startDate: r.startDate, endDate: r.endDate,
        ...(version >= 2 ? { isActive: r.isActive } : {}),
        ...(version >= 3 && r.programId !== undefined ? { programId: r.programId } : {}),
        ...(version >= 3 && r.priorityFamilyId !== undefined ? { priorityFamilyId: r.priorityFamilyId } : {}),
        ...(version >= 3 && r.programId === undefined ? { ownColor: r.ownColor } : {}),
        ...(version === 4 && r.actuals ? { actuals: {
          actualsFromDate: r.actuals.actualsFromDate,
          records: r.actuals.records.map((record) => ({ actualsThroughDate: record.actualsThroughDate,
            teams: record.teams.map((entry) => ({ teamId: entry.teamId,
              cumulativeConsumed: serializeQuantity(entry.cumulativeConsumed) })) })),
        } } : {}),
        ...(version === 5 ? {
          migrationStatus: r.snapshots?.length ? r.legacyV4Actuals || r.actuals ? "reconciled" : "native"
            : r.legacyV4Actuals || r.actuals ? "legacy-pending" : "none",
          ...(r.legacyV4Actuals || r.actuals ? { legacyV4Actuals: encodeReservationLegacy((r.legacyV4Actuals ?? r.actuals)!) } : {}),
          ...(r.snapshots?.length ? { snapshots: r.snapshots.map(encodeSnapshot) } : {}),
        } : {}),
        teamAllocations: r.teamAllocations.map((a) => ({ teamId: a.teamId, amount: a.amount.kind === "ratio"
          ? { kind: "ratio", ratio: serializeQuantity(a.amount.ratio) }
          : { kind: "fixed-daily", dailyCapacity: serializeQuantity(a.amount.dailyCapacity) } })),
      })),
    },
  };
  return JSON.stringify({ format: "flowplan", version, exportedAt, data }, null, 2);
}

export function encodeFlowplanBackupV1(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  return encodeFlowplanBackupVersion(state, 1, exportedAt);
}

export function encodeFlowplanBackupV2(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  return encodeFlowplanBackupVersion(state, 2, exportedAt);
}

export function encodeFlowplanBackupV3(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  return encodeFlowplanBackupVersion(state, 3, exportedAt);
}
export function encodeFlowplanBackupV4(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  return encodeFlowplanBackupVersion(state, 4, exportedAt);
}
export function encodeFlowplanBackupV5(state: PlanningSessionState, exportedAt: string = new Date().toISOString()): string {
  return encodeFlowplanBackupVersion(state, 5, exportedAt);
}

function repairedColor(value: unknown, key: string, used: readonly string[]): string {
  if (typeof value === "string") { const result = createColor(value); if (result.ok) return result.value; }
  return suggestColor(key, used);
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new InvalidFlowplanBackup(`${path} must be a boolean.`);
  return value;
}

function decodeFlowplanBackupVersion(text: string, version: 1 | 2 | 3 | 4 | 5): PlanningSessionState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  const envelope = object(parsed, "backup", ["format", "version", "exportedAt", "data"]);
  if (envelope.format !== "flowplan") throw new InvalidFlowplanBackup("Unknown format.");
  if (envelope.version !== version) throw new InvalidFlowplanBackup("Unsupported version.");
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
  const programColors: string[] = [];
  const programs = array(source.programs, "programs").map((v) => {
    const p = object(v, "program", ["id", "name"], version >= 3 ? ["color"] : []);
    const id = valid(createProgramId(string(p.id, "program.id")));
    const color = repairedColor(p.color, id, programColors);
    programColors.push(color);
    return valid(createProgram({ id, name: name(p.name, "program.name"), color }));
  });
  const priorityFamilies = array(source.priorityFamilies, "priorityFamilies").map((v) => {
    const p = object(v, "priorityFamily", ["id", "name"]);
    return valid(createPriorityFamily({ id: valid(createPriorityFamilyId(string(p.id, "priorityFamily.id"))), name: name(p.name, "priorityFamily.name") }));
  });
  const usedColors = [...programColors];
  const repairOwnColor = (value: unknown, key: string): string => {
    const color = repairedColor(value, key, usedColors);
    usedColors.push(color);
    return color;
  };
  const projects = array(source.projects, "projects").map((v) => {
    const p = object(v, "project", ["id", "name", "requirements", ...(version >= 2 ? ["isActive"] : []), ...(version === 5 ? ["migrationStatus"] : [])], ["programId", "priorityFamilyId", "earliestStartDate", "objectiveEndDate", "mandatoryDeadline", ...(version >= 3 ? ["ownColor"] : []), ...(version === 4 ? ["actuals"] : []), ...(version === 5 ? ["legacyV4Actuals", "snapshots"] : [])]);
    const requirements = array(p.requirements, "requirements").map((v) => {
      const r = object(v, "requirement", ["teamId", "remainingWorkload", ...(version === 4 ? ["rafAuthority"] : [])], ["dailyCap"]);
      const rafAuthority = version === 4 ? string(r.rafAuthority, "requirement.rafAuthority") : undefined;
      if (rafAuthority !== undefined && rafAuthority !== "latest-actuals" && rafAuthority !== "current-configuration") throw new InvalidFlowplanBackup("Invalid RAF authority.");
      return valid(createProjectTeamRequirement({ teamId: valid(createTeamId(string(r.teamId, "requirement.teamId"))),
        remainingWorkload: quantity(r.remainingWorkload, "requirement.remainingWorkload", remainingWorkloadFromSerialized),
        ...(r.dailyCap === undefined ? {} : { dailyCap: quantity(r.dailyCap, "requirement.dailyCap", dailyCapFromSerialized) }),
        rafAuthority: rafAuthority ?? "current-configuration" }));
    });
    const actuals = version === 4 && p.actuals !== undefined ? decodeActuals(p.actuals, true) : undefined;
    const legacy = version === 5 && p.legacyV4Actuals !== undefined ? decodeProjectLegacy(p.legacyV4Actuals) : undefined;
    const snapshots = version === 5 && p.snapshots !== undefined ? array(p.snapshots, "project.snapshots").map((item, index) =>
      decodeSnapshot(item, true, `project.snapshots[${index}]`) as ProjectActualsSnapshot) : undefined;
    if (version === 5) {
      const expected = snapshots?.length ? legacy ? "reconciled" : "native" : legacy ? "legacy-pending" : "none";
      if (p.migrationStatus !== expected || (snapshots && snapshots.length === 0)) throw new InvalidFlowplanBackup("Invalid Project migration status.");
    }
    const resolvedRequirements = version === 5 && legacy && !snapshots?.length ? requirements.map((row) => ({ ...row,
      rafAuthority: legacy.authority.find((item) => item.teamId === row.teamId)?.authority ?? "current-configuration" as const })) : requirements;
    return valid(createProject({ id: valid(createProjectId(string(p.id, "project.id"))), name: name(p.name, "project.name"), requirements: resolvedRequirements,
      ...(actuals === undefined ? {} : { actuals, legacyV4Actuals: actuals,
        legacyV4RafAuthority: requirements.map((row) => ({ teamId: row.teamId, authority: row.rafAuthority ?? "current-configuration" })) }),
      ...(legacy === undefined ? {} : { actuals: legacy.actuals, legacyV4Actuals: legacy.actuals, legacyV4RafAuthority: legacy.authority }),
      ...(snapshots === undefined ? {} : { snapshots }),
      isActive: version >= 2 ? boolean(p.isActive, "project.isActive") : true,
      ...(p.programId === undefined ? { ownColor: repairOwnColor(p.ownColor, String(p.id)) } : { programId: valid(createProgramId(string(p.programId, "project.programId"))) }),
      ...(p.priorityFamilyId === undefined ? {} : { priorityFamilyId: valid(createPriorityFamilyId(string(p.priorityFamilyId, "project.priorityFamilyId"))) }),
      ...(p.earliestStartDate === undefined ? {} : { earliestStartDate: date(p.earliestStartDate, "project.earliestStartDate") }),
      ...(p.objectiveEndDate === undefined ? {} : { objectiveEndDate: date(p.objectiveEndDate, "project.objectiveEndDate") }),
      ...(p.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: date(p.mandatoryDeadline, "project.mandatoryDeadline") }) }));
  });
  const reservations = array(source.reservations, "reservations").map((v) => {
    const r = object(v, "reservation", ["id", "name", "startDate", "endDate", "teamAllocations", ...(version >= 2 ? ["isActive"] : []), ...(version === 5 ? ["migrationStatus"] : [])], version >= 3 ? ["programId", "priorityFamilyId", "ownColor", ...(version === 4 ? ["actuals"] : []), ...(version === 5 ? ["legacyV4Actuals", "snapshots"] : [])] : []);
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
    const actuals = version === 4 && r.actuals !== undefined ? decodeActuals(r.actuals, false) : undefined;
    const legacy = version === 5 && r.legacyV4Actuals !== undefined ? decodeActuals(r.legacyV4Actuals, false) : undefined;
    const snapshots = version === 5 && r.snapshots !== undefined ? array(r.snapshots, "reservation.snapshots").map((item, index) =>
      decodeSnapshot(item, false, `reservation.snapshots[${index}]`) as ReservationActualsSnapshot) : undefined;
    if (version === 5) {
      const expected = snapshots?.length ? legacy ? "reconciled" : "native" : legacy ? "legacy-pending" : "none";
      if (r.migrationStatus !== expected || (snapshots && snapshots.length === 0)) throw new InvalidFlowplanBackup("Invalid Reservation migration status.");
    }
    return valid(createReservation({ id: valid(createReservationId(string(r.id, "reservation.id"))), name: name(r.name, "reservation.name"),
      ...(actuals === undefined ? {} : { actuals, legacyV4Actuals: actuals }),
      ...(legacy === undefined ? {} : { actuals: legacy, legacyV4Actuals: legacy }),
      ...(snapshots === undefined ? {} : { snapshots }),
      isActive: version >= 2 ? boolean(r.isActive, "reservation.isActive") : true,
      ...(r.programId === undefined ? { ownColor: repairOwnColor(r.ownColor, String(r.id)) } : { programId: valid(createProgramId(string(r.programId, "reservation.programId"))) }),
      ...(r.priorityFamilyId === undefined ? {} : { priorityFamilyId: valid(createPriorityFamilyId(string(r.priorityFamilyId, "reservation.priorityFamilyId"))) }),
      startDate: date(r.startDate, "reservation.startDate"), endDate: date(r.endDate, "reservation.endDate"), teamAllocations }));
  });
  const priorityOrder = array(source.priorityOrder, "priorityOrder").map((v) => valid(createProjectId(string(v, "priorityOrder.id"))));
  const usedPrograms = new Set([...projects.map((p) => p.programId), ...reservations.map((r) => r.programId)]);
  const usedFamilies = new Set([...projects.map((p) => p.priorityFamilyId), ...reservations.map((r) => r.priorityFamilyId)]);
  const portfolio = valid(createPortfolio({ teams, projects, programs: programs.filter((p) => usedPrograms.has(p.id)),
    priorityFamilies: priorityFamilies.filter((p) => usedFamilies.has(p.id)), priorityOrder, reservations }));
  return Object.freeze({ portfolio, planning: Object.freeze({ startDate: horizon.start, endDate: horizon.end, workingPattern, maxParallelProjects }) });
}

export function decodeFlowplanBackupV1(text: string): PlanningSessionState {
  return decodeFlowplanBackupVersion(text, 1);
}

export function decodeFlowplanBackup(text: string): PlanningSessionState {
  let envelope: unknown;
  try { envelope = JSON.parse(text); } catch { throw new InvalidFlowplanBackup("Invalid JSON."); }
  const source = object(envelope, "backup", ["format", "version", "exportedAt", "data"]);
  if (source.version !== 1 && source.version !== 2 && source.version !== 3 && source.version !== 4 && source.version !== 5) throw new InvalidFlowplanBackup("Unsupported version.");
  return decodeFlowplanBackupVersion(text, source.version);
}
