import type { CursorMetricsViewModel, CursorProgressView } from "./buildCursorMetricsViewModel.js";
import { formatCursorMd, formatCursorPercent } from "./formatCursorMetrics.js";

function progressWidth(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n || numerator <= 0n) return 0;
  if (numerator >= denominator) return 100;
  return Number((numerator * 10_000n / denominator + 50n) / 100n);
}

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
  heading.textContent = "Projected progress";
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
        const width = progressWidth(item.progress.numerator, item.progress.denominator);
        const status = item.progress.numerator >= item.progress.denominator
          ? "completed" : item.progress.numerator > 0n ? "in-progress" : "not-started";
        card.className = `cursor-progress-card cursor-progress-card--${status}`;
        card.dataset.itemId = item.id;
        const head = document.createElement("div");
        head.className = "cursor-progress-card-heading";
        const identity = document.createElement("div");
        identity.className = "cursor-progress-card-identity";
        const title = document.createElement("h4");
        title.textContent = item.name;
        const metadata = document.createElement("p");
        metadata.className = "cursor-progress-card-metadata";
        metadata.textContent = item.metadata;
        identity.append(title, metadata);
        const end = document.createElement("div");
        end.className = `cursor-progress-card-end${item.estimatedWithinHorizon && item.estimatedEndDate ? "" : " cursor-progress-card-end--incomplete"}`;
        const endLabel = document.createElement("span");
        endLabel.textContent = "Projected end";
        const endValue = document.createElement("strong");
        endValue.textContent = item.estimatedEndDate ?? "Incomplete in horizon";
        end.append(endLabel, endValue);
        head.append(identity, end);
        const load = document.createElement("div");
        load.className = "cursor-progress-card-load";
        const loadRow = document.createElement("div");
        loadRow.className = "cursor-progress-card-load-row";
        const loadLabel = document.createElement("strong");
        loadLabel.textContent = "Workload";
        const loadValues = document.createElement("span");
        loadValues.textContent = `${formatCursorMd(item.allocatedWorkload)} / ${formatCursorMd(item.baselineWorkload)} allocated to date`;
        const percentage = document.createElement("b");
        percentage.textContent = formatCursorPercent(item.progress);
        loadRow.append(loadLabel, loadValues, percentage);
        const track = document.createElement("div");
        track.className = "cursor-progress-card-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", `${item.name} projected progress at selected date`);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(width));
        track.setAttribute("aria-valuetext", formatCursorPercent(item.progress));
        const fill = document.createElement("span");
        fill.setAttribute("style", `width: ${width}%`);
        track.append(fill);
        load.append(loadRow, track);
        card.append(head, load);
        return card;
      }));
    },
    destroy: () => container.replaceChildren(),
  });
}
