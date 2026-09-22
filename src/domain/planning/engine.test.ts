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
  serializeQuantity,
  type CivilDate,
  type DomainResult,
  type FirmCapacityReservation,
  type PlanningInput,
  type PlanningResult,
  type Portfolio,
  type Project,
  type ProjectTeamRequirement,
  type ProjectTeamPlanningResult,
  type Team,
  type TeamPlanningResult,
} from "../index.js";
import {
  addRationals,
  compareRationals,
  rationalFromInteger,
  type Rational,
} from "../model/rational.js";
import { rationalOf } from "../model/scalars.js";

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

function deadlineStatuses(
  plan: ProjectTeamPlanningResult,
): [CivilDate, string][] {
  return (plan.deadlineStatuses ?? []).map((entry) => [
    entry.date,
    entry.status,
  ]);
}

function comparableResult(result: PlanningResult) {
  return {
    teamPlans: result.teamPlans.map((teamPlan) => ({
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
        deadlineStatus: projectPlan.deadlineStatus,
        deadlineStatuses: projectPlan.deadlineStatuses,
      })),
    })),
    diagnostics: result.diagnostics,
  };
}

function sumRationals(values: readonly Rational[]): Rational {
  return values.reduce(addRationals, rationalFromInteger(0n));
}

function allocationOn(
  plan: ProjectTeamPlanningResult,
  targetDate: CivilDate,
): Rational {
  return sumRationals(
    plan.allocations
      .filter((allocation) => allocation.date === targetDate)
      .map((allocation) => rationalOf(allocation.workload)),
  );
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
    assert.equal("deadlineStatus" in plan, false);
    assert.equal("deadlineStatuses" in plan, false);
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

  it("respects earliest start, ignores objective date, and handles a passed deadline", () => {
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
    assert.equal(plan.deadlineStatus, "MISSED");
  });

  it("shares capacity equally and aggregates each daily allocation", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject("first", [{ team, workload: "4" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-04"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
      ["2025-01-02", "1"],
      ["2025-01-03", "1"],
      ["2025-01-04", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "1"],
      ["2025-01-02", "1"],
      ["2025-01-03", "1"],
      ["2025-01-04", "1"],
    ]);
    assert.equal(
      findProjectPlan(teamPlan, first).projectedEndDate,
      "2025-01-04",
    );
    assert.equal(
      findProjectPlan(teamPlan, second).projectedEndDate,
      "2025-01-04",
    );
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
    const team = makeTeam("team-a", "0.5", 2);
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
      ["2025-01-01", "0.5"],
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

describe("Phase 2C normal fair sharing", () => {
  it("uses priority to assign an indivisible exact half-day quantum", () => {
    const team = makeTeam("team-a", "1.5", 2);
    const first = makeProject("first", [{ team, workload: "4" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "0.5"],
    ]);
  });

  it("shares rounds among three admitted projects in priority order", () => {
    const team = makeTeam("team-a", "2", 3);
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

    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, third)), [
      ["2025-01-01", "0.5"],
    ]);
  });

  it("allocates an exact final RAF remainder but not the unusable capacity", () => {
    const team = makeTeam("team-a", "1", 2);
    const finishing = makeProject("finishing", [{ team, workload: "0.2" }]);
    const regular = makeProject("regular", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [finishing, regular],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, finishing)), [
      ["2025-01-01", "0.2"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, regular)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.equal(findProjectPlan(teamPlan, finishing).complete, true);
  });

  it("leaves a sub-quantum capacity unused when it cannot finish a RAF", () => {
    const team = makeTeam("team-a", "0.3", 1);
    const project = makeProject("project-a", [{ team, workload: "5" }]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-01")),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), []);
    assert.equal(rendered(plan.remainingUnplannedWorkload), "5");
  });

  it("uses a sub-quantum capacity to finish an exact RAF remainder", () => {
    const team = makeTeam("team-a", "0.3", 1);
    const project = makeProject("project-a", [
      { team, workload: "0.2", dailyCap: "0.2" },
    ]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(makeInput([team], [project], "2025-01-01", "2025-01-01")),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), [["2025-01-01", "0.2"]]);
    assert.equal(plan.complete, true);
    assert.equal(plan.projectedEndDate, "2025-01-01");
  });

  it("tracks daily caps cumulatively while redistributing within admission", () => {
    const team = makeTeam("team-a", "2", 2);
    const capped = makeProject("capped", [
      { team, workload: "4", dailyCap: "0.5" },
    ]);
    const regular = makeProject("regular", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [capped, regular], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, capped)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, regular)), [
      ["2025-01-01", "1.5"],
    ]);
  });
});

