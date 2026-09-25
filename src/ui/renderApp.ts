import { createSettingsIconButton } from "./createSettingsIconButton.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface AppElements {
  readonly svg: SVGSVGElement;
  readonly diagnosticsControls: DiagnosticsControls;
  readonly cursorProgress: HTMLElement;
  readonly viewportControls: TimelineViewportControls;
  readonly planningSettingsButton: HTMLButtonElement;
  readonly planningSettingsControls: PlanningSettingsControls;
  readonly tooltip: HTMLElement;
  readonly teamEditControls: TeamEditControls;
  readonly teamCreateButton: HTMLButtonElement;
  readonly teamCreateControls: TeamCreateControls;
  readonly projectCreateControls: ProjectCreateControls;
  readonly projectCreateButton: HTMLButtonElement;
  readonly projectCreateSection: HTMLElement;
  readonly reservationCreateControls: ProjectCreateControls;
  readonly reservationCreateButton: HTMLButtonElement;
  readonly reservationCreateSection: HTMLElement;
  readonly applicationError: HTMLElement;
  readonly teamPanels: HTMLElement;
  readonly projectList: HTMLElement;
  readonly reservationList: HTMLElement;
  readonly projectTab: HTMLButtonElement;
  readonly reservationTab: HTMLButtonElement;
}

export interface DiagnosticsControls {
  readonly summary: HTMLElement;
  readonly backdrop: HTMLElement;
  readonly dialog: HTMLElement;
  readonly title: HTMLElement;
  readonly list: HTMLElement;
  readonly close: HTMLButtonElement;
}

export interface ProjectEditControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly deleteButton: HTMLButtonElement;
  readonly deleteConfirmation: HTMLElement;
  readonly deleteConfirm: HTMLButtonElement;
  readonly deleteCancel: HTMLButtonElement;
}

export interface ProjectCreateControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly error: HTMLElement;
  readonly create: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
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
  readonly capacityAdd?: HTMLButtonElement;
  readonly capacityApply: HTMLButtonElement;
  readonly capacityCancel: HTMLButtonElement;
  readonly close: HTMLButtonElement;
  readonly discard: HTMLButtonElement;
  readonly deleteButton: HTMLButtonElement;
  readonly deleteConfirmation: HTMLElement;
  readonly deleteConfirm: HTMLButtonElement;
  readonly deleteCancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface TeamCreateControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly name: HTMLInputElement;
  readonly periodFields: HTMLElement;
  readonly addPeriod: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly create: HTMLButtonElement;
  readonly error: HTMLElement;
}

export interface PlanningSettingsControls {
  readonly container: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly error: HTMLElement;
  readonly importButton: HTMLButtonElement;
  readonly exportButton: HTMLButtonElement;
  readonly fileInput: HTMLInputElement;
}

