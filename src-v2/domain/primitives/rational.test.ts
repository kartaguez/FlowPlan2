import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRational, createRational, validateRational, addRationals, subtractRationals, multiplyRationals, divideRationals, compareRationals, equalRationals, rationalToCanonicalString, type Rational } from './rational.js';
import { createQuantity, validateQuantity, createOptionalQuantity, quantityFamilies, type Quantity } from './quantity.js';
import { failure, type DomainResult } from './result.js';
function value<T>(result: DomainResult<T>): T { assert.equal(result.ok, true); if (!result.ok) throw new Error("Expected success"); return result.value; }
function text(result: DomainResult<Rational>): string { return value(rationalToCanonicalString(value(result))); }
const r = (s: string) => value(parseRational(s));
test('Q01 exact grammar, noncanonical input and unlimited precision', () => {
  for (const [input, expected] of [['42','42/1'],['-7','-7/1'],['0.1','1/10'],['01','1/1'],['001.250','5/4'],['1/3','1/3'],['2/4','1/2'],['02/04','1/2'],['-0','0/1'],['0.00','0/1']]) assert.equal(text(parseRational(input)), expected);
  const big = '12345678901234567890123456789012345678901234567890123456789';
  assert.equal(text(parseRational(big)), `${big}/1`);
  const digits = '0'.repeat(400) + '1';
  assert.equal(text(parseRational(`0.${digits}`)), `1/${10n ** 401n}`);
  for (const input of ['', ' ', '+1', '1e3', 'NaN', 'Infinity', '.5', '1.', '1,2', '1/0', '1/00', '1/-2', '1/+2', '1//2', '1/2/3', '--1', '1 2', '1\n', '１', null, 0, 1n]) assert.equal(parseRational(input).ok, false, String(input));
});
test('Q02 canonical signs, canonical zero and forged operands', () => {
  const immutable = r('2/4');
  assert.throws(() => { (immutable as unknown as {numerator:bigint}).numerator=9n; },TypeError);
  assert.equal(text(validateRational(immutable)),'1/2');
  assert.equal(text(createRational(2n,-4n)), '-1/2'); assert.equal(text(createRational(-2n,-4n)), '1/2');
  for (const d of [-100n,1n,100n]) assert.equal(text(createRational(0n,d)), '0/1');
  assert.equal(text(validateRational(r('02/04'))), '1/2');
  for (const bad of [{numerator:2n,denominator:4n},{numerator:0n,denominator:2n},{numerator:1n,denominator:-2n},{numerator:1,denominator:2n}, {}, null]) {
    assert.equal(validateRational(bad).ok,false); assert.equal(addRationals(bad,r('1')).ok,false);
  }
  assert.equal(createRational(1n,0n).ok,false);
  assert.equal(createRational('1',1n).ok,false);
});
test('Q03 exact arithmetic, comparisons, independent conservation oracle', () => {
  assert.equal(text(addRationals(r('1/3'),r('2/3'))),'1/1');
  assert.equal(text(addRationals(r('0.1'),r('0.2'))),'3/10');
  assert.equal(text(multiplyRationals(r('123456789012345678901/17'),r('17/123456789012345678901'))),'1/1');
  assert.equal(text(divideRationals(r('-2/7'),r('4/21'))),'-3/2');
  assert.equal(value(compareRationals(r('999999999999999999999999999/3'),r('999999999999999999999999998/3'))),1);
  assert.equal(value(equalRationals(r('2/4'),r('0.5'))),true);
  for (let a = -12n; a <= 12n; a++) for (let d = 1n; d <= 12n; d++) {
    const left = value(createRational(a,d)), right = r('7/13');
    const sum = value(addRationals(left,right));
    assert.equal(sum.numerator * d * 13n, (a * 13n + 7n * d) * sum.denominator);
    assert.equal(value(equalRationals(value(subtractRationals(sum,right)),left)),true);
    assert.equal(value(equalRationals(value(divideRationals(value(multiplyRationals(left,right)),right)),left)),true);
    assert.equal(Object.isFrozen(sum),true);
  }
  const result = divideRationals(r('1'),r('0'),'calculation'); assert.equal(result.ok,false);
  if (!result.ok) assert.equal(result.errors[0]?.code,'DIVISION_BY_ZERO');
});
test('Q04 units, runtime families and absence distinct from exact zero', () => {
  for (const family of quantityFamilies) {
    const zero = value(createQuantity(family,r('0'))); assert.equal(Object.isFrozen(zero),true);
    assert.equal(createQuantity(family,r('-1')).ok,false);
    assert.equal(value(createOptionalQuantity(family,{kind:'present',value:zero})).kind,'present');
    assert.equal(value(createOptionalQuantity(family,{kind:'absent'})).kind,'absent');
    assert.equal(createOptionalQuantity(family,undefined).ok,false);
    for (const other of quantityFamilies) if (other !== family) assert.equal(validateQuantity(other,zero).ok,false);
  }
  for (const family of ['ReservationRatio','UnavailabilityRatio'] as const) {
    assert.equal(createQuantity(family,r('1')).ok,true); assert.equal(createQuantity(family,r('100000000000000000001/100000000000000000000')).ok,false);
  }
  assert.equal(createOptionalQuantity('Unknown' as 'ETC',{kind:'absent'}).ok,false);
  assert.equal(createQuantity('ETC',r('9/2')).ok,true);
  assert.equal(createQuantity('ETC',value(createQuantity('Capacity',r('1')))).ok,false);
  assert.equal(validateQuantity('ETC',{family:'ETC',unit:'work/day',value:r('0')}).ok,false);
  // @ts-expect-error Families cannot be substituted despite identical units.
  const wrong: Quantity<'ETC'> = value(createQuantity('Consumption',r('0')));
  assert.equal(wrong.family,'Consumption');
  assert.equal(Object.keys(value(createQuantity('ETC',r('0')))).includes('status'),false);
});
test('Q05 immutable diagnostics, exact paths and invalid runtime values', () => {
  const parsed = parseRational({},'input.amount'); assert.equal(parsed.ok,false);
  if (!parsed.ok) {
    assert.deepEqual(parsed.errors,[{code:'INVALID_RATIONAL_TEXT',path:'input.amount',message:'INVALID_RATIONAL_TEXT'}]);
    assert.throws(() => { (parsed.errors as unknown[]).push({}); },TypeError);
  }
  const source = {code:'TEST',path:'p',message:'cause'}; const errors = [source]; const result = failure(errors);
  source.code = 'changed'; errors.length=0;
  if (!result.ok) assert.equal(result.errors[0]?.code,'TEST');
  let invoked = false;
  const accessor = {get numerator() {invoked=true; return 1n;},denominator:1n};
  assert.equal(validateRational(accessor).ok,false); assert.equal(invoked,false);
});
