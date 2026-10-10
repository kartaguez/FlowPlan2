import type { EmptyPortfolioShellState } from "../bootstrap/emptyPortfolioShellState.js";

export function renderV2Shell(root: HTMLElement, state: EmptyPortfolioShellState): () => void {
  const owner = root.ownerDocument;
  const shell = owner.createElement("main");
  shell.className = "v2-shell";
  shell.setAttribute("data-flowplan-runtime", "v2");
  shell.setAttribute("data-portfolio-state", state.kind);
  const title = owner.createElement("h1"); title.textContent = "FlowPlan2 V2";
  const portfolio = owner.createElement("section"); portfolio.setAttribute("aria-label", "Portfolio");
  const heading = owner.createElement("h2"); heading.textContent = "Portfolio";
  const status = owner.createElement("p"); status.setAttribute("role", "status"); status.textContent = "Portfolio vide";
  const counts = owner.createElement("dl");
  for (const [name, count] of [["Teams", state.teams.length], ["Projects", state.projects.length], ["Reservations", state.reservations.length], ["Snapshots", state.snapshots.length]] as const) {
    const label = owner.createElement("dt"); label.textContent = name;
    const value = owner.createElement("dd"); value.textContent = String(count); value.setAttribute("data-count", name);
    counts.append(label, value);
  }
  portfolio.append(heading, status, counts);
  shell.append(title, portfolio);
  root.replaceChildren(shell);
  shell.setAttribute("data-flowplan-ready", "true");
  return () => shell.remove();
}
