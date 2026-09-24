import type { CursorMetricsViewModel, CursorProgressView } from "./buildCursorMetricsViewModel.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";

export interface CursorProgressSurface {
  readonly render: (model: CursorMetricsViewModel, activeView: CursorProgressView) => void;
  readonly destroy: () => void;
}

export function createCursorProgressSurface(
  container: HTMLElement,
  onViewChange: (view: CursorProgressView) => void,
): CursorProgressSurface {
  const document = container.ownerDocument;
  const heading = document.createElement("h3");
  heading.textContent = "Cumulative progress";
  const controls = document.createElement("div");
  controls.className = "cursor-progress-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Progress view");
  const views: readonly CursorProgressView[] = ["projects", "programs", "pas"];
  const buttons = views.map((view) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = view === "pas" ? "PAS" : view === "projects" ? "Projects" : "Programs";
    button.addEventListener("click", () => onViewChange(view));
    controls.append(button);
    return button;
  });
  const cards = document.createElement("div");
  cards.className = "cursor-progress-cards";
  container.replaceChildren(heading, controls, cards);
  return Object.freeze({
    render: (model: CursorMetricsViewModel, activeView: CursorProgressView) => {
      buttons.forEach((button, index) => {
        const active = views[index] === activeView;
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("cursor-progress-active", active);
      });
      cards.replaceChildren(...model[activeView].map((item) => {
        const card = document.createElement("article");
        card.className = "cursor-progress-card";
        card.dataset.itemId = item.id;
        const title = document.createElement("h4");
        title.textContent = item.name;
        const detail = document.createElement("p");
        detail.textContent = `${formatCursorPercent(item.progress)} complete · ${formatCursorMd(item.allocatedWorkload)} consumed · ${formatCursorMd(item.remainingWorkload)} remaining`;
        card.append(title, detail);
        return card;
      }));
    },
    destroy: () => container.replaceChildren(),
  });
}
