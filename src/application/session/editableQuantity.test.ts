import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  remainingWorkloadFromSerialized,
  type DomainResult,
} from "../../domain/index.js";
import {
  formatPercentageForEditing,
  formatQuantityForEditing,
  parseExactPercentageInput,
  parseExactQuantityInput,
} from "./editableQuantity.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("editable quantity presentation", () => {
  it("shows finite quantities as decimals and periodic quantities at UI precision", () => {
    assert.equal(formatQuantityForEditing(must(createCapacity("6.25"))), "6.25");
    assert.equal(
      formatQuantityForEditing(must(remainingWorkloadFromSerialized("1/3"))),
      "0.333",
    );
  });

  it("shows exact ratios as decimal percentages without fraction notation", () => {
    assert.equal(formatPercentageForEditing("1/4"), "25");
    assert.equal(formatPercentageForEditing("1/3"), "33.333");
  });

  it("parses finite decimals and rational fractions directly to canonical exact values", () => {
    assert.deepEqual(
      ["12", "12.5", "0.25", "1/3", "25/4", "100/3"].map(
        parseExactQuantityInput,
      ),
      ["12/1", "25/2", "1/4", "1/3", "25/4", "100/3"],
    );
    assert.equal(parseExactQuantityInput(" 1/3 "), "1/3");
  });

  it("rejects zero denominators and malformed exact quantity syntax", () => {
    for (const value of ["1/0", "/3", "1/", "1/2/3", "abc"]) {
      assert.equal(parseExactQuantityInput(value), undefined, value);
    }
  });

  it("interprets rational percentage input as a percentage before creating the exact ratio", () => {
    assert.equal(parseExactPercentageInput("25"), "1/4");
    assert.equal(parseExactPercentageInput("100/3"), "1/3");
    assert.equal(parseExactPercentageInput("1/3"), "1/300");
  });
});