describe("Phase 2D mandatory deadlines", () => {
  it("keeps a never-admitted project pending and tests feasibility only on admission", () => {
    const team = makeTeam("team-a", "1", 1);
    const blocker = makeProject("blocker", [{ team, workload: "3" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-04" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [blocker, deadline],
          "2025-01-01",
          "2025-01-04",
        ),
      ),
      team,
    );
    const deadlinePlan = findProjectPlan(teamPlan, deadline);

    assert.deepEqual(deadlineStatuses(deadlinePlan), [
      ["2025-01-01", "PENDING"],
      ["2025-01-02", "PENDING"],
      ["2025-01-03", "PENDING"],
      ["2025-01-04", "UNFEASIBLE"],
    ]);
    assert.deepEqual(teamPlan.dayAdmissions[3]?.admittedProjectIds, [
      deadline.id,
    ]);
    assert.deepEqual(allocations(deadlinePlan), [["2025-01-04", "1"]]);
  });

  it("does not reserve future capacity for a higher-priority unfeasible deadline", () => {
    const team = makeTeam("team-a", "1", 2);
    const futurePriority = makeProject(
      "future-priority",
      [{ team, workload: "1" }],
      { earliestStartDate: "2025-01-02" },
    );
    const unfeasible = makeProject(
      "unfeasible",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const lowerDeadline = makeProject(
      "lower-deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [futurePriority, unfeasible, lowerDeadline],
          "2025-01-01",
          "2025-01-02",
        ),
      ),
      team,
    );
    const unfeasiblePlan = findProjectPlan(teamPlan, unfeasible);
    const lowerPlan = findProjectPlan(teamPlan, lowerDeadline);

    assert.equal(unfeasiblePlan.deadlineStatuses?.[0]?.status, "UNFEASIBLE");
    assert.deepEqual(deadlineStatuses(lowerPlan), [
      ["2025-01-01", "FEASIBLE"],
      ["2025-01-02", "FEASIBLE"],
    ]);
    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      unfeasible.id,
      lowerDeadline.id,
    ]);
    assert.deepEqual(teamPlan.dayAdmissions[1]?.admittedProjectIds, [
      futurePriority.id,
      unfeasible.id,
    ]);
    assert.deepEqual(allocations(lowerPlan), []);
  });

  it("does not reserve future capacity for a higher-priority missed deadline", () => {
    const team = makeTeam("team-a", "1", 2);
    const missed = makeProject(
      "missed",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const lowerDeadline = makeProject(
      "lower-deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-03" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [missed, lowerDeadline],
          "2025-01-02",
          "2025-01-02",
        ),
      ),
      team,
    );

    assert.equal(findProjectPlan(teamPlan, missed).deadlineStatus, "MISSED");
    assert.equal(
      findProjectPlan(teamPlan, lowerDeadline).deadlineStatus,
      "FEASIBLE",
    );
    assert.deepEqual(allocations(findProjectPlan(teamPlan, missed)), [
      ["2025-01-02", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, lowerDeadline)), []);
  });

  it("still applies a higher-priority feasible trajectory to future accessibility", () => {
    const team = makeTeam("team-a", "1", 2);
    const feasible = makeProject(
      "feasible",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const constrained = makeProject(
      "constrained",
      [{ team, workload: "1.5" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [feasible, constrained], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.equal(findProjectPlan(teamPlan, feasible).deadlineStatus, "FEASIBLE");
    assert.equal(
      findProjectPlan(teamPlan, constrained).deadlineStatus,
      "UNFEASIBLE",
    );
    assert.deepEqual(allocations(findProjectPlan(teamPlan, feasible)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, constrained)), [
      ["2025-01-01", "0.5"],
    ]);
  });

  it("uses an exact one-half ratio and constrains lower-priority deadlines", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject(
      "first",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const second = makeProject(
      "second",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.equal(findProjectPlan(teamPlan, first).deadlineStatus, "FEASIBLE");
    assert.equal(
      findProjectPlan(teamPlan, second).deadlineStatus,
      "UNFEASIBLE",
    );
    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), [
      ["2025-01-01", "1"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), [
      ["2025-01-01", "1"],
    ]);
  });

  it("keeps an exact one-third deadline allocation outside normal quantization", () => {
    const team = makeTeam("team-a", "1", 2);
    const normal = makeProject("normal", [{ team, workload: "5" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-03" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [normal, deadline], "2025-01-01", "2025-01-01"),
      ),
      team,
    );
    const deadlinePlan = findProjectPlan(teamPlan, deadline);
    const allocation = deadlinePlan.allocations[0];
    assert.ok(allocation);

    assert.equal(serializeQuantity(allocation.workload), "1/3");
    assert.equal(deadlinePlan.deadlineStatus, "FEASIBLE");
    assert.deepEqual(allocations(findProjectPlan(teamPlan, normal)), [
      ["2025-01-01", "0.5"],
    ]);
  });

  it("lets a lower-priority deadline consume before normal fair sharing", () => {
    const team = makeTeam("team-a", "2", 2);
    const normal = makeProject("normal", [{ team, workload: "5" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [normal, deadline], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, normal)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, deadline)), [
      ["2025-01-01", "1.5"],
    ]);
  });

  it("lets an unfeasible deadline consume the maximum without backfill", () => {
    const team = makeTeam("team-a", "2", 2);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "5" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const admittedNormal = makeProject("admitted-normal", [
      { team, workload: "4" },
    ]);
    const outside = makeProject("outside", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [deadline, admittedNormal, outside],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      deadline.id,
      admittedNormal.id,
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, deadline)), [
      ["2025-01-01", "2"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, admittedNormal)), []);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, outside)), []);
  });

  it("changes feasible to unfeasible after interruption and never reverses it", () => {
    const team = makeTeam("team-a", "1", 1);
    const interrupter = makeProject(
      "interrupter",
      [{ team, workload: "1" }],
      { earliestStartDate: "2025-01-02" },
    );
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-04" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput(
            [team],
            [interrupter, deadline],
            "2025-01-01",
            "2025-01-04",
          ),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(deadlineStatuses(deadlinePlan), [
      ["2025-01-01", "FEASIBLE"],
      ["2025-01-02", "FEASIBLE"],
      ["2025-01-03", "UNFEASIBLE"],
      ["2025-01-04", "UNFEASIBLE"],
    ]);
    assert.equal(
      serializeQuantity(deadlinePlan.allocations[0]!.workload),
      "3/4",
    );
  });

  it("changes a pending project to missed without ever admitting it", () => {
    const team = makeTeam("team-a", "1", 1);
    const blocker = makeProject("blocker", [{ team, workload: "3" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput(
            [team],
            [blocker, deadline],
            "2025-01-01",
            "2025-01-02",
          ),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(deadlineStatuses(deadlinePlan), [
      ["2025-01-01", "PENDING"],
      ["2025-01-02", "MISSED"],
    ]);
    assert.deepEqual(allocations(deadlinePlan), []);
  });

  it("changes a feasible interrupted project to missed", () => {
    const team = makeTeam("team-a", "1", 1);
    const blocker = makeProject(
      "blocker",
      [{ team, workload: "2" }],
      { earliestStartDate: "2025-01-02" },
    );
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput(
            [team],
            [blocker, deadline],
            "2025-01-01",
            "2025-01-03",
          ),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(deadlineStatuses(deadlinePlan), [
      ["2025-01-01", "FEASIBLE"],
      ["2025-01-02", "FEASIBLE"],
      ["2025-01-03", "MISSED"],
    ]);
  });

  it("changes unfeasible to missed and still consumes the maximum", () => {
    const team = makeTeam("team-a", "1", 1);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [deadline], "2025-01-01", "2025-01-02"),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(deadlineStatuses(deadlinePlan), [
      ["2025-01-01", "UNFEASIBLE"],
      ["2025-01-02", "MISSED"],
    ]);
    assert.deepEqual(allocations(deadlinePlan), [
      ["2025-01-01", "1"],
      ["2025-01-02", "1"],
    ]);
  });

  it("shares one daily cap across exact deadline and normal allocations", () => {
    const team = makeTeam("team-a", "2", 1);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "2", dailyCap: "1.5" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [deadline], "2025-01-01", "2025-01-01"),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(allocations(deadlinePlan), [["2025-01-01", "1.5"]]);
    assert.equal(rendered(deadlinePlan.remainingUnplannedWorkload), "0.5");
  });

  it("can finish a feasible project before its deadline", () => {
    const team = makeTeam("team-a", "1", 1);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const deadlinePlan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [deadline], "2025-01-01", "2025-01-01"),
        ),
        team,
      ),
      deadline,
    );

    assert.equal(deadlinePlan.complete, true);
    assert.equal(deadlinePlan.projectedEndDate, "2025-01-01");
    assert.equal(deadlinePlan.deadlineStatus, "FEASIBLE");
  });

  it("simulates deadline status independently for each team", () => {
    const slow = makeTeam("slow", "1", 1);
    const fast = makeTeam("fast", "2", 1);
    const deadline = makeProject(
      "deadline",
      [
        { team: slow, workload: "2" },
        { team: fast, workload: "2" },
      ],
      { mandatoryDeadline: "2025-01-01" },
    );
    const result = planPortfolio(
      makeInput([slow, fast], [deadline], "2025-01-01", "2025-01-01"),
    );
    const slowPlan = findProjectPlan(findTeamPlan(result, slow), deadline);
    const fastPlan = findProjectPlan(findTeamPlan(result, fast), deadline);

    assert.equal(slowPlan.deadlineStatus, "UNFEASIBLE");
    assert.equal(fastPlan.deadlineStatus, "FEASIBLE");
    assert.equal(slowPlan.complete, false);
    assert.equal(fastPlan.complete, true);
    assert.equal(Object.isFrozen(fastPlan.deadlineStatuses), true);
    assert.equal(Object.isFrozen(fastPlan.deadlineStatuses?.[0]), true);
  });
});

