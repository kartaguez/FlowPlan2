import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import {
  createProjectId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import { renderTimelineShellNavigation } from "./renderTimelineShellNavigation.js";

type Listener = () => void;
class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
}
class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly listeners = new Map<string, Set<Listener>>();
  childNodes: FakeElement[] = [];
  className = "";
  textContent: string | null = null;
  type = "";
  constructor(readonly ownerDocument: FakeDocument, readonly tagName: string) {}
  append(...nodes: FakeElement[]): void { this.childNodes.push(...nodes); }
  replaceChildren(...nodes: FakeElement[]): void { this.childNodes = [...nodes]; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener as Listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }
  click(): void { for (const listener of this.listeners.get("click") ?? []) listener(); }
}
function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("renderTimelineShellNavigation", () => {
  it("renders team sections and accessible settings actions for one shared geometry", () => {
    const alpha = must(createTeamId("team-alpha"));
    const beta = must(createTeamId("team-beta"));
    const projectB = must(createProjectId("project-b"));
    const projectA = must(createProjectId("project-a"));
    const document = new FakeDocument();
    const teams = document.createElement("div");
    const projects = document.createElement("ol");
    const selectedTeams: string[] = [];
    const selectedProjects: string[] = [];
    const navigation = renderTimelineShellNavigation({
      teamContainer: teams as unknown as HTMLElement,
      projectContainer: projects as unknown as HTMLElement,
      viewModel: {
        teams: [
          { id: alpha, label: "Team Alpha" },
          { id: beta, label: "Team Beta" },
        ],
        projects: [
          { id: projectB, label: "Boreal", priorityIndex: 0 },
          { id: projectA, label: "Atlas", priorityIndex: 1 },
        ],
      } as unknown as TimelineViewModel,
      geometry: {
        timeAxis: { height: 56 },
        teams: [
          { teamId: alpha, height: 100 },
          { teamId: beta, height: 100 },
        ],
      } as unknown as TimelineGeometry,
      onTeamSettings: (teamId) => selectedTeams.push(teamId),
      onProjectSelect: (projectId) => selectedProjects.push(projectId),
    });
    assert.equal(teams.childNodes.length, 3);
    assert.equal(teams.childNodes[1]!.dataset.teamId, alpha);
    assert.equal(teams.childNodes[1]!.childNodes[0]!.textContent, "Team Alpha");
    assert.equal(
      teams.childNodes[1]!.childNodes[1]!.attributes.get("aria-label"),
      "Edit Team Alpha settings",
    );
    assert.deepEqual(
      projects.childNodes.map((item) => item.childNodes[0]!.textContent),
      ["1. Boreal", "2. Atlas"],
    );
    teams.childNodes[2]!.childNodes[1]!.click();
    projects.childNodes[0]!.childNodes[0]!.click();
    assert.deepEqual(selectedTeams, [beta]);
    assert.deepEqual(selectedProjects, [projectB]);
    navigation.destroy();
    teams.childNodes[1]!.childNodes[1]!.click();
    assert.deepEqual(selectedTeams, [beta]);
  });
});
