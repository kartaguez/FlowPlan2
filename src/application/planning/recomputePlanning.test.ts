import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCapacityPeriod,
  createCivilDate,
  createDailyCap,
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
  quantityToDecimalString,
  type DomainResult,
  type PlanningHorizon,
  type Portfolio,
  type Project,
  type Team,
} from "../../domain/index.js";
import {
  recomputePlanning,
  type RecomputePlanningRequest,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));

function makeTeam(id: string, capacity: string): Team {
  return must(
    createTeam({
      id: must(createTeamId(id)),
      name: id,
      capacitySchedule: must(
        createTeamCapacitySchedule({
          periods: [
            must(
              createCapacityPeriod({
                start: date("2025-01-01"),
                end: date("2025-12-31"),
                dailyCapacity: must(createCapacity(capacity)),
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
  requirements: readonly {
    readonly team: Team;
    readonly workload: string;
    readonly dailyCap?: string;
  }[],
  mandatoryDeadline?: string,
): Project {
  return must(
    createProject({
      id: must(createProjectId(id)),
      name: id,
      ...(mandatoryDeadline
        ? { mandatoryDeadline: date(mandatoryDeadline) }
        : {}),
      requirements: requirements.map((requirement) =>
        must(
          createProjectTeamRequirement({
            teamId: requirement.team.id,
            remainingWorkload: must(
              createRemainingWorkload(requirement.workload),
            ),
            ...(requirement.dailyCap
              ? { dailyCap: must(createDailyCap(requirement.dailyCap)) }
              : {}),
          }),
        ),
      ),
    }),
  );
}

function makeRequest(
  teams: readonly Team[],
  projects: readonly Project[],
  start: string,
  end: string,
): RecomputePlanningRequest {
  return {
    portfolio: must(
      createPortfolio({
        teams,
        projects,
        priorityOrder: projects.map((project) => project.id),
        reservations: [],
      }),
    ),
    horizon: must(
      createPlanningHorizon({ start: date(start), end: date(end) }),
    ),
    workingPattern: must(
      createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5, 6, 7] }),
    ),
    maxParallelProjects: must(createMaxParallelProjects(2)),
  };
}

describe("RecomputePlanning", () => {
  it("delegates the request unchanged to the Planning Engine V1", () => {
    const team = makeTeam("team-a", "2");
    const project = makeProject("project-a", [
      { team, workload: "4", dailyCap: "2" },
    ]);
    const request = makeRequest(
      [team],
      [project],
      "2025-01-01",
      "2025-01-02",
    );

    const response = recomputePlanning(request);
    const domainResult = planPortfolio(request);

    assert.deepEqual(response.planningResult, domainResult);
  });

  it("preserves domain diagnostics without filtering or transformation", () => {
    const team = makeTeam("team-a", "1");
    const project = makeProject("project-a", [{ team, workload: "5" }]);
    const request = makeRequest(
      [team],
      [project],
      "2025-01-01",
      "2025-01-02",
    );

    const actual = recomputePlanning(request).planningResult;
    const expected = planPortfolio(request);

    assert.deepEqual(actual.diagnostics, expected.diagnostics);
    assert.equal(
      actual.diagnostics[0]?.code,
      "PROJECT_REMAINS_UNPLANNED_AT_HORIZON",
    );
  });

  it("preserves deadline statuses and exact allocations", () => {
    const team = makeTeam("team-a", "1");
    const normal = makeProject("normal", [{ team, workload: "5" }]);
    const project = makeProject(
      "deadline",
      [{ team, workload: "1" }],
      "2025-01-03",
    );
    const request = makeRequest(
      [team],
      [normal, project],
      "2025-01-01",
      "2025-01-01",
    );

    const actual = recomputePlanning(request).planningResult;
    const expected = planPortfolio(request);
    const actualPlan = actual.teamPlans[0]?.projectPlans.find(
      (candidate) => candidate.projectId === project.id,
    );
    const expectedPlan = expected.teamPlans[0]?.projectPlans.find(
      (candidate) => candidate.projectId === project.id,
    );
    assert.ok(actualPlan);
    assert.ok(expectedPlan);

    assert.deepEqual(actualPlan, expectedPlan);
    assert.equal(actualPlan.deadlineStatus, "FEASIBLE");
    assert.equal(
      must(quantityToDecimalString(actualPlan.allocations[0]!.workload, 9)),
      "0.333333333",
    );
  });

  it("preserves independent multi-team planning results", () => {
    const slow = makeTeam("slow", "1");
    const fast = makeTeam("fast", "2");
    const project = makeProject("shared", [
      { team: slow, workload: "3" },
      { team: fast, workload: "3" },
    ]);
    const request = makeRequest(
      [slow, fast],
      [project],
      "2025-01-01",
      "2025-01-01",
    );

    const actual = recomputePlanning(request).planningResult;
    const expected = planPortfolio(request);

    assert.deepEqual(actual.teamPlans, expected.teamPlans);
    assert.equal(actual.teamPlans.length, 2);
  });

  it("is deterministic for the same request", () => {
    const firstTeam = makeTeam("first", "2");
    const secondTeam = makeTeam("second", "1");
    const deadline = makeProject(
      "deadline",
      [
        { team: firstTeam, workload: "3" },
        { team: secondTeam, workload: "2" },
      ],
      "2025-01-02",
    );
    const normal = makeProject("normal", [
      { team: firstTeam, workload: "4" },
    ]);
    const request = makeRequest(
      [firstTeam, secondTeam],
      [normal, deadline],
      "2025-01-01",
      "2025-01-02",
    );

    assert.deepEqual(
      recomputePlanning(request).planningResult,
      recomputePlanning(request).planningResult,
    );
  });

  it("does not mutate request or domain input references", () => {
    const team = makeTeam("team-a", "1");
    const project = makeProject("project-a", [{ team, workload: "2" }]);
    const request = makeRequest(
      [team],
      [project],
      "2025-01-01",
      "2025-01-01",
    );
    const portfolio: Portfolio = request.portfolio;
    const horizon: PlanningHorizon = request.horizon;
    const teams = portfolio.teams;
    const projects = portfolio.projects;
    const requirements = project.requirements;
    const priorityOrder = portfolio.priorityOrder;

    recomputePlanning(request);

    assert.strictEqual(request.portfolio, portfolio);
    assert.strictEqual(request.horizon, horizon);
    assert.strictEqual(portfolio.teams, teams);
    assert.strictEqual(portfolio.projects, projects);
    assert.strictEqual(project.requirements, requirements);
    assert.strictEqual(portfolio.priorityOrder, priorityOrder);
  });

  it("keeps production application imports inside the domain boundary", async () => {
    const source = await readFile(
      resolve(
        process.cwd(),
        "src/application/planning/recomputePlanning.ts",
      ),
      "utf8",
    );

    const importPaths = [...source.matchAll(/from "([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.deepEqual(importPaths, ["../../domain/index.js"]);
  });
});
