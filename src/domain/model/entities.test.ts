import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCivilDate,
  createDailyCap,
  createFirmCapacityReservation,
  createMaxParallelProjects,
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
  serializeQuantity,
  type DomainResult,
  type Project,
  type Team,
} from "../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const emptySchedule = must(
  createTeamCapacitySchedule({
    workingPattern: must(
      createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }),
    ),
    periods: [],
    exceptions: [],
  }),
);

function makeTeam(id: string): Team {
  return must(
    createTeam({
      id: must(createTeamId(id)),
      name: id,
      maxParallelProjects: must(createMaxParallelProjects(2)),
      capacitySchedule: emptySchedule,
    }),
  );
}

function makeProject(id: string, team: Team): Project {
  return must(
    createProject({
      id: must(createProjectId(id)),
      name: id,
      requirements: [
        must(
          createProjectTeamRequirement({
            teamId: team.id,
            remainingWorkload: must(createRemainingWorkload("0")),
            dailyCap: must(createDailyCap("0")),
          }),
        ),
      ],
    }),
  );
}

describe("projects and teams", () => {
  it("keeps zero workload and zero daily cap explicitly", () => {
    const project = makeProject("project-a", makeTeam("team-a"));
    const requirement = project.requirements[0];
    if (!requirement || !requirement.dailyCap) {
      throw new Error("Missing requirement");
    }
    assert.equal(serializeQuantity(requirement.remainingWorkload), "0/1");
    assert.equal(serializeQuantity(requirement.dailyCap), "0/1");
    assert.equal(Object.isFrozen(requirement.remainingWorkload), true);
    assert.equal(Object.isFrozen(requirement.dailyCap), true);
  });

  it("rejects invalid workload, parallelism, and duplicate team requirements", () => {
    assert.equal(createRemainingWorkload("-1").ok, false);
    assert.equal(createRemainingWorkload("Infinity").ok, false);
    assert.equal(createMaxParallelProjects(0).ok, false);
    assert.equal(createMaxParallelProjects(-1).ok, false);
    assert.equal(createMaxParallelProjects(1.5).ok, false);

    const team = makeTeam("team-a");
    const requirement = must(
      createProjectTeamRequirement({
        teamId: team.id,
        remainingWorkload: must(createRemainingWorkload("1")),
      }),
    );
    const result = createProject({
      id: must(createProjectId("duplicate")),
      name: "duplicate",
      requirements: [requirement, requirement],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code, path }) => ({ code, path })),
        [
          {
            code: "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
            path: "requirements[1].teamId",
          },
        ],
      );
    }
  });

  it("represents project dates without interpreting feasibility", () => {
    const team = makeTeam("team-a");
    const requirement = must(
      createProjectTeamRequirement({
        teamId: team.id,
        remainingWorkload: must(createRemainingWorkload("1")),
      }),
    );
    const project = must(
      createProject({
        id: must(createProjectId("dated")),
        name: "dated",
        earliestStartDate: must(createCivilDate("2025-03-01")),
        objectiveEndDate: must(createCivilDate("2025-02-01")),
        mandatoryDeadline: must(createCivilDate("2025-01-01")),
        requirements: [requirement],
      }),
    );
    assert.equal(project.mandatoryDeadline, "2025-01-01");
  });
});

describe("Portfolio invariants", () => {
  it("preserves all meaningful input orders and copies collections", () => {
    const team = makeTeam("team-a");
    const first = makeProject("first", team);
    const second = makeProject("second", team);
    const projects = [first, second];
    const priorities = [second.id, first.id];
    const portfolio = must(
      createPortfolio({
        teams: [team],
        projects,
        priorityOrder: priorities,
        reservations: [],
      }),
    );
    projects.reverse();
    priorities.reverse();
    assert.deepEqual(
      portfolio.projects.map((project) => project.id),
      ["first", "second"],
    );
    assert.deepEqual(portfolio.priorityOrder, ["second", "first"]);
    assert.equal(Object.isFrozen(portfolio.priorityOrder), true);
  });

  it("rejects duplicate identities", () => {
    const team = makeTeam("team-a");
    const project = makeProject("project-a", team);
    const reservation = must(
      createFirmCapacityReservation({
        id: must(createReservationId("reservation-a")),
        teamId: team.id,
        label: "reservation",
        start: must(createCivilDate("2025-01-01")),
        end: must(createCivilDate("2025-01-01")),
        ratio: must(createReservationRatio("0.2")),
      }),
    );
    const result = createPortfolio({
      teams: [team, team],
      projects: [project, project],
      priorityOrder: [project.id, project.id],
      reservations: [reservation, reservation],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    const codes = result.errors.map((item) => item.code);
    for (const code of [
      "DUPLICATE_TEAM_ID",
      "DUPLICATE_PROJECT_ID",
      "DUPLICATE_RESERVATION_ID",
      "DUPLICATE_PRIORITY_PROJECT",
    ]) {
      assert.equal(codes.includes(code), true, `Missing error code ${code}`);
    }
  });

  it("rejects unknown team references", () => {
    const known = makeTeam("known");
    const absent = makeTeam("absent");
    const project = makeProject("project", absent);
    const reservation = must(
      createFirmCapacityReservation({
        id: must(createReservationId("reservation")),
        teamId: absent.id,
        label: "reservation",
        start: must(createCivilDate("2025-01-01")),
        end: must(createCivilDate("2025-01-02")),
        ratio: must(createReservationRatio("0.5")),
      }),
    );
    const result = createPortfolio({
      teams: [known],
      projects: [project],
      priorityOrder: [project.id],
      reservations: [reservation],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(
        result.errors.map(({ code, path }) => ({ code, path })),
        [
          {
            code: "UNKNOWN_REQUIREMENT_TEAM",
            path: "projects[0].requirements[0].teamId",
          },
          {
            code: "UNKNOWN_RESERVATION_TEAM",
            path: "reservations[0].teamId",
          },
        ],
      );
    }
  });

  it("rejects unknown, missing, and duplicate priority projects", () => {
    const team = makeTeam("team-a");
    const first = makeProject("first", team);
    const second = makeProject("second", team);
    const unknown = must(createProjectId("unknown"));
    const result = createPortfolio({
      teams: [team],
      projects: [first, second],
      priorityOrder: [first.id, first.id, unknown],
      reservations: [],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    const codes = result.errors.map((item) => item.code);
    for (const code of [
      "DUPLICATE_PRIORITY_PROJECT",
      "UNKNOWN_PRIORITY_PROJECT",
      "MISSING_PRIORITY_PROJECT",
    ]) {
      assert.equal(codes.includes(code), true, `Missing error code ${code}`);
    }
  });
});
