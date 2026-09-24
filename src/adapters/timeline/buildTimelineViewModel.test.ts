import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCapacityPeriod,
  createCivilDate,
  createMaxParallelProjects,
  createPlanningHorizon,
  createPortfolio,
  createProject,
  createProjectId,
  createProjectTeamRequirement,
  createRemainingWorkload,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  createWorkingPattern,
  planPortfolio,
  serializeQuantity,
  type DomainResult,
  type PlanningResult,
  type Project,
  type ProjectTeamPlanningResult,
  type Team,
  type TeamPlanningResult,
} from "../../domain/index.js";
import {
  buildTimelineViewModel,
  type BuildTimelineViewModelInput,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const capacity = (value: string) => must(createCapacity(value));
const workload = (value: string) => must(createRemainingWorkload(value));

function makeTeam(id: string, name: string, dailyCapacity: string): Team {
  return must(
    createTeam({
      id: must(createTeamId(id)),
      name,
      capacitySchedule: must(
        createTeamCapacitySchedule({
          periods: [
            must(
              createCapacityPeriod({
                start: date("2025-01-01"),
                end: date("2025-12-31"),
                dailyCapacity: capacity(dailyCapacity),
              }),
            ),
          ],
          exceptions: [],
        }),
      ),
    }),
  );
}

function makeProject(
  id: string,
  name: string,
  teams: readonly Team[],
  withDates = false,
): Project {
  return must(
    createProject({
      id: must(createProjectId(id)),
      name,
      ...(withDates
        ? {
            earliestStartDate: date("2025-01-06"),
            objectiveEndDate: date("2025-01-07"),
            mandatoryDeadline: date("2025-01-08"),
          }
        : {}),
      requirements: teams.map((team) =>
        must(
          createProjectTeamRequirement({
            teamId: team.id,
            remainingWorkload: workload("3"),
          }),
        ),
      ),
    }),
  );
}

function projectPlan(
  project: Project,
  team: Team,
  input: Omit<ProjectTeamPlanningResult, "projectId" | "teamId">,
): ProjectTeamPlanningResult {
  return { projectId: project.id, teamId: team.id, ...input };
}

interface Fixture {
  readonly input: BuildTimelineViewModelInput;
  readonly firstTeam: Team;
  readonly secondTeam: Team;
  readonly highPriority: Project;
  readonly lowPriority: Project;
}

function makeFixture(): Fixture {
  const firstTeam = makeTeam("team-b", "Team B", "1.5");
  const secondTeam = makeTeam("team-a", "Team A", "2");
  const highPriority = makeProject(
    "project-high",
    "High priority",
    [firstTeam, secondTeam],
    true,
  );
  const lowPriority = makeProject(
    "project-low",
    "Low priority",
    [firstTeam],
  );
  const firstDate = date("2025-01-06");
  const secondDate = date("2025-01-07");
  const portfolio = must(
    createPortfolio({
      programs: [],
      priorityFamilies: [],
      teams: [firstTeam, secondTeam],
      projects: [lowPriority, highPriority],
      priorityOrder: [highPriority.id, lowPriority.id],
      reservations: [],
    }),
  );
  const horizon = must(
    createPlanningHorizon({ start: firstDate, end: secondDate }),
  );
  const firstTeamPlan: TeamPlanningResult = {
    teamId: firstTeam.id,
    dayCapacities: [
      {
        date: firstDate,
        effectiveCapacity: capacity("1.5"),
        reservedCapacity: capacity("0"),
        projectCapacity: capacity("1.5"),
        overReserved: false,
      },
    ],
    dayAdmissions: [
      {
        date: firstDate,
        admittedProjectIds: [highPriority.id, lowPriority.id],
      },
    ],
    projectPlans: [
      projectPlan(lowPriority, firstTeam, {
        allocations: [
          { date: firstDate, workload: capacity("0.5") },
          { date: secondDate, workload: capacity("0.5") },
        ],
        plannedWorkload: capacity("1"),
        remainingUnplannedWorkload: workload("2"),
        complete: false,
      }),
      projectPlan(highPriority, firstTeam, {
        allocations: [{ date: firstDate, workload: capacity("0.5") }],
        plannedWorkload: capacity("0.5"),
        remainingUnplannedWorkload: workload("0"),
        complete: true,
        projectedEndDate: firstDate,
        deadlineStatus: "FEASIBLE",
        deadlineStatuses: [{ date: firstDate, status: "FEASIBLE" }],
      }),
    ],
  };
  const secondTeamPlan: TeamPlanningResult = {
    teamId: secondTeam.id,
    dayCapacities: [
      {
        date: firstDate,
        effectiveCapacity: capacity("2"),
        reservedCapacity: capacity("0.5"),
        projectCapacity: capacity("1.5"),
        overReserved: false,
      },
    ],
    dayAdmissions: [
      { date: firstDate, admittedProjectIds: [highPriority.id] },
    ],
    projectPlans: [
      projectPlan(highPriority, secondTeam, {
        allocations: [{ date: firstDate, workload: capacity("1") }],
        plannedWorkload: capacity("1"),
        remainingUnplannedWorkload: workload("2"),
        complete: false,
        deadlineStatus: "UNFEASIBLE",
        deadlineStatuses: [{ date: firstDate, status: "UNFEASIBLE" }],
      }),
    ],
  };
  const planningResult: PlanningResult = {
    teamPlans: [secondTeamPlan, firstTeamPlan],
    diagnostics: [
      {
        code: "DEADLINE_UNFEASIBLE",
        teamId: firstTeam.id,
        projectId: highPriority.id,
        date: firstDate,
      },
      {
        code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        teamId: secondTeam.id,
        projectId: highPriority.id,
      },
    ],
  };

  return {
    input: { portfolio, horizon, planningResult,
      workingPattern: must(createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] })) },
    firstTeam,
    secondTeam,
    highPriority,
    lowPriority,
  };
}

