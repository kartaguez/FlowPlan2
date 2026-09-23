import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type { ProjectId, ReservationId, TeamId } from "../../domain/index.js";

export interface ReservationNavigationItem {
  readonly id: ReservationId;
  readonly name: string;
}

export interface TimelineShellNavigation {
  readonly destroy: () => void;
}

export interface RenderTimelineShellNavigationInput {
  readonly teamContainer: HTMLElement;
  readonly projectContainer: HTMLElement;
  readonly reservationContainer: HTMLElement;
  readonly projectTab: HTMLButtonElement;
  readonly reservationTab: HTMLButtonElement;
  readonly reservations: readonly ReservationNavigationItem[];
  readonly initialTab?: "projects" | "reservations";
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
  const axisSpacer = document.createElement("div");
  axisSpacer.className = "timeline-team-axis-spacer";
  axisSpacer.setAttribute("aria-hidden", "true");
  axisSpacer.setAttribute("style", `height: ${input.geometry.timeAxis.height}px`);
  const teamsById = new Map(input.viewModel.teams.map((team) => [team.id, team]));
  const teamRows = input.geometry.teams.map((teamGeometry) => {
    const team = teamsById.get(teamGeometry.teamId);
    if (team === undefined) {
      throw new TypeError(`Missing timeline team ${teamGeometry.teamId}.`);
    }
    const section = document.createElement("section");
    section.className = "timeline-team-section";
    section.dataset.teamId = team.id;
    section.setAttribute("style", `height: ${teamGeometry.height}px`);
    const heading = document.createElement("h3");
    heading.textContent = team.label;
    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "timeline-team-settings-button";
    settings.textContent = "Settings";
    settings.setAttribute("aria-label", `Edit ${team.label} settings`);
    const listener = () => input.onTeamSettings(team.id);
    settings.addEventListener("click", listener);
    listeners.push({ button: settings, listener });
    section.append(heading, settings);
    return section;
  });
  input.teamContainer.replaceChildren(axisSpacer, ...teamRows);

  const projectItems = input.viewModel.projects.map((project) => {
    const item = document.createElement("li");
    item.className = "project-sidebar-item";
    item.dataset.projectId = project.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-sidebar-button";
    button.textContent = `${project.priorityIndex + 1}. ${project.label}`;
    button.setAttribute("aria-label", `Edit project ${project.label}`);
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
  const showProjects = () => {
    input.projectContainer.hidden = false;
    input.reservationContainer.hidden = true;
    input.projectTab.setAttribute("aria-pressed", "true");
    input.reservationTab.setAttribute("aria-pressed", "false");
    input.projectTab.classList.add("portfolio-tab--active");
    input.reservationTab.classList.remove("portfolio-tab--active");
  };
  const showReservations = () => {
    input.projectContainer.hidden = true;
    input.reservationContainer.hidden = false;
    input.projectTab.setAttribute("aria-pressed", "false");
    input.reservationTab.setAttribute("aria-pressed", "true");
    input.projectTab.classList.remove("portfolio-tab--active");
    input.reservationTab.classList.add("portfolio-tab--active");
  };
  input.projectTab.addEventListener("click", showProjects);
  input.reservationTab.addEventListener("click", showReservations);
  if (input.initialTab === "reservations") showReservations();
  else showProjects();

  return Object.freeze({
    destroy: () => {
      for (const { button, listener } of listeners) {
        button.removeEventListener("click", listener);
      }
      input.projectTab.removeEventListener("click", showProjects);
      input.reservationTab.removeEventListener("click", showReservations);
    },
  });
}