export interface ReservationEditControls {
  readonly container: HTMLElement;
  readonly title: HTMLElement;
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly deleteButton?: HTMLButtonElement;
  readonly deleteConfirmation?: HTMLElement;
  readonly deleteConfirm?: HTMLButtonElement;
  readonly deleteCancel?: HTMLButtonElement;
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
  timeline.setAttribute("tabindex", "0");
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
  const diagnosticsBackdrop = document.createElement("div");
  diagnosticsBackdrop.className = "timeline-diagnostics-backdrop";
  diagnosticsBackdrop.hidden = true;
  const diagnosticsDialog = document.createElement("section");
  diagnosticsDialog.className = "planning-settings-modal timeline-diagnostics-dialog";
  diagnosticsDialog.setAttribute("role", "dialog");
  diagnosticsDialog.setAttribute("aria-modal", "true");
  diagnosticsDialog.setAttribute("aria-labelledby", "timeline-diagnostics-dialog-title");
  diagnosticsDialog.hidden = true;
  const diagnosticsTitle = document.createElement("h3");
  diagnosticsTitle.id = "timeline-diagnostics-dialog-title";
  const diagnosticsList = document.createElement("div");
  diagnosticsList.className = "timeline-diagnostics-dialog-content";
  const diagnosticsClose = document.createElement("button");
  diagnosticsClose.type = "button";
  diagnosticsClose.textContent = "Close";
  diagnosticsDialog.append(diagnosticsTitle, diagnosticsList, diagnosticsClose);
  const diagnosticsControls = Object.freeze({
    summary: diagnostics,
    backdrop: diagnosticsBackdrop,
    dialog: diagnosticsDialog,
    title: diagnosticsTitle,
    list: diagnosticsList,
    close: diagnosticsClose,
  });
  const cursorProgress = document.createElement("section");
  cursorProgress.className = "cursor-progress";
  cursorProgress.setAttribute("aria-label", "Cumulative progress at projection date");
  const tooltip = document.createElement("div");
  tooltip.className = "timeline-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
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
  teamEditStatus.textContent = "Use a Team Settings button to edit.";
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
  const capacityAdd = document.createElement("button");
  capacityAdd.type = "button";
  capacityAdd.className = "timeline-team-period-action";
  capacityAdd.textContent = "Add period";
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
  capacityForm.append(capacityFields, capacityAdd, capacityActions);
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
  const teamDiscard = document.createElement("button");
  teamDiscard.type = "button";
  teamDiscard.textContent = "Discard changes";
  const teamDeleteButton = document.createElement("button");
  teamDeleteButton.type = "button";
  teamDeleteButton.textContent = "Delete Team";
  const teamDeleteConfirmation = document.createElement("div");
  teamDeleteConfirmation.className = "team-delete-confirmation";
  teamDeleteConfirmation.hidden = true;
  const teamDeleteMessage = document.createElement("p");
  teamDeleteMessage.textContent = "Delete this Team? This action cannot be undone.";
  const teamDeleteConfirm = document.createElement("button");
  teamDeleteConfirm.type = "button";
  teamDeleteConfirm.textContent = "Confirm delete";
  const teamDeleteCancel = document.createElement("button");
  teamDeleteCancel.type = "button";
  teamDeleteCancel.textContent = "Cancel deletion";
  teamDeleteConfirmation.append(teamDeleteMessage, teamDeleteCancel, teamDeleteConfirm);
  teamEdit.append(teamDiscard, teamDeleteButton, teamDeleteConfirmation);
  const teamEditControls = Object.freeze({
    container: teamEdit,
    title: teamEditTitle,
    nameForm: teamNameForm,
    nameFields: teamNameFields,
    nameApply: teamNameApply,
    capacityDetails,
    capacityForm,
    capacityFields,
    capacityAdd,
    capacityApply,
    capacityCancel,
    close: teamClose,
    discard: teamDiscard,
    deleteButton: teamDeleteButton,
    deleteConfirmation: teamDeleteConfirmation,
    deleteConfirm: teamDeleteConfirm,
    deleteCancel: teamDeleteCancel,
    status: teamEditStatus,
  });
  const applicationError = document.createElement("p");
  applicationError.className = "application-error";
  applicationError.setAttribute("role", "alert");
  applicationError.hidden = true;
  teamEdit.append(applicationError);

