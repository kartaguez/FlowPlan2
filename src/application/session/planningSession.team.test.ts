import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  createMaxParallelProjects,
  createTeamId,
  createUnavailabilityRatio,
  createWorkingPattern,
  effectiveCapacity,
  serializeQuantity,
  type DomainResult,
  type TeamId,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  createPlanningSession,
  type PlanningSessionState,
  type UpdateTeamCommand,
} from "./planningSession.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function commandFor(
  state: PlanningSessionState,
  teamId: TeamId,
  overrides: Partial<UpdateTeamCommand> = {},
): UpdateTeamCommand {
  const team = state.portfolio.teams.find((candidate) => candidate.id === teamId)!;
  return {
    kind: "update-team",
    teamId,
    name: team.name,
    maxParallelProjects: team.maxParallelProjects,
    workingPattern: team.capacitySchedule.workingPattern,
    capacityPeriods: team.capacitySchedule.periods.map((period) => ({
      startDate: period.start,
      endDate: period.end,
      capacity: period.dailyCapacity,
      unavailability:
        period.unavailabilityRatio ?? must(createUnavailabilityRatio("0")),
    })),
    ...overrides,
  };
}

describe("PlanningSession team editing", () => {
  it("atomically rebuilds team-global settings and existing periods", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const otherTeam = initial.portfolio.teams[1]!;
    const session = createPlanningSession(initial);
    const before = session.getState();
    const command = commandFor(before, team.id, {
      name: "  Alpha Updated  ",
      maxParallelProjects: 1,
      workingPattern: must(createWorkingPattern({ workingWeekdays: [1, 3, 5] })),
      capacityPeriods: team.capacitySchedule.periods.map((period, index) => ({
        startDate: period.start,
        endDate: period.end,
        capacity: must(createCapacity(index === 0 ? "4" : "2")),
        unavailability: must(
          createUnavailabilityRatio(index === 0 ? "0.25" : "0"),
        ),
      })),
    });

    const result = session.dispatch(command);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const updated = result.state.portfolio.teams[0]!;
    assert.notEqual(result.state, before);
    assert.notEqual(updated, team);
    assert.equal(updated.name, "Alpha Updated");
    assert.equal(updated.maxParallelProjects, 1);
    assert.deepEqual(updated.capacitySchedule.workingPattern.workingWeekdays, [1, 3, 5]);
    assert.equal(serializeQuantity(updated.capacitySchedule.periods[0]!.dailyCapacity), "4/1");
    assert.equal(
      serializeQuantity(updated.capacitySchedule.periods[0]!.unavailabilityRatio!),
      "1/4",
    );
    assert.equal(result.state.portfolio.teams[1], otherTeam);
    assert.deepEqual(result.state.portfolio.projects, initial.portfolio.projects);
    assert.ok(
      result.state.portfolio.projects.every(
        (project, index) => project === initial.portfolio.projects[index],
      ),
    );
    assert.deepEqual(
      result.state.portfolio.priorityOrder,
      initial.portfolio.priorityOrder,
    );
    assert.deepEqual(
      result.state.portfolio.reservations,
      initial.portfolio.reservations,
    );
    assert.ok(
      result.state.portfolio.reservations.every(
        (reservation, index) => reservation === initial.portfolio.reservations[index],
      ),
    );
    assert.equal(result.state.horizon, initial.horizon);
    assert.equal(team.name, "Team Alpha");
  });

  it("rejects invalid max parallel, unknown teams, and period count changes", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const cases: UpdateTeamCommand[] = [
      commandFor(initial, team.id, { maxParallelProjects: 0 }),
      commandFor(initial, team.id, { maxParallelProjects: -1 }),
      commandFor(initial, team.id, { maxParallelProjects: 1.5 }),
      commandFor(initial, team.id, { capacityPeriods: [] }),
      {
        ...commandFor(initial, team.id),
        teamId: must(createTeamId("unknown-team")),
      },
    ];
    for (const command of cases) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      assert.equal(session.dispatch(command).ok, false);
      assert.equal(session.getState(), before);
    }
  });

  it("accepts adjacent periods and gaps but rejects overlap and containment", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const base = commandFor(initial, team.id);
    assert.equal(createPlanningSession(initial).dispatch(base).ok, true);

    const gapCommand = {
      ...base,
      capacityPeriods: [
        base.capacityPeriods[0]!,
        {
          ...base.capacityPeriods[1]!,
          startDate: must(createCivilDate("2025-02-10")),
        },
      ],
    } satisfies UpdateTeamCommand;
    const gapSession = createPlanningSession(initial);
    const gapResult = gapSession.dispatch(gapCommand);
    assert.equal(gapResult.ok, true);
    if (gapResult.ok) {
      assert.equal(
        serializeQuantity(
          effectiveCapacity(
            gapResult.state.portfolio.teams[0]!,
            must(createCivilDate("2025-02-03")),
          ),
        ),
        "0/1",
      );
    }

    for (const capacityPeriods of [
      [
        base.capacityPeriods[0]!,
        {
          ...base.capacityPeriods[1]!,
          startDate: base.capacityPeriods[0]!.endDate,
        },
      ],
      [
        {
          ...base.capacityPeriods[0]!,
          endDate: must(createCivilDate("2025-03-01")),
        },
        base.capacityPeriods[1]!,
      ],
    ]) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      assert.equal(session.dispatch({ ...base, capacityPeriods }).ok, false);
      assert.equal(session.getState(), before);
    }
  });

  it("rejects reversed intervals and period reorder atomically", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const base = commandFor(initial, team.id);
    const cases = [
      [
        {
          ...base.capacityPeriods[0]!,
          startDate: must(createCivilDate("2025-01-20")),
          endDate: must(createCivilDate("2025-01-10")),
        },
        base.capacityPeriods[1]!,
      ],
      [base.capacityPeriods[1]!, base.capacityPeriods[0]!],
    ];
    for (const capacityPeriods of cases) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      assert.equal(session.dispatch({ ...base, capacityPeriods }).ok, false);
      assert.equal(session.getState(), before);
    }
  });

  it("accepts zero capacity and an empty working week because the domain permits both", () => {
    const initial = createDemoPlanningScenario();
    const team = initial.portfolio.teams[0]!;
    const base = commandFor(initial, team.id);
    const result = createPlanningSession(initial).dispatch({
      ...base,
      workingPattern: must(createWorkingPattern({ workingWeekdays: [] })),
      capacityPeriods: base.capacityPeriods.map((period) => ({
        ...period,
        capacity: must(createCapacity("0")),
      })),
    });
    assert.equal(result.ok, true);
  });

  it("keeps the command model DOM-free and update-project remains available", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(
        new URL(
          "src/application/session/planningSession.ts",
          `file://${process.cwd()}/`,
        ),
        "utf8",
      ),
    );
    assert.doesNotMatch(source, /HTMLElement|SVGElement|src\/ui/);
    assert.match(source, /UpdateProjectCommand[\s\S]*UpdateTeamCommand/);
    assert.equal(must(createMaxParallelProjects(1)), 1);
  });
});
