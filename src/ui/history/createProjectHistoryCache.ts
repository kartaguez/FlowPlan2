import { buildProjectHistoryViewModel, type ProjectHistoryViewModel } from "../../application/history/buildProjectHistoryViewModel.js";
import { comparePortfolioSnapshots, type PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";
import type { Rational } from "../../domain/model/rational.js";
import { computeHistoryVisualCap, createHistoryTemporalGeometry } from "../../adapters/history/geometry/buildProjectHistoryGeometry.js";
import type { TemporalViewportChange } from "../timeline/createTimelineViewportController.js";
import type { TimelineViewportState } from "../timeline/timelineViewport.js";

export interface HistoryCacheState {
  readonly model: ProjectHistoryViewModel;
  readonly temporal: ReturnType<typeof createHistoryTemporalGeometry> | null;
  readonly viewport: TimelineViewportState | null;
  readonly cap: Rational | null;
  readonly capWindow: TimelineViewportState | null;
  readonly zoomRevision: number;
}
export function createProjectHistoryCache(width = 2160) {
  let ids: readonly string[] | undefined;
  let state: HistoryCacheState = { model: buildProjectHistoryViewModel([]), temporal: null, viewport: null, cap: null, capWindow: null, zoomRevision: 0 };
  const refresh = (collection: readonly PortfolioSnapshot[]): boolean => {
    const orderedIds = [...collection].sort(comparePortfolioSnapshots).map((snapshot) => snapshot.snapshotId);
    if (ids && ids.length === orderedIds.length && ids.every((id, i) => id === orderedIds[i])) return false;
    const model = buildProjectHistoryViewModel(collection);
    const referenceChanged = model.referenceSnapshotId !== state.model.referenceSnapshotId;
    const temporal = model.horizon ? createHistoryTemporalGeometry(model, width) : null;
    const viewport = temporal ? !referenceChanged && state.viewport ? state.viewport : Object.freeze({ x: 0, width }) : null;
    state = Object.freeze({ model, temporal, viewport, cap: temporal && viewport ? computeHistoryVisualCap(model, temporal, viewport) : null,
      capWindow: viewport, zoomRevision: referenceChanged ? 0 : state.zoomRevision });
    ids = Object.freeze(orderedIds); return true;
  };
  const changeViewport = (change: TemporalViewportChange): void => {
    if (!state.temporal) return;
    const widthChanged = Math.abs(change.previous.width - change.next.width) > 1e-9;
    const rescale = widthChanged && ["zoom-button", "range-zoom", "reset"].includes(change.cause);
    state = Object.freeze({ ...state, viewport: change.next,
      cap: rescale ? computeHistoryVisualCap(state.model, state.temporal, change.next) : state.cap,
      capWindow: rescale ? change.next : state.capWindow,
      zoomRevision: state.zoomRevision + (rescale ? 1 : 0) });
  };
  return { refresh, changeViewport, getState: () => state };
}
