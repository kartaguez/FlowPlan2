import { error, failure, success, type DomainResult } from "./result";

declare const civilDateBrand: unique symbol;
export type CivilDate = string & { readonly [civilDateBrand]: "CivilDate" };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const INVALID_DATE_MESSAGE =
  "Date must be a valid ISO civil date (YYYY-MM-DD).";

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function createCivilDate(
  value: string,
  path = "date",
): DomainResult<CivilDate> {
  const match = DATE_PATTERN.exec(value);
  if (!match)
    return failure([error("INVALID_CIVIL_DATE", path, INVALID_DATE_MESSAGE)]);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return failure([error("INVALID_CIVIL_DATE", path, INVALID_DATE_MESSAGE)]);
  }
  return success(value as CivilDate);
}

export function compareCivilDates(
  left: CivilDate,
  right: CivilDate,
): -1 | 0 | 1 {
  return left < right ? -1 : left > right ? 1 : 0;
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

export function addDays(
  date: CivilDate,
  days: number,
  path = "days",
): DomainResult<CivilDate> {
  if (!Number.isSafeInteger(days)) {
    return failure([
      error("INVALID_DAY_OFFSET", path, "Day offset must be a safe integer."),
    ]);
  }
  const result = fromEpochDay(toEpochDay(date) + days);
  if (!DATE_PATTERN.test(result)) {
    return failure([
      error(
        "CIVIL_DATE_OUT_OF_RANGE",
        path,
        "Resulting date must remain between years 0000 and 9999.",
      ),
    ]);
  }
  return success(result as CivilDate);
}

export function civilDatesInclusive(
  start: CivilDate,
  end: CivilDate,
): readonly CivilDate[] {
  if (compareCivilDates(start, end) > 0) return Object.freeze([]);
  const values: CivilDate[] = [];
  const endDay = toEpochDay(end);
  for (let current = toEpochDay(start); current <= endDay; current += 1) {
    values.push(fromEpochDay(current) as CivilDate);
  }
  return Object.freeze(values);
}

export function isoWeekday(date: CivilDate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  // 0000-03-01 was a Wednesday in the proleptic Gregorian calendar.
  const weekday = (((toEpochDay(date) + 2) % 7) + 7) % 7;
  return (weekday + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
