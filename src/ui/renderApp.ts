const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export interface AppElements {
  readonly svg: SVGSVGElement;
  readonly diagnostics: HTMLElement;
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
  workspace.append(workspaceTitle, description, timelineContainer, diagnostics);

  shell.append(header, workspace);
  root.replaceChildren(shell);
  return Object.freeze({ svg: timeline, diagnostics });
}
