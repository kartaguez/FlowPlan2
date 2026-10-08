import { historyDayIndex, type HistoryPresentRow, type HistoricalAssociation } from "../../application/history/buildProjectHistoryViewModel.js";
import { rationalFromInteger, rationalToCanonicalString, compareRationals, type Rational } from "../../domain/model/rational.js";
import type { CivilDate } from "../../domain/model/date.js";
import { formatCursorMd } from "../timeline/formatCursorMetrics.js";

export function historySnapshotTimestamp(createdAt: string): string {
  return `${new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3, timeZoneName: "longOffset" }).format(new Date(createdAt))} · ${createdAt}`;
}
const quantity = (value: Rational) => `${formatCursorMd(value)} (exact ${rationalToCanonicalString(value)})`;
const association = (value: HistoricalAssociation | null) => value ? `${value.name} [${value.id}]` : "None";
const dateValue = (date: CivilDate | null, reason: string | null) => date ?? `unavailable (${reason})`;
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
export function projectHistoryTooltipLines(row: HistoryPresentRow, date: CivilDate | undefined, cap: Rational): readonly string[] {
  const m = row.metrics;
  const lines = [row.metadata.name, `Snapshot ${historySnapshotTimestamp(row.createdAt)} · ID ${row.snapshotId}`,
    `Project ID ${row.metadata.id} · ${row.metadata.isActive ? "Active" : "Inactive"}`,
    `Programme: ${association(row.metadata.program)} · Pas: ${association(row.metadata.pas)}`,
    `Priority #${m.priorityPosition}`, `Actuals ${quantity(row.actuals)} · RAF ${quantity(row.raf)} · EAC ${quantity(row.eac)}`,
    `Actuals knowledge: ${m.actualsKnowledge}`,
    `Estimated start: ${dateValue(m.estimatedStartDate, m.startAbsenceReason)}`,
    `Estimated end: ${dateValue(m.estimatedEndDate, m.endAbsenceReason)}`,
    `Forecast: ${row.forecastStatus}`,
    row.profile === "available" ? `Actuals coverage: ${row.actualsRange ? `${row.actualsRange.from} through ${row.actualsRange.through} inclusive` : "no coverage"}. Forecast horizon: ${row.forecastRange!.from} through ${row.forecastRange!.through}.`
      : "Daily profile unavailable (historical forecast schema 1). Daily allocations unavailable.",
  ];
  if (row.profile === "available") {
    lines.push(`Actuals knowledge through: ${row.actualsRange?.through ?? "unavailable"} · First positive Forecast: ${row.firstForecastPositiveDate ?? "none"}`);
    if (!row.days.length) lines.push("Present in this snapshot, no activity.");
    if (row.days.some((day) => day.actuals.numerator > 0n && day.forecast.numerator > 0n)) lines.push("Actuals and Forecast overlap; components are stacked on their captured dates.");
  }
  if (row.comparison) {
    const c = row.comparison;
    lines.push(`Compared with previous presence ${c.previousSnapshotId}`,
      `Priority #${c.priority.previous} → #${c.priority.next} (${signed(c.priority.delta)})`,
      `EAC ${quantity(c.eac.previous)} → ${quantity(c.eac.next)} (delta ${c.eac.delta.numerator >= 0n ? "+" : ""}${quantity(c.eac.delta)})`);
    for (const [name, value] of [["Start", c.start], ["End", c.end]] as const) lines.push(`${name} ${dateValue(value.previous, value.previousReason)} → ${dateValue(value.next, value.nextReason)} (${value.delta === null ? "not comparable" : `${signed(value.delta)} calendar days`})`);
    if (c.programChanged) lines.push(`Programme ${association(c.previousMetadata.program)} → ${association(row.metadata.program)}`);
    if (c.pasChanged) lines.push(`Pas ${association(c.previousMetadata.pas)} → ${association(row.metadata.pas)}`);
    if (c.activationChanged) lines.push(`${c.previousMetadata.isActive ? "Active" : "Inactive"} → ${row.metadata.isActive ? "Active" : "Inactive"}`);
  } else lines.push("First presence; no previous comparison.");
  if (date) {
    lines.push(`Day ${date}`);
    if (row.profile === "available") {
      const found = row.days[historyDayIndex(row.days, date)];
      const day = found?.date === date ? found : undefined;
      const actuals = day?.actuals ?? rationalFromInteger(0n), forecast = day?.forecast ?? rationalFromInteger(0n), total = day?.total ?? rationalFromInteger(0n);
      lines.push(`Simulated daily Actuals ${quantity(actuals)} · Forecast ${quantity(forecast)} · Total ${quantity(total)}`,
        row.actualsRange && date >= row.actualsRange.from && date <= row.actualsRange.through ? "Within captured Actuals coverage (calculated daily distribution)." : "No Actuals coverage for this day; zero is not a known observation.",
        `Visual cap ${quantity(cap)}${compareRationals(total, cap) > 0 ? " — exceeds cap; heights reduced proportionally." : ""}`);
    } else lines.push("Daily amounts unavailable.");
  }
  return Object.freeze(lines);
}
export function renderProjectHistoryTooltip(container: HTMLElement, row: HistoryPresentRow, date: CivilDate | undefined, cap: Rational): void {
  const lines = projectHistoryTooltipLines(row, date, cap);
  const document = container.ownerDocument;
  container.replaceChildren(...lines.map((line, index) => {
    const node = document.createElement(index === 0 ? "h3" : "p"); node.textContent = line; return node;
  }));
  container.hidden = false;
}
