import { immutableCopy, type PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import {
  capacityFromSerialized,
  createCapacityPeriod,
  createReservation,
  createReservationTeamAllocation,
  createMaxParallelProjects,
  createPlanningHorizon,
  createPortfolio,
  createProject,
  createProjectTeamRequirement,
  createTeam,
  createTeamCapacitySchedule,
  createWorkingPattern,
  transitionProjectRequirements,
  replaceProjectSnapshot,
  replaceReservationSnapshot,
  serializeQuantity,
  reservationRatioFromSerialized,
  unavailabilityRatioFromSerialized,
  type Capacity,
  type CapacityPeriod,
  type CivilDate,
  type DailyCap,
  type DomainError,
  type Portfolio,
  type ProjectId,
  type ProgramId,
  type PriorityFamilyId,
  type ReservationId,
  type Reservation,
  type ReservationRatio,
  type RemainingWorkload,
  type Team,
  type TeamId,
  type UnavailabilityRatio,
  type WorkingPattern,
  type MaxParallelProjects,
  type ReservationActualsChronology,
  type ProjectActualsSnapshot,
  type ReservationActualsSnapshot,
  type SnapshotEvidence,
  type SnapshotEditIntent,
} from "../../domain/index.js";
import { createTeamIdGenerator, type TeamIdGenerator } from "./teamIdGenerator.js";
import { createProjectIdGenerator, type ProjectIdGenerator } from "./projectIdGenerator.js";
import { createReservationIdGenerator, type ReservationIdGenerator } from "./reservationIdGenerator.js";
import { GroupingResolutionError, pruneCatalogs, resolveGrouping, type GroupingEdit } from "./resolveGrouping.js";

export interface PlanningSettings {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly workingPattern: WorkingPattern;
  readonly maxParallelProjects: MaxParallelProjects;
}

export interface PlanningSessionState {
  readonly portfolio: Portfolio;
  readonly planning: PlanningSettings;
  /** Optional only for pre-V6 seed callers; sessions always normalize to an empty collection. */
  readonly portfolioSnapshots?: readonly PortfolioSnapshot[];
}

export interface UpdatePlanningSettingsCommand {
  readonly kind: "update-planning-settings";
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly workingPattern: WorkingPattern;
  readonly maxParallelProjects: number;
}

export interface UpdateProjectTeamRequirement {
  readonly teamId: TeamId;
  readonly remainingWorkload: RemainingWorkload;
  readonly dailyCap?: DailyCap;
}

export interface UpdateProjectCommand extends GroupingEdit {
  readonly kind: "update-project";
  readonly projectId: ProjectId;
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly teamRequirements: readonly UpdateProjectTeamRequirement[];
}

export interface CreateProjectCommand extends GroupingEdit {
  readonly kind: "create-project";
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly earliestStartDate?: CivilDate;
  readonly objectiveEndDate?: CivilDate;
  readonly mandatoryDeadline?: CivilDate;
  readonly teamRequirements: readonly UpdateProjectTeamRequirement[];
}

export interface RemoveProjectCommand {
  readonly kind: "remove-project";
  readonly projectId: ProjectId;
}

export interface ReorderProjectCommand {
  readonly kind: "reorder-project";
  readonly projectId: ProjectId;
  /** One is the highest user-facing priority. */
  readonly targetPosition: number;
}

export interface SetProjectActiveCommand {
  readonly kind: "set-project-active";
  readonly projectId: ProjectId;
  readonly isActive: boolean;
}

export interface SetReservationActiveCommand {
  readonly kind: "set-reservation-active";
  readonly reservationId: ReservationId;
  readonly isActive: boolean;
}

export interface UpdateTeamCapacityPeriod {
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly capacity: Capacity;
  readonly unavailability: UnavailabilityRatio;
}

export interface UpdateTeamNameCommand {
  readonly kind: "update-team-name";
  readonly teamId: TeamId;
  readonly name: string;
}

export interface CreateTeamCommand {
  readonly kind: "create-team";
  readonly name: string;
  readonly capacityPeriods: readonly UpdateTeamCapacityPeriod[];
}

export interface RemoveTeamCommand {
  readonly kind: "remove-team";
  readonly teamId: TeamId;
}

export interface UpdateTeamCapacityPeriodsCommand {
  readonly kind: "update-team-capacity-periods";
  readonly teamId: TeamId;
  /** Complete replacement; the Domain normalizes chronological order. */
  readonly capacityPeriods: readonly UpdateTeamCapacityPeriod[];
}

export type UpdateReservationTeamAllocation =
  | Readonly<{ teamId: TeamId; kind: "ratio"; ratio: ReservationRatio }>
  | Readonly<{ teamId: TeamId; kind: "fixed-daily"; dailyCapacity: Capacity }>;

export interface UpdateReservationCommand extends GroupingEdit {
  readonly kind: "update-reservation";
  readonly reservationId: ReservationId;
  readonly name: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly UpdateReservationTeamAllocation[];
}

export interface CreateReservationCommand extends GroupingEdit {
  readonly kind: "create-reservation";
  readonly name: string;
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly UpdateReservationTeamAllocation[];
}

export interface RemoveReservationCommand {
  readonly kind: "remove-reservation";
  readonly reservationId: ReservationId;
}

export interface ReplaceProjectActualsCommand {
  readonly kind: "replace-project-actuals";
  readonly projectId: ProjectId;
  readonly baseVersion: number;
  readonly current: Omit<ProjectActualsSnapshot, "snapshotId" | "version" | "knowledgeDate">;
  readonly evidence: SnapshotEvidence;
  readonly intent: SnapshotEditIntent;
  /** Complete Forecast participation, in Portfolio Team order. RAF comes from current. */
  readonly teamRequirements: readonly Readonly<{ teamId: TeamId; dailyCap?: DailyCap }>[];
}

export interface ReplaceReservationActualsCommand {
  readonly kind: "replace-reservation-actuals";
  readonly reservationId: ReservationId;
  readonly baseVersion: number;
  readonly current: Omit<ReservationActualsSnapshot, "snapshotId" | "version" | "knowledgeDate">;
  readonly evidence: SnapshotEvidence;
  readonly intent: SnapshotEditIntent;
  readonly teamAllocations: readonly UpdateReservationTeamAllocation[];
}

export type PlanningCommand =
  | UpdatePlanningSettingsCommand
  | UpdateProjectCommand
  | CreateProjectCommand
  | RemoveProjectCommand
  | ReorderProjectCommand
  | SetProjectActiveCommand
  | SetReservationActiveCommand
  | CreateTeamCommand
  | RemoveTeamCommand
  | UpdateTeamNameCommand
  | UpdateTeamCapacityPeriodsCommand
  | UpdateReservationCommand
  | CreateReservationCommand
  | RemoveReservationCommand
  | ReplaceProjectActualsCommand
  | ReplaceReservationActualsCommand;

export type PlanningCommandResult =
  | Readonly<{ ok: true; state: PlanningSessionState }>
  | Readonly<{ ok: false; errors: readonly DomainError[] }>;

export interface PlanningSession {
  readonly commitPortfolioSnapshots: (expected: PlanningSessionState, snapshots: readonly PortfolioSnapshot[], beforeCommit: (candidate: PlanningSessionState) => void) => PlanningCommandResult;
  readonly getState: () => PlanningSessionState;
  readonly dispatch: (command: PlanningCommand, beforeCommit?: (candidate: PlanningSessionState) => void) => PlanningCommandResult;
}

export function createPlanningSession(
  initialState: PlanningSessionState,
  clock?: Readonly<{ today: () => CivilDate }>,
): PlanningSession {
  let state = freezeState({ ...initialState, portfolioSnapshots: immutableCopy(initialState.portfolioSnapshots ?? []) });
  const teamIds = createTeamIdGenerator(() => [...state.portfolio.teams.map((team) => team.id), ...historicalIds(state, "teams") as TeamId[]]);
  const projectIds = createProjectIdGenerator(() => [...state.portfolio.projects.map((project) => project.id), ...historicalIds(state, "projects") as ProjectId[]]);
  const reservationIds = createReservationIdGenerator(() => [...state.portfolio.reservations.map((reservation) => reservation.id), ...historicalIds(state, "reservations") as ReservationId[]]);
  const historicalProgramIds = new Set(state.portfolio.programs.map((program) => program.id));
  const historicalFamilyIds = new Set(state.portfolio.priorityFamilies.map((family) => family.id));
  const refreshCatalogIds = () => {
    historicalProgramIds.clear(); historicalFamilyIds.clear();
    for (const id of [...state.portfolio.programs.map((p) => p.id), ...historicalIds(state, "programs")]) historicalProgramIds.add(id as ProgramId);
    for (const id of [...state.portfolio.priorityFamilies.map((p) => p.id), ...historicalIds(state, "priorityFamilies")]) historicalFamilyIds.add(id as PriorityFamilyId);
  };
  refreshCatalogIds();
  return Object.freeze({
    getState: () => state,
    commitPortfolioSnapshots: (expected: PlanningSessionState, snapshots: readonly PortfolioSnapshot[], beforeCommit: (candidate: PlanningSessionState) => void): PlanningCommandResult => {
      if (state !== expected) return failure([applicationError("STALE_PROJECTION", "portfolioSnapshots", "Applied state and published projection differ.")]);
      const candidate = freezeState({ ...state, portfolioSnapshots: immutableCopy(snapshots) });
      try { beforeCommit(candidate); } catch { return failure([applicationError("COMMIT_FAILED", "portfolioSnapshots", "Portfolio history could not be saved.")]); }
      state = candidate; refreshCatalogIds();
      return Object.freeze({ ok: true, state });
    },
    dispatch: (command: PlanningCommand, beforeCommit?: (candidate: PlanningSessionState) => void): PlanningCommandResult => {
      let candidate: PlanningCommandResult;
      try { candidate = applyCommand(state, command, teamIds, projectIds, reservationIds, historicalProgramIds, historicalFamilyIds, clock); }
      catch (cause) {
        if (!(cause instanceof GroupingResolutionError)) throw cause;
        return failure([applicationError("INVALID_GROUPING", "grouping", cause.message)]);
      }
      if (!candidate.ok) return candidate;
      if (candidate.state === state) return Object.freeze({ ok: true, state });
      try {
        beforeCommit?.(candidate.state);
      } catch {
        return failure([applicationError("COMMIT_FAILED", "planning", "Planning change could not be saved.")]);
      }
      if (command.kind === "create-team") teamIds.next();
      if (command.kind === "create-project") projectIds.next();
      if (command.kind === "create-reservation") reservationIds.next();
      state = candidate.state;
      refreshCatalogIds();
      return Object.freeze({ ok: true, state });
    },
  });
}

function applyCommand(
  state: PlanningSessionState,
  command: PlanningCommand,
  teamIds: TeamIdGenerator,
  projectIds: ProjectIdGenerator,
  reservationIds: ReservationIdGenerator,
  historicalProgramIds: ReadonlySet<ProgramId>,
  historicalFamilyIds: ReadonlySet<PriorityFamilyId>,
  clock?: Readonly<{ today: () => CivilDate }>,
): PlanningCommandResult {
  if ((command as { kind: string }).kind === "append-project-actuals" ||
      (command as { kind: string }).kind === "append-reservation-actuals") {
    return failure([applicationError("LEGACY_ACTUALS_READ_ONLY", "actuals", "V4 Actuals records are read-only; reconcile into a V5 snapshot.")]);
  }
  switch (command.kind) {
    case "update-planning-settings":
      return updatePlanningSettings(state, command);
    case "update-project":
      return updateProject(state, command, historicalProgramIds, historicalFamilyIds);
    case "create-project":
      return addProject(state, command, projectIds, historicalProgramIds, historicalFamilyIds);
    case "remove-project":
      return removeProject(state, command);
    case "reorder-project":
      return reorderProject(state, command);
    case "set-project-active":
      return setProjectActive(state, command);
    case "set-reservation-active":
      return setReservationActive(state, command);
    case "create-team":
      return addTeam(state, command, teamIds);
    case "remove-team":
      return removeTeam(state, command);
    case "update-team-name":
      return updateTeamName(state, command);
    case "update-team-capacity-periods":
      return updateTeamCapacityPeriods(state, command);
    case "update-reservation":
      return updateReservation(state, command, historicalProgramIds, historicalFamilyIds);
    case "create-reservation":
      return addReservation(state, command, reservationIds, historicalProgramIds, historicalFamilyIds);
    case "remove-reservation":
      return removeReservation(state, command);
    case "replace-project-actuals":
      return replaceProjectActuals(state, command, clock);
    case "replace-reservation-actuals":
      return replaceReservationActuals(state, command, clock);
  }
}

function replaceProjectActuals(
  state: PlanningSessionState, command: ReplaceProjectActualsCommand,
  clock?: Readonly<{ today: () => CivilDate }>,
): PlanningCommandResult {
  if (!clock) return failure([applicationError("MISSING_APPLICATION_CLOCK", "actuals", "Actuals knowledge needs an application clock.")]);
  const project = state.portfolio.projects.find((item) => item.id === command.projectId);
  if (!project) return failure([applicationError("UNKNOWN_PROJECT", "projectId", "Project does not exist.")]);
  const expected = state.portfolio.teams.map((team) => team.id).filter((id) => command.teamRequirements.some((row) => row.teamId === id));
  if (command.teamRequirements.length !== expected.length ||
      command.teamRequirements.some((row, index) => row.teamId !== expected[index]) ||
      command.current.participation.length !== expected.length ||
      command.current.participation.some((id, index) => id !== expected[index])) {
    return failure([applicationError("ACTUALS_MEMBERSHIP_MISMATCH", "participation", "Snapshot and Forecast Teams must match Portfolio order.")]);
  }
  const priorHistory = project.snapshots ?? [];
  const history = replaceProjectSnapshot(project.id, priorHistory, {
    baseVersion: command.baseVersion, knowledgeDate: clock.today(), current: command.current, evidence: command.evidence,
    intent: command.intent,
  });
  if (!history.ok) return failure(history.errors);
  if (history.value === priorHistory) return Object.freeze({ ok: true, state });
  const raf = new Map(command.current.raf.map((row) => [row.teamId, row.amount]));
  const requirementResults = command.teamRequirements.map((row) => createProjectTeamRequirement({
    teamId: row.teamId, remainingWorkload: raf.get(row.teamId)!,
    ...(row.dailyCap === undefined ? {} : { dailyCap: row.dailyCap }),
  }));
  const requirementErrors = requirementResults.flatMap((result) => result.ok ? [] : result.errors);
  if (requirementErrors.length) return failure(requirementErrors);
  const updated = createProject({ ...project,
    requirements: requirementResults.map((result) => {
      if (!result.ok) throw new TypeError("Validated requirement failed.");
      return result.value;
    }), snapshots: history.value });
  if (!updated.ok) return failure(updated.errors);
  const portfolio = createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item) => item.id === project.id ? updated.value : item) });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function replaceReservationActuals(
  state: PlanningSessionState, command: ReplaceReservationActualsCommand,
  clock?: Readonly<{ today: () => CivilDate }>,
): PlanningCommandResult {
  if (!clock) return failure([applicationError("MISSING_APPLICATION_CLOCK", "actuals", "Actuals knowledge needs an application clock.")]);
  const reservation = state.portfolio.reservations.find((item) => item.id === command.reservationId);
  if (!reservation) return failure([applicationError("UNKNOWN_RESERVATION", "reservationId", "Reservation does not exist.")]);
  const expected = state.portfolio.teams.map((team) => team.id).filter((id) => command.teamAllocations.some((row) => row.teamId === id));
  if (command.teamAllocations.length !== expected.length ||
      command.teamAllocations.some((row, index) => row.teamId !== expected[index]) ||
      command.current.participation.length !== expected.length ||
      command.current.participation.some((id, index) => id !== expected[index])) {
    return failure([applicationError("ACTUALS_MEMBERSHIP_MISMATCH", "participation", "Snapshot and Forecast Teams must match Portfolio order.")]);
  }
  const priorHistory = reservation.snapshots ?? [];
  const history = replaceReservationSnapshot(reservation.id, priorHistory, {
    baseVersion: command.baseVersion, knowledgeDate: clock.today(), current: command.current, evidence: command.evidence,
    intent: command.intent,
  });
  if (!history.ok) return failure(history.errors);
  if (history.value === priorHistory) return Object.freeze({ ok: true, state });
  const allocations = command.teamAllocations.map((row) => createReservationTeamAllocation({
    teamId: row.teamId, amount: row.kind === "ratio"
      ? { kind: "ratio", ratio: row.ratio } : { kind: "fixed-daily", dailyCapacity: row.dailyCapacity },
  }));
  const allocationErrors = allocations.flatMap((result) => result.ok ? [] : result.errors);
  if (allocationErrors.length) return failure(allocationErrors);
  const updated = createReservation({ ...reservation, teamAllocations: allocations.map((result) => {
    if (!result.ok) throw new TypeError("Validated allocation failed.");
    return result.value;
  }), snapshots: history.value });
  if (!updated.ok) return failure(updated.errors);
  return replaceReservations(state, state.portfolio.reservations.map((item) => item.id === reservation.id ? updated.value : item));
}

