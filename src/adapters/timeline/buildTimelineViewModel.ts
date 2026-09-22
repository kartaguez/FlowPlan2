import type {
  PlanningHorizon,
  PlanningResult,
  Portfolio,
  Project,
  ProjectId,
  ProjectTeamPlanningResult,
  Team,
  TeamId,
  TeamPlanningResult,
} from "../../domain/index.js";
import type {
  TimelineAllocation,
  TimelineCapacityDay,
  TimelineDiagnostic,
  TimelineProject,
  TimelineProjectTeamState,
  TimelineTeam,
  TimelineViewModel,
} from "./timelineViewModel.js";

export interface BuildTimelineViewModelInput {
  readonly portfolio: Portfolio;
  readonly horizon: PlanningHorizon;
  readonly planningResult: PlanningResult;
}

export function buildTimelineViewModel(
  input: BuildTimelineViewModelInput,
): TimelineViewModel {
  const projectsById = indexProjects(input.portfolio.projects);
  const teamsById = indexTeams(input.portfolio.teams);
  const orderedProjects = input.portfolio.priorityOrder.map(
    (projectId, priorityIndex) => {
      const project = requireProject(projectsById, projectId);
      return Object.freeze({
        id: project.id,
        label: project.name,
        priorityIndex,
        ...(project.earliestStartDate !== undefined
          ? { earliestStartDate: project.earliestStartDate }
          : {}),
        ...(project.objectiveEndDate !== undefined
          ? { objectiveEndDate: project.objectiveEndDate }
          : {}),
        ...(project.mandatoryDeadline !== undefined
          ? { mandatoryDeadline: project.mandatoryDeadline }
          : {}),
      }) satisfies TimelineProject;
    },
  );
  const teamPlansById = indexTeamPlans(
    input.planningResult.teamPlans,
    teamsById,
  );

  if (teamPlansById.size !== input.portfolio.teams.length) {
    throw new TypeError(
      "Planning result must contain exactly one plan for every portfolio team.",
    );
  }

  const teams = input.portfolio.teams.map((team) =>
    buildTimelineTeam(
      team,
      requireTeamPlan(teamPlansById, team.id),
      input.portfolio.priorityOrder,
      projectsById,
    ),
  );
  const diagnostics = input.planningResult.diagnostics.map((diagnostic) => {
    const team =
      diagnostic.teamId === undefined
        ? undefined
        : requireTeam(teamsById, diagnostic.teamId);
    const project =
      diagnostic.projectId === undefined
        ? undefined
        : requireProject(projectsById, diagnostic.projectId);

    return Object.freeze({
      code: diagnostic.code,
      ...(diagnostic.teamId !== undefined
        ? { teamId: diagnostic.teamId, teamLabel: team!.name }
        : {}),
      ...(diagnostic.projectId !== undefined
        ? { projectId: diagnostic.projectId, projectLabel: project!.name }
        : {}),
      ...(diagnostic.date !== undefined ? { date: diagnostic.date } : {}),
    }) satisfies TimelineDiagnostic;
  });

  return Object.freeze({
    horizon: Object.freeze({
      start: input.horizon.start,
      end: input.horizon.end,
    }),
    projects: Object.freeze(orderedProjects),
    teams: Object.freeze(teams),
    diagnostics: Object.freeze(diagnostics),
  });
}

function buildTimelineTeam(
  team: Team,
  teamPlan: TeamPlanningResult,
  priorityOrder: readonly ProjectId[],
  projectsById: ReadonlyMap<ProjectId, Project>,
): TimelineTeam {
  const projectPlansById = indexProjectPlans(teamPlan, projectsById);
  const expectedProjectIds = priorityOrder.filter((projectId) =>
    requireProject(projectsById, projectId).requirements.some(
      (requirement) => requirement.teamId === team.id,
    ),
  );

  if (projectPlansById.size !== expectedProjectIds.length) {
    throw new TypeError(
      `Team plan ${team.id} must contain exactly one plan for each required project.`,
    );
  }

  const orderedPlans = expectedProjectIds.map((projectId) =>
    requireProjectPlan(projectPlansById, projectId, team.id),
  );
  const capacities = teamPlan.dayCapacities.map(
    (day) =>
      Object.freeze({
        date: day.date,
        effectiveCapacity: day.effectiveCapacity,
        reservedCapacity: day.reservedCapacity,
        projectCapacity: day.projectCapacity,
        overReserved: day.overReserved,
      }) satisfies TimelineCapacityDay,
  );
  const allocations = orderedPlans.flatMap((projectPlan) =>
    projectPlan.allocations.map(
      (allocation) =>
        Object.freeze({
          projectId: projectPlan.projectId,
          teamId: team.id,
          date: allocation.date,
          workload: allocation.workload,
        }) satisfies TimelineAllocation,
    ),
  );
  const projectStates = orderedPlans.map(
    (projectPlan) =>
      Object.freeze({
        projectId: projectPlan.projectId,
        teamId: team.id,
        complete: projectPlan.complete,
        ...(projectPlan.projectedEndDate !== undefined
          ? { projectedEndDate: projectPlan.projectedEndDate }
          : {}),
        ...(projectPlan.deadlineStatus !== undefined
          ? { deadlineStatus: projectPlan.deadlineStatus }
          : {}),
        remainingUnplannedWorkload: projectPlan.remainingUnplannedWorkload,
      }) satisfies TimelineProjectTeamState,
  );

  return Object.freeze({
    id: team.id,
    label: team.name,
    capacities: Object.freeze(capacities),
    allocations: Object.freeze(allocations),
    projectStates: Object.freeze(projectStates),
  });
}

