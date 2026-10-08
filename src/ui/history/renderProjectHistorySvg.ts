import type { ProjectHistoryGeometry } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
import { HISTORY_DRAW_HEIGHT, HISTORY_ROW_HEIGHT } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
import type { TemporalGeometry } from "../../adapters/temporal/temporalGeometry.js";
import type { TimelineViewportState } from "../timeline/timelineViewport.js";
import { applyTimelineViewport } from "../timeline/applyTimelineViewport.js";
import { historySnapshotColor } from "./historySnapshotColor.js";

const NS = "http://www.w3.org/2000/svg";
export function historySvgNode<K extends keyof SVGElementTagNameMap>(document: Document, tag: K, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}
/** Two sparse step surfaces per row, including holes; no DOM node per day. */
export function renderProjectHistorySvg(svg: SVGSVGElement, geometry: ProjectHistoryGeometry): void {
  const document = svg.ownerDocument;
  const layer = historySvgNode(document, "g", { class: "history-load-layer" });
  for (const row of geometry.rows) {
    const color = historySnapshotColor(row.row.snapshotId), baseline = row.y + HISTORY_ROW_HEIGHT - 4;
    let actuals = "", forecast = "", excess = "";
    for (const cell of row.cells) {
      const x = cell.x, right = x + cell.width, middle = baseline - cell.actualsHeight, top = middle - cell.forecastHeight;
      if (cell.actualsHeight > 0) actuals += `M${x},${baseline}H${right}V${middle}H${x}Z`;
      if (cell.forecastHeight > 0) forecast += `M${x},${middle}H${right}V${top}H${x}Z`;
      if (cell.capped) excess += `M${x},${baseline - HISTORY_DRAW_HEIGHT - 2}H${right}`;
    }
    const group = historySvgNode(document, "g", { "data-project-index": row.projectIndex, "data-snapshot-id": row.row.snapshotId });
    if (actuals) group.append(historySvgNode(document, "path", { d: actuals, fill: color.actuals, class: "history-actuals" }));
    if (forecast) group.append(historySvgNode(document, "path", { d: forecast, fill: color.forecast, class: "history-forecast" }));
    if (excess) {
      const indicator = historySvgNode(document, "path", { d: excess, class: "history-cap-excess", "vector-effect": "non-scaling-stroke", "aria-label": "Daily load exceeds visual cap. Exact amounts available in row details." });
      group.append(indicator);
    }
    if (row.row.daysLoaded !== false && !row.row.days.length && (row.row.profile === "available" || row.row.metrics.startAbsenceReason === "no-activity")) {
      group.append(historySvgNode(document, "line", { x1: geometry.viewport.x, x2: geometry.viewport.x + geometry.viewport.width,
        y1: baseline, y2: baseline, class: "history-no-activity", "vector-effect": "non-scaling-stroke" }));
    }
    if (row.knowledgeX !== null) {
      const marker = historySvgNode(document, "line", { x1: row.knowledgeX, x2: row.knowledgeX, y1: row.y + 2, y2: baseline + 1,
        class: "history-knowledge-marker", stroke: color.actuals, "vector-effect": "non-scaling-stroke" });
      const title = historySvgNode(document, "title"); title.textContent = `Actuals knowledge through ${row.row.actualsRange!.through}`; marker.append(title); group.append(marker);
    }
    layer.append(group);
  }
  const range = svg.querySelector(".timeline-range-selection-layer") ?? historySvgNode(document, "g", { class: "timeline-range-selection-layer" });
  svg.replaceChildren(layer, range);
  svg.setAttribute("height", String(geometry.height));
  svg.setAttribute("preserveAspectRatio", "none");
  applyTimelineViewport({ svg, geometry, viewport: geometry.viewport });
}
export function renderHistoryTimeAxis(svg: SVGSVGElement, geometry: TemporalGeometry, viewport: TimelineViewportState): void {
  const document = svg.ownerDocument, nodes: SVGElement[] = [];
  for (const segment of [...geometry.timeAxis.years, ...geometry.timeAxis.months]) {
    const left = Math.max(segment.x, viewport.x), right = Math.min(segment.x + segment.width, viewport.x + viewport.width);
    if (right <= left) continue;
    nodes.push(historySvgNode(document, "rect", { x: left, y: segment.y, width: right - left, height: segment.height, class: "history-axis-cell" }));
    const x = (left + right) / 2, y = segment.labelY;
    const label = historySvgNode(document, "text", { x, y, "text-anchor": "middle", "dominant-baseline": "middle",
      "data-screen-space-typography": "true", "data-timeline-label-x": x, "data-timeline-label-y": y });
    label.textContent = segment.label; nodes.push(label);
  }
  const range = svg.querySelector(".timeline-range-selection-layer") ?? historySvgNode(document, "g", { class: "timeline-range-selection-layer" });
  svg.replaceChildren(...nodes, range); svg.setAttribute("preserveAspectRatio", "none");
  applyTimelineViewport({ svg, geometry: { ...geometry, height: geometry.timeAxis.height }, viewport });
}
