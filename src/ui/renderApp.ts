const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface AppElements {
  readonly svg: SVGSVGElement;
  readonly diagnostics: HTMLElement;
  readonly dateSummary: HTMLElement;
  readonly cursorControl: HTMLButtonElement;
  readonly viewportControls: TimelineViewportControls;
  readonly tooltip: HTMLElement;
  readonly selectionSummary: HTMLElement;
  readonly projectEditControls: ProjectEditControls;
  readonly teamEditControls: TeamEditControls;
  readonly reservationEditControls: ReservationEditControls;
  readonly applicationError: HTMLElement;
  readonly reservationEditError: HTMLElement;
}

export interface ProjectEditControls {
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface TeamEditControls {
  readonly form: HTMLFormElement;
  readonly fields: HTMLElement;
  readonly apply: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly status: HTMLElement;
}

export interface ReservationEditControls {
  readonly form: HTMLFormElement;
  readonly rows: HTMLElement;
  readonly add: HTMLButtonElement;
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
  workspaceTitle.textContent = "Planning demo";
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
    form: projectEditForm,
    fields: projectFields,
    apply: projectApply,
    cancel: projectCancel,
    status: projectEditStatus,
  });
  const teamEdit = document.createElement("section");
  teamEdit.className = "timeline-team-edit";
  teamEdit.setAttribute("aria-label", "Team edit demo");
  const teamEditTitle = document.createElement("h3");
  teamEditTitle.textContent = "Selected team";
  const teamEditStatus = document.createElement("p");
  teamEditStatus.className = "timeline-team-edit-status";
  teamEditStatus.textContent = "Select a team lane to edit.";
  const teamEditForm = document.createElement("form");
  teamEditForm.className = "timeline-team-edit-form";
  const teamFields = document.createElement("div");
  teamFields.className = "timeline-team-edit-fields";
  const teamApply = document.createElement("button");
  teamApply.type = "submit";
  teamApply.textContent = "Apply";
  teamApply.disabled = true;
  const teamCancel = document.createElement("button");
  teamCancel.type = "button";
  teamCancel.textContent = "Cancel";
  teamCancel.disabled = true;
  const teamActions = document.createElement("div");
  teamActions.className = "timeline-team-edit-actions";
  teamActions.append(teamApply, teamCancel);
  teamEditForm.append(teamFields, teamActions);
  teamEdit.append(teamEditTitle, teamEditStatus, teamEditForm);
  const teamEditControls = Object.freeze({
    form: teamEditForm,
    fields: teamFields,
    apply: teamApply,
    cancel: teamCancel,
    status: teamEditStatus,
  });
  const reservationEdit = document.createElement("section");
  reservationEdit.className = "timeline-reservation-edit";
  reservationEdit.setAttribute("aria-label", "Firm reservation edit");
  const reservationTitle = document.createElement("h3");
  reservationTitle.textContent = "Firm reservations";
  const reservationStatus = document.createElement("p");
  reservationStatus.className = "timeline-reservation-edit-status";
  reservationStatus.textContent = "Select a team lane to edit reservations.";
  const reservationForm = document.createElement("form");
  reservationForm.className = "timeline-reservation-edit-form";
  const reservationRows = document.createElement("div");
  reservationRows.className = "timeline-reservation-edit-rows";
  const reservationAdd = document.createElement("button");
  reservationAdd.type = "button";
  reservationAdd.textContent = "Add reservation";
  reservationAdd.disabled = true;
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
  reservationActions.append(reservationAdd, reservationApply, reservationCancel);
  reservationForm.append(reservationRows, reservationActions);
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
    form: reservationForm,
    rows: reservationRows,
    add: reservationAdd,
    apply: reservationApply,
    cancel: reservationCancel,
    status: reservationStatus,
  });
  const applicationError = document.createElement("p");
  applicationError.className = "application-error";
  applicationError.setAttribute("role", "alert");
  applicationError.hidden = true;
  workspace.append(
    workspaceTitle,
    description,
    cursorControl,
    viewportControlContainer,
    timelineContainer,
    dateSummary,
    selectionSummary,
    projectEdit,
    teamEdit,
    reservationEdit,
    applicationError,
    diagnostics,
    tooltip,
  );

  shell.append(header, workspace);
  root.replaceChildren(shell);
  return Object.freeze({
    svg: timeline,
    diagnostics,
    dateSummary,
    cursorControl,
    viewportControls,
    tooltip,
    selectionSummary,
    projectEditControls,
    teamEditControls,
    reservationEditControls,
    applicationError,
    reservationEditError,
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
