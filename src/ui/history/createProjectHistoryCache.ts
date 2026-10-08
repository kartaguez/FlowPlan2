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
  let lazyKey: string | undefined;
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
  const changeViewport = (change: TemporalViewportChange, lazy = false): void => {
    if (!state.temporal) return;
    const widthChanged = Math.abs(change.previous.width - change.next.width) > 1e-9;
    const rescale = widthChanged && ["zoom-button", "range-zoom", "reset"].includes(change.cause);
    state = Object.freeze({ ...state, viewport: change.next,
      cap: rescale ? lazy ? null : computeHistoryVisualCap(state.model, state.temporal, change.next) : state.cap,
      capWindow: rescale ? change.next : state.capWindow,
      zoomRevision: state.zoomRevision + (rescale ? 1 : 0) });
  };
  const installModel = (model: ProjectHistoryViewModel, key: string): boolean => {
    const changed = lazyKey !== key, dropped = state.model.projects.length === 0 && model.projects.length > 0;
    const referenceChanged = model.referenceSnapshotId !== state.model.referenceSnapshotId || (!!lazyKey && JSON.parse(lazyKey)[0] !== JSON.parse(key)[0]);
    const temporal = model.horizon ? createHistoryTemporalGeometry(model, width) : null;
    const viewport = temporal ? !referenceChanged && state.viewport ? state.viewport : Object.freeze({ x: 0, width }) : null;
    state = Object.freeze({ ...state, model, temporal, viewport,
      cap: changed || !temporal ? null : state.cap, capWindow: changed ? viewport : state.capWindow,
      zoomRevision: referenceChanged ? 0 : state.zoomRevision });
    lazyKey = key; return changed || dropped;
  };
  return { refresh, changeViewport, installModel, getState: () => state,
    updateModel: (model: ProjectHistoryViewModel) => { state = Object.freeze({ ...state, model }); },
    setCap: (cap: Rational) => { state = Object.freeze({ ...state, cap, capWindow: state.viewport }); },
    releaseModel: () => { state = Object.freeze({ ...state, model: Object.freeze({ ...state.model, projects: Object.freeze([]) }) }); },
  };
}
