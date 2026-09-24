import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  createCivilDate,
  createDailyCap,
  createProjectId,
  createPortfolio,
  createProgramId,
  createPriorityFamilyId,
  createRemainingWorkload,
  createTeamId,
  serializeQuantity,
  type DomainResult,
  type ProjectId,
} from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import {
  createPlanningSession,
  type PlanningSessionState,
  type UpdateProjectCommand,
} from "./planningSession.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

function commandFor(
  state: PlanningSessionState,
  projectId: ProjectId,
  overrides: Partial<UpdateProjectCommand> = {},
): UpdateProjectCommand {
  const project = state.portfolio.projects.find((candidate) => candidate.id === projectId)!;
  return {
    kind: "update-project",
    projectId,
    name: project.name,
    ...(project.programId === undefined ? {} : { programId: project.programId }),
    ...(project.priorityFamilyId === undefined ? {} : { priorityFamilyId: project.priorityFamilyId }),
    ...(project.earliestStartDate === undefined
      ? {}
      : { earliestStartDate: project.earliestStartDate }),
    ...(project.objectiveEndDate === undefined
      ? {}
      : { objectiveEndDate: project.objectiveEndDate }),
    ...(project.mandatoryDeadline === undefined
      ? {}
      : { mandatoryDeadline: project.mandatoryDeadline }),
    teamRequirements: project.requirements.map((requirement) => ({
      teamId: requirement.teamId,
      remainingWorkload: requirement.remainingWorkload,
      ...(requirement.dailyCap === undefined
        ? {}
        : { dailyCap: requirement.dailyCap }),
    })),
    ...overrides,
  };
}