function addReservation(
  state: PlanningSessionState,
  command: CreateReservationCommand,
  ids: ReservationIdGenerator,
  historicalProgramIds: ReadonlySet<ProgramId>,
  historicalFamilyIds: ReadonlySet<PriorityFamilyId>,
): PlanningCommandResult {
  const grouping = resolveGrouping(state.portfolio, command, ids.peek(), undefined, historicalProgramIds, historicalFamilyIds);
  const validated = buildReservation(state, command, ids.peek(), true, grouping);
  if (!validated.ok) return failure(validated.errors);
  return replaceReservations(state, [...state.portfolio.reservations, validated.value], grouping);
}

function removeReservation(state: PlanningSessionState, command: RemoveReservationCommand): PlanningCommandResult {
  const existing = state.portfolio.reservations.find((reservation) => reservation.id === command.reservationId);
  if (!existing) {
    return failure([applicationError("UNKNOWN_RESERVATION", "reservationId",
      `Reservation ${command.reservationId} does not exist in the current portfolio.`)]);
  }
  if (existing.actuals || existing.legacyV4Actuals || existing.snapshots?.length) return failure([applicationError("RESERVATION_HAS_ACTUALS", "reservationId", "Reservation with Actuals cannot be deleted.")]);
  return replaceReservations(state, state.portfolio.reservations.filter((reservation) => reservation.id !== command.reservationId));
}

