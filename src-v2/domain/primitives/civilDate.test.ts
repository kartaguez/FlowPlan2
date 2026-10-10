import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCivilDate, addDays, compareCivilDates, civilDayDifference, isoWeekday } from './civilDate.js';
import { createCivilInterval, intervalDayCount, intervalContains } from './civilInterval.js';
import type { DomainResult } from './result.js';
function value<T>(r: DomainResult<T>): T { assert.equal(r.ok,true); if (!r.ok) throw new Error("Expected success"); return r.value; }
test('D01 strict Gregorian calendar, year zero and both inclusive bounds', () => {
  for (const d of ['2000-02-29','2024-02-29','0000-02-29','0000-01-01','9999-12-31']) assert.equal(value(createCivilDate(d)),d);
  for (const d of ['1900-02-29','2100-02-29','2023-02-29','2024-00-10','2024-13-10','2024-04-31','2024-01-00','2024-1-01','2024-01-1','2024-01-01T00:00:00Z','2024-01-01+02:00','-0001-12-31','10000-01-01','2024-01-01\n',null,20240101]) assert.equal(createCivilDate(d).ok,false,String(d));
});
test('D02 inclusive intervals, adjacency, year/month crossings and inverted refusal', () => {
  const single = value(createCivilInterval({start:'2024-02-29',end:'2024-02-29'})); assert.equal(value(intervalDayCount(single)),1);
  const interval = value(createCivilInterval({start:'2023-12-31',end:'2024-03-01'})); assert.equal(value(intervalDayCount(interval)),62);
  assert.equal(value(intervalContains(interval,interval.start)),true); assert.equal(value(intervalContains(interval,interval.end)),true);
  assert.equal(value(intervalContains(interval,'2023-12-30')),false); assert.equal(value(intervalContains(interval,'2024-03-02')),false);
  assert.equal(value(addDays(single.end,1)),'2024-03-01');
  assert.equal(createCivilInterval({start:'2024-03-01',end:'2024-02-29'}).ok,false);
  assert.equal(createCivilInterval({start:null,end:null}).ok,false);
  assert.equal(intervalDayCount({start:'bogus',end:'2024-01-01'}).ok,false);
});
test('D03 exact daily arithmetic, safe intermediates and independent 400-year oracle', () => {
  assert.equal(value(addDays('0000-02-28',1)),'0000-02-29'); assert.equal(value(addDays('0000-02-29',1)),'0000-03-01');
  assert.equal(value(addDays('2000-03-01',-1)),'2000-02-29'); assert.equal(value(addDays('1900-02-28',1)),'1900-03-01');
  assert.equal(value(civilDayDifference('9999-12-31','0000-01-01')),3652424);
  assert.equal(value(addDays('0000-01-01',3652424)),'9999-12-31'); assert.equal(value(addDays('9999-12-31',-3652424)),'0000-01-01');
  assert.equal(value(compareCivilDates('0000-01-01','9999-12-31')),-1);
  assert.equal(value(civilDayDifference('2024-02-28','2024-03-01')),-2);
  for (const offset of [1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'1']) assert.equal(addDays('2024-01-01',offset).ok,false);
  for (const [d,n] of [['0000-01-01',-1],['9999-12-31',1],['9999-12-31',Number.MAX_SAFE_INTEGER],['0000-01-01',-Number.MAX_SAFE_INTEGER]] as const) assert.equal(addDays(d,n).ok,false);
  assert.equal(value(isoWeekday('0000-01-01')),6); assert.equal(value(isoWeekday('0000-03-01')),3); assert.equal(value(isoWeekday('1970-01-01')),4); assert.equal(value(isoWeekday('2000-01-01')),6);
  // Independent month-length enumeration rather than a second copy of the epoch algorithm.
  let previous = '1999-12-31', count = 0;
  for (let year=2000; year<2400; year++) for (let month=1; month<=12; month++) {
    const leap = year%4===0 && (year%100!==0 || year%400===0);
    const days = month===2 ? (leap?29:28) : [4,6,9,11].includes(month)?30:31;
    for (let day=1; day<=days; day++) {
      const expected = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      assert.equal(value(addDays(previous,1)),expected); assert.equal(value(addDays(expected,-1)),previous);
      previous=expected; count++;
    }
  }
  assert.equal(count,146097); assert.equal(value(civilDayDifference(previous,'1999-12-31')),count);
});
test('D04 identical DST vectors (suite executed in separate real TZ processes)', () => {
  for (const [start,end] of [['2024-03-30','2024-04-01'],['2024-10-26','2024-10-28'],['2024-03-09','2024-03-11'],['2024-11-02','2024-11-04']]) {
    assert.equal(value(addDays(start,2)),end); assert.equal(value(civilDayDifference(end,start)),2);
    assert.equal(value(isoWeekday(start)),6); assert.equal(value(isoWeekday(end)),1);
  }
});
