import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { createProjectId, type DomainResult } from "../../domain/index.js";
import { createDemoPlanningScenario } from "../../main/demo/createDemoPlanningScenario.js";
import { createPlanningSession } from "./planningSession.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("PlanningSession", () => {
  it("owns the initial immutable domain/application state", () => {
    const initial = createDemoPlanningScenario();
    const session = createPlanningSession(initial);

    assert.equal(session.getState().portfolio, initial.portfolio);
    assert.equal(session.getState().horizon, initial.horizon);
    assert.equal(Object.isFrozen(session.getState()), true);
  });

  it("renames a project through domain factories without mutating prior state", () => {
    const initial = createDemoPlanningScenario();
    const initialProjects = initial.portfolio.projects;
    const initialProject = initialProjects[0]!;
    const session = createPlanningSession(initial);

    const result = session.dispatch({
      kind: "rename-project",
      projectId: initialProject.id,
      label: "  Atlas Renamed  ",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.notEqual(result.state, initial);
    assert.notEqual(result.state.portfolio, initial.portfolio);
    assert.notEqual(result.state.portfolio.projects, initialProjects);
    assert.equal(result.state.portfolio.projects[0]?.name, "Atlas Renamed");
    assert.equal(initialProject.name, "Project Atlas");
    assert.equal(initial.portfolio.projects, initialProjects);
    assert.notEqual(result.state.portfolio.teams, initial.portfolio.teams);
    assert.deepEqual(result.state.portfolio.teams, initial.portfolio.teams);
    assert.notEqual(
      result.state.portfolio.priorityOrder,
      initial.portfolio.priorityOrder,
    );
    assert.deepEqual(
      result.state.portfolio.priorityOrder,
      initial.portfolio.priorityOrder,
    );
    assert.notEqual(
      result.state.portfolio.reservations,
      initial.portfolio.reservations,
    );
    assert.deepEqual(
      result.state.portfolio.reservations,
      initial.portfolio.reservations,
    );
  });

  it("keeps the same state after an invalid or unknown-project command", () => {
    const session = createPlanningSession(createDemoPlanningScenario());
    const before = session.getState();

    const empty = session.dispatch({
      kind: "rename-project",
      projectId: before.portfolio.projects[0]!.id,
      label: "   ",
    });
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.errors[0]?.code, "EMPTY_PROJECT_LABEL");
    assert.equal(session.getState(), before);

    const unknown = session.dispatch({
      kind: "rename-project",
      projectId: must(createProjectId("unknown-project")),
      label: "Unknown",
    });
    assert.equal(unknown.ok, false);
    assert.equal(session.getState(), before);
  });

  it("is DOM-free and does not depend on UI or adapters", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/application/session/planningSession.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /src\/ui|\.\.\/\.\.\/ui|HTMLElement|SVGElement/);
    assert.doesNotMatch(source, /adapters|TimelineViewModel|TimelineGeometry/);
  });
});
