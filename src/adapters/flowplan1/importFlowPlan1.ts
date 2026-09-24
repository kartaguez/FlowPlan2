import {
    createCapacity,
    createCapacityException,
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
    createUnavailabilityRatio,
    createWorkingPattern,
    type CivilDate,
    type DomainResult,
    type MaxParallelProjects,
    type PlanningHorizon,
    type Portfolio,
    type WorkingPattern,
} from "../../domain/index.js";
import type { FlowPlan1Transfer } from "./flowPlan1Dto.js";

export interface FlowPlan1Scenario {
    readonly portfolio: Portfolio;
    readonly horizon: PlanningHorizon;
    readonly planning: {
        readonly startDate: CivilDate;
        readonly endDate: CivilDate;
        readonly workingPattern: WorkingPattern;
        readonly maxParallelProjects: MaxParallelProjects;
    };
}

export function importFlowPlan1(source: FlowPlan1Transfer): FlowPlan1Scenario {
    const payload = source.payload;
    const horizon = must(
        createPlanningHorizon({
            start: date(payload.planning.startDate),
            end: date(payload.planning.endDate),
        }),
    );
    const holidayDates = payload.planning.holidaysText
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map(date);
    const teamIds = payload.teamIds.map((id) => must(createTeamId(id)));
    const teams = teamIds.map((teamId) => {
        const settings = payload.teamSettings[teamId];
        if (settings === undefined) {
            throw new TypeError(`Missing FlowPlan 1 settings for team ${teamId}.`);
        }
        const periods = settings.periods.map((period) =>
            must(
                createCapacityPeriod({
                    start: date(period.startDate),
                    end: date(period.endDate),
                    dailyCapacity: must(createCapacity(String(period.fte))),
                    unavailabilityRatio: must(
                        createUnavailabilityRatio(String(period.unavailableCapacityRatio)),
                    ),
                }),
            ),
        );
        const exceptions = holidayDates.map((holiday) =>
            must(
                createCapacityException({
                    date: holiday,
                    capacity: must(createCapacity("0")),
                }),
            )
        );
        const schedule = must(
            createTeamCapacitySchedule({
                periods,
                exceptions,
            }),
        );
        return must(
            createTeam({
                id: teamId,
                name: settings.name,
                capacitySchedule: schedule,
            }),
        );
    });
    const projects = Object.entries(payload.projects).map(([id, project]) => {
        const projectId = must(createProjectId(id));
        const requirements = teamIds.flatMap((teamId) => {
            const workload = project.workloads[teamId] ?? 0;
            return workload <= 0
                ? []
                : [
                    must(
                        createProjectTeamRequirement({
                            teamId,
                            remainingWorkload: must(
                                createRemainingWorkload(String(workload)),
                            ),
                        }),
                    ),
                ];
        });
        if (requirements.length === 0) {
            throw new TypeError(`FlowPlan 1 project ${id} has no workload.`);
        }
        return must(
            createProject({
                id: projectId,
                name: project.name,
                ...(project.earliestStartDate === undefined
                    ? {}
                    : { earliestStartDate: date(project.earliestStartDate) }),
                ...(project.latestEndDate === undefined
                    ? {}
                    : { objectiveEndDate: date(project.latestEndDate) }),
                requirements,
            }),
        );
    });
    const priorityOrder = payload.projectPriorities.map((id) =>
        must(createProjectId(id)),
    );
    const portfolio = must(
        createPortfolio({
            teams,
            projects,
            programs: [],
            priorityFamilies: [],
            priorityOrder,
            reservations: [],
        }),
    );
    return Object.freeze({
        portfolio,
        horizon,
        planning: Object.freeze({
            startDate: horizon.start,
            endDate: horizon.end,
            workingPattern: must(
                createWorkingPattern({
                    workingWeekdays: payload.planning.workingDaysOfWeek,
                })
            ),
            maxParallelProjects: must(
                createMaxParallelProjects(payload.planning.maxParallelProjectsPerTeam),
            ),
        }),
    });
}

function date(value: string): CivilDate {
    return must(createCivilDate(value));
}

function must<T>(result: DomainResult<T>): T {
    if (!result.ok) {
        throw new TypeError(`Invalid FlowPlan 1 data : ${JSON.stringify(result.errors)}`);
    }
    return result.value;
}
