// Run after npm run build: node --expose-gc scripts/benchmark-history.mjs [S P D].
// Synthetic validated captures measure presentation, not a historical engine replay.
import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
const root = new URL("../dist/js/", import.meta.url);
const { createDemoPlanningScenario } = await import(new URL("main/demo/createDemoPlanningScenario.js", root));
const { encodePlanningInputs, decodePlanningInputs } = await import(new URL("application/backup/planningInputCodec.js", root));
const { capturePortfolioSnapshot } = await import(new URL("application/portfolioSnapshots/capturePortfolioSnapshot.js", root));
const { encodeFlowplanBackupV7, decodeFlowplanBackup } = await import(new URL("application/backup/flowplanBackupV7.js", root));
const { createCivilDate, civilDatesInclusive, addDays } = await import(new URL("domain/model/date.js", root));
const { capacityFromSerialized } = await import(new URL("domain/model/scalars.js", root));
const { buildProjectHistoryViewModel } = await import(new URL("application/history/buildProjectHistoryViewModel.js", root));
const { createProjectHistoryCache } = await import(new URL("ui/history/createProjectHistoryCache.js", root));
const { buildProjectHistoryGeometry } = await import(new URL("adapters/history/geometry/buildProjectHistoryGeometry.js", root));
const [S, P, D] = process.argv.slice(2).map(Number);
const counts = { snapshots: S || 24, projects: P || 100, days: D || 730 };
const dto = encodePlanningInputs(createDemoPlanningScenario());
dto.planning.startDate = createCivilDate("2025-01-01").value;
dto.planning.endDate = addDays(dto.planning.startDate, counts.days - 1).value;
const allDates = civilDatesInclusive(dto.planning.startDate, dto.planning.endDate), dates = allDates.filter((_, i) => i % 5 === 0);
const { addRationals, rationalFromInteger, rationalToCanonicalString } = await import(new URL("domain/model/rational.js", root));
const { rationalOf } = await import(new URL("domain/model/scalars.js", root));
const complex = process.env.HISTORY_BENCHMARK_COMPLEX === "1";
const allocations = dates.map((date, index) => ({ date, workload: capacityFromSerialized(
  complex && index % 97 === 0 ? "100/3" : complex && index % 73 === 0 ? `1/${10n ** 40n + 7n}` : "1/3").value }));
const workload = rationalToCanonicalString(allocations.reduce((sum, day) => addRationals(sum, rationalOf(day.workload)), rationalFromInteger(0n)));
const prototype = dto.portfolio.projects[0];
dto.portfolio.projects = Array.from({ length: counts.projects }, (_, i) => ({ ...prototype, id: `volume-${i}`, name: `Volume ${i}`, requirements: dto.portfolio.teams.slice(0, 2).map(t => ({ teamId: t.id, remainingWorkload: workload })) }));
dto.portfolio.priorityOrder = dto.portfolio.projects.map(p => p.id);
dto.portfolio.reservations = [];
dto.portfolio.programs = dto.portfolio.programs.filter(p => p.id === prototype.programId);
dto.portfolio.priorityFamilies = dto.portfolio.priorityFamilies.filter(p => p.id === prototype.priorityFamilyId);
const state = decodePlanningInputs(dto, 5, undefined, true);
const result = { diagnostics: [], teamPlans: state.portfolio.teams.slice(0, 2).map(t => ({ teamId: t.id, dayCapacities: [], dayAdmissions: [], projectPlans: state.portfolio.projects.map(p => ({ projectId: p.id, teamId: t.id, allocations, complete: true, projectedEndDate: dates.at(-1) })) })) };
let start = performance.now();
const snapshots = Array.from({ length: counts.snapshots }, (_, i) => capturePortfolioSnapshot(state, result, { contributions: [], teamDayTotals: [] }, `volume-${i}`, "2026-10-08T10:00:00.000Z"));
const captureMs = performance.now() - start;
start = performance.now(); const text = encodeFlowplanBackupV7({ ...state, portfolioSnapshots: snapshots }); const encodeMs = performance.now() - start;
start = performance.now(); const decoded = decodeFlowplanBackup(text); const decodeMs = performance.now() - start;
start = performance.now(); const model = buildProjectHistoryViewModel(decoded.portfolioSnapshots); const vmMs = performance.now() - start;
const cache = createProjectHistoryCache(); cache.refresh(decoded.portfolioSnapshots);
let current = cache.getState();
start = performance.now(); cache.changeViewport({ cause: "zoom-button", previous: current.viewport, next: { x: 0, width: 2160 / 10 } }); const zoomCapMs = performance.now() - start;
const panTimes = [], geometryTimes = [];
for (let i = 0; i < 100; i++) {
  current = cache.getState(); start = performance.now();
  cache.changeViewport({ cause: "pan", previous: current.viewport, next: { x: i / 100 * (2160 - current.viewport.width), width: current.viewport.width } });
  panTimes.push(performance.now() - start); current = cache.getState(); start = performance.now();
  buildProjectHistoryGeometry({ model: current.model, temporal: current.temporal, viewport: current.viewport, cap: current.cap, firstProject: 0, throughProject: 3 });
  geometryTimes.push(performance.now() - start);
}
const stats = values => { const sorted = [...values].sort((a,b) => a-b); return { median: sorted[Math.floor(sorted.length/2)], p95: sorted[Math.floor(sorted.length*.95)], max: sorted.at(-1) }; };
const report = { ...counts, complexSpikesAndLongFractions: complex, positiveDays: dates.length, storedDailyRows: counts.snapshots * counts.projects * dates.length, logicalRows: model.projects.length * model.snapshots.length,
  utf8Bytes: Buffer.byteLength(text), captureMs, encodeMs, decodeMs, vmMs, zoomCapMs, panCacheMs: stats(panTimes), windowedGeometryMs: stats(geometryTimes), heapUsedMB: process.memoryUsage().heapUsed / 1048576, rssMB: process.memoryUsage().rss / 1048576 };
if (process.env.HISTORY_BENCHMARK_EXPORT) await writeFile(process.env.HISTORY_BENCHMARK_EXPORT, text);
console.log(JSON.stringify(report, null, 2));
