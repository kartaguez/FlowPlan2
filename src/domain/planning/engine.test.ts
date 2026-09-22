import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCapacityPeriod,
  createCivilDate,
  createDailyCap,
  createFirmCapacityReservation,
  createMaxParallelProjects,
  createPlanningHorizon,
  createPortfolio,
  createProject,
  createProjectId,
  createProjectTeamRequirement,
  createRemainingWorkload,
  createReservationId,
  createReservationRatio,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
  createWorkingPattern,
  planPortfolio,
  quantityToDecimalString,
  type CivilDate,
  type DomainResult,
  type FirmCapacityReservation,
  type PlanningInput,
  type PlanningResult,
  type Portfolio,
  type Project,
  type ProjectTeamPlanningResult,
  type Team,
  type TeamPlanningResult,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));
const rendered = (value: Parameters<typeof quantityToDecimalString>[0]) =>
  must(quantityToDecimalString(value));

function makeTeam(
  id: string,
  dailyCapacity: string,
  maxParallelProjects = 3,
): Team {
  const teamId = must(createTeamId(id));
  return must(
    createTeam({
      id: teamId,
      name: id,
      maxParallelProjects: must(
        createMaxParallelProjects(maxParallelProjects),
      ),
      capacitySchedule: must(
        createTeamCapacitySchedule({
          workingPattern: must(
            createWorkingPattern({
              workingWeekdays: [1, 2, 3, 4, 5, 6, 7],
            }),
          ),
          periods: [
            must(
              createCapacityPeriod({
                start: date("2025-01-01"),
                end: date("2025-12-31"),
                dailyCapacity: must(createCapacity(dailyCapacity)),
              }),
            ),
          ],
          exceptions: [],
        }),
      ),
    }),
  );
}

interface RequirementSpec {
  readonly team: Team;
  readonly workload: string;
  readonly dailyCap?: string;
}

interface ProjectDates {
  readonly earliestStartDate?: string;
  readonly objectiveEndDate?: string;
  readonly mandatoryDeadline?: string;
}

function makeProject(
  id: string,
  requirements: readonly RequirementSpec[],
  dates: ProjectDates = {},
): Project {
  return must(
    createProject({
      id: must(createProjectId(id)),
      name: id,
      ...(dates.earliestStartDate
        ? { earliestStartDate: date(dates.earliestStartDate) }
        : {}),
      ...(dates.objectiveEndDate
        ? { objectiveEndDate: date(dates.objectiveEndDate) }
        : {}),
      ...(dates.mandatoryDeadline
        ? { mandatoryDeadline: date(dates.mandatoryDeadline) }
        : {}),
      requirements: requirements.map((requirement) =>
        must(
          createProjectTeamRequirement({
            teamId: requirement.team.id,
            remainingWorkload: must(
              createRemainingWorkload(requirement.workload),
            ),
            ...(requirement.dailyCap !== undefined
              ? { dailyCap: must(createDailyCap(requirement.dailyCap)) }
              : {}),
          }),
        ),
      ),
    }),
  );
}

function reservation(
  id: string,
  team: Team,
  ratio: string,
): FirmCapacityReservation {
  return must(
    createFirmCapacityReservation({
      id: must(createReservationId(id)),
      teamId: team.id,
      label: id,
      start: date("2025-01-01"),
      end: date("2025-12-31"),
      ratio: must(createReservationRatio(ratio)),
    }),
  );
}

function makeInput(
  teams: readonly Team[],
  projects: readonly Project[],
  start: string,
  end: string,
  reservations: readonly FirmCapacityReservation[] = [],
  priorityOrder: readonly Project[] = projects,
): PlanningInput {
  const portfolio = must(
    createPortfolio({
      teams,
      projects,
      priorityOrder: priorityOrder.map((project) => project.id),
      reservations,
    }),
  );
  return {
    portfolio,
    horizon: must(
      createPlanningHorizon({ start: date(start), end: date(end) }),
    ),
  };
}

function findTeamPlan(result: PlanningResult, team: Team): TeamPlanningResult {
  const plan = result.teamPlans.find((candidate) => candidate.teamId === team.id);
  assert.ok(plan, `Missing plan for team ${team.name}`);
  return plan;
}

