// Laboratory resource characterization, not a production admission policy.
import { rich } from "./inputs.fixture.js";
import { buildPlanningSessionProjection } from "../../main/planning/buildPlanningSessionProjection.js";
import { captureLegacyInputs } from "../../application/portfolioSnapshots/legacyCapture.fixture.js";
import { validateHistoricalSnapshot } from "../../application/portfolioSnapshots/capturePortfolioSnapshot.js";
import { resolve } from "./replay.fixture.js";
import { civilDayDifference } from "../../domain/model/date.js";

/** Valid legacy artifact with an extreme future-through range; never reconstruct it here. */
export function resourceRisk() {
  const current=rich("legacy"),reference=buildPlanningSessionProjection({state:current,geometryViewport:{width:1000,teamLaneHeight:100,timeAxisHeight:76}});
  const snapshot:any=structuredClone(captureLegacyInputs(current,reference.planningResult,reference.actualsReconstruction,"resource-risk","2026-10-09T10:00:00.000Z"));
  snapshot.forecast.forecastSchemaVersion=1;
  for(const row of snapshot.forecast.projects)delete row.dailyProfile;
  snapshot.inputs.portfolio.projects[0].legacyV4Actuals.records.at(-1).actualsThroughDate="9999-12-31";
  const valid=validateHistoricalSnapshot(snapshot,current),historical=resolve(valid,current);
  let contributionRows=0,maxPeriodDays=0;
  for(const owner of [...historical.portfolio.projects,...historical.portfolio.reservations]) {
    const legacy=owner.legacyV4Actuals??owner.actuals;if(!legacy)continue;
    let previous=legacy.actualsFromDate;
    for(let i=0;i<legacy.records.length;i++) {
      const row=legacy.records[i]!;
      const days=civilDayDifference(row.actualsThroughDate,previous)+(i===0?1:0);
      contributionRows+=days*row.teams.length;maxPeriodDays=Math.max(maxPeriodDays,days);previous=row.actualsThroughDate;
    }
  }
  return {valid,historical,diagnostic:{kind:"RESOURCE_RISK_NOT_EXECUTED",scope:"laboratory",contributionRows,maxPeriodDays,
    reason:"Millions of date/weight/quantity objects would coexist; outside the measured envelope. No engine incompatibility is asserted."}};
}