  const teamCreateButton = document.createElement("button");
  teamCreateButton.type = "button";
  teamCreateButton.className = "team-create-trigger";
  teamCreateButton.textContent = "Create Team";
  teamCreateButton.setAttribute("aria-label", "Create Team in planning teams");
  const teamCreate = document.createElement("section");
  teamCreate.className = "timeline-team-edit team-create-dialog";
  teamCreate.setAttribute("role", "dialog");
  teamCreate.setAttribute("aria-modal", "true");
  teamCreate.setAttribute("aria-label", "Create Team");
  teamCreate.hidden = true;
  const teamCreateTitle = document.createElement("h3");
  teamCreateTitle.textContent = "Create Team";
  const teamCreateForm = document.createElement("form");
  teamCreateForm.className = "timeline-team-capacity-form";
  const teamCreateNameLabel = document.createElement("label");
  teamCreateNameLabel.textContent = "Name";
  const teamCreateName = document.createElement("input");
  teamCreateName.type = "text";
  teamCreateName.name = "team.name";
  teamCreateNameLabel.append(teamCreateName);
  const teamCreatePeriodFields = document.createElement("div");
  teamCreatePeriodFields.className = "timeline-team-edit-fields";
  const teamCreateAddPeriod = document.createElement("button");
  teamCreateAddPeriod.type = "button";
  teamCreateAddPeriod.textContent = "Add period";
  const teamCreateCancel = document.createElement("button");
  teamCreateCancel.type = "button";
  teamCreateCancel.textContent = "Cancel";
  const teamCreateSubmit = document.createElement("button");
  teamCreateSubmit.type = "submit";
  teamCreateSubmit.textContent = "Create";
  const teamCreateError = document.createElement("p");
  teamCreateError.className = "application-error";
  teamCreateError.setAttribute("role", "alert");
  teamCreateError.hidden = true;
  const teamCreateActions = document.createElement("div");
  teamCreateActions.className = "timeline-team-edit-actions";
  teamCreateActions.append(teamCreateCancel, teamCreateSubmit);
  teamCreateForm.append(teamCreateNameLabel, teamCreatePeriodFields,
    teamCreateAddPeriod, teamCreateError, teamCreateActions);
  teamCreate.append(teamCreateTitle, teamCreateForm);
  const teamCreateControls = Object.freeze({ container: teamCreate, form: teamCreateForm,
    name: teamCreateName, periodFields: teamCreatePeriodFields, addPeriod: teamCreateAddPeriod,
    cancel: teamCreateCancel, create: teamCreateSubmit, error: teamCreateError });

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
  const planningImport = document.createElement("button");
  planningImport.type = "button";
  planningImport.textContent = "Import";
  const planningExport = document.createElement("button");
  planningExport.type = "button";
  planningExport.textContent = "Export";
  const planningFileInput = document.createElement("input");
  planningFileInput.type = "file";
  planningFileInput.accept = ".json,application/json";
  planningFileInput.hidden = true;
  const planningTransferActions = document.createElement("div");
  planningTransferActions.className = "planning-settings-actions";
  planningTransferActions.append(planningImport, planningExport, planningFileInput);
  const planningSettingsError = document.createElement("p");
  planningSettingsError.className = "planning-settings-error";
  planningSettingsError.setAttribute("role", "alert");
  planningSettingsError.hidden = true;
  planningSettingsForm.append(
    planningSettingsFields,
    planningTransferActions,
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
    importButton: planningImport,
    exportButton: planningExport,
    fileInput: planningFileInput,
  });
  const planningMain = document.createElement("div");
  planningMain.className = "planning-main";
  planningMain.append(
    planningHeading,
    cursorProgress,
    diagnostics,
    viewportControlContainer,
    timelineStage,
    tooltip,
  );
  const projectSidebar = document.createElement("aside");
  projectSidebar.className = "project-sidebar";
  projectSidebar.setAttribute("aria-label", "Portfolio");
  const projectSidebarTitle = document.createElement("h2");
  projectSidebarTitle.textContent = "Portfolio";
  const portfolioTabs = document.createElement("div");
  portfolioTabs.className = "portfolio-tabs";
  portfolioTabs.setAttribute("role", "tablist");
  portfolioTabs.setAttribute("aria-label", "Portfolio view");
  const projectTab = document.createElement("button");
  projectTab.type = "button";
  projectTab.className = "portfolio-tab portfolio-tab--active";
  projectTab.textContent = "Projects";
  projectTab.id = "portfolio-projects-tab";
  projectTab.setAttribute("role", "tab");
  projectTab.setAttribute("aria-selected", "true");
  projectTab.setAttribute("aria-controls", "portfolio-projects-panel");
  const reservationTab = document.createElement("button");
  reservationTab.type = "button";
  reservationTab.className = "portfolio-tab";
  reservationTab.textContent = "Reservations";
  reservationTab.id = "portfolio-reservations-tab";
  reservationTab.setAttribute("role", "tab");
  reservationTab.setAttribute("aria-selected", "false");
  reservationTab.setAttribute("aria-controls", "portfolio-reservations-panel");
  portfolioTabs.append(projectTab, reservationTab);
  const projectCreateSection = document.createElement("div");
  projectCreateSection.className = "project-create-section";
  const projectCreateButton = document.createElement("button");
  projectCreateButton.type = "button";
  projectCreateButton.className = "project-create-trigger";
  projectCreateButton.textContent = "Create Project";
  const projectCreateContainer = document.createElement("section");
  projectCreateContainer.className = "timeline-project-edit project-create-panel";
  projectCreateContainer.setAttribute("aria-label", "Create Project");
  projectCreateContainer.hidden = true;
  const projectCreateForm = document.createElement("form");
  projectCreateForm.className = "timeline-project-edit-form";
  const projectCreateFields = document.createElement("div");
  projectCreateFields.className = "timeline-project-edit-fields";
  const projectCreateError = document.createElement("p");
  projectCreateError.className = "application-error";
  projectCreateError.setAttribute("role", "alert");
  projectCreateError.hidden = true;
  const projectCreateCancel = document.createElement("button");
  projectCreateCancel.type = "button";
  projectCreateCancel.textContent = "Cancel";
  const projectCreateSubmit = document.createElement("button");
  projectCreateSubmit.type = "submit";
  projectCreateSubmit.textContent = "Create";
  const projectCreateActions = document.createElement("div");
  projectCreateActions.className = "timeline-project-edit-actions";
  projectCreateActions.append(projectCreateCancel, projectCreateSubmit);
  projectCreateForm.append(projectCreateFields, projectCreateError, projectCreateActions);
  projectCreateContainer.append(projectCreateForm);
  projectCreateSection.append(projectCreateButton, projectCreateContainer);
  const projectCreateControls = Object.freeze({ container: projectCreateContainer,
    form: projectCreateForm, fields: projectCreateFields, error: projectCreateError,
    create: projectCreateSubmit, cancel: projectCreateCancel });
  const projectList = document.createElement("ol");
  projectList.className = "project-sidebar-list";
  projectList.id = "portfolio-projects-panel";
  projectList.setAttribute("role", "tabpanel");
  projectList.setAttribute("aria-labelledby", projectTab.id);
  const reservationList = document.createElement("ol");
  reservationList.className = "project-sidebar-list reservation-sidebar-list";
  reservationList.id = "portfolio-reservations-panel";
  reservationList.setAttribute("role", "tabpanel");
  reservationList.setAttribute("aria-labelledby", reservationTab.id);
  reservationList.hidden = true;
  const reservationCreateSection = document.createElement("div");
  reservationCreateSection.className = "project-create-section";
  const reservationCreateButton = document.createElement("button");
  reservationCreateButton.type = "button";
  reservationCreateButton.className = "project-create-trigger";
  reservationCreateButton.textContent = "Create Reservation";
  const reservationCreateContainer = document.createElement("section");
  reservationCreateContainer.className = "timeline-reservation-edit project-create-panel";
  reservationCreateContainer.setAttribute("aria-label", "Create Reservation");
  reservationCreateContainer.hidden = true;
  const reservationCreateForm = document.createElement("form");
  reservationCreateForm.className = "timeline-reservation-edit-form";
  const reservationCreateFields = document.createElement("div");
  reservationCreateFields.className = "timeline-reservation-edit-fields";
  const reservationCreateError = document.createElement("p");
  reservationCreateError.className = "reservation-edit-error";
  reservationCreateError.setAttribute("role", "alert");
  reservationCreateError.hidden = true;
  const reservationCreateCancel = document.createElement("button");
  reservationCreateCancel.type = "button";
  reservationCreateCancel.textContent = "Cancel";
  const reservationCreateSubmit = document.createElement("button");
  reservationCreateSubmit.type = "submit";
  reservationCreateSubmit.textContent = "Create";
  const reservationCreateActions = document.createElement("div");
  reservationCreateActions.className = "timeline-reservation-edit-actions";
  reservationCreateActions.append(reservationCreateCancel, reservationCreateSubmit);
  reservationCreateForm.append(reservationCreateFields, reservationCreateError, reservationCreateActions);
  reservationCreateContainer.append(reservationCreateForm);
  reservationCreateSection.append(reservationCreateButton, reservationCreateContainer);
  const reservationCreateControls = Object.freeze({ container: reservationCreateContainer,
    form: reservationCreateForm, fields: reservationCreateFields, error: reservationCreateError,
    create: reservationCreateSubmit, cancel: reservationCreateCancel });
  projectSidebar.append(projectSidebarTitle, portfolioTabs, projectCreateSection, projectList,
    reservationCreateSection, reservationList);
  workspace.append(planningMain, projectSidebar);

  shell.append(header, workspace, diagnosticsBackdrop, diagnosticsDialog, planningSettings, teamEdit, teamCreate);
  root.replaceChildren(shell);
  return Object.freeze({
    svg: timeline,
    diagnosticsControls,
    cursorProgress,
    viewportControls,
    planningSettingsButton,
    planningSettingsControls,
    tooltip,
    teamEditControls,
    teamCreateButton,
    teamCreateControls,
    projectCreateControls,
    reservationCreateControls,
    reservationCreateButton,
    reservationCreateSection,
    projectCreateButton,
    projectCreateSection,
    applicationError,
    teamPanels,
    projectList,
    reservationList,
    projectTab,
    reservationTab,
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
