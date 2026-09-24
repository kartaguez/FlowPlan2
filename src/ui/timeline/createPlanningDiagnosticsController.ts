import type { TimelineDiagnostic } from "../../adapters/index.js";
import type { DiagnosticsControls } from "../renderApp.js";
import {
  diagnosticPresentationGroup,
  renderPlanningDiagnostics,
  type DiagnosticPresentationGroup,
} from "./renderPlanningDiagnostics.js";

export interface PlanningDiagnosticsController {
  readonly setDiagnostics: (diagnostics: readonly TimelineDiagnostic[]) => void;
  readonly destroy: () => void;
}

export function createPlanningDiagnosticsController(input: {
  readonly controls: DiagnosticsControls;
  readonly isModalOpen: () => boolean;
}): PlanningDiagnosticsController {
  const { controls } = input;
  const document = controls.summary.ownerDocument;
  const heading = document.createElement("h3");
  heading.className = "timeline-diagnostics-heading";
  heading.textContent = "Diagnostics";
  const indicators = document.createElement("div");
  indicators.className = "timeline-diagnostics-indicators";
  const buttons = new Map<DiagnosticPresentationGroup, HTMLButtonElement>();
  const names = { red: "Red diagnostics", grey: "Grey diagnostics" } as const;
  let diagnostics: readonly TimelineDiagnostic[] = [];
  let trigger: HTMLButtonElement | undefined;

  const close = (): void => {
    if (controls.dialog.hidden) return;
    controls.dialog.hidden = true;
    controls.backdrop.hidden = true;
    const previousTrigger = trigger;
    trigger = undefined;
    previousTrigger?.focus();
  };
  const open = (group: DiagnosticPresentationGroup): void => {
    if (input.isModalOpen()) return;
    const filtered = diagnostics.filter((diagnostic) => diagnosticPresentationGroup(diagnostic.code) === group);
    if (filtered.length === 0) return;
    trigger = buttons.get(group);
    controls.title.textContent = names[group];
    renderPlanningDiagnostics({ container: controls.list, diagnostics: filtered });
    controls.backdrop.hidden = false;
    controls.dialog.hidden = false;
    controls.close.focus();
  };
  for (const group of ["red", "grey"] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `timeline-diagnostics-indicator timeline-diagnostics-indicator--${group}`;
    button.setAttribute("aria-label", `${names[group]}: 0`);
    button.addEventListener("click", () => open(group));
    buttons.set(group, button);
    indicators.append(button);
  }
  controls.summary.replaceChildren(heading, indicators);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (controls.dialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      event.preventDefault();
      controls.close.focus();
    }
  };
  const onFocusIn = (event: FocusEvent): void => {
    if (!controls.dialog.hidden && !controls.dialog.contains(event.target as Node)) {
      controls.close.focus();
    }
  };
  controls.close.addEventListener("click", close);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusin", onFocusIn);

  return Object.freeze({
    setDiagnostics: (next: readonly TimelineDiagnostic[]) => {
      close();
      diagnostics = next;
      for (const group of ["red", "grey"] as const) {
        const count = next.filter((diagnostic) => diagnosticPresentationGroup(diagnostic.code) === group).length;
        const button = buttons.get(group)!;
        button.disabled = count === 0;
        button.textContent = `${group === "red" ? "●" : "○"} ${count}`;
        button.setAttribute("aria-label", `${names[group]}: ${count}`);
      }
    },
    destroy: () => {
      close();
      controls.close.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      controls.summary.replaceChildren();
      controls.list.replaceChildren();
    },
  });
}
