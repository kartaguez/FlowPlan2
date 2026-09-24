import type {
  TimelineGeometry,
  TimelineViewModel,
} from "../../adapters/index.js";
import type { ProjectId, ReservationId, TeamId } from "../../domain/index.js";
import { createSettingsIconButton } from "../createSettingsIconButton.js";
import { projectColorIndex } from "./projectVisualIdentity.js";

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
  readonly globalMetricsContainer: HTMLElement;
  readonly teamMetricsContainers: ReadonlyMap<TeamId, HTMLElement>;
  readonly projectCards: ReadonlyMap<ProjectId, { button: HTMLButtonElement; handle: HTMLButtonElement; host: HTMLElement; item: HTMLElement }>;
  readonly reservationCards: ReadonlyMap<ReservationId, { button: HTMLButtonElement; host: HTMLElement; item: HTMLElement }>;
  readonly getActiveTab: () => PortfolioTab;
  readonly setCardState: (kind: "project" | "reservation", id: ProjectId | ReservationId, expanded: boolean, dirty: boolean) => void;
  readonly setReorderPreview: (projectId?: ProjectId, targetPosition?: number) => void;
  readonly showReorderError: (message: string) => void;
  readonly destroy: () => void;
}

export interface RenderTimelineShellNavigationInput {
  readonly teamContainer: HTMLElement;
  readonly teamCreateButton: HTMLButtonElement;
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
  readonly onTabChange?: (tab: PortfolioTab) => void;
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
  const globalMetricsHeight = input.geometry.globalMetricsHeight ?? 0;
  const teamCollectionActionsHeight = input.geometry.teamCollectionActionsHeight ?? 0;
  axisSpacer.setAttribute("style", `height: ${input.geometry.timeAxis.height + globalMetricsHeight + teamCollectionActionsHeight}px`);
  const globalMetricsContainer = document.createElement("div");
  globalMetricsContainer.className = "timeline-global-metrics";
  globalMetricsContainer.setAttribute("style", `top: ${input.geometry.timeAxis.height}px; height: ${globalMetricsHeight}px`);
  globalMetricsContainer.setAttribute("aria-label", "Planning cumulative capacity metrics");
  const globalMetricsTitle = document.createElement("h3");
  globalMetricsTitle.className = "timeline-global-metrics-title";
  globalMetricsTitle.textContent = "Global capacity metrics";
  const globalMetricsValues = document.createElement("div");
  globalMetricsValues.className = "timeline-global-metrics-values capacity-metrics";
  globalMetricsContainer.append(globalMetricsTitle, globalMetricsValues);
  const teamCollectionActions = document.createElement("div");
  teamCollectionActions.className = "team-collection-actions";
  teamCollectionActions.setAttribute("style", `top: ${input.geometry.timeAxis.height + globalMetricsHeight}px; height: ${teamCollectionActionsHeight}px`);
  teamCollectionActions.append(input.teamCreateButton);
  axisSpacer.append(globalMetricsContainer, teamCollectionActions);
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
    metrics.className = "team-panel-metrics capacity-metrics";
    metrics.setAttribute("aria-label", `${team.label} cumulative metrics`);
    teamMetricsContainers.set(team.id, metrics);
    header.append(metrics);
    const lane = document.createElement("div");
    lane.className = "team-panel-timeline";
    lane.setAttribute("aria-label", `${team.label} timeline lane`);
    lane.setAttribute("style", `height: ${(input.geometry.teamProjectionBandHeight ?? 0) + teamGeometry.height}px`);
    section.append(header, lane);
    return section;
  });
  input.teamContainer.replaceChildren(axisSpacer, ...teamPanels);

  const projectMetadata = new Map(input.projectItems.map((item) => [item.id, item]));
  const projectCards = new Map<ProjectId, { button: HTMLButtonElement; handle: HTMLButtonElement; host: HTMLElement; item: HTMLElement; badge: HTMLElement }>();
  const projectOrder = input.viewModel.projects.map((project) => project.id);
  const projectItems = input.viewModel.projects.map((project) => {
    const metadata = projectMetadata.get(project.id);
    if (metadata === undefined) throw new TypeError(`Missing Portfolio navigation project ${project.id}.`);
    const programName = metadata.programName ?? "—";
    const priorityFamilyName = metadata.priorityFamilyName ?? "—";
    const item = document.createElement("li");
    item.className = `project-sidebar-item project-sidebar-item--color-${projectColorIndex(project.id)}`;
    item.dataset.projectId = project.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-sidebar-button";
    button.setAttribute("aria-expanded", "false");
    const host = document.createElement("div");
    host.className = "portfolio-card-content";
    host.id = `project-card-${project.id}`;
    host.hidden = true;
    button.setAttribute("aria-controls", host.id);
    const title = document.createElement("span");
    title.className = "project-sidebar-title";
    title.textContent = project.label;
    const badge = document.createElement("span");
    badge.className = "project-priority-badge";
    badge.textContent = `#${project.priorityIndex + 1}`;
    badge.setAttribute("aria-hidden", "true");
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "project-reorder-handle";
    handle.textContent = "↕";
    handle.setAttribute("aria-label", `Reorder ${project.label}, position ${project.priorityIndex + 1} of ${projectOrder.length}`);
    handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown Home End");
    handle.setAttribute("title", "Move with Up, Down, Home or End");
    const grouping = document.createElement("span");
    grouping.className = "project-sidebar-grouping";
    grouping.textContent = `Program ${programName} · PaS ${priorityFamilyName}`;
    button.append(title, grouping);
    button.setAttribute("aria-label", `Toggle project ${project.label}, Program ${programName}, PaS ${priorityFamilyName}`);
    const listener = () => input.onProjectSelect(project.id);
    button.addEventListener("click", listener);
    listeners.push({ button, listener });
    const header = document.createElement("div");
    header.className = "project-sidebar-header";
    header.append(badge, button, handle);
    item.append(header, host);
    projectCards.set(project.id, { button, handle, host, item, badge });
    return item;
  });
  input.projectContainer.replaceChildren(...projectItems);
  const reorderError = document.createElement("p");
  reorderError.className = "application-error";
  reorderError.setAttribute("role", "alert");
  reorderError.hidden = true;
  input.projectContainer.after?.(reorderError);

  const reservationCards = new Map<ReservationId, { button: HTMLButtonElement; host: HTMLElement; item: HTMLElement }>();
  const reservationItems = input.reservations.map((reservation) => {
    const item = document.createElement("li");
    item.className = "project-sidebar-item reservation-sidebar-item";
    item.dataset.reservationId = reservation.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-sidebar-button reservation-sidebar-button";
    button.setAttribute("aria-expanded", "false");
    const host = document.createElement("div");
    host.className = "portfolio-card-content";
    host.id = `reservation-card-${reservation.id}`;
    host.hidden = true;
    button.setAttribute("aria-controls", host.id);
    button.textContent = reservation.name;
    button.setAttribute("aria-label", `Edit reservation ${reservation.name}`);
    const listener = () => input.onReservationSelect(reservation.id);
    button.addEventListener("click", listener);
    listeners.push({ button, listener });
    item.append(button, host);
    reservationCards.set(reservation.id, { button, host, item });
    return item;
  });
  input.reservationContainer.replaceChildren(...reservationItems);
  let activeTab: PortfolioTab = input.initialTab ?? "projects";
  const showTab = (next: PortfolioTab, notify = false): void => {
    if (notify && activeTab !== next) input.onTabChange?.(next);
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
  const showProjects = () => showTab("projects", true);
  const showReservations = () => showTab("reservations", true);
  const onTabKeyDown = (event: KeyboardEvent): void => {
    let next: PortfolioTab;
    if (event.key === "ArrowLeft" || event.key === "Home") next = "projects";
    else if (event.key === "ArrowRight" || event.key === "End") next = "reservations";
    else return;
    event.preventDefault();
    showTab(next, true);
    (next === "projects" ? input.projectTab : input.reservationTab).focus();
  };
  input.projectTab.addEventListener("click", showProjects);
  input.reservationTab.addEventListener("click", showReservations);
  input.projectTab.addEventListener("keydown", onTabKeyDown);
  input.reservationTab.addEventListener("keydown", onTabKeyDown);
  showTab(activeTab);

  const setCardState = (kind: "project" | "reservation", id: ProjectId | ReservationId, expanded: boolean, dirty: boolean): void => {
    const card = kind === "project" ? projectCards.get(id as ProjectId) : reservationCards.get(id as ReservationId);
    if (!card) return;
    if (!expanded && card.host.contains(document.activeElement)) card.button.focus();
    card.host.hidden = !expanded;
    card.button.setAttribute("aria-expanded", String(expanded));
    card.item.classList.toggle("portfolio-card--dirty", dirty);
    card.item.classList.toggle("portfolio-card--expanded", expanded);
  };

  const setReorderPreview = (projectId?: ProjectId, targetPosition?: number): void => {
    const withoutSource = projectOrder.filter((id) => id !== projectId);
    const valid = projectId !== undefined && targetPosition !== undefined &&
      targetPosition >= 1 && targetPosition <= projectOrder.length;
    const preview = valid ? [...withoutSource] : [...projectOrder];
    if (valid) preview.splice(targetPosition - 1, 0, projectId!);
    const insertionId = valid ? withoutSource[targetPosition! - 1] : undefined;
    const lastId = valid && insertionId === undefined ? withoutSource.at(-1) : undefined;
    for (const [id, card] of projectCards) {
      card.badge.textContent = `#${preview.indexOf(id) + 1}`;
      card.item.classList.toggle("project-sidebar-item--dragging", id === projectId);
      card.item.classList.toggle("project-sidebar-item--insert-before", id === insertionId);
      card.item.classList.toggle("project-sidebar-item--insert-after", id === lastId);
    }
  };

  return Object.freeze({
    globalMetricsContainer: globalMetricsValues,
    teamMetricsContainers,
    projectCards,
    reservationCards,
    getActiveTab: () => activeTab,
    setCardState,
    setReorderPreview,
    showReorderError: (message: string) => { reorderError.textContent = message; reorderError.hidden = message === ""; },
    destroy: () => {
      reorderError.remove?.();
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
