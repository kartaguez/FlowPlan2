import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCapacity,
  createCivilDate,
  type DomainResult,
} from "../../../domain/index.js";
import {
  buildTimelineCursorGeometry,
  dateAtTimelineX,
  type TimelineGeometry,
} from "../../index.js";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const date = (value: string) => must(createCivilDate(value));

function geometry(): TimelineGeometry {
  return {
    width: 300,
    height: 256,
    dayWidth: 100,
    teamHeaderHeight: 0,
    dates: [
      { date: date("2025-01-01"), x: 0, width: 100 },
      { date: date("2025-01-02"), x: 100, width: 100 },
      { date: date("2025-01-03"), x: 200, width: 100 },
    ],
    timeAxis: {
      x: 0,
      y: 0,
      width: 300,
      height: 56,
      years: [],
      months: [],
    },
    maxEffectiveCapacity: must(createCapacity("0")),
    pixelsPerCapacityUnit: 0,
    teams: [],
  };
}

describe("TimelineCursorGeometry", () => {
  it("centers the cursor on the first, middle, and last daily columns", () => {
    const timeline = geometry();

    assert.equal(
      buildTimelineCursorGeometry({
        geometry: timeline,
        selectedDate: date("2025-01-01"),
      }).x,
      50,
    );
    assert.equal(
      buildTimelineCursorGeometry({
        geometry: timeline,
        selectedDate: date("2025-01-02"),
      }).x,
      150,
    );
    assert.equal(
      buildTimelineCursorGeometry({
        geometry: timeline,
        selectedDate: date("2025-01-03"),
      }).x,
      250,
    );
  });

  it("starts below the time axis and ends at geometry height", () => {
    const cursor = buildTimelineCursorGeometry({
      geometry: geometry(),
      selectedDate: date("2025-01-02"),
    });

    assert.equal(cursor.y1, 56);
    assert.equal(cursor.y2, 256);
    assert.equal(Object.isFrozen(cursor), true);
  });

  it("rejects a selected date outside the geometry", () => {
    assert.throws(
      () =>
        buildTimelineCursorGeometry({
          geometry: geometry(),
          selectedDate: date("2025-01-04"),
        }),
      TypeError,
    );
  });

  it("maps timeline x using half-open day ranges", () => {
    const timeline = geometry();

    assert.equal(dateAtTimelineX({ geometry: timeline, x: 0 }), "2025-01-01");
    assert.equal(
      dateAtTimelineX({ geometry: timeline, x: 150 }),
      "2025-01-02",
    );
    assert.equal(
      dateAtTimelineX({ geometry: timeline, x: 100 }),
      "2025-01-02",
    );
  });

  it("clamps pointer positions outside the visible timeline", () => {
    const timeline = geometry();

    assert.equal(
      dateAtTimelineX({ geometry: timeline, x: -0.1 }),
      "2025-01-01",
    );
    assert.equal(
      dateAtTimelineX({ geometry: timeline, x: 400 }),
      "2025-01-03",
    );
    assert.equal(
      dateAtTimelineX({ geometry: timeline, x: 300 }),
      "2025-01-03",
    );
  });
});