describe("buildTimelineViewModel", () => {
  it("projects the Project's latest Team completion as its global estimated end", () => {
    const { input, highPriority } = makeFixture();
    const dates = [date("2025-01-07"), date("2025-01-06")];
    const planningResult = { ...input.planningResult,
      teamPlans: input.planningResult.teamPlans.map((teamPlan, index) => ({ ...teamPlan,
        projectPlans: teamPlan.projectPlans.map((plan) => plan.projectId === highPriority.id
          ? { ...plan, complete: true, remainingUnplannedWorkload: workload("0"),
            projectedEndDate: dates[index]! }
          : plan),
      })) };
    const projected = buildTimelineViewModel({ ...input, planningResult }).projects.find((project) =>
      project.id === highPriority.id)!;
    assert.equal(projected.estimatedWithinHorizon, true);
    assert.equal(projected.estimatedEndDate, date("2025-01-07"));
    const incomplete = buildTimelineViewModel(input).projects.find((project) => project.id === highPriority.id)!;
    assert.equal(incomplete.estimatedWithinHorizon, false);
    assert.equal(incomplete.estimatedEndDate, undefined);
  });
  it("projects the supplied planning horizon exactly", () => {
    const { input } = makeFixture();
    const viewModel = buildTimelineViewModel(input);

    assert.strictEqual(viewModel.horizon.start, input.horizon.start);
    assert.strictEqual(viewModel.horizon.end, input.horizon.end);
  });

  it("orders projects by portfolio priority rather than physical project order", () => {
    const { input, highPriority, lowPriority } = makeFixture();
    const viewModel = buildTimelineViewModel(input);

    assert.deepEqual(
      viewModel.projects.map((project) => [project.id, project.priorityIndex]),
      [
        [highPriority.id, 0],
        [lowPriority.id, 1],
      ],
    );
    assert.equal(
      viewModel.projects[0]?.earliestStartDate,
      highPriority.earliestStartDate,
    );
    assert.equal(
      viewModel.projects[0]?.objectiveEndDate,
      highPriority.objectiveEndDate,
    );
    assert.equal(
      viewModel.projects[0]?.mandatoryDeadline,
      highPriority.mandatoryDeadline,
    );
  });

  it("orders teams by the portfolio rather than planning result order", () => {
    const { input, firstTeam, secondTeam } = makeFixture();

    assert.deepEqual(
      buildTimelineViewModel(input).teams.map((team) => team.id),
      [firstTeam.id, secondTeam.id],
    );
  });

  it("joins project and team labels from the portfolio", () => {
    const { input } = makeFixture();
    const viewModel = buildTimelineViewModel(input);

    assert.deepEqual(
      viewModel.projects.map((project) => project.label),
      ["High priority", "Low priority"],
    );
    assert.deepEqual(
      viewModel.teams.map((team) => team.label),
      ["Team B", "Team A"],
    );
  });

  it("preserves exact capacity objects without numeric conversion", () => {
    const { input } = makeFixture();
    const source = input.planningResult.teamPlans[1]!.dayCapacities[0]!;
    const projected = buildTimelineViewModel(input).teams[0]!.capacities[0]!;

    assert.strictEqual(projected.projectCapacity, source.projectCapacity);
    assert.equal(serializeQuantity(projected.projectCapacity), "3/2");
    assert.equal(typeof projected.projectCapacity, "object");
  });

  it("keeps daily allocations distinct and orders projects by priority", () => {
    const { input, highPriority, lowPriority } = makeFixture();
    const allocations = buildTimelineViewModel(input).teams[0]!.allocations;

    assert.deepEqual(
      allocations.map((allocation) => [
        allocation.projectId,
        allocation.date,
      ]),
      [
        [highPriority.id, date("2025-01-06")],
        [lowPriority.id, date("2025-01-06")],
        [lowPriority.id, date("2025-01-07")],
      ],
    );
  });

  it("projects independent states for the same project on multiple teams", () => {
    const { input, highPriority } = makeFixture();
    const viewModel = buildTimelineViewModel(input);
    const states = viewModel.teams.flatMap((team) => team.projectStates).filter(
      (state) => state.projectId === highPriority.id,
    );

    assert.equal(states.length, 2);
    assert.equal(states[0]?.complete, true);
    assert.equal(states[1]?.complete, false);
    assert.equal(states[0]?.teamId, viewModel.teams[0]?.id);
    assert.equal(states[1]?.teamId, viewModel.teams[1]?.id);
  });

  it("projects current deadline state without its daily history", () => {
    const { input } = makeFixture();
    const state = buildTimelineViewModel(input).teams[0]!.projectStates[0]!;

    assert.equal(state.deadlineStatus, "FEASIBLE");
    assert.equal(state.projectedEndDate, date("2025-01-06"));
    assert.equal(serializeQuantity(state.remainingUnplannedWorkload), "0/1");
    assert.equal(Object.hasOwn(state, "deadlineStatuses"), false);
  });

  it("joins diagnostic labels while preserving existing identity and date", () => {
    const { input, firstTeam, highPriority } = makeFixture();
    const diagnostic = buildTimelineViewModel(input).diagnostics[0]!;

    assert.equal(diagnostic.teamId, firstTeam.id);
    assert.equal(diagnostic.teamLabel, firstTeam.name);
    assert.equal(diagnostic.projectId, highPriority.id);
    assert.equal(diagnostic.projectLabel, highPriority.name);
    assert.equal(diagnostic.date, date("2025-01-06"));
  });

  it("does not invent a date for a diagnostic that has none", () => {
    const { input } = makeFixture();
    const diagnostic = buildTimelineViewModel(input).diagnostics[1]!;

    assert.equal(
      diagnostic.code,
      "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
    );
    assert.equal(Object.hasOwn(diagnostic, "date"), false);
  });

  it("preserves the source diagnostic order", () => {
    const { input } = makeFixture();

    assert.deepEqual(
      buildTimelineViewModel(input).diagnostics.map(
        (diagnostic) => diagnostic.code,
      ),
      input.planningResult.diagnostics.map((diagnostic) => diagnostic.code),
    );
  });

  it("is deterministic for the same input", () => {
    const { input } = makeFixture();

    assert.deepEqual(
      buildTimelineViewModel(input),
      buildTimelineViewModel(input),
    );
  });

  it("does not mutate portfolio, horizon, or planning result inputs", () => {
    const { input } = makeFixture();
    const projects = input.portfolio.projects;
    const teams = input.portfolio.teams;
    const priorityOrder = input.portfolio.priorityOrder;
    const teamPlans = input.planningResult.teamPlans;
    const diagnostics = input.planningResult.diagnostics;

    buildTimelineViewModel(input);

    assert.strictEqual(input.portfolio.projects, projects);
    assert.strictEqual(input.portfolio.teams, teams);
    assert.strictEqual(input.portfolio.priorityOrder, priorityOrder);
    assert.strictEqual(input.planningResult.teamPlans, teamPlans);
    assert.strictEqual(input.planningResult.diagnostics, diagnostics);
  });

  it("freezes the complete view model tree owned by the adapter", () => {
    const { input } = makeFixture();
    const viewModel = buildTimelineViewModel(input);

    assert.equal(Object.isFrozen(viewModel), true);
    assert.equal(Object.isFrozen(viewModel.horizon), true);
    assert.equal(Object.isFrozen(viewModel.projects), true);
    assert.ok(viewModel.projects.every(Object.isFrozen));
    assert.equal(Object.isFrozen(viewModel.teams), true);
    assert.ok(viewModel.teams.every(Object.isFrozen));
    for (const team of viewModel.teams) {
      assert.equal(Object.isFrozen(team.capacities), true);
      assert.ok(team.capacities.every(Object.isFrozen));
      assert.equal(Object.isFrozen(team.allocations), true);
      assert.ok(team.allocations.every(Object.isFrozen));
      assert.equal(Object.isFrozen(team.projectStates), true);
      assert.ok(team.projectStates.every(Object.isFrozen));
      assert.equal(Object.hasOwn(team, "dayAdmissions"), false);
    }
    assert.equal(Object.isFrozen(viewModel.diagnostics), true);
    assert.ok(viewModel.diagnostics.every(Object.isFrozen));
  });

  it("composes end to end with an externally computed planning result", () => {
    const { input, firstTeam } = makeFixture();
    const planningResult = planPortfolio({
      portfolio: input.portfolio,
      horizon: input.horizon,
      workingPattern: must(
        createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }),
      ),
      maxParallelProjects: must(createMaxParallelProjects(2)),
    });
    const viewModel = buildTimelineViewModel({
      portfolio: input.portfolio,
      horizon: input.horizon,
      planningResult,
      workingPattern: input.workingPattern,
    });

    assert.equal(viewModel.teams[0]?.id, firstTeam.id);
    assert.deepEqual(
      viewModel.teams[0]?.capacities.map((day) => day.date),
      [date("2025-01-06"), date("2025-01-07")],
    );
    assert.equal(viewModel.projects[0]?.label, "High priority");
  });

  it("keeps production imports inside domain and semantic timeline contracts", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/adapters/timeline/buildTimelineViewModel.ts",
      ),
      "utf8",
    );
    const importPaths = [...source.matchAll(/from "([^"]+)"/g)].map(
      (match) => match[1],
    );

    assert.deepEqual(importPaths, [
      "../../domain/index.js",
      "./timelineViewModel.js",
    ]);
    assert.doesNotMatch(source, /planPortfolio|recomputePlanning/);
  });
});
