import type { AppElements } from "./renderApp.js";
import type { TimelineUiCoordinator } from "./timeline/createTimelineUiCoordinator.js";

/** The shell owns mode and focus. Neither navigation nor resume publishes a projection. */
export function createWorkspaceModeController(input: {
  controls: NonNullable<AppElements["modeControls"]>;
  planning: Pick<TimelineUiCoordinator, "isModalOpen" | "suspend" | "resume">;
  history: { resume(): void; suspend(): void; destroy(): void };
}) {
  const { controls, planning, history } = input;
  const document = controls.planningSurface.ownerDocument;
  let mode: "Planning" | "History" = "Planning", destroyed = false;
  let previousFocus: HTMLElement | null = null;
  const rememberPlanningFocus = (event: FocusEvent) => {
    if (mode === "Planning") previousFocus = event.target as HTMLElement;
  };
  controls.planningSurface.addEventListener("focusin", rememberPlanningFocus);
  const blockedEvents = ["click", "input", "change", "submit", "keydown", "pointerdown", "pointermove", "pointerup", "focusin"];
  const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const refresh = () => { controls.history.disabled = mode === "Planning" && planning.isModalOpen(); };
  const Observer = document.defaultView?.MutationObserver;
  const observer = Observer ? new Observer(refresh) : undefined;
  const observe = () => observer?.observe(controls.planningSurface, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  const setMode = (next: "Planning" | "History"): boolean => {
    if (destroyed) return false;
    if (next === mode) return true;
    if (next === "History") {
      if (planning.isModalOpen() || !planning.suspend()) { refresh(); return false; }
      const currentFocus = document.activeElement as HTMLElement | null;
      if (controls.planningSurface.contains?.(currentFocus) || previousFocus === null) previousFocus = currentFocus;
      observer?.disconnect();
      for (const event of blockedEvents) controls.planningSurface.addEventListener(event, block, true);
      controls.planningSurface.inert = true; controls.planningSurface.hidden = true;
      controls.historySurface.hidden = false; controls.historySurface.inert = false;
      history.resume(); controls.historySurface.focus();
    } else {
      history.suspend(); controls.historySurface.hidden = true; controls.historySurface.inert = true;
      for (const event of blockedEvents) controls.planningSurface.removeEventListener(event, block, true);
      controls.planningSurface.hidden = false; controls.planningSurface.inert = false;
      planning.resume(); observe();
      if (previousFocus?.isConnected && !previousFocus.closest("[hidden], [inert]")) previousFocus.focus();
      else controls.planning.focus();
    }
    mode = next;
    controls.planning.setAttribute("aria-pressed", String(mode === "Planning"));
    controls.history.setAttribute("aria-pressed", String(mode === "History"));
    refresh(); return true;
  };
  const showPlanning = () => { setMode("Planning"); }, showHistory = () => { setMode("History"); };
  controls.planning.addEventListener("click", showPlanning); controls.history.addEventListener("click", showHistory);
  controls.historySurface.inert = true;
  refresh(); observe();
  return { setMode, getMode: () => mode, destroy: () => {
    if (destroyed) return; destroyed = true; observer?.disconnect();
    controls.planningSurface.removeEventListener("focusin", rememberPlanningFocus);
    controls.planning.removeEventListener("click", showPlanning); controls.history.removeEventListener("click", showHistory);
    for (const event of blockedEvents) controls.planningSurface.removeEventListener(event, block, true);
    history.destroy();
  } };
}