describe("PlanningSession project editing", () => {
  it("updates memberships and preserves them on unrelated Project Apply", () => {
    const initial = createDemoPlanningScenario();
    const atlas = initial.portfolio.projects[0]!;
    const boreal = initial.portfolio.projects[1]!;
    const session = createPlanningSession(initial);
    const assigned = session.dispatch(commandFor(initial, boreal.id, {
      priorityFamilyId: initial.portfolio.priorityFamilies[1]!.id,
    }));
    assert.equal(assigned.ok, true);
    if (!assigned.ok) return;
    assert.equal(assigned.state.portfolio.projects[1]!.programId, boreal.programId);
    assert.equal(assigned.state.portfolio.projects[1]!.priorityFamilyId, initial.portfolio.priorityFamilies[1]!.id);
    assert.deepEqual(assigned.state.portfolio.programs, initial.portfolio.programs);
    assert.deepEqual(assigned.state.portfolio.priorityFamilies, initial.portfolio.priorityFamilies);
    const renamed = session.dispatch(commandFor(session.getState(), atlas.id, { name: "Atlas renamed" }));
    assert.equal(renamed.ok, true);
    if (!renamed.ok) return;
    assert.equal(renamed.state.portfolio.projects[0]!.programId, atlas.programId);
    assert.equal(renamed.state.portfolio.projects[0]!.priorityFamilyId, atlas.priorityFamilyId);
    assert.equal(serializeQuantity(renamed.state.portfolio.projects[0]!.requirements[0]!.dailyCap!), "3/2");
  });

  it("clears either membership and rejects unknown references atomically", () => {
    const initial = createDemoPlanningScenario();
    const atlas = initial.portfolio.projects[0]!;
    const session = createPlanningSession(initial);
    const { programId: _programOnly, ...withoutProgram } = commandFor(initial, atlas.id);
    const oneCleared = session.dispatch(withoutProgram);
    assert.equal(oneCleared.ok, true);
    if (!oneCleared.ok) return;
    assert.equal(oneCleared.state.portfolio.projects[0]!.programId, undefined);
    assert.equal(oneCleared.state.portfolio.projects[0]!.priorityFamilyId, atlas.priorityFamilyId);
    const { programId: _programId, priorityFamilyId: _priorityFamilyId, ...clear } = commandFor(initial, atlas.id);
    const cleared = session.dispatch(clear);
    assert.equal(cleared.ok, true);
    if (!cleared.ok) return;
    assert.equal(cleared.state.portfolio.projects[0]!.programId, undefined);
    assert.equal(cleared.state.portfolio.projects[0]!.priorityFamilyId, undefined);
    for (const membership of [
      { programId: must(createProgramId("unknown")) },
      { priorityFamilyId: must(createPriorityFamilyId("unknown")) },
    ]) {
      const before = session.getState();
      const rejected = session.dispatch({ ...commandFor(before, atlas.id), ...membership });
      assert.equal(rejected.ok, false);
      if (!rejected.ok) {
        assert.equal(rejected.errors[0]?.code, "programId" in membership
          ? "UNKNOWN_PROJECT_PROGRAM"
          : "UNKNOWN_PROJECT_PRIORITY_FAMILY");
      }
      assert.equal(session.getState(), before);
    }
  });
  it("owns the initial immutable domain/application state", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    assert.equal(session.getState().portfolio, initial.portfolio);
    assert.equal(session.getState().planning, initial.planning);
    assert.equal(Object.isFrozen(session.getState()), true);
  });

  it("atomically updates global project fields, RAF, and daily caps without changing priority", () => {
    const initial = createDemoPlanningScenario();
    const previousState = initial;
    const previousProject = initial.portfolio.projects[0]!;
    const previousRequirements = previousProject.requirements;
    const session = createPlanningSession(initial);
    const result = session.dispatch(
      commandFor(initial, previousProject.id, {
        name: "  Atlas Updated  ",
        earliestStartDate: must(createCivilDate("2025-01-10")),
        objectiveEndDate: must(createCivilDate("2025-02-10")),
        mandatoryDeadline: must(createCivilDate("2025-03-10")),
        teamRequirements: [
          {
            teamId: previousRequirements[0]!.teamId,
            remainingWorkload: must(createRemainingWorkload("0")),
            dailyCap: must(createDailyCap("1.5")),
          },
          {
            teamId: previousRequirements[1]!.teamId,
            remainingWorkload: must(createRemainingWorkload("12.5")),
          },
        ],
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    const updated = result.state.portfolio.projects[0]!;
    assert.notEqual(result.state, previousState);
    assert.notEqual(updated, previousProject);
    assert.notEqual(updated.requirements, previousRequirements);
    assert.equal(updated.name, "Atlas Updated");
    assert.equal(updated.earliestStartDate, "2025-01-10");
    assert.equal(updated.objectiveEndDate, "2025-02-10");
    assert.equal(updated.mandatoryDeadline, "2025-03-10");
    assert.equal(
      serializeQuantity(updated.requirements[0]!.remainingWorkload),
      "0/1",
    );
    assert.equal(serializeQuantity(updated.requirements[0]!.dailyCap!), "3/2");
    assert.equal(serializeQuantity(updated.requirements[1]!.remainingWorkload), "25/2");
    assert.equal(serializeQuantity(updated.requirements[1]!.dailyCap!), "1/1");
    assert.deepEqual(result.state.portfolio.priorityOrder, initial.portfolio.priorityOrder);
    assert.equal(previousProject.name, "Project Atlas");
    assert.equal(previousProject.earliestStartDate, undefined);
    assert.equal(previousProject.requirements, previousRequirements);
    assert.ok(
      updated.requirements.every(
        (requirement) =>
          !("earliestStartDate" in requirement) &&
          !("objectiveEndDate" in requirement) &&
          !("mandatoryDeadline" in requirement),
      ),
    );
  });

  it("rejects every invalid reorder position atomically", () => {
    const initial = createDemoPlanningScenario();
    const projectId = initial.portfolio.projects[1]!.id;
    for (const targetPosition of [0, -1, 1.5, 5, Number.NaN]) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      const result = session.dispatch(
        { kind: "reorder-project", projectId, targetPosition },
      );
      assert.equal(result.ok, false);
      assert.equal(session.getState(), before);
    }
  });

  it("moves first to last, last to first, and accepts a middle no-op", () => {
    const initial = createDemoPlanningScenario();
    const ids = initial.portfolio.priorityOrder;
    const firstSession = createPlanningSession(initial);
    firstSession.dispatch({ kind: "reorder-project", projectId: ids[0]!, targetPosition: 4 });
    assert.deepEqual(firstSession.getState().portfolio.priorityOrder, [
      ids[1], ids[2], ids[3], ids[0],
    ]);
    const lastSession = createPlanningSession(initial);
    lastSession.dispatch({ kind: "reorder-project", projectId: ids[3]!, targetPosition: 1 });
    assert.deepEqual(lastSession.getState().portfolio.priorityOrder, [
      ids[3], ids[0], ids[1], ids[2],
    ]);
    const middleSession = createPlanningSession(initial);
    const before = middleSession.getState();
    middleSession.dispatch({ kind: "reorder-project", projectId: ids[1]!, targetPosition: 2 });
    assert.deepEqual(middleSession.getState().portfolio.priorityOrder, ids);
    assert.strictEqual(middleSession.getState(), before);
  });

  it("rejects empty, duplicate, and unknown team requirements", () => {
    const initial = createDemoPlanningScenario();
    const project = initial.portfolio.projects[0]!;
    const base = commandFor(initial, project.id);
    const unknownTeamId = must(createTeamId("unknown-team"));
    const cases = [
      [],
      [base.teamRequirements[0]!, base.teamRequirements[0]!],
      [
        ...base.teamRequirements,
        {
          teamId: unknownTeamId,
          remainingWorkload: must(createRemainingWorkload("1")),
        },
      ],
    ];
    for (const teamRequirements of cases) {
      const session = createPlanningSession(initial);
      const before = session.getState();
      assert.equal(
        session.dispatch({ ...base, teamRequirements }).ok,
        false,
      );
      assert.equal(session.getState(), before);
    }
  });

  it("atomically changes Project Team membership and never revives a removed daily cap", () => {
    const initial = createDemoPlanningScenario();
    const project = initial.portfolio.projects[0]!;
    const session = createPlanningSession(initial);
    const beta = project.requirements[1]!;
    const gamma = initial.portfolio.teams[2]!;
    const changed = session.dispatch(commandFor(initial, project.id, {
      teamRequirements: [
        { teamId: gamma.id, remainingWorkload: must(createRemainingWorkload("8")) },
        { teamId: beta.teamId, remainingWorkload: beta.remainingWorkload },
      ],
    }));
    assert.equal(changed.ok, true);
    if (!changed.ok) return;
    const requirements = changed.state.portfolio.projects[0]!.requirements;
    assert.deepEqual(requirements.map((item) => item.teamId), [beta.teamId, gamma.id]);
    assert.equal(serializeQuantity(requirements[0]!.dailyCap!), "1/1");
    assert.equal(requirements[1]!.dailyCap, undefined);
    const alpha = project.requirements[0]!;
    const restored = session.dispatch(commandFor(changed.state, project.id, {
      teamRequirements: [
        ...requirements,
        { teamId: alpha.teamId, remainingWorkload: must(createRemainingWorkload("3")) },
      ],
    }));
    assert.equal(restored.ok, true);
    if (restored.ok) assert.equal(restored.state.portfolio.projects[0]!.requirements[0]!.dailyCap, undefined);
  });

  it("rejects a typed zero daily cap at the application boundary", () => {
    const initial = createDemoPlanningScenario();
    const project = initial.portfolio.projects[0]!;
    const session = createPlanningSession(initial);
    const previousState = session.getState();
    const result = session.dispatch(
      commandFor(initial, project.id, {
        teamRequirements: project.requirements.map((requirement, index) =>
          index === 0
            ? {
                ...requirement,
                dailyCap: must(createDailyCap("0")),
              }
            : requirement,
        ),
      }),
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors[0]?.code, "NON_POSITIVE_DAILY_CAP");
    }
    assert.equal(session.getState(), previousState);
  });

  it("rejects an unknown project without replacing state", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const unknown = must(createProjectId("unknown-project"));
    const result = session.dispatch({
      ...commandFor(initial, initial.portfolio.projects[0]!.id),
      projectId: unknown,
    });
    assert.equal(result.ok, false);
    assert.equal(session.getState().portfolio, initial.portfolio);
  });

  it("is DOM-free and defines no per-requirement project dates", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/application/session/planningSession.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /src\/ui|\.\.\/\.\.\/ui|HTMLElement|SVGElement/);
    assert.doesNotMatch(source, /adapters|TimelineViewModel|TimelineGeometry/);
    const requirementContract = source.slice(
      source.indexOf("export interface UpdateProjectTeamRequirement"),
      source.indexOf("export interface UpdateProjectCommand"),
    );
    assert.doesNotMatch(
      requirementContract,
      /earliestStartDate|objectiveEndDate|mandatoryDeadline/,
    );
  });
});