function indexProjects(projects: readonly Project[]): Map<ProjectId, Project> {
  const indexed = new Map<ProjectId, Project>();
  for (const project of projects) {
    if (indexed.has(project.id)) {
      throw new TypeError(`Duplicate portfolio project ${project.id}.`);
    }
    indexed.set(project.id, project);
  }
  return indexed;
}

function indexTeams(teams: readonly Team[]): Map<TeamId, Team> {
  const indexed = new Map<TeamId, Team>();
  for (const team of teams) {
    if (indexed.has(team.id)) {
      throw new TypeError(`Duplicate portfolio team ${team.id}.`);
    }
    indexed.set(team.id, team);
  }
  return indexed;
}

function indexTeamPlans(
  teamPlans: readonly TeamPlanningResult[],
  teamsById: ReadonlyMap<TeamId, Team>,
): Map<TeamId, TeamPlanningResult> {
  const indexed = new Map<TeamId, TeamPlanningResult>();
  for (const teamPlan of teamPlans) {
    requireTeam(teamsById, teamPlan.teamId);
    if (indexed.has(teamPlan.teamId)) {
      throw new TypeError(`Duplicate planning result for team ${teamPlan.teamId}.`);
    }
    indexed.set(teamPlan.teamId, teamPlan);
  }
  return indexed;
}

function indexProjectPlans(
  teamPlan: TeamPlanningResult,
  projectsById: ReadonlyMap<ProjectId, Project>,
): Map<ProjectId, ProjectTeamPlanningResult> {
  const indexed = new Map<ProjectId, ProjectTeamPlanningResult>();
  for (const projectPlan of teamPlan.projectPlans) {
    requireProject(projectsById, projectPlan.projectId);
    if (projectPlan.teamId !== teamPlan.teamId) {
      throw new TypeError(
        `Project plan ${projectPlan.projectId} references a different team.`,
      );
    }
    if (indexed.has(projectPlan.projectId)) {
      throw new TypeError(
        `Duplicate project plan ${projectPlan.projectId} for team ${teamPlan.teamId}.`,
      );
    }
    indexed.set(projectPlan.projectId, projectPlan);
  }
  return indexed;
}

function requireProject(
  projectsById: ReadonlyMap<ProjectId, Project>,
  projectId: ProjectId,
): Project {
  const project = projectsById.get(projectId);
  if (!project) throw new TypeError(`Unknown portfolio project ${projectId}.`);
  return project;
}

function requireTeam(
  teamsById: ReadonlyMap<TeamId, Team>,
  teamId: TeamId,
): Team {
  const team = teamsById.get(teamId);
  if (!team) throw new TypeError(`Unknown portfolio team ${teamId}.`);
  return team;
}

function requireTeamPlan(
  teamPlansById: ReadonlyMap<TeamId, TeamPlanningResult>,
  teamId: TeamId,
): TeamPlanningResult {
  const teamPlan = teamPlansById.get(teamId);
  if (!teamPlan) throw new TypeError(`Missing planning result for team ${teamId}.`);
  return teamPlan;
}

function requireProjectPlan(
  projectPlansById: ReadonlyMap<ProjectId, ProjectTeamPlanningResult>,
  projectId: ProjectId,
  teamId: TeamId,
): ProjectTeamPlanningResult {
  const projectPlan = projectPlansById.get(projectId);
  if (!projectPlan) {
    throw new TypeError(
      `Missing project plan ${projectId} for team ${teamId}.`,
    );
  }
  return projectPlan;
}
