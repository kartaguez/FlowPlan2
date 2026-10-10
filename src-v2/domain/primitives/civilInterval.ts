import { invalid, success, type DomainResult } from './result.js';
import { createCivilDate, civilDayDifference, type CivilDate } from './civilDate.js';
import { dataRecord, field, hasKeys } from './data.js';
declare const intervalBrand: unique symbol;
export interface CivilInterval { readonly start: CivilDate; readonly end: CivilDate; readonly [intervalBrand]: true }
export function createCivilInterval(input: unknown, path = 'interval'): DomainResult<CivilInterval> {
  const record = dataRecord(input, path); if (!record.ok) return record;
  if (!hasKeys(record.value, ['start', 'end'])) return invalid('INVALID_CIVIL_INTERVAL', path);
  const start = createCivilDate(field(record.value, 'start'), `${path}.start`); if (!start.ok) return start;
  const end = createCivilDate(field(record.value, 'end'), `${path}.end`); if (!end.ok) return end;
  if (start.value > end.value) return invalid('INVERTED_CIVIL_INTERVAL', path);
  return success(Object.freeze({ start: start.value, end: end.value }) as CivilInterval);
}
export function intervalDayCount(input: unknown, path = 'interval'): DomainResult<number> {
  const interval = createCivilInterval(input, path); if (!interval.ok) return interval;
  const days = civilDayDifference(interval.value.end, interval.value.start, path);
  return days.ok ? success(days.value + 1) : days;
}
export function intervalContains(input: unknown, day: unknown, path = 'interval'): DomainResult<boolean> {
  const interval = createCivilInterval(input, path); if (!interval.ok) return interval;
  const date = createCivilDate(day, `${path}.date`); if (!date.ok) return date;
  return success(interval.value.start <= date.value && date.value <= interval.value.end);
}