function updateReservation(
  state: PlanningSessionState,
  command: UpdateReservationCommand,
  historicalProgramIds: ReadonlySet<ProgramId>,
  historicalFamilyIds: ReadonlySet<PriorityFamilyId>,
): PlanningCommandResult {
  const reservationIndex = state.portfolio.reservations.findIndex(
    (reservation) => reservation.id === command.reservationId,
  );
  if (reservationIndex < 0) {
    return failure([
      applicationError(
        "UNKNOWN_RESERVATION",
        "reservationId",
        `Reservation ${command.reservationId} does not exist in the current portfolio.`,
      ),
    ]);
  }
  const previous = state.portfolio.reservations[reservationIndex]!;
  const grouping = resolveGrouping(state.portfolio, command, command.reservationId, previous, historicalProgramIds, historicalFamilyIds);
  const updated = buildReservation(state, command, command.reservationId,
    previous.isActive, grouping, previous.actuals, previous.snapshots, previous.legacyV4Actuals);
  if (!updated.ok) return failure(updated.errors);
  const reservations = state.portfolio.reservations.map((reservation, index) =>
    index === reservationIndex ? updated.value : reservation,
  );
  return replaceReservations(state, reservations, grouping);
}

function buildReservation(
  state: PlanningSessionState,
  command: CreateReservationCommand | UpdateReservationCommand,
  id: ReservationId,
  isActive = true,
  grouping?: ReturnType<typeof resolveGrouping>,
  actuals?: ReservationActualsChronology,
  snapshots?: Reservation["snapshots"],
  legacyV4Actuals?: Reservation["legacyV4Actuals"],
): ReturnType<typeof createReservation> {
  const errors: DomainError[] = [];
  const teamIds = new Set<TeamId>();
  const knownTeamIds = new Set(state.portfolio.teams.map((team) => team.id));
  const allocations = command.teamAllocations.map((allocation, index) => {
    const path = `reservation.teamAllocations[${index}]`;
    if (teamIds.has(allocation.teamId)) {
      errors.push(
        applicationError(
          "DUPLICATE_RESERVATION_TEAM_ALLOCATION",
          `${path}.teamId`,
          "A team may appear only once in reservation allocations.",
        ),
      );
    }
    teamIds.add(allocation.teamId);
    if (!knownTeamIds.has(allocation.teamId)) {
      errors.push(
        applicationError(
          "UNKNOWN_RESERVATION_TEAM",
          `${path}.teamId`,
          "Reservation allocation must reference an existing team.",
        ),
      );
    }
    const amount = allocation.kind === "ratio"
      ? reservationRatioFromSerialized(serializeQuantity(allocation.ratio), `${path}.ratio`)
      : capacityFromSerialized(serializeQuantity(allocation.dailyCapacity), `${path}.dailyCapacity`);
    if (!amount.ok) {
      errors.push(...amount.errors);
      return undefined;
    }
    const result = createReservationTeamAllocation({
      teamId: allocation.teamId,
      amount: allocation.kind === "ratio"
        ? Object.freeze({ kind: "ratio", ratio: amount.value as ReservationRatio })
        : Object.freeze({ kind: "fixed-daily", dailyCapacity: amount.value as Capacity }),
    });
    if (!result.ok) {
      errors.push(...result.errors);
      return undefined;
    }
    return result.value;
  });
  if (errors.length > 0 || allocations.some((item) => item === undefined)) {
    return { ok: false, errors };
  }
  const validated = allocations.filter(
    (item): item is NonNullable<typeof item> => item !== undefined,
  );
  return createReservation({
    id,
    isActive,
    ...(grouping?.programId === undefined ? {} : { programId: grouping.programId }),
    ...(grouping?.priorityFamilyId === undefined ? {} : { priorityFamilyId: grouping.priorityFamilyId }),
    ...(grouping?.ownColor === undefined ? {} : { ownColor: grouping.ownColor }),
    name: command.name,
    startDate: command.startDate,
    endDate: command.endDate,
    teamAllocations: validated,
    ...(actuals === undefined ? {} : { actuals }),
    ...(snapshots === undefined ? {} : { snapshots }),
    ...(legacyV4Actuals === undefined ? {} : { legacyV4Actuals }),
  });
}