function findProjectPlan(
  teamPlan: TeamPlanningResult,
  project: Project,
): ProjectTeamPlanningResult {
  const plan = teamPlan.projectPlans.find(
    (candidate) => candidate.projectId === project.id,
  );
  assert.ok(plan, `Missing plan for project ${project.name}`);
  return plan;
}

function allocations(plan: ProjectTeamPlanningResult): [CivilDate, string][] {
  return plan.allocations.map((allocation) => [
    allocation.date,
    rendered(allocation.workload),
  ]);
}

function comparableResult(result: PlanningResult) {
  return result.teamPlans.map((teamPlan) => ({
    teamId: teamPlan.teamId,
    days: teamPlan.dayCapacities.map((day) => ({
      date: day.date,
      effective: rendered(day.effectiveCapacity),
      reserved: rendered(day.reservedCapacity),
      project: rendered(day.projectCapacity),
      overReserved: day.overReserved,
    })),
    admissions: teamPlan.dayAdmissions.map((admission) => ({
      date: admission.date,
      projectIds: admission.admittedProjectIds,
    })),
    projects: teamPlan.projectPlans.map((projectPlan) => ({
      projectId: projectPlan.projectId,
      allocations: allocations(projectPlan),
      planned: rendered(projectPlan.plannedWorkload),
      remaining: rendered(projectPlan.remainingUnplannedWorkload),
      complete: projectPlan.complete,
      projectedEndDate: projectPlan.projectedEndDate,
    })),
  }));
}

