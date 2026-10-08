import type { RepositoryHistoryReader } from "../../application/history/repositoryHistoryReader.js";
import type { HistoryScratch } from "../../application/history/historyScratch.js";
import { computeLazyHistoryVisualCap } from "../../adapters/history/geometry/computeLazyHistoryVisualCap.js";
import { civilDayDifference } from "../../domain/model/date.js";
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
export function createProjectHistoryCoordinator(input: { container: HTMLElement } & ({ getSnapshots: () => readonly PortfolioSnapshot[] } | { reader: RepositoryHistoryReader; scratch: () => Promise<HistoryScratch> })) {
  const document = input.container.ownerDocument;
  const cache = createProjectHistoryCache();
  const lazy = "reader" in input ? input : undefined;
  let capRequest = 0, rowLoading = false;
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
  const status = node("p", "history-storage-status"); status.setAttribute("role", "status");
  const axis = node("div", "history-axis"); const axisGutter = node("span", "history-axis-gutter", "Snapshot / Priority");
  const axisSvg = historySvgNode(document, "svg", { height: HISTORY_AXIS_HEIGHT, "aria-label": "Reference snapshot time axis" }); axis.append(axisGutter, axisSvg);
  const scroll = node("div", "history-scroll"), stage = node("div", "history-stage"), gutters = node("div", "history-gutters");
  const svg = historySvgNode(document, "svg", { class: "history-timeline", "aria-label": "Historical daily Actuals and Forecast", role: "img" });
  const tooltip = node("section", "history-tooltip"); tooltip.id = "history-project-details";
  tooltip.setAttribute("role", "region"); tooltip.setAttribute("aria-label", "Historical Project details"); tooltip.setAttribute("aria-live", "polite"); tooltip.hidden = true;
  const tooltipContent = node("div"); const dismiss = button("Close", "Close historical details"); tooltip.append(dismiss, tooltipContent);
  stage.append(svg, gutters); scroll.append(stage); input.container.append(heading, reference, controls, help, legend, status, empty, axis, scroll, tooltip);
  const clear = () => {
    tooltip.hidden = true; information = undefined;
    if (pointerFrame !== undefined) document.defaultView?.cancelAnimationFrame(pointerFrame);
    pointerFrame = undefined;
  };
  const updateTooltip = () => {
    const state = cache.getState(), hit = information;
    const row = hit && state.model.projects[hit.p]?.rows[hit.s];
    if (!hit || !row || row.kind !== "present" || !state.cap || gesturing || !active) { tooltip.hidden = true; return; }
    if (lazy && row.daysLoaded === false) {
      tooltipContent.replaceChildren(node("p", "", "Loading exact captured daily profile…")); tooltip.hidden = false;
      void lazy.reader.ensureRows([{ projectIndex: hit.p, snapshotIndex: hit.s }]).then(() => {
        if (!active || destroyed) return;
        cache.updateModel(lazy.reader.getModel()); updateTooltip(); scheduleDraw();
      }).catch(cause => { if (active) status.textContent = cause instanceof Error ? cause.message : "History read failed."; });
      return;
    }
    renderProjectHistoryTooltip(tooltipContent, row, hit.date, state.cap); tooltip.hidden = false;
    // Temporal visibility belongs to the complete captured profile, independent of mounted groups.
    const visible = state.temporal && state.viewport ? visibleHistoryDates(state.temporal, state.viewport) : undefined;
    const horizon = state.model.horizon;
    if (row.profile === "available" && row.days.some((day) => day.total.numerator > 0n) && visible && horizon
      && !row.days.some((day) => day.total.numerator > 0n && day.date >= horizon.from && day.date <= horizon.through
        && day.date >= visible[0] && day.date <= visible[1])) {
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
    const firstY = scroll.scrollTop - HISTORY_ROW_HEIGHT, throughY = scroll.scrollTop + (scroll.clientHeight || 700) + HISTORY_ROW_HEIGHT;
    if (lazy && !rowLoading) {
      const wanted: { projectIndex: number; snapshotIndex: number }[] = [];
      for (let p = firstProject; p < throughProject; p++) state.model.projects[p]?.rows.forEach((row, s) => {
        const y = p * state.temporal!.groupHeight + HISTORY_GROUP_HEADER_HEIGHT + s * HISTORY_ROW_HEIGHT;
        if (row.kind === "present" && row.daysLoaded === false && y + HISTORY_ROW_HEIGHT >= firstY && y <= throughY) wanted.push({ projectIndex: p, snapshotIndex: s });
      });
      if (wanted.length) {
        rowLoading = true;
        void lazy.reader.ensureRows(wanted).then(() => { if (active && !destroyed) { cache.updateModel(lazy.reader.getModel()); scheduleDraw(); } })
          .catch(cause => { if (active) status.textContent = cause instanceof Error ? cause.message : "History read failed."; })
          .finally(() => { rowLoading = false; });
      }
    }
    geometry = buildProjectHistoryGeometry({ model: state.model, temporal: state.temporal, viewport: state.viewport, cap: state.cap, firstProject, throughProject,
      ...(lazy ? { firstY, throughY } : {}) });
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
      onViewportChange: (change) => { cache.changeViewport(change, !!lazy); if (change.cause !== "initial") clear(); if (lazy && cache.getState().cap === null) void loadCap(); else scheduleDraw(); },
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
  const loadCap = async () => {
    if (!lazy || !active) return;
    const state = cache.getState(); if (!state.temporal || !state.viewport) return;
    const request = ++capRequest, temporal = state.temporal, viewport = state.viewport;
    const [from, through] = visibleHistoryDates(temporal, viewport);
    status.textContent = "Loading exact global visual cap…";
    controls.inert = axis.inert = scroll.inert = true; svg.replaceChildren();
    async function* values() {
      for await (const day of lazy!.reader.dailyTotals(from, through)) {
        const x = civilDayDifference(day.date, temporal.dates[0]!.date) * temporal.dayWidth;
        if (Math.min(x + temporal.dayWidth, viewport.x + viewport.width) > Math.max(x, viewport.x)) yield { value: day.total, count: day.count };
      }
    }
    try {
      const cap = await computeLazyHistoryVisualCap(values(), await lazy.scratch());
      if (!active || destroyed || request !== capRequest) return;
      cache.setCap(cap); status.textContent = ""; draw();
    } catch (cause) { if (active && request === capRequest) status.textContent = cause instanceof Error ? cause.message : "History cap failed; data was preserved."; }
    finally { if (active && request === capRequest) controls.inert = axis.inert = scroll.inert = false; }
  };
  const loadLazyDataset = async () => {
    if (!lazy) return;
    const request = ++capRequest; status.textContent = "Loading historical metadata…";
    controls.inert = axis.inert = scroll.inert = true;
    try {
      await lazy.reader.refresh((done, total) => { if (active && request === capRequest) status.textContent = `Loading historical metadata ${done}/${total}…`; });
      if (!active || destroyed || request !== capRequest) return;
      const changed = cache.installModel(lazy.reader.getModel(), lazy.reader.getKey());
      if (changed) { viewportController?.destroy(); rangeController?.destroy(); axisRangeController?.destroy(); viewportController = undefined; rangeController = undefined; axisRangeController = undefined; renderDataset(); }
      if (!viewportController) mountInteractions(); else { viewportController.resume(); rangeController?.resume(); axisRangeController?.resume(); }
      lifecycle.resume(); resizeObserver?.observe(scroll);
      if (!cache.getState().temporal) { status.textContent = ""; controls.inert = axis.inert = scroll.inert = false; }
      else if (cache.getState().cap === null) await loadCap();
      else { status.textContent = ""; controls.inert = axis.inert = scroll.inert = false; draw(); }
    } catch (cause) { if (active && request === capRequest) { status.textContent = cause instanceof Error ? cause.message : "History read failed."; controls.inert = axis.inert = scroll.inert = false; } }
  };
  // Pointer capture stores the release row for touch and click independently of hover updates.
  lifecycle.listen(svg, "pointerdown", (event: PointerEvent) => { pointer = event; });
  lifecycle.listen(svg, "pointerup", (event: PointerEvent) => { pointer = event; });
  return {
    getState: cache.getState,
    resume: () => {
      if (active || destroyed) return; active = true;
      if (lazy) { void loadLazyDataset(); return; }
      const changed = cache.refresh((input as { getSnapshots: () => readonly PortfolioSnapshot[] }).getSnapshots());
      if (changed) { viewportController?.destroy(); rangeController?.destroy(); axisRangeController?.destroy(); viewportController = undefined; rangeController = undefined; axisRangeController = undefined; renderDataset(); }
      if (!viewportController) mountInteractions(); else { viewportController.resume(); rangeController?.resume(); axisRangeController?.resume(); }
      lifecycle.resume(); resizeObserver?.observe(scroll); draw();
    },
    suspend: () => {
      if (!active) return; active = false;
      viewportController?.suspend(); rangeController?.suspend(); axisRangeController?.suspend(); lifecycle.suspend(); resizeObserver?.disconnect(); gesturing = false;
      if (lazy) { capRequest++; lazy.reader.releaseAll(); cache.releaseModel(); rowButtons.clear(); gutters.replaceChildren(); svg.replaceChildren(); geometry = undefined; clear(); }
    },
    destroy: () => {
      if (destroyed) return; destroyed = true; active = false;
      viewportController?.destroy(); rangeController?.destroy(); axisRangeController?.destroy(); lifecycle.destroy(); resizeObserver?.disconnect(); capRequest++; lazy?.reader.releaseAll(); input.container.replaceChildren();
    },
  };
}
