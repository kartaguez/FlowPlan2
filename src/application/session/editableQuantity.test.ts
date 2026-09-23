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
});
