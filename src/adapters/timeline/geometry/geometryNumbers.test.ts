import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GEOMETRY_EPSILON,
  snapToGeometryBoundary,
} from "./geometryNumbers.js";

describe("geometry numerical policy", () => {
  it("uses one fixed epsilon only for ulp-scale boundary comparisons", () => {
    assert.equal(GEOMETRY_EPSILON, 1e-9);
    assert.equal(snapToGeometryBoundary(299.99999999999994, 300), 300);
    assert.equal(snapToGeometryBoundary(299.99, 300), 299.99);
  });
});
