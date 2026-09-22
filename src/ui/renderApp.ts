const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface AppElements {
  readonly svg: SVGSVGElement;
  readonly diagnostics: HTMLElement;
  readonly dateSummary: HTMLElement;
  readonly cursorControl: HTMLButtonElement;
  readonly viewportControls: TimelineViewportControls;
  readonly tooltip: HTMLElement;
  readonly selectionSummary: HTMLElement;
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
  workspace.append(
    workspaceTitle,
    description,
    cursorControl,
    viewportControlContainer,
    timelineContainer,
    dateSummary,
    selectionSummary,
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