function replaceReservations(state: PlanningSessionState, reservations: readonly Reservation[], grouping?: ReturnType<typeof resolveGrouping>): PlanningCommandResult {
  const catalogs = pruneCatalogs({ projects: state.portfolio.projects, reservations,
    programs: grouping?.programs ?? state.portfolio.programs,
    priorityFamilies: grouping?.priorityFamilies ?? state.portfolio.priorityFamilies });
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: state.portfolio.projects,
    programs: catalogs.programs,
    priorityFamilies: catalogs.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({
    ok: true,
    state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }),
  });
}

function updatePlanningSettings(
  state: PlanningSessionState,
  command: UpdatePlanningSettingsCommand,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const horizon = createPlanningHorizon({
    start: command.startDate,
    end: command.endDate,
  });
  if (!horizon.ok) errors.push(...horizon.errors);
  const workingPattern = createWorkingPattern({
    workingWeekdays: command.workingPattern.workingWeekdays,
  });
  if (!workingPattern.ok) errors.push(...workingPattern.errors);
  if (
    workingPattern.ok &&
    workingPattern.value.workingWeekdays.length === 0
  ) {
    errors.push(
      applicationError(
        "EMPTY_WORKING_WEEK",
        "planning.workingWeekdays",
        "At least one working weekday is required.",
      ),
    );
  }
  const maxParallelProjects = createMaxParallelProjects(
    command.maxParallelProjects,
    "planning.maxParallelProjects",
  );
  if (!maxParallelProjects.ok) errors.push(...maxParallelProjects.errors);
  if (!horizon.ok || !workingPattern.ok || !maxParallelProjects.ok || errors.length > 0) {
    return failure(errors);
  }
  return Object.freeze({
    ok: true,
    state: freezeState({
      ...state,
      portfolio: state.portfolio,
      planning: Object.freeze({
        startDate: horizon.value.start,
        endDate: horizon.value.end,
        workingPattern: workingPattern.value,
        maxParallelProjects: maxParallelProjects.value,
      }),
    }),
  });
}

