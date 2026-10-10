import { invalid, success, type DomainResult } from './result.js';
declare const civilDateBrand: unique symbol;
export type CivilDate = string & { readonly [civilDateBrand]: 'CivilDate' };
function isLeapYear(year: number): boolean { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
export function createCivilDate(input: unknown, path = 'date'): DomainResult<CivilDate> {
  if (typeof input !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input)) return invalid('INVALID_CIVIL_DATE', path);
  const year = Number(input.slice(0, 4)), month = Number(input.slice(5, 7)), day = Number(input.slice(8, 10));
  const days = month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  if (month < 1 || month > 12 || day < 1 || day > days) return invalid('INVALID_CIVIL_DATE', path);
  return success(input as CivilDate);
}
function toEpochDay(date: CivilDate): number {
  let year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra;
}

function fromEpochDay(epochDay: number): string {
  const era = Math.floor(epochDay / 146097);
  const dayOfEra = epochDay - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  let year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  year += month <= 2 ? 1 : 0;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function compareCivilDates(left: unknown, right: unknown, path = 'date'): DomainResult<-1 | 0 | 1> {
  const l = createCivilDate(left, `${path}.left`); if (!l.ok) return l;
  const r = createCivilDate(right, `${path}.right`); if (!r.ok) return r;
  return success(l.value < r.value ? -1 : l.value > r.value ? 1 : 0);
}
export function addDays(input: unknown, offset: unknown, path = 'days'): DomainResult<CivilDate> {
  const date = createCivilDate(input, `${path}.date`); if (!date.ok) return date;
  if (typeof offset !== 'number' || !Number.isSafeInteger(offset)) return invalid('INVALID_DAY_OFFSET', path);
  const day = toEpochDay(date.value) + offset;
  if (!Number.isSafeInteger(day)) return invalid('UNSAFE_DAY_CALCULATION', path);
  if (day < -60 || day > 3652364) return invalid('CIVIL_DATE_OUT_OF_RANGE', path);
  return createCivilDate(fromEpochDay(day), path);
}
export function civilDayDifference(next: unknown, previous: unknown, path = 'date'): DomainResult<number> {
  const n = createCivilDate(next, `${path}.next`); if (!n.ok) return n;
  const p = createCivilDate(previous, `${path}.previous`); if (!p.ok) return p;
  return success(toEpochDay(n.value) - toEpochDay(p.value));
}
export function isoWeekday(input: unknown, path = 'date'): DomainResult<1 | 2 | 3 | 4 | 5 | 6 | 7> {
  const date = createCivilDate(input, path); if (!date.ok) return date;
  // 0000-03-01 is Wednesday. Floor-based civil algorithms work through year zero.
  return success(((((toEpochDay(date.value) + 2) % 7) + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
}
