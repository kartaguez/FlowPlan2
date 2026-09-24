import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationEditViewModel } from "../../application/index.js";
import { createReservationId, createTeamId, type DomainResult } from "../../domain/index.js";
import { createReservationDraftStore } from "./reservationDraftStore.js";
function must<T>(result: DomainResult<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const a = must(createReservationId("a"));
const b = must(createReservationId("b"));
const teamId = must(createTeamId("alpha"));
const model = (reservationId: typeof a, name = "A", value = "20", exact = "1/5"): ReservationEditViewModel => ({
  reservationId, name, startDate: "2025-01-01" as never, endDate: "2025-02-01" as never,
  teamAllocations: [{ teamId, teamLabel: "Alpha", enabled: true, kind: "ratio", value, exact }],
});

describe("ReservationDraftStore", () => {
  it("tracks reversible dirty and isolates Cancel", () => {
    const store = createReservationDraftStore();
    const first = store.initialize(a, model(a));
    store.initialize(b, model(b, "B"));
    store.update(a, { ...first.values, teams: [{ ...first.values.teams[0]!, enabled: false }] });
    assert.equal(store.isDirty(a), true);
    assert.equal(store.isTeamDirty(a, teamId), true);
    store.update(a, first.values);
    assert.equal(store.isDirty(a), false);
    store.cancel(a);
    assert.equal(store.get(a), undefined);
    assert.equal(store.get(b)?.values.name, "B");
  });
  it("rebases mode/value as a pair and adopts untouched global fields", () => {
    const store = createReservationDraftStore();
    const first = store.initialize(a, model(a));
    store.update(a, { ...first.values, teams: [{ ...first.values.teams[0]!, kind: "fixed-daily", value: "3", expanded: true }] });
    store.setExpanded(a, true);
    store.setErrors(a, ["Keep error"]);
    store.rebase(a, { ...model(a, "Session", "25", "1/4"), startDate: "2025-01-02" as never });
    const after = store.get(a)!;
    assert.equal(after.values.name, "Session");
    assert.equal(after.values.startDate, "2025-01-02");
    assert.equal(after.values.teams[0]!.kind, "fixed-daily");
    assert.equal(after.values.teams[0]!.value, "3");
    assert.equal(after.values.teams[0]!.expanded, true);
    assert.equal(after.expanded, true);
    assert.deepEqual(after.errors, ["Keep error"]);
    assert.equal(store.isTeamDirty(a, teamId), true);
  });
  it("adopts a new exact value when the local pair was unchanged", () => {
    const store = createReservationDraftStore();
    store.initialize(a, model(a));
    store.rebase(a, model(a, "A", "33.333", "1/3"));
    assert.equal(store.get(a)?.values.teams[0]?.exact, "1/3");
    assert.equal(store.isDirty(a), false);
  });
});