describe("Planning Engine V1 diagnostics", () => {
  it("reports over-reservation once per team and date", () => {
    const team = makeTeam("team-a", "3", 1);
    const project = makeProject("project-a", [{ team, workload: "2" }]);
    const result = planPortfolio(
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
    );

    assert.deepEqual(result.diagnostics, [
      {
        code: "TEAM_OVER_RESERVED",
        teamId: team.id,
        date: "2025-01-01",
      },
      {
        code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        teamId: team.id,
        projectId: project.id,
      },
    ]);
  });

  it("reports a partial horizon independently from deadlines", () => {
    const team = makeTeam("team-a", "1", 1);
    const project = makeProject("project-a", [{ team, workload: "5" }]);
    const result = planPortfolio(
      makeInput([team], [project], "2025-01-01", "2025-01-03"),
    );

    assert.deepEqual(result.diagnostics, [
      {
        code: "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
        teamId: team.id,
        projectId: project.id,
      },
    ]);
  });

  it("emits each deadline transition once and keeps distinct horizon diagnostics", () => {
    const team = makeTeam("team-a", "1", 1);
    const project = makeProject(
      "project-a",
      [{ team, workload: "4" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const result = planPortfolio(
      makeInput([team], [project], "2025-01-01", "2025-01-03"),
    );

    assert.deepEqual(
      result.diagnostics.map((diagnostic) => diagnostic.code),
      [
        "DEADLINE_UNFEASIBLE",
        "DEADLINE_MISSED",
        "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
      ],
    );
  });

  it("freezes the complete result tree owned by the planner", () => {
    const team = makeTeam("team-a", "1", 1);
    const project = makeProject(
      "project-a",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const result = planPortfolio(
      makeInput([team], [project], "2025-01-01", "2025-01-01"),
    );
    const teamPlan = result.teamPlans[0];
    const projectPlan = teamPlan?.projectPlans[0];
    assert.ok(teamPlan);
    assert.ok(projectPlan);

    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.teamPlans), true);
    assert.equal(Object.isFrozen(result.diagnostics), true);
    assert.equal(Object.isFrozen(result.diagnostics[0]), true);
    assert.equal(Object.isFrozen(teamPlan), true);
    assert.equal(Object.isFrozen(teamPlan.dayCapacities), true);
    assert.equal(Object.isFrozen(teamPlan.dayCapacities[0]), true);
    assert.equal(Object.isFrozen(teamPlan.dayAdmissions), true);
    assert.equal(Object.isFrozen(teamPlan.dayAdmissions[0]), true);
    assert.equal(
      Object.isFrozen(teamPlan.dayAdmissions[0]?.admittedProjectIds),
      true,
    );
    assert.equal(Object.isFrozen(teamPlan.projectPlans), true);
    assert.equal(Object.isFrozen(projectPlan), true);
    assert.equal(Object.isFrozen(projectPlan.allocations), true);
    assert.equal(Object.isFrozen(projectPlan.allocations[0]), true);
    assert.equal(Object.isFrozen(projectPlan.deadlineStatuses), true);
    assert.equal(Object.isFrozen(projectPlan.deadlineStatuses?.[0]), true);
  });
});

describe("Planning Engine V1 exact invariants", () => {
  it("preserves workloads, capacities, daily caps, admission, and slot limits", () => {
    const primary = makeTeam("primary", "2", 2);
    const secondary = makeTeam("secondary", "1", 1);
    const deadline = makeProject(
      "deadline",
      [
        { team: primary, workload: "2", dailyCap: "1.5" },
        { team: secondary, workload: "3", dailyCap: "1" },
      ],
      { mandatoryDeadline: "2025-01-02" },
    );
    const short = makeProject("short", [
      { team: primary, workload: "0.5" },
    ]);
    const partial = makeProject("partial", [
      { team: primary, workload: "5", dailyCap: "0.5" },
    ]);
    const input = makeInput(
      [primary, secondary],
      [deadline, short, partial],
      "2025-01-01",
      "2025-01-02",
      [reservation("quarter", primary, "0.25")],
    );
    const result = planPortfolio(input);

    for (const teamPlan of result.teamPlans) {
      const team = input.portfolio.teams.find(
        (candidate) => candidate.id === teamPlan.teamId,
      );
      assert.ok(team);

      for (const projectPlan of teamPlan.projectPlans) {
        const project = input.portfolio.projects.find(
          (candidate) => candidate.id === projectPlan.projectId,
        );
        assert.ok(project);
        const requirement: ProjectTeamRequirement | undefined = project.requirements.find(
          (candidate) => candidate.teamId === team.id,
        );
        assert.ok(requirement);

        const reconstructed = addRationals(
          rationalOf(projectPlan.plannedWorkload),
          rationalOf(projectPlan.remainingUnplannedWorkload),
        );
        assert.equal(
          compareRationals(reconstructed, rationalOf(requirement.remainingWorkload)),
          0,
        );

        for (const allocation of projectPlan.allocations) {
          const admission = teamPlan.dayAdmissions.find(
            (day) => day.date === allocation.date,
          );
          assert.ok(admission?.admittedProjectIds.includes(projectPlan.projectId));
          if (requirement.dailyCap) {
            assert.equal(
              compareRationals(
                allocationOn(projectPlan, allocation.date),
                rationalOf(requirement.dailyCap),
              ) <= 0,
              true,
            );
          }
        }
      }

      for (const day of teamPlan.dayCapacities) {
        const allocated = sumRationals(
          teamPlan.projectPlans.map((plan) => allocationOn(plan, day.date)),
        );
        assert.equal(
          compareRationals(allocated, rationalOf(day.projectCapacity)) <= 0,
          true,
        );
      }

      for (const admission of teamPlan.dayAdmissions) {
        assert.equal(
          admission.admittedProjectIds.length <= team.maxParallelProjects,
          true,
        );
      }
    }

    const primaryPlans = findTeamPlan(result, primary).projectPlans;
    assert.equal(primaryPlans.some((plan) => plan.complete), true);
    assert.equal(primaryPlans.some((plan) => !plan.complete), true);
  });

  it("is strongly deterministic on a complex multi-team scenario", () => {
    const firstTeam = makeTeam("first-team", "3", 2);
    const secondTeam = makeTeam("second-team", "1.5", 1);
    const deadline = makeProject(
      "deadline",
      [
        { team: firstTeam, workload: "4", dailyCap: "2" },
        { team: secondTeam, workload: "3", dailyCap: "1" },
      ],
      { mandatoryDeadline: "2025-01-02" },
    );
    const normal = makeProject("normal", [
      { team: firstTeam, workload: "5" },
      { team: secondTeam, workload: "2" },
    ]);
    const input = makeInput(
      [firstTeam, secondTeam],
      [normal, deadline],
      "2025-01-01",
      "2025-01-02",
      [reservation("firm", firstTeam, "0.25")],
    );
    const teams = input.portfolio.teams;
    const projects = input.portfolio.projects;
    const priorityOrder = input.portfolio.priorityOrder;
    const reservations = input.portfolio.reservations;
    const deadlineRequirements = deadline.requirements;
    const firmReservation = reservations[0];

    const firstResult = planPortfolio(input);
    const secondResult = planPortfolio(input);
    assert.deepEqual(comparableResult(firstResult), comparableResult(secondResult));
    assert.strictEqual(input.portfolio.teams, teams);
    assert.strictEqual(input.portfolio.projects, projects);
    assert.strictEqual(input.portfolio.priorityOrder, priorityOrder);
    assert.strictEqual(input.portfolio.reservations, reservations);
    assert.strictEqual(deadline.requirements, deadlineRequirements);
    assert.strictEqual(input.portfolio.teams[0], firstTeam);
    assert.strictEqual(input.portfolio.projects[0], normal);
    assert.strictEqual(input.portfolio.reservations[0], firmReservation);
  });
});

describe("Planning Engine V1 canonical scenarios", () => {
  it("A. shares normal capacity equally over the complete horizon", () => {
    const team = makeTeam("team-a", "2", 2);
    const first = makeProject("first", [{ team, workload: "4" }]);
    const second = makeProject("second", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-04"),
      ),
      team,
    );
    const expected: [CivilDate, string][] = [
      [date("2025-01-01"), "1"],
      [date("2025-01-02"), "1"],
      [date("2025-01-03"), "1"],
      [date("2025-01-04"), "1"],
    ];

    assert.deepEqual(allocations(findProjectPlan(teamPlan, first)), expected);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), expected);
  });

  it("B. finishes a short RAF without backfilling the frozen admission", () => {
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

  it("C. lets a newly eligible higher priority interrupt the current project", () => {
    const team = makeTeam("team-a", "1", 1);
    const first = makeProject(
      "first",
      [{ team, workload: "1" }],
      { earliestStartDate: "2025-01-02" },
    );
    const second = makeProject("second", [{ team, workload: "2" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-02"),
      ),
      team,
    );

    assert.deepEqual(
      teamPlan.dayAdmissions.map((day) => day.admittedProjectIds),
      [[second.id], [first.id]],
    );
  });

  it("D. subtracts an exact firm reservation before project capacity", () => {
    const team = makeTeam("team-a", "3", 1);
    const project = makeProject("project-a", [{ team, workload: "3" }]);
    const day = findTeamPlan(
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
    ).dayCapacities[0];
    assert.ok(day);

    assert.equal(rendered(day.effectiveCapacity), "3");
    assert.equal(rendered(day.reservedCapacity), "1.5");
    assert.equal(rendered(day.projectCapacity), "1.5");
  });

  it("E. reports over-reservation while keeping project capacity at zero", () => {
    const team = makeTeam("team-a", "3", 1);
    const project = makeProject("project-a", [{ team, workload: "3" }]);
    const result = planPortfolio(
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
    );
    const day = findTeamPlan(result, team).dayCapacities[0];
    assert.ok(day);

    assert.equal(rendered(day.projectCapacity), "0");
    assert.equal(day.overReserved, true);
    assert.equal(result.diagnostics[0]?.code, "TEAM_OVER_RESERVED");
  });

  it("F. follows an exact one-half feasible deadline trajectory", () => {
    const team = makeTeam("team-a", "2", 2);
    const feasible = makeProject(
      "feasible",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const consumer = makeProject(
      "consumer",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [feasible, consumer], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.equal(findProjectPlan(teamPlan, feasible).deadlineStatus, "FEASIBLE");
    assert.deepEqual(allocations(findProjectPlan(teamPlan, feasible)), [
      ["2025-01-01", "1"],
    ]);
  });

  it("G. preserves an exact one-third deadline allocation", () => {
    const team = makeTeam("team-a", "1", 2);
    const normal = makeProject("normal", [{ team, workload: "5" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-03" },
    );
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [normal, deadline], "2025-01-01", "2025-01-01"),
        ),
        team,
      ),
      deadline,
    );

    assert.equal(serializeQuantity(plan.allocations[0]!.workload), "1/3");
  });

  it("H. marks an impossible deadline unfeasible and consumes today's maximum", () => {
    const team = makeTeam("team-a", "1", 1);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "5" }],
      { mandatoryDeadline: "2025-01-03" },
    );
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [deadline], "2025-01-01", "2025-01-01"),
        ),
        team,
      ),
      deadline,
    );

    assert.equal(plan.deadlineStatus, "UNFEASIBLE");
    assert.deepEqual(allocations(plan), [["2025-01-01", "1"]]);
  });

  it("I. marks a positive RAF missed after its deadline", () => {
    const team = makeTeam("team-a", "1", 1);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [deadline], "2025-01-02", "2025-01-02"),
        ),
        team,
      ),
      deadline,
    );

    assert.equal(plan.deadlineStatus, "MISSED");
    assert.equal(
      plan.deadlineStatuses?.[0]?.status,
      "MISSED",
    );
  });

  it("J. lets a lower-priority deadline consume before a normal project", () => {
    const team = makeTeam("team-a", "2", 2);
    const normal = makeProject("normal", [{ team, workload: "5" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [normal, deadline], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.deepEqual(allocations(findProjectPlan(teamPlan, normal)), [
      ["2025-01-01", "0.5"],
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, deadline)), [
      ["2025-01-01", "1.5"],
    ]);
  });

  it("K. never exceeds a project daily cap", () => {
    const team = makeTeam("team-a", "2", 1);
    const project = makeProject("project-a", [
      { team, workload: "2", dailyCap: "0.5" },
    ]);
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [project], "2025-01-01", "2025-01-02"),
        ),
        team,
      ),
      project,
    );

    assert.deepEqual(allocations(plan), [
      ["2025-01-01", "0.5"],
      ["2025-01-02", "0.5"],
    ]);
  });

  it("L. preserves partial work and reports it at the horizon", () => {
    const team = makeTeam("team-a", "1", 1);
    const project = makeProject("project-a", [{ team, workload: "5" }]);
    const result = planPortfolio(
      makeInput([team], [project], "2025-01-01", "2025-01-03"),
    );
    const plan = findProjectPlan(findTeamPlan(result, team), project);

    assert.equal(rendered(plan.plannedWorkload), "3");
    assert.equal(rendered(plan.remainingUnplannedWorkload), "2");
    assert.equal(plan.complete, false);
    assert.equal(
      result.diagnostics[0]?.code,
      "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
    );
  });

  it("M. simulates the same project independently on multiple teams", () => {
    const slow = makeTeam("slow", "1", 1);
    const fast = makeTeam("fast", "2", 1);
    const project = makeProject("project-a", [
      { team: slow, workload: "3" },
      { team: fast, workload: "3" },
    ]);
    const result = planPortfolio(
      makeInput([slow, fast], [project], "2025-01-01", "2025-01-01"),
    );

    assert.equal(
      rendered(findProjectPlan(findTeamPlan(result, slow), project).plannedWorkload),
      "1",
    );
    assert.equal(
      rendered(findProjectPlan(findTeamPlan(result, fast), project).plannedWorkload),
      "2",
    );
  });

  it("N. never predicts feasibility before the first admission", () => {
    const team = makeTeam("team-a", "1", 1);
    const first = makeProject("first", [{ team, workload: "5" }]);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-04" },
    );
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput([team], [first, deadline], "2025-01-01", "2025-01-04"),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(
      deadlineStatuses(plan).map((entry) => entry[1]),
      ["PENDING", "PENDING", "PENDING", "PENDING"],
    );
  });

  it("O. can downgrade feasible after losing and regaining admission", () => {
    const team = makeTeam("team-a", "1", 1);
    const interrupter = makeProject(
      "interrupter",
      [{ team, workload: "1" }],
      { earliestStartDate: "2025-01-02" },
    );
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "3" }],
      { mandatoryDeadline: "2025-01-04" },
    );
    const plan = findProjectPlan(
      findTeamPlan(
        planPortfolio(
          makeInput(
            [team],
            [interrupter, deadline],
            "2025-01-01",
            "2025-01-04",
          ),
        ),
        team,
      ),
      deadline,
    );

    assert.deepEqual(
      deadlineStatuses(plan).map((entry) => entry[1]),
      ["FEASIBLE", "FEASIBLE", "UNFEASIBLE", "UNFEASIBLE"],
    );
  });

  it("P. keeps a normal admitted project inactive after deadline consumption", () => {
    const team = makeTeam("team-a", "2", 2);
    const deadline = makeProject(
      "deadline",
      [{ team, workload: "5" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const second = makeProject("second", [{ team, workload: "4" }]);
    const third = makeProject("third", [{ team, workload: "4" }]);
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput(
          [team],
          [deadline, second, third],
          "2025-01-01",
          "2025-01-01",
        ),
      ),
      team,
    );

    assert.deepEqual(teamPlan.dayAdmissions[0]?.admittedProjectIds, [
      deadline.id,
      second.id,
    ]);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, second)), []);
    assert.deepEqual(allocations(findProjectPlan(teamPlan, third)), []);
  });

  it("Q. applies feasible deadline trajectories sequentially by priority", () => {
    const team = makeTeam("team-a", "1", 2);
    const first = makeProject(
      "first",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const second = makeProject(
      "second",
      [{ team, workload: "1.5" }],
      { mandatoryDeadline: "2025-01-02" },
    );
    const teamPlan = findTeamPlan(
      planPortfolio(
        makeInput([team], [first, second], "2025-01-01", "2025-01-01"),
      ),
      team,
    );

    assert.equal(findProjectPlan(teamPlan, first).deadlineStatus, "FEASIBLE");
    assert.equal(
      findProjectPlan(teamPlan, second).deadlineStatus,
      "UNFEASIBLE",
    );
  });

  it("R. never reserves future capacity for unfeasible or missed deadlines", () => {
    const team = makeTeam("team-a", "1", 2);
    const failed = makeProject(
      "failed",
      [{ team, workload: "2" }],
      { mandatoryDeadline: "2025-01-01" },
    );
    const lower = makeProject(
      "lower",
      [{ team, workload: "1" }],
      { mandatoryDeadline: "2025-01-03" },
    );
    const unfeasibleResult = planPortfolio(
      makeInput([team], [failed, lower], "2025-01-01", "2025-01-01"),
    );
    const missedResult = planPortfolio(
      makeInput([team], [failed, lower], "2025-01-02", "2025-01-02"),
    );

    assert.equal(
      findProjectPlan(findTeamPlan(unfeasibleResult, team), lower).deadlineStatus,
      "FEASIBLE",
    );
    assert.equal(
      findProjectPlan(findTeamPlan(missedResult, team), lower).deadlineStatus,
      "FEASIBLE",
    );
  });
});
