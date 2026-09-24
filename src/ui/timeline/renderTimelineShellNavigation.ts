import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type { ProjectId, ReservationId, TeamId } from "../../domain/index.js";
import { createSettingsIconButton } from "../createSettingsIconButton.js";

export interface ReservationNavigationItem {
  readonly id: ReservationId;
  readonly name: string;
}

export interface ProjectNavigationItem {
  readonly id: ProjectId;
  readonly programName?: string;
  readonly priorityFamilyName?: string;
}

export type PortfolioTab = "projects" | "reservations";

export interface TimelineShellNavigation {
  readonly teamMetricsContainers: ReadonlyMap<TeamId, HTMLElement>;
  readonly getActiveTab: () => PortfolioTab;
  readonly destroy: () => void;
}

export interface RenderTimelineShellNavigationInput {
  readonly teamContainer: HTMLElement;
  readonly projectContainer: HTMLElement;
  readonly reservationContainer: HTMLElement;
  readonly projectTab: HTMLButtonElement;
  readonly reservationTab: HTMLButtonElement;
  readonly reservations: readonly ReservationNavigationItem[];
  readonly projectItems: readonly ProjectNavigationItem[];
  readonly initialTab?: PortfolioTab;
  readonly viewModel: TimelineViewModel;
  readonly geometry: TimelineGeometry;
  readonly onTeamSettings: (teamId: TeamId) => void;
  readonly onProjectSelect: (projectId: ProjectId) => void;
  readonly onReservationSelect: (reservationId: ReservationId) => void;
}

export function renderTimelineShellNavigation(
  input: RenderTimelineShellNavigationInput,
): TimelineShellNavigation {
  const document = input.teamContainer.ownerDocument;
  const listeners: Array<{
    readonly button: HTMLButtonElement;
    readonly listener: () => void;
  }> = [];
  const teamMetricsContainers = new Map<TeamId, HTMLElement>();
  const axisSpacer = document.createElement("div");
  axisSpacer.className = "timeline-team-axis-spacer";
  axisSpacer.setAttribute("aria-hidden", "true");
  axisSpacer.setAttribute("style", `height: ${input.geometry.timeAxis.height}px`);
  const teamsById = new Map(input.viewModel.teams.map((team) => [team.id, team]));
  const teamPanels = input.geometry.teams.map((teamGeometry) => {
    const team = teamsById.get(teamGeometry.teamId);
    if (team === undefined) {
      throw new TypeError(`Missing timeline team ${teamGeometry.teamId}.`);
    }
    const section = document.createElement("section");
    section.className = "team-panel";
    section.dataset.teamId = team.id;
    const header = document.createElement("header");
    header.className = "team-panel-header";
    header.setAttribute("style", `height: ${input.geometry.teamHeaderHeight}px`);
    const heading = document.createElement("h3");
    heading.textContent = team.label;
    const settings = createSettingsIconButton(
      document,
      `Edit ${team.label} settings`,
    );
    const listener = () => input.onTeamSettings(team.id);
    settings.addEventListener("click", listener);
    listeners.push({ button: settings, listener });
    header.append(heading, settings);
    const metrics = document.createElement("div");
    metrics.className = "team-panel-metrics";
    metrics.setAttribute("aria-label", `${team.label} cumulative metrics`);
    teamMetricsContainers.set(team.id, metrics);
    header.append(metrics);
    const lane = document.createElement("div");
    lane.className = "team-panel-timeline";
    lane.setAttribute("aria-label", `${team.label} timeline lane`);
    lane.setAttribute("style", `height: ${teamGeometry.height}px`);
    section.append(header, lane);
    return section;
  });
  input.teamContainer.replaceChildren(axisSpacer, ...teamPanels);

  const projectMetadata = new Map(input.projectItems.map((item) => [item.id, item]));
  const projectItems = input.viewModel.projects.map((project) => {
    const metadata = projectMetadata.get(project.id);
    if (metadata === undefined) throw new TypeError(`Missing Portfolio navigation project ${project.id}.`);
    const programName = metadata.programName ?? "—";
    const priorityFamilyName = metadata.priorityFamilyName ?? "—";
    const item = document.createElement("li");
    item.className = "project-sidebar-item";
    item.dataset.projectId = project.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-sidebar-button";
    const title = document.createElement("span");
    title.className = "project-sidebar-title";
    title.textContent = `${project.priorityIndex + 1}. ${project.label}`;
    const grouping = document.createElement("span");
    grouping.className = "project-sidebar-grouping";
    grouping.textContent = `Program ${programName} · PAS ${priorityFamilyName}`;
    button.append(title, grouping);
    button.setAttribute("aria-label", `Edit project ${project.label}, Program ${programName}, PAS ${priorityFamilyName}`);
    const listener = () => input.onProjectSelect(project.id);
    button.addEventListener("click", listener);
    listeners.push({ button, listener });
    item.append(button);
    return item;
  });
  input.projectContainer.replaceChildren(...projectItems);

  const reservationItems = input.reservations.map((reservation) => {
    const item = document.createElement("li");
    item.className = "project-sidebar-item reservation-sidebar-item";
    item.dataset.reservationId = reservation.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-sidebar-button reservation-sidebar-button";
    button.textContent = reservation.name;
    button.setAttribute("aria-label", `Edit reservation ${reservation.name}`);
    const listener = () => input.onReservationSelect(reservation.id);
    button.addEventListener("click", listener);
    listeners.push({ button, listener });
    item.append(button);
    return item;
  });
  input.reservationContainer.replaceChildren(...reservationItems);
  let activeTab: PortfolioTab = input.initialTab ?? "projects";
  const showTab = (next: PortfolioTab): void => {
    activeTab = next;
    const projectsActive = next === "projects";
    input.projectContainer.hidden = !projectsActive;
    input.reservationContainer.hidden = projectsActive;
    input.projectTab.setAttribute("aria-selected", String(projectsActive));
    input.reservationTab.setAttribute("aria-selected", String(!projectsActive));
    input.projectTab.tabIndex = projectsActive ? 0 : -1;
    input.reservationTab.tabIndex = projectsActive ? -1 : 0;
    input.projectTab.classList.toggle("portfolio-tab--active", projectsActive);
    input.reservationTab.classList.toggle("portfolio-tab--active", !projectsActive);
  };
  const showProjects = () => showTab("projects");
  const showReservations = () => showTab("reservations");
  const onTabKeyDown = (event: KeyboardEvent): void => {
    let next: PortfolioTab;
    if (event.key === "ArrowLeft" || event.key === "Home") next = "projects";
    else if (event.key === "ArrowRight" || event.key === "End") next = "reservations";
    else return;
    event.preventDefault();
    showTab(next);
    (next === "projects" ? input.projectTab : input.reservationTab).focus();
  };
  input.projectTab.addEventListener("click", showProjects);
  input.reservationTab.addEventListener("click", showReservations);
  input.projectTab.addEventListener("keydown", onTabKeyDown);
  input.reservationTab.addEventListener("keydown", onTabKeyDown);
  showTab(activeTab);

  return Object.freeze({
    teamMetricsContainers,
    getActiveTab: () => activeTab,
    destroy: () => {
      for (const { button, listener } of listeners) {
        button.removeEventListener("click", listener);
      }
      input.projectTab.removeEventListener("click", showProjects);
      input.reservationTab.removeEventListener("click", showReservations);
      input.projectTab.removeEventListener("keydown", onTabKeyDown);
      input.reservationTab.removeEventListener("keydown", onTabKeyDown);
    },
  });
}
