import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineGeometry, TimelineViewModel } from "../../adapters/index.js";
import {
  createProjectId,
  createReservationId,
  createTeamId,
  type DomainResult,
} from "../../domain/index.js";
import { renderTimelineShellNavigation } from "./renderTimelineShellNavigation.js";

type Listener = () => void;
class FakeDocument {
  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName);
  }
  createElementNS(_namespace: string, tagName: string): FakeElement {
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
  hidden = false;
  readonly classList = { add() {}, remove() {} };
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
    const projectC = must(createProjectId("project-c"));
    const projectD = must(createProjectId("project-d"));
    const document = new FakeDocument();
    const teams = document.createElement("div");
    const projects = document.createElement("ol");
    const reservations = document.createElement("ol");
    const projectTab = document.createElement("button");
    const reservationTab = document.createElement("button");
    const selectedTeams: string[] = [];
    const selectedProjects: string[] = [];
    const selectedReservations: string[] = [];
    const reservationId = must(createReservationId("run"));
    const navigation = renderTimelineShellNavigation({
      teamContainer: teams as unknown as HTMLElement,
      projectContainer: projects as unknown as HTMLElement,
      reservationContainer: reservations as unknown as HTMLElement,
      projectTab: projectTab as unknown as HTMLButtonElement,
      reservationTab: reservationTab as unknown as HTMLButtonElement,
      reservations: [{ id: reservationId, name: "Run" }],
      projectItems: [
        { id: projectB, programName: "Phoenix", priorityFamilyName: "Strategic" },
        { id: projectA, programName: "Phoenix" },
        { id: projectC, priorityFamilyName: "Regulatory" },
        { id: projectD },
      ],
      viewModel: {
        teams: [
          { id: alpha, label: "Team Alpha" },
          { id: beta, label: "Team Beta" },
        ],
        projects: [
          { id: projectB, label: "Boreal", priorityIndex: 0 },
          { id: projectA, label: "Atlas", priorityIndex: 1 },
          { id: projectC, label: "Cobalt", priorityIndex: 2 },
          { id: projectD, label: "Delta", priorityIndex: 3 },
        ],
      } as unknown as TimelineViewModel,
      geometry: {
        timeAxis: { height: 56 },
        teamHeaderHeight: 48,
        teams: [
          { teamId: alpha, height: 100 },
          { teamId: beta, height: 100 },
        ],
      } as unknown as TimelineGeometry,
      onTeamSettings: (teamId) => selectedTeams.push(teamId),
      onProjectSelect: (projectId) => selectedProjects.push(projectId),
      onReservationSelect: (id) => selectedReservations.push(id),
    });
    assert.equal(teams.childNodes.length, 3);
    assert.equal(teams.childNodes[1]!.dataset.teamId, alpha);
    assert.equal(teams.childNodes[1]!.className, "team-panel");
    assert.equal(teams.childNodes[1]!.childNodes[0]!.className, "team-panel-header");
    assert.equal(teams.childNodes[1]!.childNodes[1]!.className, "team-panel-timeline");
    assert.equal(
      teams.childNodes[1]!.childNodes[0]!.childNodes[0]!.textContent,
      "Team Alpha",
    );
    assert.equal(
      teams.childNodes[1]!.childNodes[0]!.childNodes[1]!.attributes.get("aria-label"),
      "Edit Team Alpha settings",
    );
    assert.equal(
      teams.childNodes[1]!.childNodes[0]!.childNodes[1]!.childNodes[0]!.tagName,
      "svg",
    );
    assert.equal(
      teams.childNodes[1]!.childNodes[1]!.attributes.get("aria-label"),
      "Team Alpha timeline lane",
    );
    assert.deepEqual(
      teams.childNodes.slice(1).map((panel) => [
        panel.childNodes[0]!.childNodes[0]!.textContent,
        panel.childNodes[1]!.attributes.get("aria-label"),
      ]),
      [
        ["Team Alpha", "Team Alpha timeline lane"],
        ["Team Beta", "Team Beta timeline lane"],
      ],
    );
    assert.deepEqual(
      projects.childNodes.map((item) => item.childNodes[0]!.childNodes[0]!.textContent),
      ["1. Boreal", "2. Atlas", "3. Cobalt", "4. Delta"],
    );
    assert.deepEqual(
      projects.childNodes.map((item) => item.childNodes[0]!.childNodes[1]!.textContent),
      [
        "Program Phoenix · PAS Strategic",
        "Program Phoenix · PAS —",
        "Program — · PAS Regulatory",
        "Program — · PAS —",
      ],
    );
    teams.childNodes[2]!.childNodes[0]!.childNodes[1]!.click();
    projects.childNodes[0]!.childNodes[0]!.click();
    reservationTab.click();
    reservations.childNodes[0]!.childNodes[0]!.click();
    assert.deepEqual(selectedTeams, [beta]);
    assert.deepEqual(selectedProjects, [projectB]);
    assert.deepEqual(selectedReservations, [reservationId]);
    assert.equal(projects.hidden, true);
    assert.equal(reservations.hidden, false);
    navigation.destroy();
    teams.childNodes[1]!.childNodes[0]!.childNodes[1]!.click();
    assert.deepEqual(selectedTeams, [beta]);
  });
});