describe("Phase 2A planning engine", () => {
  it("plans a simple workload over an inclusive horizon", () => {
    const team = makeTeam("team-a", "2");
    const project = makeProject("project-a", [
      { team, workload: "4", dailyCap: "2" },
    ]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-02")),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), [
      ["2025-01-01", "2"],
      ["2025-01-02", "2"],
    ]);
    assert.equal(rendered(plan.plannedWorkload), "4");
    assert.equal(rendered(plan.remainingUnplannedWorkload), "0");
    assert.equal(plan.complete, true);
    assert.equal(plan.projectedEndDate, "2025-01-02");
  });

  it("applies an exact daily cap without quantization", () => {
    const team = makeTeam("team-a", "2");
    const project = makeProject("project-a", [
      { team, workload: "2", dailyCap: "0.5" },
    ]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-04")),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), [
      ["2025-01-01", "0.5"],
      ["2025-01-02", "0.5"],
      ["2025-01-03", "0.5"],
      ["2025-01-04", "0.5"],
    ]);
  });

  it("skips a zero daily cap and considers the next priority", () => {
    const team = makeTeam("team-a", "1");
    const blocked = makeProject("blocked", [
      { team, workload: "1", dailyCap: "0" },
    ]);
    const next = makeProject("next", [{ team, workload: "1" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [blocked, next], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, blocked)), []);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, next)), [
      ["2025-01-01", "1"],
    ]);
  });

  it("respects earliest start inclusively and ignores objective and deadline dates", () => {
    const team = makeTeam("team-a", "1");
    const project = makeProject(
      "project-a",
      [{ team, workload: "1" }],
      {
        earliestStartDate: "2025-01-03",
        objectiveEndDate: "2025-01-01",
        mandatoryDeadline: "2025-01-02",
      },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-03")),
      team,
    );
    const plan = findProjectPlan(teamPlan, project);

    assert.deepEqual(allocations(plan), [["2025-01-03", "1"]]);
    assert.deepEqual(
      teamPlan.dayAdmissions.map((day) => day.admittedProjectIds),
      [[], [], [project.id]],
    );
    assert.equal(plan.projectedEndDate, "2025-01-03");
  });

  it("gives each day to the first eligible project in priority order", () => {
    const team = makeTeam("team-a", "1");
    const first = makeProject("first", [{ team, workload: "2" }]);
    const second = makeProject("second", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-04"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
      ["2025-01-02", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-03", "1"],
      ["2025-01-04", "1"],
    ]);
  });

  it("retains unplanned workload at the strict horizon boundary", () => {
    const team = makeTeam("team-a", "1");
    const project = makeProject("project-a", [{ team, workload: "5" }]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-03")),
        team,
      ),
      project,
    );

    assert.equal(rendered(plan.plannedWorkload), "3");
    assert.equal(rendered(plan.remainingUnplannedWorkload), "2");
    assert.equal(plan.complete, false);
    assert.equal("projectedEndDate" in plan, false);
  });

  it("allocates only project capacity after firm reservations", () => {
    const team = makeTeam("team-a", "3");
    const project = makeProject("project-a", [{ team, workload: "3" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [project],
          "2025-01-01",
          "2025-01-01",
          [reservation("half", team, "0.5")],
        ),
      ),
      team,
    );
    const day = teamPlan.dayCapacities[0];
    assert.ok(day);
    assert.equal(rendered(day.effectiveCapacity), "3");
    assert.equal(rendered(day.reservedCapacity), "1.5");
    assert.equal(rendered(day.projectCapacity), "1.5");
    assert.deepEqual(allocations(findProjectPlan(teamPlan, project)), [
      ["2025-01-01", "1.5"],
    ]);
  });

  it("reports over-reservation and performs no project allocation", () => {
    const team = makeTeam("team-a", "3");
    const project = makeProject("project-a", [{ team, workload: "3" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [project],
          "2025-01-01",
          "2025-01-01",
          [
            reservation("first", team, "0.7"),
            reservation("second", team, "0.7"),
          ],
        ),
      ),
      team,
    );
    const day = teamPlan.dayCapacities[0];
    assert.ok(day);
    assert.equal(rendered(day.projectCapacity), "0");
    assert.equal(day.overReserved, true);
    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, []);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, project)), []);
  });

  it("keeps an initially completed contribution complete without an end date", () => {
    const team = makeTeam("team-a", "2");
    const project = makeProject("project-a", [{ team, workload: "0" }]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-02")),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), []);
    assert.equal(rendered(plan.plannedWorkload), "0");
    assert.equal(rendered(plan.remainingUnplannedWorkload), "0");
    assert.equal(plan.complete, true);
    assert.equal("projectedEndDate" in plan, false);
  });

  it("simulates the same project independently for each team", () => {
    const slow = makeTeam("slow", "1");
    const fast = makeTeam("fast", "2");
    const project = makeProject("shared", [
      { team: slow, workload: "2" },
      { team: fast, workload: "3" },
    ]);
    const result = planPortfolio(
      makeInput([slow, fast], [project], "2025-01-01", "2025-01-02"),
    );

    const slowPlan = findProjectPlan(findTeamPlan(result, slow), project);
    const fastPlan = findProjectPlan(findTeamPlan(result, fast), project);
    assert.deepEqual(allocations(slowPlan), [
      ["2025-01-01", "1"],
      ["2025-01-02", "1"],
    ]);
    assert.deepEqual(allocations(fastPlan), [
      ["2025-01-01", "2"],
      ["2025-01-02", "1"],
    ]);
    assert.equal(rendered(slowPlan.remainingUnplannedWorkload), "0");
    assert.equal(rendered(fastPlan.remainingUnplannedWorkload), "0");
  });

  it("is deterministic and does not mutate portfolio inputs", () => {
    const team = makeTeam("team-a", "1");
    const first = makeProject("first", [{ team, workload: "2" }]);
    const second = makeProject("second", [{ team, workload: "1" }]);
    const input = makeInput(
      [team],
      [first, second],
      "2025-01-01",
      "2025-01-02",
    );
    const portfolio: Portfolio = input.portfolio;
    const teams = portfolio.teams;
    const projects = portfolio.projects;
    const priorityOrder = portfolio.priorityOrder;
    const firstRequirements = first.requirements;

    const firstResult = planPortfolio(input);
    const secondResult = planPortfolio(input);

    assert.deepEqual(
      comparableResult(firstResult),
      comparableResult(secondResult),
    );
    assert.strictEqual(portfolio.teams, teams);
    assert.strictEqual(portfolio.projects, projects);
    assert.strictEqual(portfolio.priorityOrder, priorityOrder);
    assert.strictEqual(first.requirements, firstRequirements);
    assert.deepEqual(portfolio.priorityOrder, [first.id, second.id]);
    assert.equal(rendered(first.requirements[0]!.remainingWorkload), "2");
    assert.equal(Object.isFrozen(firstResult), true);
    assert.equal(Object.isFrozen(firstResult.teamPlans), true);
    const firstTeamPlan = firstResult.teamPlans[0];
    assert.ok(firstTeamPlan);
    const firstAdmission = firstTeamPlan.dayAdmissions[0];
    assert.ok(firstAdmission);
    assert.equal(Object.isFrozen(firstTeamPlan.dayAdmissions), true);
    assert.equal(Object.isFrozen(firstAdmission), true);
    assert.equal(Object.isFrozen(firstAdmission.admittedProjectIds), true);
  });
});