function updateTeamName(
  state: PlanningSessionState,
  command: UpdateTeamNameCommand,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([
      applicationError("EMPTY_TEAM_NAME", "team.name", "Team name must not be empty."),
    ]);
  }
  const teamIndex = state.portfolio.teams.findIndex(
    (team) => team.id === command.teamId,
  );
  if (teamIndex < 0) {
    return failure([
      applicationError(
        "UNKNOWN_TEAM",
        "teamId",
        `Team ${command.teamId} does not exist in the current portfolio.`,
      ),
    ]);
  }
  const currentTeam = state.portfolio.teams[teamIndex]!;
  const updatedTeam = createTeam({
    id: currentTeam.id,
    name,
    capacitySchedule: currentTeam.capacitySchedule,
  });
  if (!updatedTeam.ok) return failure(updatedTeam.errors);
  return replaceTeam(state, teamIndex, updatedTeam.value);
}

function addTeam(
  state: PlanningSessionState,
  command: CreateTeamCommand,
  teamIds: TeamIdGenerator,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([applicationError("EMPTY_TEAM_NAME", "team.name", "Team name must not be empty.")]);
  }
  if (command.capacityPeriods.length === 0) {
    return failure([applicationError("EMPTY_TEAM_CAPACITY_PERIODS", "team.capacityPeriods",
      "A new Team needs at least one capacity period.")]);
  }
  const periodResult = buildTeamCapacityPeriods(command.capacityPeriods);
  if (!periodResult.ok) return failure(periodResult.errors);
  const schedule = createTeamCapacitySchedule({ periods: periodResult.periods, exceptions: [] });
  if (!schedule.ok) return failure(schedule.errors);
  const team = createTeam({ id: teamIds.peek(), name, capacitySchedule: schedule.value });
  if (!team.ok) return failure(team.errors);
  const portfolio = createPortfolio({
    teams: [...state.portfolio.teams, team.value],
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function removeTeam(
  state: PlanningSessionState,
  command: RemoveTeamCommand,
): PlanningCommandResult {
  if (!state.portfolio.teams.some((team) => team.id === command.teamId)) {
    return failure([applicationError("UNKNOWN_TEAM", "teamId",
      `Team ${command.teamId} does not exist in the current portfolio.`)]);
  }
  const errors: DomainError[] = [];
  state.portfolio.projects.forEach((project, projectIndex) => {
    if ((project.legacyV4Actuals ?? project.actuals)?.records.some((record) => record.teams.some((entry) => entry.teamId === command.teamId))) {
      errors.push(applicationError("TEAM_REFERENCED_BY_PROJECT_ACTUALS", `projects[${projectIndex}].actuals`, `Team ${command.teamId} is in Project Actuals.`));
    }
    if (project.snapshots?.some((snapshot) => snapshot.participation.includes(command.teamId) || snapshot.retiredZeroTeams.includes(command.teamId))) {
      errors.push(applicationError("TEAM_REFERENCED_BY_PROJECT_ACTUALS", `projects[${projectIndex}].snapshots`, `Team ${command.teamId} is in Project snapshot history.`));
    }
    project.requirements.forEach((requirement, requirementIndex) => {
      if (requirement.teamId === command.teamId) errors.push(applicationError(
        "TEAM_REFERENCED_BY_PROJECT",
        `projects[${projectIndex}].requirements[${requirementIndex}].teamId`,
        `Team ${command.teamId} is used by Project ${project.name}.`,
      ));
    });
  });
  state.portfolio.reservations.forEach((reservation, reservationIndex) => {
    if ((reservation.legacyV4Actuals ?? reservation.actuals)?.records.some((record) => record.teams.some((entry) => entry.teamId === command.teamId))) {
      errors.push(applicationError("TEAM_REFERENCED_BY_RESERVATION_ACTUALS", `reservations[${reservationIndex}].actuals`, `Team ${command.teamId} is in Reservation Actuals.`));
    }
    if (reservation.snapshots?.some((snapshot) => snapshot.participation.includes(command.teamId) || snapshot.retiredZeroTeams.includes(command.teamId))) {
      errors.push(applicationError("TEAM_REFERENCED_BY_RESERVATION_ACTUALS", `reservations[${reservationIndex}].snapshots`, `Team ${command.teamId} is in Reservation snapshot history.`));
    }
    reservation.teamAllocations.forEach((allocation, allocationIndex) => {
      if (allocation.teamId === command.teamId) errors.push(applicationError(
        "TEAM_REFERENCED_BY_RESERVATION",
        `reservations[${reservationIndex}].teamAllocations[${allocationIndex}].teamId`,
        `Team ${command.teamId} is used by Reservation ${reservation.name}.`,
      ));
    });
  });
  if (errors.length > 0) return failure(errors);
  const portfolio = createPortfolio({
    teams: state.portfolio.teams.filter((team) => team.id !== command.teamId),
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function buildTeamCapacityPeriods(
  inputs: readonly UpdateTeamCapacityPeriod[],
): Readonly<{ ok: true; periods: readonly CapacityPeriod[] }> | Readonly<{ ok: false; errors: readonly DomainError[] }> {
  const results = inputs.map((period, index) => {
    const path = `team.capacityPeriods[${index}]`;
    const capacity = capacityFromSerialized(serializeQuantity(period.capacity), `${path}.capacity`);
    const unavailability = unavailabilityRatioFromSerialized(
      serializeQuantity(period.unavailability), `${path}.unavailability`);
    if (!capacity.ok || !unavailability.ok) return {
      ok: false as const,
      errors: [...(capacity.ok ? [] : capacity.errors), ...(unavailability.ok ? [] : unavailability.errors)],
    };
    return createCapacityPeriod({ start: period.startDate, end: period.endDate,
      dailyCapacity: capacity.value, unavailabilityRatio: unavailability.value });
  });
  const errors = results.flatMap((result) => result.ok ? [] : result.errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, periods: results.map((result) => {
    if (!result.ok) throw new TypeError("Validated capacity period failed.");
    return result.value;
  }) };
}

function updateTeamCapacityPeriods(
  state: PlanningSessionState,
  command: UpdateTeamCapacityPeriodsCommand,
): PlanningCommandResult {
  const teamIndex = state.portfolio.teams.findIndex(
    (team) => team.id === command.teamId,
  );
  if (teamIndex < 0) {
    return failure([
      applicationError("UNKNOWN_TEAM", "teamId", `Team ${command.teamId} does not exist in the current portfolio.`),
    ]);
  }
  const periodResult = buildTeamCapacityPeriods(command.capacityPeriods);
  if (!periodResult.ok) return failure(periodResult.errors);
  const currentTeam = state.portfolio.teams[teamIndex]!;
  const capacitySchedule = createTeamCapacitySchedule({
    periods: periodResult.periods,
    exceptions: currentTeam.capacitySchedule.exceptions,
  });
  if (!capacitySchedule.ok) return failure(capacitySchedule.errors);
  const updatedTeam = createTeam({
    id: currentTeam.id,
    name: currentTeam.name,
    capacitySchedule: capacitySchedule.value,
  });
  if (!updatedTeam.ok) return failure(updatedTeam.errors);
  return replaceTeam(state, teamIndex, updatedTeam.value);
}

function replaceTeam(
  state: PlanningSessionState,
  teamIndex: number,
  updatedTeam: Team,
): PlanningCommandResult {
  const teams = state.portfolio.teams.map((team, index) =>
    index === teamIndex ? updatedTeam : team,
  );
  const portfolio = createPortfolio({
    teams,
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({
    ok: true,
    state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }),
  });
}

function addProject(
  state: PlanningSessionState,
  command: CreateProjectCommand,
  projectIds: ProjectIdGenerator,
  historicalProgramIds: ReadonlySet<ProgramId>,
  historicalFamilyIds: ReadonlySet<PriorityFamilyId>,
): PlanningCommandResult {
  const name = command.name.trim();
  if (name.length === 0) {
    return failure([applicationError("EMPTY_PROJECT_LABEL", "project.name", "Project label must not be empty.")]);
  }
  const requirementResults = command.teamRequirements.map((requirement) =>
    createProjectTeamRequirement(requirement));
  const errors = requirementResults.flatMap((result) => result.ok ? [] : result.errors);
  if (errors.length > 0) return failure(errors);
  const requirements = requirementResults.map((result) => {
    if (!result.ok) throw new TypeError("Validated Project requirement failed.");
    return result.value;
  });
  const id = projectIds.peek();
  const grouping = resolveGrouping(state.portfolio, command, id, undefined, historicalProgramIds, historicalFamilyIds);
  const project = createProject({
    id, name,
    ...(grouping.programId === undefined ? {} : { programId: grouping.programId }),
    ...(grouping.priorityFamilyId === undefined ? {} : { priorityFamilyId: grouping.priorityFamilyId }),
    ...(grouping.ownColor === undefined ? {} : { ownColor: grouping.ownColor }),
    ...(command.earliestStartDate === undefined ? {} : { earliestStartDate: command.earliestStartDate }),
    ...(command.objectiveEndDate === undefined ? {} : { objectiveEndDate: command.objectiveEndDate }),
    ...(command.mandatoryDeadline === undefined ? {} : { mandatoryDeadline: command.mandatoryDeadline }),
    requirements,
  });
  if (!project.ok) return failure(project.errors);
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: [...state.portfolio.projects, project.value],
    programs: grouping.programs,
    priorityFamilies: grouping.priorityFamilies,
    priorityOrder: [...state.portfolio.priorityOrder, id],
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function removeProject(
  state: PlanningSessionState,
  command: RemoveProjectCommand,
): PlanningCommandResult {
  const existing = state.portfolio.projects.find((project) => project.id === command.projectId);
  if (!existing) {
    return failure([applicationError("UNKNOWN_PROJECT", "projectId",
      `Project ${command.projectId} does not exist in the current portfolio.`)]);
  }
  if (existing.actuals || existing.legacyV4Actuals || existing.snapshots?.length) return failure([applicationError("PROJECT_HAS_ACTUALS", "projectId", "Project with Actuals cannot be deleted.")]);
  const projects = state.portfolio.projects.filter((project) => project.id !== command.projectId);
  const catalogs = pruneCatalogs({ projects, reservations: state.portfolio.reservations,
    programs: state.portfolio.programs, priorityFamilies: state.portfolio.priorityFamilies });
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects,
    programs: catalogs.programs,
    priorityFamilies: catalogs.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder.filter((id) => id !== command.projectId),
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function updateProject(
  state: PlanningSessionState,
  command: UpdateProjectCommand,
  historicalProgramIds: ReadonlySet<ProgramId>,
  historicalFamilyIds: ReadonlySet<PriorityFamilyId>,
): PlanningCommandResult {
  const errors: DomainError[] = [];
  const name = command.name.trim();
  if (name.length === 0) {
    errors.push(
      applicationError(
        "EMPTY_PROJECT_LABEL",
        "project.name",
        "Project label must not be empty.",
      ),
    );
  }
  const projectIndex = state.portfolio.projects.findIndex(
    (project) => project.id === command.projectId,
  );
  if (projectIndex < 0) {
    errors.push(
      applicationError(
        "UNKNOWN_PROJECT",
        "projectId",
        `Project ${command.projectId} does not exist in the current portfolio.`,
      ),
    );
  }
  if (errors.length > 0 || projectIndex < 0) return failure(errors);

  const project = state.portfolio.projects[projectIndex]!;
  const grouping = resolveGrouping(state.portfolio, command, project.id, project, historicalProgramIds, historicalFamilyIds);
  const validTeamIds = new Set(state.portfolio.teams.map((team) => team.id));
  const currentRequirementsByTeam = new Map(
    project.requirements.map((requirement) => [requirement.teamId, requirement]),
  );
  const replacements = new Map<TeamId, UpdateProjectTeamRequirement>();
  command.teamRequirements.forEach((requirement, index) => {
    const path = `requirements.${requirement.teamId}`;
    const currentDailyCap = currentRequirementsByTeam.get(requirement.teamId)?.dailyCap;
    if (replacements.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
          path,
          "A project team requirement may appear only once.",
        ),
      );
    } else if (!validTeamIds.has(requirement.teamId)) {
      errors.push(
        applicationError(
          "UNKNOWN_PROJECT_TEAM_REQUIREMENT",
          `teamRequirements[${index}].teamId`,
          "Project requirement Team must exist in the portfolio.",
        ),
      );
    }
    if (
      requirement.dailyCap !== undefined &&
      serializeQuantity(requirement.dailyCap) === "0/1" &&
      (currentDailyCap === undefined || serializeQuantity(currentDailyCap) !== "0/1")
    ) {
      errors.push(
        applicationError(
          "NON_POSITIVE_DAILY_CAP",
          `${path}.dailyCap`,
          "Daily cap must be greater than zero when provided.",
        ),
      );
    }
    replacements.set(requirement.teamId, requirement);
  });
  if (errors.length > 0) return failure(errors);

  const requirementResults = state.portfolio.teams.flatMap((team) => {
    const replacement = replacements.get(team.id);
    if (replacement === undefined) return [];
    const dailyCap = replacement.dailyCap ?? currentRequirementsByTeam.get(team.id)?.dailyCap;
    return [createProjectTeamRequirement({
      teamId: team.id,
      remainingWorkload: replacement.remainingWorkload,
      ...(dailyCap === undefined ? {} : { dailyCap }),
    })];
  });
  const requirementErrors = requirementResults.flatMap((result) =>
    result.ok ? [] : result.errors,
  );
  if (requirementErrors.length > 0) return failure(requirementErrors);
  const requirements = requirementResults.map((result) => {
    if (!result.ok) {
      throw new TypeError("Validated requirement reconstruction failed.");
    }
    return result.value;
  });
  const transitioned = transitionProjectRequirements(project, requirements);
  if (!transitioned.ok) return failure(transitioned.errors);

  const updatedProject = createProject({
    id: project.id,
    isActive: project.isActive,
    name,
    ...(grouping.programId === undefined ? {} : { programId: grouping.programId }),
    ...(grouping.priorityFamilyId === undefined ? {} : { priorityFamilyId: grouping.priorityFamilyId }),
    ...(grouping.ownColor === undefined ? {} : { ownColor: grouping.ownColor }),
    ...(command.earliestStartDate === undefined
      ? {}
      : { earliestStartDate: command.earliestStartDate }),
    ...(command.objectiveEndDate === undefined
      ? {}
      : { objectiveEndDate: command.objectiveEndDate }),
    ...(command.mandatoryDeadline === undefined
      ? {}
      : { mandatoryDeadline: command.mandatoryDeadline }),
    requirements: transitioned.value,
    ...(project.actuals === undefined ? {} : { actuals: project.actuals }),
    ...(project.legacyV4Actuals === undefined ? {} : { legacyV4Actuals: project.legacyV4Actuals }),
    ...(project.legacyV4RafAuthority === undefined ? {} : { legacyV4RafAuthority: project.legacyV4RafAuthority }),
    ...(project.snapshots === undefined ? {} : { snapshots: project.snapshots }),
  });
  if (!updatedProject.ok) return failure(updatedProject.errors);

  const projects = state.portfolio.projects.map((candidate, index) =>
    index === projectIndex ? updatedProject.value : candidate,
  );
  const catalogs = pruneCatalogs({ projects, reservations: state.portfolio.reservations,
    programs: grouping.programs, priorityFamilies: grouping.priorityFamilies });
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects,
    programs: catalogs.programs,
    priorityFamilies: catalogs.priorityFamilies,
    priorityOrder: state.portfolio.priorityOrder,
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);

  return Object.freeze({
    ok: true,
    state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }),
  });
}

function reorderProject(
  state: PlanningSessionState,
  command: ReorderProjectCommand,
): PlanningCommandResult {
  if (!state.portfolio.projects.some((project) => project.id === command.projectId)) {
    return failure([applicationError("UNKNOWN_PROJECT", "projectId",
      `Project ${command.projectId} does not exist in the current portfolio.`)]);
  }
  const count = state.portfolio.priorityOrder.length;
  if (!Number.isSafeInteger(command.targetPosition) ||
    command.targetPosition < 1 || command.targetPosition > count) {
    return failure([applicationError("PROJECT_PRIORITY_OUT_OF_RANGE", "targetPosition",
      `Priority position must be an integer from 1 to ${count}.`)]);
  }
  if (state.portfolio.priorityOrder[command.targetPosition - 1] === command.projectId) {
    return Object.freeze({ ok: true, state });
  }
  const portfolio = createPortfolio({
    teams: state.portfolio.teams,
    projects: state.portfolio.projects,
    programs: state.portfolio.programs,
    priorityFamilies: state.portfolio.priorityFamilies,
    priorityOrder: moveProjectPriority(state.portfolio.priorityOrder, command.projectId, command.targetPosition),
    reservations: state.portfolio.reservations,
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function setProjectActive(
  state: PlanningSessionState,
  command: SetProjectActiveCommand,
): PlanningCommandResult {
  if (typeof command.isActive !== "boolean") return failure([applicationError(
    "INVALID_PROJECT_ACTIVATION", "isActive", "Project activation must be a boolean.")]);
  const project = state.portfolio.projects.find((item) => item.id === command.projectId);
  if (!project) return failure([applicationError("UNKNOWN_PROJECT", "projectId",
    `Project ${command.projectId} does not exist in the current portfolio.`)]);
  if (project.isActive === command.isActive) return Object.freeze({ ok: true, state });
  const updated = createProject({ ...project, isActive: command.isActive });
  if (!updated.ok) return failure(updated.errors);
  const portfolio = createPortfolio({ ...state.portfolio,
    projects: state.portfolio.projects.map((item) => item.id === project.id ? updated.value : item),
  });
  if (!portfolio.ok) return failure(portfolio.errors);
  return Object.freeze({ ok: true, state: freezeState({ ...state, portfolio: portfolio.value, planning: state.planning }) });
}

function setReservationActive(
  state: PlanningSessionState,
  command: SetReservationActiveCommand,
): PlanningCommandResult {
  if (typeof command.isActive !== "boolean") return failure([applicationError(
    "INVALID_RESERVATION_ACTIVATION", "isActive", "Reservation activation must be a boolean.")]);
  const reservation = state.portfolio.reservations.find((item) => item.id === command.reservationId);
  if (!reservation) return failure([applicationError("UNKNOWN_RESERVATION", "reservationId",
    `Reservation ${command.reservationId} does not exist in the current portfolio.`)]);
  if (reservation.isActive === command.isActive) return Object.freeze({ ok: true, state });
  const updated = createReservation({ ...reservation, isActive: command.isActive });
  if (!updated.ok) return failure(updated.errors);
  return replaceReservations(state, state.portfolio.reservations.map((item) =>
    item.id === reservation.id ? updated.value : item));
}

function moveProjectPriority(
  priorityOrder: readonly ProjectId[],
  projectId: ProjectId,
  targetPosition: number,
): readonly ProjectId[] {
  const withoutProject = priorityOrder.filter(
    (candidate) => candidate !== projectId,
  );
  withoutProject.splice(targetPosition - 1, 0, projectId);
  return Object.freeze(withoutProject);
}

function applicationError(
  code: string,
  path: string,
  message: string,
): DomainError {
  return Object.freeze({ code, path, message });
}

function failure(errors: readonly DomainError[]): PlanningCommandResult {
  return Object.freeze({ ok: false, errors: Object.freeze([...errors]) });
}

function freezeState(state: PlanningSessionState): PlanningSessionState {
  return Object.freeze({ portfolio: state.portfolio, planning: state.planning, portfolioSnapshots: Object.freeze([...(state.portfolioSnapshots ?? [])]) });
}

function historicalIds(state: PlanningSessionState, kind: "projects" | "reservations" | "teams" | "programs" | "priorityFamilies"): string[] {
  return (state.portfolioSnapshots ?? []).flatMap((s) => {
    const inputs = s.inputs as { portfolio: Record<string, readonly { id: string }[]> };
    return (inputs.portfolio[kind] ?? []).map((object) => object.id);
  });
}
