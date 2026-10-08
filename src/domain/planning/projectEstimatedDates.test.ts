import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectEstimatedStartDate, projectEstimatedEndDate } from "./projectEstimatedDates.js";
import { capacityFromSerialized, consumedWorkloadFromSerialized, createCivilDate, createProjectId, createTeamId, type DomainResult } from "../index.js";
function must<T>(r: DomainResult<T>): T { if (!r.ok) throw new Error("fixture"); return r.value; }
const date = (s: string) => must(createCivilDate(s));
const id = must(createProjectId("p"));
const actual = (when: string, amount: string, sourceKind: "project" | "reservation" = "project", sourceId = id, team = "t") => ({
  sourceKind, sourceId, teamId: must(createTeamId(team)), date: date(when), amount: must(consumedWorkloadFromSerialized(amount)) });
const allocation = (when: string, amount: string) => ({ date: date(when), workload: must(capacityFromSerialized(amount)) });
describe("shared Project estimated date semantics", () => {
  it("starts via Actuals outside horizon and ignores other kinds, Projects, Teams and zero amounts", () => {
    assert.equal(projectEstimatedStartDate(id, [actual("2024-01-01", "0/1"), actual("2024-01-02", "1/3", "reservation"),
      actual("2024-01-03", "1/3", "project", must(createProjectId("other"))), actual("2024-01-08", "1/3"), actual("2024-01-07", "1/3", "project", id, "t2")], []), "2024-01-07");
  });
  it("starts via first positive Forecast, ignores zero allocations", () => {
    assert.equal(projectEstimatedStartDate(id, [], [allocation("2025-01-01", "0/1"), allocation("2025-01-03", "1/3"), allocation("2025-01-02", "1/3")]), "2025-01-02");
  });
  it("takes the minimum of Actuals and Forecast in either order", () => {
    assert.equal(projectEstimatedStartDate(id, [actual("2024-01-01", "1/3")], [allocation("2025-01-01", "1/3")]), "2024-01-01");
    assert.equal(projectEstimatedStartDate(id, [actual("2025-01-01", "1/3")], [allocation("2024-01-01", "1/3")]), "2024-01-01");
  });
  it("has no activity when all sources are absent or zero", () => {
    assert.equal(projectEstimatedStartDate(id, [], []), null);
    assert.equal(projectEstimatedStartDate(id, [actual("2024-01-01", "0/1")], [allocation("2025-01-01", "0/1")]), null);
  });
  it("ends at the latest completed Team end", () => {
    assert.deepEqual(projectEstimatedEndDate(true, [{ complete: true, projectedEndDate: date("2025-01-03") }, { complete: true }, { complete: true, projectedEndDate: date("2025-01-07") }]), { date: date("2025-01-07"), reason: null, complete: true });
  });
  it("has explicit inactive, incomplete and no-allocation absences", () => {
    assert.equal(projectEstimatedEndDate(false, [{ complete: true, projectedEndDate: date("2025-01-07") }]).reason, "inactive");
    assert.deepEqual(projectEstimatedEndDate(true, [{ complete: true, projectedEndDate: date("2025-01-07") }, { complete: false }]), { date: null, reason: "incomplete-within-horizon", complete: false });
    assert.deepEqual(projectEstimatedEndDate(true, [{ complete: true }]), { date: null, reason: "no-allocation", complete: true });
    assert.equal(projectEstimatedEndDate(true, []).reason, "no-allocation");
  });
});