describe("Phase 2B daily admission", () => {
  it("admits one project until it completes when max parallel is one", () => {
    const team = makeTeam("team-a", "2", 1);
    const first = makeProject("first", [{ team, workload: "4" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-03"),
      ),
      team,
    );

    assert.deepEqual(
      teamPlan.dayAdmissions.map((day) => day.admittedProjectIds),
      [[first.id], [first.id], [second.id]],
    );
  });

  it("admits at most two projects and leaves the third outside", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject("first", [{ team, workload: "4" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const third = makeProject("third", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [first, second, third],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      first.id,
      second.id,
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, third)), []);
  });

  it("freezes admission before consumption and never backfills", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject("first", [{ team, workload: "0.5" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const third = makeProject("third", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [first, second, third],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      first.id,
      second.id,
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "1.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, third)), []);
  });

  it("recomputes admission daily without continuity rights", () => {
    const team = makeTeam("team-a", "1", 1);
    const first = makeProject(
      "first",
      [{ team, workload: "2" }],
      { earliestStartDate: "2025-01-02" },
    );
    const second = makeProject("second", [{ team, workload: "3" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-03"),
      ),
      team,
    );

    assert.deepEqual(
      teamPlan.dayAdmissions.map((day) => day.admittedProjectIds),
      [[second.id], [first.id], [first.id]],
    );
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "1"],
    ]);
  });

  it("does not admit a project whose daily cap is zero", () => {
    const team = makeTeam("team-a", "1", 1);
    const blocked = makeProject("blocked", [
      { team, workload: "2", dailyCap: "0" },
    ]);
    const next = makeProject("next", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [blocked, next], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [next.id]);
  });

  it("does not admit a project whose remaining workload is zero", () => {
    const team = makeTeam("team-a", "1", 1);
    const complete = makeProject("complete", [{ team, workload: "0" }]);
    const next = makeProject("next", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [complete, next], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [next.id]);
  });

  it("admits no project when project capacity is zero", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject("first", [{ team, workload: "2" }]);
    const second = makeProject("second", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [first, second],
          "2025-01-01",
          "2025-01-01",
          [reservation("all", team, "1")],
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, []);
  });

  it("keeps an admitted project inactive without admitting a replacement", () => {
    const team = makeTeam("team-a", "1", 2);
    const first = makeProject("first", [{ team, workload: "2" }]);
    const second = makeProject("second", [{ team, workload: "2" }]);
    const third = makeProject("third", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [first, second, third],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      first.id,
      second.id,
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), []);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, third)), []);
  });

  it("uses portfolio priority order for admission", () => {
    const team = makeTeam("team-a", "1", 2);
    const first = makeProject("first", [{ team, workload: "2" }]);
    const second = makeProject("second", [{ team, workload: "2" }]);
    const third = makeProject("third", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [third, first, second],
          "2025-01-01",
          "2025-01-01",
          [],
          [first, second, third],
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      first.id,
      second.id,
    ]);
  });

  it("computes independent admissions for teams with different limits", () => {
    const narrow = makeTeam("narrow", "2", 1);
    const wide = makeTeam("wide", "2", 2);
    const first = makeProject("first", [
      { team: narrow, workload: "2" },
      { team: wide, workload: "2" },
    ]);
    const second = makeProject("second", [
      { team: narrow, workload: "2" },
      { team: wide, workload: "2" },
    ]);
    const teamPlans = planPortfolio(
      makeInput(
        [narrow, wide],
        [first, second],
        "2025-01-01",
        "2025-01-01",
      ),
    );

    assert.deepEqual(
      findTeamPlan(teamPlans, narrow).dayAdmissions[0]?.admittedProjectIds,
      [first.id],
    );
    assert.deepEqual(
      findTeamPlan(teamPlans, wide).dayAdmissions[0]?.admittedProjectIds,
      [first.id, second.id],
    );
  });
});
