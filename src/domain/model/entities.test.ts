import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCivilDate,
  createDailyCap,
  createReservation,
  createReservationTeamAllocation,
  createMaxParallelProjects,
  createPortfolio,
  createProject,
  createProjectId,
  createProgram,
  createProgramId,
  createPriorityFamily,
  createPriorityFamilyId,
  createProjectTeamRequirement,
  createRemainingWorkload,
  createReservationId,
  createReservationRatio,
  createTeam,
  createTeamCapacitySchedule,
  createTeamId,
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
    periods: [],
    exceptions: [],
  }),
);

function makeTeam(id: string): Team {
  return must(
    createTeam({
      id: must(createTeamId(id)),
      name: id,
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
  it("supports independent optional Program and PAS membership with immutable catalogs", () => {
    const team = makeTeam("team-a");
    const program = must(createProgram({ id: must(createProgramId("phoenix")), name: "Phoenix" }));
    const family = must(createPriorityFamily({ id: must(createPriorityFamilyId("strategic")), name: "Strategic" }));
    const cases = [
      {},
      { programId: program.id },
      { priorityFamilyId: family.id },
      { programId: program.id, priorityFamilyId: family.id },
    ];
    const projects = cases.map((membership, index) => {
      const base = makeProject(`project-${index}`, team);
      return must(createProject({ ...base, ...membership }));
    });
    const programs = [program];
    const priorityFamilies = [family];
    const result = createPortfolio({
      teams: [team], projects, programs, priorityFamilies,
      priorityOrder: projects.map((project) => project.id), reservations: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value.projects.map(({ programId, priorityFamilyId }) => [programId, priorityFamilyId]), [
      [undefined, undefined], [program.id, undefined], [undefined, family.id], [program.id, family.id],
    ]);
    programs.pop();
    priorityFamilies.pop();
    assert.deepEqual(result.value.programs, [program]);
    assert.deepEqual(result.value.priorityFamilies, [family]);
    for (const value of [...projects, program, family, result.value.programs, result.value.priorityFamilies]) {
      assert.equal(Object.isFrozen(value), true);
    }
  });

  it("rejects duplicate catalog IDs and unknown Project memberships", () => {
    const team = makeTeam("team-a");
    const program = must(createProgram({ id: must(createProgramId("phoenix")), name: "Phoenix" }));
    const family = must(createPriorityFamily({ id: must(createPriorityFamilyId("strategic")), name: "Strategic" }));
    const project = must(createProject({
      ...makeProject("project", team),
      programId: must(createProgramId("unknown-program")),
      priorityFamilyId: must(createPriorityFamilyId("unknown-family")),
    }));
    const result = createPortfolio({
      teams: [team], projects: [project], programs: [program, program],
      priorityFamilies: [family, family], priorityOrder: [project.id], reservations: [],
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.errors.map(({ code, path }) => [code, path]), [
      ["DUPLICATE_PROGRAM_ID", "programs[1].id"],
      ["DUPLICATE_PRIORITY_FAMILY_ID", "priorityFamilies[1].id"],
      ["UNKNOWN_PROJECT_PROGRAM", "projects[0].programId"],
      ["UNKNOWN_PROJECT_PRIORITY_FAMILY", "projects[0].priorityFamilyId"],
    ]);
  });
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
        programs: [],
        priorityFamilies: [],
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
      createReservation({
        id: must(createReservationId("reservation-a")),
        name: "reservation",
        startDate: must(createCivilDate("2025-01-01")),
        endDate: must(createCivilDate("2025-01-01")),
        teamAllocations: [must(createReservationTeamAllocation({
          teamId: team.id,
          amount: { kind: "ratio", ratio: must(createReservationRatio("0.2")) },
        }))],
      }),
    );
    const result = createPortfolio({
      teams: [team, team],
      projects: [project, project],
      programs: [],
      priorityFamilies: [],
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
      createReservation({
        id: must(createReservationId("reservation")),
        name: "reservation",
        startDate: must(createCivilDate("2025-01-01")),
        endDate: must(createCivilDate("2025-01-02")),
        teamAllocations: [must(createReservationTeamAllocation({
          teamId: absent.id,
          amount: { kind: "ratio", ratio: must(createReservationRatio("0.5")) },
        }))],
      }),
    );
    const result = createPortfolio({
      teams: [known],
      projects: [project],
      programs: [],
      priorityFamilies: [],
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
            path: "reservations[0].teamAllocations[0].teamId",
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
      programs: [],
      priorityFamilies: [],
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
