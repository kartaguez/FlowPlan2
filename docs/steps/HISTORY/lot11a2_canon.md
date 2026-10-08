# Lot 11A.2 — Historical daily load profiles

Status: **IN REVIEW**. **11B = PLANNED / NOT STARTED**.

Baseline: branch `codex/lot11a-portfolio-snapshots`, initial HEAD
`a494be8f876729c3c2b72cd4c006541a46933984`, clean and synchronized with origin
(0/0 after fetch). Validated 11A `f477dd6e1a31f3be7be949dad9fea4cae9667770`
is an ancestor. The hardened [plan](./lot11a2_11b_plan.md) is the contract.

## Model and capture

Forecast is a closed discriminated union: schema 1 retains the 11A contract,
schema 2 requires `dailyProfile` on every Project, including no-activity cases.
Inputs schema 1 and the planning engine version remain unchanged.

```text
dailyProfile = {
  actualsRange: { from, through } | null,
  forecastRange: { from, through },
  days: [{ date, actualsWorkload, forecastWorkload }]
}
```

Ranges are inclusive civil dates. Actuals coverage comes from the selected V5
source or the pending V4 start through its last record, never positive days.
None/RAF-only has null coverage; covered zero retains its full range. Forecast
range is the snapshot's complete planning horizon. Actuals outside that horizon
remain captured. No viewport boundary exists here.

`captureDailyProfiles` indexes published Project contributions and Project
allocations once, summing all Teams by Project/date with existing Rational and
scalar helpers. Quantities are canonical exact strings; no business quantity
uses Number. Days are strictly sorted/unique; double-zero days are omitted;
one-zero/one-positive days remain. Schema 1 absence never becomes schema 2 empty.
No full engine output, capacities, Team plans or diagnostics are persisted.

The capture uses the shared start/end rules unchanged. Validation checks closed
schemas/fields, dates/ranges, canonical nonnegative quantities, coverage/horizon,
inactive Forecast, Actuals sum, Forecast ≤ RAF, EAC = Actuals + RAF and first
positive activity/last positive Forecast when an end is defined. Save additionally
requires Forecast = RAF when the active Project's Team plans are all complete.
Inactive, partial and unallocated RAF is never manufactured into daily load.
Import validates structure and historical references, never reruns a historical
engine or redistributes Actuals to authenticate daily shapes. Errors identify
capture/Project/day and reject the entire document.

The existing immutable JSON copy/freeze owns every profile member. Neither
engine allocations nor Actuals reconstruction arrays are retained. Save still
checks global dirty and state/run identity, persists before publication and
reuses the published projection; Delete and ordinary commands preserve their
existing behavior. No V5 source creation or V4 reconciliation is added.

## Persistence and regressions

V7 is a distinct compact JSON envelope with the same data boundary and storage
key `flowplan.backup.v1`. It accepts schema 1 and schema 2 together. V6 remains
strictly schema 1; its reader now explicitly enforces this existing constraint
before the shared Domain validator. Its encoder rejects schema 2. V1–V5 rules
are unchanged, including the V5 technical knowledge-date rule and their
history-bearing downgrade guards.

V1–V5 import invents no Portfolio Snapshot. V6 captures retain every field,
metric, date, ID and source unchanged in V7, with profiles explicitly absent.
Startup never rewrites a valid older document. The next accepted command/import
or explicit Save/Delete writes complete V7 before publication. Invalid input,
codec errors and quota failures preserve prior state/document and publish no
successful capture. No automatic deletion, compression or new storage backend.

Original 11A/V6 capture regression fixtures explicitly discard schema 2 fields
and validate schema 1 before exercising the unchanged V6 expectations. Live
persistence version assertions move from 6 to the required 7; no business
expectation is weakened. New tests independently exercise schema 2, source/run
equality, exact fractions, multi-Team/multiple same-date entries, holes, out-of-
horizon Actuals, exclusive V5 versions and pending V4, inactive/RAF-zero/partial/
complete/no-allocation cases, empty profiles, overlap, zero omission,
conservation, aliasing and mutation, mixed-schema round trips, malformed middle
capture rejection and codec failure atomicity. Existing tests retain dirty,
quota/write failure, zero recompute, Delete and historical ID protection checks.

## Verification and storage measurement

2026-10-08: `npm run typecheck`, `npm test` (**746/746 tests, 89 suites**),
`npm run build` and `git diff --check` pass. No skipped/cancelled/todo tests.
No Planning engine, reconstruction, Timeline or History UI code was changed.

Disposable Node benchmark (no permanent tooling): synthetic coherent published
Forecast, 24 captures × 100 Projects × 730 civil days, positive every fifth day
(146 per Project, 350,400 stored rows), two Teams with exact thirds.

| Measurement | Result |
| --- | ---: |
| Compact V7 UTF-8 export | 26,631,198 bytes |
| Approximate UTF-16 string payload | 53,262,396 bytes |
| Capture 24 artifacts | 728 ms |
| Encode including validation | 472 ms |
| Decode including validation/freeze | 454 ms |
| Atomic Save of 25th capture | 615 ms |
| In-memory store assignment | 0.002 ms |
| Save with injected QuotaExceededError | 644 ms, explicit failure |
| Heap used / RSS at end | 566.8 MB / 798.6 MB |

Single local run; memory includes simultaneous source, artifacts, serialized
text and decoded state, not an isolated per-profile footprint. Store write is
an in-memory test double, not measured browser localStorage latency/quota.
Injected quota failure preserved both state identity and prior document.
These volumes must not be assumed to fit browser quota. The product retains
explicit failure and complete export, without purge or hidden snapshot limits.

## Remaining gate

Implementation → tests/build → ChatGPT audit → corrections/revalidation →
human validation → **DONE** → only then 11B. This implementation is **IN REVIEW**,
not DONE. No History mode/view/renderer/tooltip/geometry/toggle or Timeline
refactoring has begun. 11A.1 merge/archive work remains deferred.
