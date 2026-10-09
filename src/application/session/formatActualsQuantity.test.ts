import assert from "node:assert/strict";
import test from "node:test";
import { formatActualsQuantity, formatActualsRational } from "./formatActualsQuantity.js";
import { parseExactQuantityInput, parseExactPercentageInput } from "./editableQuantity.js";
import { parseSerializedRational, remainingWorkloadFromSerialized, quantityToDecimalString,
  rationalToCanonicalString, addRationals, type DomainResult } from "../../domain/index.js";
const createRational = (numerator: bigint, denominator: bigint) => parseSerializedRational(`${numerator}/${denominator}`);
const valid = <T>(result: DomainResult<T>): T => { assert.equal(result.ok, true); if (!result.ok) throw Error("fixture"); return result.value; };
for (const [text, exact, display] of [
  ["0", "0/1", "0"], ["-0", "0/1", "0"], ["1,25", "5/4", "1,25"],
  ["1.2500", "5/4", "1,25"], ["5/4", "5/4", "1,25"], ["2/6", "1/3", "1/3"],
  ["1/10000", "1/10000", "0,0001"], ["1,234", "617/500", "1,234"],
  [" 12,5 ", "25/2", "12,5"],
] as const) test(`11D.1 exact input/display round-trip ${text}`, () => {
  assert.equal(parseExactQuantityInput(text), exact);
  assert.equal(formatActualsQuantity(valid(remainingWorkloadFromSerialized(exact))), display);
  assert.equal(parseExactQuantityInput(display), exact);
});
for (const text of ["", "1,", "1.", "1/", "-", "1,234.5", "1.234,5", "1 234", "1\u00a0234", "1'234", "1,,2", "1..2", "1e3", "+1", "1/0", "1/2,5", "01", ".5", ",5"])
  test(`11D.1 incomplete/malformed preserved but non-applicable ${JSON.stringify(text)}`, () => assert.equal(parseExactQuantityInput(text), undefined));
test("11D.1 exact formatter agrees with unbounded Domain oracle across prime powers and non-finite fractions", () => {
  for (const numerator of [-37n, 0n, 1n, 15n, 1234567890123456789n]) for (let twos = 0; twos < 32; twos += 3) for (let fives = 0; fives < 28; fives += 3) for (const other of [1n, 3n, 7n]) {
    const rational = valid(createRational(numerator, 2n ** BigInt(twos) * 5n ** BigInt(fives) * other));
    const rendered = formatActualsRational(rational);
    const quantity = remainingWorkloadFromSerialized(rationalToCanonicalString(rational));
    if (quantity.ok) {
      const oracle = quantityToDecimalString(quantity.value);
      assert.equal(rendered, oracle.ok ? oracle.value.replace(".", ",") : rationalToCanonicalString(rational));
    }
    assert.equal(parseExactQuantityInput(rendered), rationalToCanonicalString(rational));
  }
});
for (const n of [16, 100, 1000, 10000]) test(`11D.1 complete ${n}-digit decimal and compact finite fraction`, () => {
  const text = "0," + "1".repeat(n);
  assert.equal(formatActualsQuantity(valid(remainingWorkloadFromSerialized(parseExactQuantityInput(text)!))), text);
  const fraction = valid(createRational(1n, 2n ** BigInt(n)));
  const display = formatActualsRational(fraction);
  assert.equal(display.length, n + 2);
  assert.equal(parseExactQuantityInput(display), rationalToCanonicalString(fraction));
});
test("11D.1 multi-Team sums retain all exact denominator factors", () => {
  let sum = valid(createRational(0n, 1n));
  for (const denominator of [3n, 7n, 11n, 13n, 17n, 19n]) sum = addRationals(sum, valid(createRational(1n, denominator)));
  assert.equal(parseExactQuantityInput(formatActualsRational(sum)), rationalToCanonicalString(sum));
  assert.equal(parseExactPercentageInput("12,5"), "1/8");
});