describe("PlanningSession project reorder", () => {
  it("moves in both directions and preserves every other Portfolio value", () => {
    const initial = createDemoPlanningScenario();
    const ids = initial.portfolio.priorityOrder;
    const session = createPlanningSession(initial);
    const down = session.dispatch({ kind: "reorder-project", projectId: ids[1]!, targetPosition: 3 });
    assert.equal(down.ok, true);
    if (!down.ok) return;
    assert.deepEqual(down.state.portfolio.priorityOrder, [ids[0], ids[2], ids[1], ids[3]]);
    const up = session.dispatch({ kind: "reorder-project", projectId: ids[2]!, targetPosition: 1 });
    assert.equal(up.ok, true);
    if (!up.ok) return;
    assert.deepEqual(up.state.portfolio.priorityOrder, [ids[2], ids[0], ids[1], ids[3]]);
    for (const key of ["teams", "projects", "programs", "priorityFamilies", "reservations"] as const) {
      assert.deepEqual(up.state.portfolio[key], initial.portfolio[key]);
      up.state.portfolio[key].forEach((value, index) => assert.strictEqual(value, initial.portfolio[key][index]));
    }
    assert.strictEqual(up.state.planning, initial.planning);
    assert.equal(new Set(up.state.portfolio.priorityOrder).size, ids.length);
    assert.equal(createPortfolio(up.state.portfolio).ok, true);
  });

  it("rejects an unknown Project and leaves a same-position command as the same state", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const before = session.getState();
    const unknown = session.dispatch({ kind: "reorder-project", projectId: must(createProjectId("absent")), targetPosition: 1 });
    assert.equal(unknown.ok, false);
    assert.strictEqual(session.getState(), before);
    const same = session.dispatch({ kind: "reorder-project", projectId: before.portfolio.priorityOrder[1]!, targetPosition: 2 });
    assert.equal(same.ok, true);
    assert.strictEqual(session.getState(), before);
  });

  it("keeps the reordered priority when a Project draft is later applied", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);
    const projectId = initial.portfolio.priorityOrder[0]!;
    const draftCommand = commandFor(initial, projectId, { name: "Edited after reorder" });
    session.dispatch({ kind: "reorder-project", projectId, targetPosition: 4 });
    const order = session.getState().portfolio.priorityOrder;
    const applied = session.dispatch(draftCommand);
    assert.equal(applied.ok, true);
    assert.deepEqual(session.getState().portfolio.priorityOrder, order);
  });
});
