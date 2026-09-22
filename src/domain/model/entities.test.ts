import { describe, expect, it } from "vitest";
import {
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
  createCivilDate,
  type DomainResult,
  type Project,
  type Team,
} from "../index";

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
            remainingWorkload: must(createRemainingWorkload(0)),
            dailyCap: must(createDailyCap(0)),
          }),
        ),
      ],
    }),
  );
}

describe("projects and teams", () => {
  it("keeps zero workload and zero daily cap explicitly", () => {
    const project = makeProject("project-a", makeTeam("team-a"));
    expect(project.requirements[0]).toMatchObject({
      remainingWorkload: 0,
      dailyCap: 0,
    });
  });

  it("rejects invalid workload, parallelism, and duplicate team requirements", () => {
    expect(createRemainingWorkload(-1).ok).toBe(false);
    expect(createRemainingWorkload(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(createMaxParallelProjects(0).ok).toBe(false);
    expect(createMaxParallelProjects(-1).ok).toBe(false);
    expect(createMaxParallelProjects(1.5).ok).toBe(false);

    const team = makeTeam("team-a");
    const requirement = must(
      createProjectTeamRequirement({
        teamId: team.id,
        remainingWorkload: must(createRemainingWorkload(1)),
      }),
    );
    expect(
      createProject({
        id: must(createProjectId("duplicate")),
        name: "duplicate",
        requirements: [requirement, requirement],
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: "DUPLICATE_PROJECT_TEAM_REQUIREMENT",
          path: "requirements[1].teamId",
        },
      ],
    });
  });

  it("represents project dates without interpreting feasibility", () => {
    const team = makeTeam("team-a");
    const requirement = must(
      createProjectTeamRequirement({
        teamId: team.id,
        remainingWorkload: must(createRemainingWorkload(1)),
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
    expect(project.mandatoryDeadline).toBe("2025-01-01");
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
    expect(portfolio.projects.map((project) => project.id)).toEqual([
      "first",
      "second",
    ]);
    expect(portfolio.priorityOrder).toEqual(["second", "first"]);
    expect(Object.isFrozen(portfolio.priorityOrder)).toBe(true);
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
        ratio: must(createReservationRatio(0.2)),
      }),
    );
    const result = createPortfolio({
      teams: [team, team],
      projects: [project, project],
      priorityOrder: [project.id, project.id],
      reservations: [reservation, reservation],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_TEAM_ID",
        "DUPLICATE_PROJECT_ID",
        "DUPLICATE_RESERVATION_ID",
        "DUPLICATE_PRIORITY_PROJECT",
      ]),
    );
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
        ratio: must(createReservationRatio(0.5)),
      }),
    );
    const result = createPortfolio({
      teams: [known],
      projects: [project],
      priorityOrder: [project.id],
      reservations: [reservation],
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          code: "UNKNOWN_REQUIREMENT_TEAM",
          path: "projects[0].requirements[0].teamId",
        },
        { code: "UNKNOWN_RESERVATION_TEAM", path: "reservations[0].teamId" },
      ],
    });
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
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_PRIORITY_PROJECT",
        "UNKNOWN_PRIORITY_PROJECT",
        "MISSING_PRIORITY_PROJECT",
      ]),
    );
  });
});
