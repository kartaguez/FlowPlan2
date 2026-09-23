import { createSettingsIconButton } from "./createSettingsIconButton.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface AppElements {
  readonly svg: SVGSVGElement;
  readonly diagnostics: HTMLElement;
  readonly dateSummary: HTMLElement;
  readonly cursorControl: HTMLButtonElement;
  readonly viewportControls: TimelineViewportControls;
  readonly planningSettingsButton: HTMLButtonElement;
  readonly planningSettingsControls: PlanningSettingsControls;
  readonly tooltip: HTMLElement;
  readonly selectionSummary: HTMLElement;
  readonly projectEditControls: ProjectEditControls;
  readonly teamEditControls: TeamEditControls;
  readonly reservationEditControls: ReservationEditControls;
  readonly applicationError: HTMLElement;
  readonly reservationEditError: HTMLElement;
  readonly teamPanels: HTMLElement;
  readonly projectList: HTMLElement;
  readonly reservationList: HTMLElement;
  readonly projectTab: HTMLButtonElement;
  readonly reservationTab: HTMLButtonElement;
  readonly editorDrawer: HTMLElement;
}

export interface ProjectEditControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface TeamEditControls {
  readonly container: HTMLElement;
  readonly title: HTMLElement;
  readonly nameForm: HTMLFormElement;
  readonly nameFields: HTMLElement;
  readonly nameApply: HTMLButtonElement;
  readonly capacityDetails: HTMLDetailsElement;
  readonly capacityForm: HTMLFormElement;
  readonly capacityFields: HTMLElement;
  readonly capacityApply: HTMLButtonElement;
  readonly capacityCancel: HTMLButtonElement;
  readonly close: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface PlanningSettingsControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly error: HTMLElement;
}

