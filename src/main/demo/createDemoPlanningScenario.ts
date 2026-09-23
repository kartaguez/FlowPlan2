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
  type CivilDate,
  type DomainResult,
  type ProjectTeamRequirement,
  type Team,
  type TeamId,
} from "../../domain/index.js";
import type { PlanningSessionState } from "../../application/index.js";

export type DemoPlanningScenario = PlanningSessionState;

export function createDemoPlanningScenario(): DemoPlanningScenario {
  const start = date("2025-01-01");
  const end = date("2025-03-31");
  const alphaId = must(createTeamId("team-alpha"));
  const betaId = must(createTeamId("team-beta"));
  const gammaId = must(createTeamId("team-gamma"));

  const alpha = team(alphaId, "Team Alpha", [
    ["2025-01-01", "2025-01-31", "3"],
    ["2025-02-01", "2025-03-31", "2.5"],
  ]);
  const beta = team(betaId, "Team Beta", [
    ["2025-01-01", "2025-03-31", "2"],
  ]);
  const gamma = team(gammaId, "Team Gamma", [
    ["2025-01-01", "2025-03-31", "1.5"],
  ]);

  const atlasId = must(createProjectId("project-atlas"));
  const borealId = must(createProjectId("project-boreal"));
  const cobaltId = must(createProjectId("project-cobalt"));
  const deltaId = must(createProjectId("project-delta"));
  const atlas = must(
    createProject({
      id: atlasId,
      name: "Project Atlas",
      objectiveEndDate: date("2025-02-28"),
      requirements: [
        requirement(alphaId, "55", "1.5"),
        requirement(betaId, "30", "1"),
      ],
    }),
  );
  const boreal = must(
    createProject({
      id: borealId,
      name: "Project Boreal",
      earliestStartDate: date("2025-02-03"),
      objectiveEndDate: date("2025-03-21"),
      requirements: [
        requirement(alphaId, "45", "1.5"),
        requirement(gammaId, "24", "0.75"),
      ],
    }),
  );
  const cobalt = must(
    createProject({
      id: cobaltId,
      name: "Project Cobalt",
      mandatoryDeadline: date("2025-03-14"),
      requirements: [requirement(betaId, "38", "1")],
    }),
  );
  const delta = must(
    createProject({
      id: deltaId,
      name: "Project Delta",
      requirements: [
        requirement(alphaId, "30", "1"),
        requirement(betaId, "22", "1"),
        requirement(gammaId, "22", "1"),
      ],
    }),
  );

  const reservations = [
    must(
      createFirmCapacityReservation({
        id: must(createReservationId("reservation-beta-operations")),
        teamId: betaId,
        label: "Operations support",
        start: date("2025-01-20"),
        end: date("2025-02-14"),
        ratio: must(createReservationRatio("0.2")),
      }),
    ),
    must(
      createFirmCapacityReservation({
        id: must(createReservationId("reservation-gamma-audit")),
        teamId: gammaId,
        label: "Audit",
        start: date("2025-02-10"),
        end: date("2025-02-12"),
        ratio: must(createReservationRatio("0.7")),
      }),
    ),
    must(
      createFirmCapacityReservation({
        id: must(createReservationId("reservation-gamma-support")),
        teamId: gammaId,
        label: "Production support",
        start: date("2025-02-10"),
        end: date("2025-02-12"),
        ratio: must(createReservationRatio("0.6")),
      }),
    ),
  ];

  const horizon = must(createPlanningHorizon({ start, end }));
  const portfolio = must(
    createPortfolio({
      teams: [alpha, beta, gamma],
      projects: [atlas, boreal, cobalt, delta],
      priorityOrder: [atlasId, borealId, cobaltId, deltaId],
      reservations,
    }),
  );

  return Object.freeze({
    portfolio,
    planning: Object.freeze({
      startDate: horizon.start,
      endDate: horizon.end,
      workingPattern: must(
        createWorkingPattern({ workingWeekdays: [1, 2, 3, 4, 5] }),
      ),
      maxParallelProjects: must(createMaxParallelProjects(2)),
    }),
  });
}

function team(
  id: TeamId,
  name: string,
  periods: readonly (readonly [string, string, string])[],
): Team {
  const capacityPeriods = periods.map(([start, end, dailyCapacity]) =>
    must(
      createCapacityPeriod({
        start: date(start),
        end: date(end),
        dailyCapacity: must(createCapacity(dailyCapacity)),
      }),
    ),
  );
  const capacitySchedule = must(
    createTeamCapacitySchedule({
      periods: capacityPeriods,
      exceptions: [],
    }),
  );
  return must(
    createTeam({
      id,
      name,
      capacitySchedule,
    }),
  );
}

function requirement(
  teamId: TeamId,
  remainingWorkload: string,
  dailyCap?: string,
): ProjectTeamRequirement {
  return must(
    createProjectTeamRequirement({
      teamId,
      remainingWorkload: must(createRemainingWorkload(remainingWorkload)),
      ...(dailyCap === undefined
        ? {}
        : { dailyCap: must(createDailyCap(dailyCap)) }),
    }),
  );
}

function date(value: string): CivilDate {
  return must(createCivilDate(value));
}

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) {
    throw new TypeError(
      `Invalid demo planning scenario: ${JSON.stringify(result.errors)}`,
    );
  }
  return result.value;
}
