import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { CivilDate } from "../../domain/model/date.js";
import { buildProjectHistoryGeometry, hitTestProjectHistory, visibleHistoryDates, HISTORY_AXIS_HEIGHT, HISTORY_GROUP_HEADER_HEIGHT, HISTORY_ROW_HEIGHT } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
import { createProjectHistoryCache } from "./createProjectHistoryCache.js";
import { renderProjectHistorySvg, renderHistoryTimeAxis, historySvgNode } from "./renderProjectHistorySvg.js";
import { historySnapshotColor } from "./historySnapshotColor.js";
import { historySnapshotTimestamp, renderProjectHistoryTooltip } from "./renderProjectHistoryTooltip.js";
import { createTemporalViewportController, type TimelineViewportController } from "../timeline/createTimelineViewportController.js";
import { createTemporalRangeController } from "../timeline/createTemporalRangeController.js";
import { renderTimelineRangeSelection } from "../timeline/renderTimelineRangeSelection.js";
import { timelinePointFromClientPoint } from "../timeline/timelineViewport.js";
import { createInteractionLifecycle } from "../interactionLifecycle.js";
import { formatCursorMd } from "../timeline/formatCursorMetrics.js";
import { rationalToCanonicalString } from "../../domain/model/rational.js";

/** Read-only composition: this API has no command, persistence, editor or engine capability. */
export function createProjectHistoryCoordinator(input: { container: HTMLElement; getSnapshots: () => readonly PortfolioSnapshot[] }) {
  const document = input.container.ownerDocument;
  const cache = createProjectHistoryCache();
  let active = false, destroyed = false, gesturing = false, frame: number | undefined;
  let geometry: ReturnType<typeof buildProjectHistoryGeometry> | undefined;
  let viewportController: TimelineViewportController | undefined, rangeController: ReturnType<typeof createTemporalRangeController> | undefined, axisRangeController: ReturnType<typeof createTemporalRangeController> | undefined;
  let information: { p: number; s: number; date?: CivilDate } | undefined;
  const rowButtons = new Map<string, HTMLButtonElement>();
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") => {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  };
  const heading = node("h2", "", "Project History"), reference = node("p", "history-reference");
  const help = node("p", "history-help", "Drag a date range to zoom · Shift + drag to pan · Focus a row and use ← → / Home / End for daily details. Heights share a visual cap; dark = Actuals, pastel = Forecast.");
  const controls = node("div", "history-controls");
  const button = (text: string, label: string) => { const b = node("button", "", text); b.type = "button"; b.setAttribute("aria-label", label); return b; };
  const zoomIn = button("+", "Zoom in History"), zoomOut = button("−", "Zoom out History"), reset = button("Reset", "Reset History view");
  const capLabel = node("span", "history-cap-label"); controls.append(zoomOut, zoomIn, reset, capLabel);
  const legend = node("div", "history-legend"); legend.setAttribute("aria-label", "Portfolio snapshots, oldest first");
  const empty = node("p", "history-empty");
  const axis = node("div", "history-axis"); const axisGutter = node("span", "history-axis-gutter", "Snapshot / Priority");
  const axisSvg = historySvgNode(document, "svg", { height: HISTORY_AXIS_HEIGHT, "aria-label": "Reference snapshot time axis" }); axis.append(axisGutter, axisSvg);
  const scroll = node("div", "history-scroll"), stage = node("div", "history-stage"), gutters = node("div", "history-gutters");
  const svg = historySvgNode(document, "svg", { class: "history-timeline", "aria-label": "Historical daily Actuals and Forecast", role: "img" });
  const tooltip = node("section", "history-tooltip"); tooltip.id = "history-project-details";
  tooltip.setAttribute("role", "region"); tooltip.setAttribute("aria-label", "Historical Project details"); tooltip.setAttribute("aria-live", "polite"); tooltip.hidden = true;
  const tooltipContent = node("div"); const dismiss = button("Close", "Close historical details"); tooltip.append(dismiss, tooltipContent);
  stage.append(svg, gutters); scroll.append(stage); input.container.append(heading, reference, controls, help, legend, empty, axis, scroll, tooltip);
  const clear = () => {
    tooltip.hidden = true; information = undefined;
    if (pointerFrame !== undefined) document.defaultView?.cancelAnimationFrame(pointerFrame);
    pointerFrame = undefined;
  };
  const updateTooltip = () => {
    const state = cache.getState(), hit = information;
    const row = hit && state.model.projects[hit.p]?.rows[hit.s];
    if (!hit || !row || row.kind !== "present" || !state.cap || gesturing || !active) { tooltip.hidden = true; return; }
    renderProjectHistoryTooltip(tooltipContent, row, hit.date, state.cap); tooltip.hidden = false;
    if (row.days.length && geometry && !geometry.rows.find((r) => r.projectIndex === hit.p && r.snapshotIndex === hit.s)?.cells.length) {
      const text = node("p", "", "Captured activity lies outside the visible window or reference axis."); tooltipContent.append(text);
    }
  };
  const showRow = (p: number, s: number, date?: CivilDate) => { information = { p, s, ...(date ? { date } : {}) }; updateTooltip(); };
  const draw = () => {
    const state = cache.getState();
    if (!state.temporal || !state.viewport || !state.cap) return;
    // Window the heavy surfaces by Project groups; logical rows and keyboard entries remain complete.
    const firstProject = Math.max(0, Math.floor(scroll.scrollTop / state.temporal.groupHeight) - 1);
    const throughProject = Math.min(state.model.projects.length, Math.ceil((scroll.scrollTop + (scroll.clientHeight || 700)) / state.temporal.groupHeight) + 1);
    geometry = buildProjectHistoryGeometry({ model: state.model, temporal: state.temporal, viewport: state.viewport, cap: state.cap, firstProject, throughProject });
    const scrollbarWidth = Math.max(0, (scroll.offsetWidth ?? 0) - scroll.clientWidth - 2);
    axis.style.paddingRight = `${scrollbarWidth}px`;
    renderProjectHistorySvg(svg, geometry); renderHistoryTimeAxis(axisSvg, state.temporal, state.viewport);
    capLabel.textContent = `Visual cap ${formatCursorMd(state.cap)}/day`;
    capLabel.title = `Exact visual cap ${rationalToCanonicalString(state.cap)} MD/day`;
    updateTooltip();
  };
  const scheduleDraw = () => {
    if (!active || frame !== undefined) return;
    const window = document.defaultView;
    if (window) frame = window.requestAnimationFrame(() => { frame = undefined; if (active) draw(); }); else draw();
  };
  const renderDataset = () => {
    const state = cache.getState(); rowButtons.clear(); gutters.replaceChildren(); legend.replaceChildren(); clear();
    reference.textContent = state.model.referenceSnapshotId ? `Reference snapshot: ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(state.model.snapshots.at(-1)!.createdAt))}` : "No portfolio snapshots";
    for (const snapshot of state.model.snapshots) {
      const entry = button("", `Snapshot ${historySnapshotTimestamp(snapshot.createdAt)}, ID ${snapshot.snapshotId}`);
      entry.className = "history-legend-entry"; entry.title = `${historySnapshotTimestamp(snapshot.createdAt)} · ${snapshot.snapshotId}`;
      const swatch = node("span", "history-swatch"); swatch.style.background = historySnapshotColor(snapshot.snapshotId).actuals;
      const text = node("span", "", new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(snapshot.createdAt)));
      if (snapshot.snapshotId === state.model.referenceSnapshotId) { entry.classList.add("history-reference-entry"); text.textContent += " · Reference"; }
      const detail = node("span", "history-legend-detail", entry.title); detail.hidden = true;
      entry.addEventListener("click", () => { detail.hidden = !detail.hidden; });
      entry.addEventListener("keydown", (event) => { if (event.key === "Escape") { detail.hidden = true; event.stopPropagation(); } });
      entry.append(swatch, text, detail); legend.append(entry);
    }
    const available = state.temporal !== null;
    zoomIn.disabled = zoomOut.disabled = reset.disabled = !available;
    empty.hidden = available && state.model.projects.length > 0;
    empty.textContent = available ? "No historical Projects in these snapshots." : "Save a portfolio snapshot in Planning";
    axis.hidden = !available; scroll.hidden = !available || !state.model.projects.length;
    if (!state.temporal) { capLabel.textContent = ""; return; }
    stage.style.height = `${state.temporal.height}px`;
    state.model.projects.forEach((project, p) => {
      const group = node("section", "history-group"); group.style.top = `${p * state.temporal!.groupHeight}px`;
      group.style.height = `${state.temporal!.groupHeight}px`;
      const title = node("h3", "history-group-title", project.metadata.name);
      title.title = `${project.metadata.name} · Programme ${project.metadata.program?.name ?? "None"} · Pas ${project.metadata.pas?.name ?? "None"}`;
      const labels = node("span", "history-group-labels", `Programme ${project.metadata.program?.name ?? "None"} · Pas ${project.metadata.pas?.name ?? "None"}`);
      title.append(labels); group.append(title);
      project.rows.forEach((row, s) => {
        const entry = node(row.kind === "present" ? "button" : "span", "history-row-entry");
        entry.style.top = `${HISTORY_GROUP_HEADER_HEIGHT + s * HISTORY_ROW_HEIGHT}px`;
        if (row.kind === "absent") {
          entry.setAttribute("aria-label", `${project.metadata.name}, snapshot ${row.snapshotId}: absent from snapshot`);
          entry.setAttribute("role", "note");
          entry.append(node("span", "history-sr-only", `${project.metadata.name}, snapshot ${row.snapshotId}: absent from snapshot`));
        } else {
          const b = entry as HTMLButtonElement; b.type = "button";
          const swatch = node("span", "history-swatch"); swatch.style.background = historySnapshotColor(row.snapshotId).actuals;
          const priority = node("span", "", `#${row.metrics.priorityPosition}`);
          b.setAttribute("aria-label", `${row.metadata.name}, snapshot ${historySnapshotTimestamp(row.createdAt)}, ID ${row.snapshotId}, priority ${row.metrics.priorityPosition}${row.profile === "unavailable-legacy" ? ", daily profile unavailable" : ""}`);
          b.setAttribute("aria-describedby", tooltip.id);
          b.append(swatch, priority);
          if (row.profile === "unavailable-legacy") b.append(node("span", "history-unavailable", "Daily profile unavailable"));
          b.addEventListener("focus", () => { showRow(p, s); scheduleDraw(); });
          b.addEventListener("click", () => showRow(p, s));
          b.addEventListener("keydown", (event) => {
            if (event.key === "Escape") { event.preventDefault(); clear(); return; }
            if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
            const current = cache.getState(); if (!current.temporal || !current.viewport) return;
            const [first, last] = visibleHistoryDates(current.temporal, current.viewport);
            const dates = current.temporal.dates;
            const low = dates.findIndex((d) => d.date === first), high = dates.findIndex((d) => d.date === last);
            const selected = information?.p === p && information?.s === s ? information.date : undefined;
            let index = selected ? dates.findIndex((d) => d.date === selected) : low;
            switch (event.key) {
              case "ArrowLeft": index = selected ? Math.max(low, index - 1) : low; break;
              case "ArrowRight": index = selected ? Math.min(high, index + 1) : low; break;
              case "Home": index = low; break;
              case "End": index = high; break;
              default: return;
            }
            event.preventDefault(); showRow(p, s, dates[index]!.date);
          });
          rowButtons.set(`${p}:${s}`, b);
        }
        group.append(entry);
      });
      gutters.append(group);
    });
  };
  const pointHit = (event: PointerEvent) => {
    if (!geometry) return;
    const bounds = svg.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const point = timelinePointFromClientPoint({ clientX: event.clientX, clientY: event.clientY, svgLeft: bounds.left, svgTop: bounds.top,
      svgWidth: bounds.width, svgHeight: bounds.height, viewport: cache.getState().viewport!, geometryHeight: geometry.height });
    return hitTestProjectHistory(cache.getState().model, geometry, point.x, point.y, 4 * geometry.viewport.width / bounds.width);
  };
  let pointer: PointerEvent | undefined;
  let pointerFrame: number | undefined;
  const pointerMove = (event: PointerEvent) => {
    if (gesturing || event.pointerType === "touch") return;
    pointer = event;
    if (pointerFrame !== undefined) return;
    const update = () => { pointerFrame = undefined; if (!active || !pointer) return;
      const hit = pointHit(pointer); if (hit) showRow(hit.projectIndex, hit.snapshotIndex, hit.date); else clear(); };
    if (document.defaultView) pointerFrame = document.defaultView.requestAnimationFrame(update); else update();
  };
  const lifecycle = createInteractionLifecycle(() => {
    if (frame !== undefined) document.defaultView?.cancelAnimationFrame(frame);
    if (pointerFrame !== undefined) document.defaultView?.cancelAnimationFrame(pointerFrame);
    frame = pointerFrame = undefined; pointer = undefined; clear();
  });
  lifecycle.listen(svg, "pointermove", pointerMove);
  lifecycle.listen(svg, "pointerleave", () => { if (document.activeElement !== dismiss && !gutters.contains(document.activeElement)) clear(); });
  lifecycle.listen(svg, "pointercancel", clear);
  lifecycle.listen(scroll, "scroll", scheduleDraw);
  lifecycle.listen(dismiss, "click", () => { const hit = information; clear(); if (hit) rowButtons.get(`${hit.p}:${hit.s}`)?.focus(); clear(); });
  lifecycle.listen(input.container, "keydown", (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); clear(); } });
  const ResizeObserverClass = document.defaultView?.ResizeObserver;
  const resizeObserver = ResizeObserverClass ? new ResizeObserverClass(scheduleDraw) : undefined;
  lifecycle.suspend();
  const mountInteractions = () => {
    const state = cache.getState(); if (!state.temporal || !state.viewport) return;
    viewportController = createTemporalViewportController({ svg, pointerSurfaces: [svg, axisSvg], geometry: state.temporal, controls: { zoomIn, zoomOut, reset }, initialViewport: state.viewport,
      getZoomAnchorX: (viewport) => viewport.x + viewport.width / 2,
      isPanPointerAllowed: (event) => event.isPrimary !== false && (event.button === undefined || event.button === 0),
      onViewportChange: (change) => { cache.changeViewport(change); if (change.cause !== "initial") clear(); scheduleDraw(); },
      onPanStateChange: (value) => { gesturing = value; if (value) clear(); },
    });
    const preview = (selection: import("../timeline/renderTimelineRangeSelection.js").TimelineRangeSelection | undefined) => {
      gesturing = selection !== undefined; if (selection) clear();
      if (geometry) {
        renderTimelineRangeSelection({ svg, geometry, viewport: cache.getState().viewport!, selection });
        renderTimelineRangeSelection({ svg: axisSvg, geometry: { ...geometry, height: HISTORY_AXIS_HEIGHT }, viewport: cache.getState().viewport!, selection });
      }
    };
    rangeController = createTemporalRangeController({ svg, geometry: state.temporal, getViewport: viewportController.getState,
      onVisibleDateRange: viewportController.setVisibleDateRange,
      onClick: (date, event) => { const hit = pointHit(event); if (hit) { rowButtons.get(`${hit.projectIndex}:${hit.snapshotIndex}`)?.focus({ preventScroll: true }); showRow(hit.projectIndex, hit.snapshotIndex, date); } },
      onRangePreviewChange: preview,
    });
    axisRangeController = createTemporalRangeController({ svg: axisSvg, geometry: state.temporal, getViewport: viewportController.getState,
      onVisibleDateRange: viewportController.setVisibleDateRange, onRangePreviewChange: preview,
    });
  };
  // Pointer capture stores the release row for touch and click independently of hover updates.
  lifecycle.listen(svg, "pointerdown", (event: PointerEvent) => { pointer = event; });
  lifecycle.listen(svg, "pointerup", (event: PointerEvent) => { pointer = event; });
  return {
    getState: cache.getState,
    resume: () => {
      if (active || destroyed) return; active = true;
      const changed = cache.refresh(input.getSnapshots());
      if (changed) { viewportController?.destroy(); rangeController?.destroy(); axisRangeController?.destroy(); viewportController = undefined; rangeController = undefined; axisRangeController = undefined; renderDataset(); }
      if (!viewportController) mountInteractions(); else { viewportController.resume(); rangeController?.resume(); axisRangeController?.resume(); }
      lifecycle.resume(); resizeObserver?.observe(scroll); draw();
    },
    suspend: () => {
      if (!active) return; active = false;
      viewportController?.suspend(); rangeController?.suspend(); axisRangeController?.suspend(); lifecycle.suspend(); resizeObserver?.disconnect(); gesturing = false;
    },
    destroy: () => {
      if (destroyed) return; destroyed = true; active = false;
      viewportController?.destroy(); rangeController?.destroy(); axisRangeController?.destroy(); lifecycle.destroy(); resizeObserver?.disconnect(); input.container.replaceChildren();
    },
  };
}