export interface ReservationEditControls {
  readonly container: HTMLElement;
  readonly title: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface TimelineViewportControls {
  readonly zoomIn: HTMLButtonElement;
  readonly zoomOut: HTMLButtonElement;
  readonly reset: HTMLButtonElement;
}

export function renderApp(root: HTMLElement): AppElements {
  const document = root.ownerDocument;
  const shell = document.createElement("main");
  shell.className = "application-shell";

  const header = document.createElement("header");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "FLOWPLAN";
  const title = document.createElement("h1");
  title.textContent = "FlowPlan";
  header.append(eyebrow, title);

  const workspace = document.createElement("section");
  workspace.className = "workspace-placeholder";
  workspace.setAttribute("aria-label", "Planning workspace");
  const workspaceTitle = document.createElement("h2");
  workspaceTitle.textContent = "Planning";
  const planningHeading = document.createElement("div");
  planningHeading.className = "planning-heading";
  const planningSettingsButton = createSettingsIconButton(
    document,
    "Edit planning settings",
  );
  planningHeading.append(workspaceTitle, planningSettingsButton);
  const description = document.createElement("p");
  description.textContent =
    "Three teams, four projects, exact capacity reservations and daily planning.";
  const cursorControl = document.createElement("button");
  cursorControl.type = "button";
  cursorControl.className = "timeline-cursor-control";
  cursorControl.setAttribute("aria-label", "Timeline date cursor");
  cursorControl.textContent = "Selected date";
  const viewportControlContainer = document.createElement("div");
  viewportControlContainer.className = "timeline-viewport-controls";
  viewportControlContainer.setAttribute("role", "group");
  viewportControlContainer.setAttribute("aria-label", "Timeline viewport");
  const zoomOut = createViewportButton(document, "−", "Zoom out");
  const zoomIn = createViewportButton(document, "+", "Zoom in");
  const reset = createViewportButton(document, "Reset view", "Reset view");
  viewportControlContainer.append(zoomOut, zoomIn, reset);
  const viewportControls = Object.freeze({ zoomIn, zoomOut, reset });
  const timelineContainer = document.createElement("div");
  timelineContainer.className = "timeline-container";
  const timeline = document.createElementNS(SVG_NAMESPACE, "svg");
  timeline.id = "timeline";
  timeline.classList.add("timeline-svg");
  timeline.setAttribute("aria-label", "FlowPlan planning timeline demo");
  timelineContainer.append(timeline);
  const teamPanels = document.createElement("div");
  teamPanels.className = "timeline-team-panels";
  teamPanels.setAttribute("aria-label", "Planning teams");
  const timelineStage = document.createElement("div");
  timelineStage.className = "timeline-stage";
  timelineStage.append(timelineContainer, teamPanels);
  const diagnostics = document.createElement("section");
  diagnostics.className = "timeline-diagnostics";
  diagnostics.setAttribute("aria-label", "Planning diagnostics");
  const dateSummary = document.createElement("section");
  dateSummary.className = "timeline-date-summary";
  dateSummary.setAttribute("aria-label", "Selected planning date summary");
  const selectionSummary = document.createElement("section");
  selectionSummary.className = "timeline-selection-summary";
  selectionSummary.setAttribute("aria-label", "Timeline selection summary");
  selectionSummary.setAttribute("aria-live", "polite");
  const tooltip = document.createElement("div");
  tooltip.className = "timeline-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  const projectEdit = document.createElement("section");
  projectEdit.className = "timeline-project-edit";
  projectEdit.setAttribute("aria-label", "Project edit demo");
  projectEdit.hidden = true;
  const projectEditTitle = document.createElement("h3");
  projectEditTitle.textContent = "Selected project";
  const projectEditStatus = document.createElement("p");
  projectEditStatus.className = "timeline-project-edit-status";
  projectEditStatus.textContent = "Select a project allocation or marker to edit.";
  const projectEditForm = document.createElement("form");
  projectEditForm.className = "timeline-project-edit-form";
  const projectFields = document.createElement("div");
  projectFields.className = "timeline-project-edit-fields";
  const projectApply = document.createElement("button");
  projectApply.type = "submit";
  projectApply.textContent = "Apply";
  projectApply.disabled = true;
  const projectCancel = document.createElement("button");
  projectCancel.type = "button";
  projectCancel.textContent = "Cancel";
  projectCancel.disabled = true;
  const projectActions = document.createElement("div");
  projectActions.className = "timeline-project-edit-actions";
  projectActions.append(projectApply, projectCancel);
  projectEditForm.append(projectFields, projectActions);
  projectEdit.append(projectEditTitle, projectEditStatus, projectEditForm);
  const projectEditControls = Object.freeze({
    container: projectEdit,
    form: projectEditForm,
    fields: projectFields,
    apply: projectApply,
    cancel: projectCancel,
    status: projectEditStatus,
  });
  const teamEdit = document.createElement("section");
  teamEdit.className = "timeline-team-edit";
  teamEdit.setAttribute("role", "dialog");
  teamEdit.setAttribute("aria-modal", "true");
  teamEdit.setAttribute("aria-label", "Team settings");
  teamEdit.hidden = true;
  const teamEditTitle = document.createElement("h3");
  teamEditTitle.textContent = "Team settings";
  const teamEditStatus = document.createElement("p");
  teamEditStatus.className = "timeline-team-edit-status";
  teamEditStatus.textContent = "Select a team lane to edit.";
  const teamNameForm = document.createElement("form");
  teamNameForm.className = "timeline-team-name-form";
  const teamNameFields = document.createElement("div");
  const teamNameApply = document.createElement("button");
  teamNameApply.type = "submit";
  teamNameApply.textContent = "Apply name";
  teamNameApply.disabled = true;
  teamNameForm.append(teamNameFields, teamNameApply);
  const capacityDetails = document.createElement("details");
  capacityDetails.className = "timeline-team-capacity-details";
  const capacitySummary = document.createElement("summary");
  capacitySummary.textContent = "Capacity periods";
  const capacityForm = document.createElement("form");
  capacityForm.className = "timeline-team-capacity-form";
  const capacityFields = document.createElement("div");
  capacityFields.className = "timeline-team-edit-fields";
  const capacityApply = document.createElement("button");
  capacityApply.type = "submit";
  capacityApply.textContent = "Apply periods";
  capacityApply.disabled = true;
  const capacityCancel = document.createElement("button");
  capacityCancel.type = "button";
  capacityCancel.textContent = "Cancel changes";
  capacityCancel.disabled = true;
  const capacityActions = document.createElement("div");
  capacityActions.className = "timeline-team-edit-actions";
  capacityActions.append(capacityCancel, capacityApply);
  capacityForm.append(capacityFields, capacityActions);
  capacityDetails.append(capacitySummary, capacityForm);
  const teamClose = document.createElement("button");
  teamClose.type = "button";
  teamClose.textContent = "Close";
  teamEdit.append(
    teamEditTitle,
    teamEditStatus,
    teamNameForm,
    capacityDetails,
    teamClose,
  );
  const teamEditControls = Object.freeze({
    container: teamEdit,
    title: teamEditTitle,
    nameForm: teamNameForm,
    nameFields: teamNameFields,
    nameApply: teamNameApply,
    capacityDetails,
    capacityForm,
    capacityFields,
    capacityApply,
    capacityCancel,
    close: teamClose,
    status: teamEditStatus,
  });
  const reservationEdit = document.createElement("section");
  reservationEdit.className = "timeline-reservation-edit planning-settings-modal";
  reservationEdit.setAttribute("role", "dialog");
  reservationEdit.setAttribute("aria-modal", "true");
  reservationEdit.setAttribute("aria-label", "Reservation editor");
  reservationEdit.hidden = true;
  const reservationTitle = document.createElement("h3");
  reservationTitle.textContent = "Reservation";
  const reservationStatus = document.createElement("p");
  reservationStatus.className = "timeline-reservation-edit-status";
  reservationStatus.textContent = "Select a reservation to edit.";
  const reservationForm = document.createElement("form");
  reservationForm.className = "timeline-reservation-edit-form";
  const reservationFields = document.createElement("div");
  reservationFields.className = "timeline-reservation-edit-fields";
  const reservationApply = document.createElement("button");
  reservationApply.type = "submit";
  reservationApply.textContent = "Apply reservations";
  reservationApply.disabled = true;
  const reservationCancel = document.createElement("button");
  reservationCancel.type = "button";
  reservationCancel.textContent = "Cancel";
  reservationCancel.disabled = true;
  const reservationActions = document.createElement("div");
  reservationActions.className = "timeline-reservation-edit-actions";
  reservationActions.append(reservationCancel, reservationApply);
  reservationForm.append(reservationFields, reservationActions);
  const reservationEditError = document.createElement("p");
  reservationEditError.className = "reservation-edit-error";
  reservationEditError.setAttribute("role", "alert");
  reservationEditError.hidden = true;
  reservationEdit.append(
    reservationTitle,
    reservationStatus,
    reservationForm,
    reservationEditError,
  );
  const reservationEditControls = Object.freeze({
    container: reservationEdit,
    title: reservationTitle,
    form: reservationForm,
    fields: reservationFields,
    apply: reservationApply,
    cancel: reservationCancel,
    status: reservationStatus,
  });
  const applicationError = document.createElement("p");
  applicationError.className = "application-error";
  applicationError.setAttribute("role", "alert");
  applicationError.hidden = true;

  const planningSettings = document.createElement("section");
  planningSettings.className = "planning-settings-modal";
  planningSettings.setAttribute("role", "dialog");
  planningSettings.setAttribute("aria-modal", "true");
  planningSettings.setAttribute("aria-label", "Planning settings");
  planningSettings.hidden = true;
  const planningSettingsTitle = document.createElement("h3");
  planningSettingsTitle.textContent = "Planning settings";
  const planningSettingsForm = document.createElement("form");
  const planningSettingsFields = document.createElement("div");
  planningSettingsFields.className = "planning-settings-fields";
  const planningSettingsCancel = document.createElement("button");
  planningSettingsCancel.type = "button";
  planningSettingsCancel.textContent = "Cancel";
  const planningSettingsApply = document.createElement("button");
  planningSettingsApply.type = "submit";
  planningSettingsApply.textContent = "Apply";
  const planningSettingsActions = document.createElement("div");
  planningSettingsActions.className = "planning-settings-actions";
  planningSettingsActions.append(planningSettingsCancel, planningSettingsApply);
  const planningSettingsError = document.createElement("p");
  planningSettingsError.className = "planning-settings-error";
  planningSettingsError.setAttribute("role", "alert");
  planningSettingsError.hidden = true;
  planningSettingsForm.append(
    planningSettingsFields,
    planningSettingsError,
    planningSettingsActions,
  );
  planningSettings.append(planningSettingsTitle, planningSettingsForm);
  const planningSettingsControls = Object.freeze({
    container: planningSettings,
    form: planningSettingsForm,
    fields: planningSettingsFields,
    apply: planningSettingsApply,
    cancel: planningSettingsCancel,
    error: planningSettingsError,
  });
  const planningMain = document.createElement("div");
  planningMain.className = "planning-main";
  planningMain.append(
    planningHeading,
    description,
    cursorControl,
    viewportControlContainer,
    timelineStage,
    dateSummary,
    selectionSummary,
    diagnostics,
    tooltip,
  );
  const projectSidebar = document.createElement("aside");
  projectSidebar.className = "project-sidebar";
  projectSidebar.setAttribute("aria-label", "Portfolio");
  const projectSidebarTitle = document.createElement("h2");
  projectSidebarTitle.textContent = "Portfolio";
  const portfolioTabs = document.createElement("div");
  portfolioTabs.className = "portfolio-tabs";
  const projectTab = document.createElement("button");
  projectTab.type = "button";
  projectTab.className = "portfolio-tab portfolio-tab--active";
  projectTab.textContent = "Projects";
  projectTab.setAttribute("aria-pressed", "true");
  const reservationTab = document.createElement("button");
  reservationTab.type = "button";
  reservationTab.className = "portfolio-tab";
  reservationTab.textContent = "Reservations";
  reservationTab.setAttribute("aria-pressed", "false");
  portfolioTabs.append(projectTab, reservationTab);
  const projectList = document.createElement("ol");
  projectList.className = "project-sidebar-list";
  const reservationList = document.createElement("ol");
  reservationList.className = "project-sidebar-list reservation-sidebar-list";
  reservationList.hidden = true;
  const editorDrawer = document.createElement("div");
  editorDrawer.className = "planning-editor-drawer";
  editorDrawer.setAttribute("aria-label", "Planning editor");
  editorDrawer.append(applicationError, projectEdit);
  projectSidebar.append(projectSidebarTitle, portfolioTabs, projectList, reservationList, editorDrawer);
  workspace.append(planningMain, projectSidebar);

  shell.append(header, workspace, planningSettings, teamEdit, reservationEdit);
  root.replaceChildren(shell);
  return Object.freeze({
    svg: timeline,
    diagnostics,
    dateSummary,
    cursorControl,
    viewportControls,
    planningSettingsButton,
    planningSettingsControls,
    tooltip,
    selectionSummary,
    projectEditControls,
    teamEditControls,
    reservationEditControls,
    applicationError,
    reservationEditError,
    teamPanels,
    projectList,
    reservationList,
    projectTab,
    reservationTab,
    editorDrawer,
  });
}

function createViewportButton(
  document: Document,
  text: string,
  label: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "timeline-viewport-button";
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
}
