import type { PlanningSessionState } from "../session/planningSession.js";
import type { PortfolioSnapshot } from "../../domain/portfolioSnapshots/portfolioSnapshot.js";

/** Portable artifact boundary; never the live editable session. */
export interface PlanningBackupDataset extends PlanningSessionState {
  readonly portfolioSnapshots?: readonly PortfolioSnapshot[];
}
