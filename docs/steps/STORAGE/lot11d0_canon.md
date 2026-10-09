# Lot 11D.0 — Storage architecture delivery

**Status: IMPLEMENTED — IN REVIEW**, 2026-10-09. Independent storage audit and
human closure remain required. **11B DONE; 11C DONE** by explicit user instruction
on 2026-10-08. Implementation baseline/initial SHA:
`eb38a3df8fceab30d82253cac6bc5cd325625444`, clean and origin 0/0 after fetch,
branch `codex/lot11a-portfolio-snapshots`. Prerequisite gates before storage:
typecheck PASS, 879/879 tests / 95 suites PASS, build PASS. Engine remains the
same `/2` baseline. No backup version, engine calculation or 11D.2 full daily
contribution model changed. [Hardened plan](./lot11d0_plan.md).

## Ownership and Application boundary

`PlanningSessionState` owns `{portfolio, planning}` only; owned Actuals histories
remain in Portfolio. Historical identity constraints are injected from exact
five-kind reference indexes. No live session property contains Portfolio capture
payloads. Portable codecs use a separate `PlanningBackupDataset`. The old
synchronous dispatcher/full-history accessor is a `.fixture.ts` characterization
adapter excluded from application builds; production uses asynchronous repository
services and light metadata. `Domain` and engine contain no IndexedDB/localStorage.

`application/persistence/planningRepository.ts` defines the browser-independent
port. `createPlanningRepository` coordinates validation, signatures, staging,
revisions and receipts over transaction adapters. Memory adapter characterizes
atomicity/CAS before the native adapter. Session `prepare` is private-candidate
work; `publish` advances state/ID generators only after commit. UI awaits through
`MaybePromise/mapResult`; production is async and synchronous test fixtures keep
their immediate characterization. Root is inert while committing, preserving
invalid/hidden drafts, owners and DOM. Apply rebases after successful publication;
failed commands keep state, projection and drafts. Save is dirty-guarded and binds
its already published run to capturedCurrentRevision; Save/Delete rerun no engine.

## Physical backend and transactions

IndexedDB database `flowplan-planning`, schema **2**, logical storage data **1**:
`control`, `current`, `snapshotMetadata`, `snapshotContent`,
`snapshotIdentityRefs`, `identityReservations`, `jobs`, `receipts`. Metadata keys
are native compound `(generation,createdAt,snapshotId)`; contents are independently
keyed by `(generation,snapshotId)`. No persistent historySummaries store or daily
contribution/parts model was introduced. A v1 prototype upgrade adds receipt
revision index/identity count without reading historical payloads.

- writeCurrent: CAS/control, Current only, currentRevision/revision, receipt.
  No history content/metadata/index write. Owned Actuals prefixes/owners and
  legacy evidence cannot be dropped or changed through ordinary Current writes.
- createSnapshot: bind run currentRevision + full expected token, add immutable
  content/metadata, reference counts, historyRevision/revision and receipt.
  No write Current or read of other capture payloads.
- deleteSnapshot: target content/metadata/reference counts only, History revisions
  and receipt. No Current/Actuals purge or unrelated artifact write.
- activateImport: complete sealed job + expected base CAS, generation switch,
  both revisions/global revision and receipt. Parsing, validation, engine,
  hashes and dialogs happen before this transaction. Activated generations cannot
  be activated again by a new operation; identical receipt retries are idempotent.

Resolve only after transaction complete; abort rejects publication. Durability
`strict` is a browser hint, not absolute disk-failure immunity. Every mutation
includes control for multi-connection ordering. BroadcastChannel is notification
only; CAS survives missing messages. blocked/versionchange close connections and
require reload, never delete the DB. Receipts retain the latest 1024 commits;
expired correct retries have stale expected tokens and cannot replay a write.
operationId uniqueness remains a caller contract after receipt expiry.

SHA-256 covers exact stored Current/capture texts and proves integrity, not business
validity. Following the independent audit, **strategy B: systematic validation**
replaces the certificate shortcut. New content carries no validationVersion;
existing epoch-1/unknown metadata is ignored. Both worker snapshot and History
paths call the same complete validator: strict historical inputs/Actuals prefixes,
Domain structure/Forecast/references/identities/temporal invariants. Current is
read from the same expected repository token. No metric is repaired or replayed.
The additional read cost is measured separately below; the original table records
pre-correction performance and cannot establish current snapshot-read latency.

## Migration, conflicts, files and recovery

Legacy `flowplan.backup.v1` remains untouched. Its exact raw source is archived in
jobs separately from lightweight control; legacySourceFingerprintAtMigration
remains fixed across normal Current edits/imports. Changed legacy triggers an
older-client conflict, separate exports and explicit keep/replace resolution.
An acknowledgment records the chosen changed fingerprint without rewriting the
original migration source. Source changes during migration prevent activation.
There is no transaction across localStorage/IDB and no lock capable of preventing
an old uncooperative client: close/reload old tabs; events/focus recheck detect
observed changes. No automatic merge or dual-write.

Private staging validates Current and each snapshot, reads back artifact bytes,
metadata/reference/count indexes, then seals the generation. Same-source incomplete
jobs resume idempotently by SHA fingerprint; each existing artifact is checked,
reference counts are not incremented twice. Failed/mid-file imports never activate.
Complete validation and Current preflight precede final import confirmation.
Cancelled staging and explicit cleanup remove only inactive temporary generations.
Prior activated generations are retained for technical recovery, not automatically
purged; repeated imports can therefore require additional quota.

V1–V7 contracts remain readable. V1–V5 defaults/repair policy is preserved;
color/orphan repairs require explicit migration approval with raw source retained.
V6 schema 1 and V7 mixed schema 1/2 remain exact. Unknown schemas/broken references
reject entirely. Ambiguous duplicate data/history JSON keys and malformed arrays
are explicitly rejected by the staged reader, never silently selecting a branch.

Production file input passes File/Blob to the worker. It retains one text buffer
and parses one historical artifact at a time, never an all-capture object graph.
This is **not full streaming UTF-8 import**. Visible file parsing limit: 512 MiB.
Export assembles complete autonomous V7 chunks/Blob with token consistency check;
no physical DB key, generation, certificate or workspace dependency enters JSON.
Export still buffers a complete file, so very large exports have transient RAM
costs. Legacy/migration-source exports are available even for undecodable source.
Invalid startup blocks editing behind recovery actions; it never overwrites data
with a writable demo. Absent new-depot data starts the demo without historical
captures being invented.

Storage estimate is indicative, persist is opt-in/refusable; quota failures are
visible, retain applied data/drafts, and allow export/retry/temporary cleanup.
No purge, archive merge, compression, remote backend or unlimited-storage claim.

## Lazy History and memory

Startup/list/Current writes read no Portfolio content records. History refresh
projects validated immutable captures one by one in a serialized worker, producing
only lightweight rows/metadata. Profiles are loaded only for visible/focused rows;
no current-label fallback, engine or reconstruction enters History. Ephemeral
projectionVersion **1** is rebuildable and never a metric authority.

Decoded-row LRU estimated budget **32 MiB**, compact union/comparison index estimated
budget **64 MiB**. Budget errors are visible without truncating history. Requests
are serialized so obsolete view work cannot accumulate full capture buffers.
Generation/revision tokens guard responses; release cancels obsolete loads, drops
rows/model/gutter DOM, and keeps viewport/reference/cap state. Planning DOM/drafts
survive. Covered zero, empty schema 2, unavailable schema 1, previous presence,
clipped activity and exact metrics keep their original semantics.

The cap considers all historical positive Project/day totals in the visible X
window. Grouping equal date/value samples preserves integer multiplicities, not
averages or sampling. External exact sorting uses 4096-entry chunks, fan-in eight,
and the unchanged quartile/IQR/lower-median policy. Scratch lives in disposable
`flowplan-history-workspace`, independent of historical authority. Pan retains cap;
effective zoom/dataset changes recalculate; scratch is removed after completion or
error. An abrupt browser closure can leave disposable workspace requiring later
cleanup; it does not invalidate business data. Heavy scientific quantities stay
Rational/BigInt; Number is used only for counts, pixels and diagnostic timings.

## Verification and limits

Automated gates include existing domain/Actuals/Portfolio/mixed schema/History/UI
characterizations plus new CAS/revisions, targeted writes/deletes, immutable owned
prefixes, failure atomicity, staging/resume, fingerprint divergence, parser errors,
exact external/weighted cap and row-cache release. Synchronous fixtures retain all
prior business assertions; helper wrappers assert they remain synchronous rather
than weakening expectations. Complete final counts/gates are recorded in the
Git delivery response and measurement files.

Real Edge headless tests use an isolated origin/profile, not user data:
concurrent connections, stale run rejection, operation replay, native transaction
abort, generation activation/reopen, portable V7, legacy-preserving migration/Save,
History details and repeated mode transitions. Desktop/mobile width checks and
light/dark captures are inspected. No dedicated third-party E2E dependency added.

**Quota limitation:** Edge 154 accepts DevTools quota override and reports it active,
but the attempted write did not receive physical QUOTA refusal. Native transaction
rollback after injected QuotaExceededError returns visible QUOTA and preserves the
revision. No physical-quota saturation success is claimed; other browsers/private
mode and true disk exhaustion remain audit checks.

[Reproducible measurements](./lot11d0_measurements.json) cover the required
5×20×365, 25×100×730, 100×200×1095 with multiple Teams/Reservations. They distinguish
logical bytes, snapshot bytes, Current projection/UI startup, read/write, import/
export, metadata, cap and estimated cache retention. Sampling is observed heap +
backing buffers across attached contexts, not whole-process RSS or an absolute
peak guarantee. Artifact fixture preparation/file buffers contribute to transient
memory. Final GC is laboratory-only; production never forces GC.

[Exploratory full-horizon Reservation measurements](./lot11d0_full_horizon_measurements.json)
show existing Current projection cost (up to about 14 s on the largest synthetic
case), independent of loading historical contents. No engine or current Timeline
algorithm was changed to hide this limitation. On-demand reads and Current writes
are much smaller operations; current horizons/Reservations still have their own
scaling costs. Large import/export transient memory and retained inactive import
versions are material limits, not storage-capacity promises.

### Original implementation browser dimensions — 2026-10-09

Edge 154.0.4258.53, isolated temporary profiles; sparse positive every fifth civil
day, 3/5/8 Teams and 8/30/80 staggered 30-day Reservations. Current RAF is reduced
independently of the frozen historical inputs, illustrating Current/History separation.
Two warmups + ten timed runs for medians; import/export/cap/UI startup are single
local measurements. The engine digest serializes WeakMap-backed quantities with
serializeQuantity, not empty JSON objects.

| S×P×D | Logical MiB / snapshot MiB | Current write median ms | Snapshot open median ms | Metadata page median ms | UI startup ms | History metadata / cap ms | Import / export ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5×20×365 | 0.60 / 0.12 | 1.70 | 1.00 | 0.40 | 136.6 | 5.2 / 6.2 | 107.1 / 6.1 |
| 25×100×730 | 27.47 / 1.10 | 4.20 | 7.70 | 0.80 | 1554.2 | 108.2 / 133.9 | 4448.8 / 234.9 |
| 100×200×1095 | 325.44 / 3.25 | 13.90 | 25.20 | 1.60 | 13177.7 | 1160.2 / 1561.3 | 48482.0 / 2915.2 |

All Current engine parity checks pass. Row cache estimated bytes after release: **0**
for all cases. Laboratory main heap after GC is about 3.4 MiB, 4.5 MiB, 6.6 MiB,
excluding worker/native heaps. Observed main+worker heap/backing peaks include
fixture generation, file buffers, codec/staging and Current projection: 40.8 MiB, 234.6 MiB, 1694.8 MiB.
These are sampled peaks, not exact RSS. Large-file import remains memory-intensive,
even with per-capture parsing; no claim of constant import/export RAM is made.

Reproduction: npm run typecheck; npm test; npm run test:storage;
node scripts/benchmark-storage.mjs --output=docs/steps/STORAGE/lot11d0_measurements.json
after build. FLOWPLAN_BROWSER may select an installed Chromium binary.
No dependency or user-profile access is required.

Original implementation gates, before these audit corrections: **typecheck PASS; 904/904 tests, 96 suites PASS; build PASS;
git diff --check PASS**. No skipped/cancelled/todo tests. Real browser report:
[verification](./lot11d0_browser_verification.txt). Inspected renders:
[Planning 1440](./lot11d0-ui/planning-1440.png),
[Planning 390](./lot11d0-ui/planning-390.png),
[History light 1440](./lot11d0-ui/history-light-1440.png),
[History dark 1440](./lot11d0-ui/history-dark-1440.png),
[History light 390](./lot11d0-ui/history-light-390.png),
[History dark 390](./lot11d0-ui/history-dark-390.png).
Widths equal scrollWidth at 1440 and 390 in both History themes. Native blocked
upgrade reports BLOCKED; legacy remains byte-identical through migration, Save
and three mode cycles, and closed History retains zero gutter rows.

**11B DONE; 11C DONE; 11D.0 IMPLEMENTED — IN REVIEW.**

## Independent-audit corrections — 2026-10-09

Corrective baseline: `8086ddf14f609d0f1c9e16cd480bf17de3f13f6b`;
expected branch, clean working tree and origin 0/0 verified after fetch before edits.
No other lot starts; portable V7, Domain and engine remain unchanged.

### Concurrent History requests

Cause: a waiter returned after another request's Promise without checking its own
missing rows. A FIFO Promise queue now re-evaluates each requested subset after the
preceding request; common cached rows are reused. Each request binds the epoch and
full token, and requires a model built for that token. Refresh/release/cancel detach
obsolete work so a newer view need not wait for old IO; stale results/errors cannot
publish or clear newer profiles. Totals also recheck after awaiting IO, between
samples and at scan completion. No exhaustive History load is introduced by ensureRows.

Eviction precedes insertion, preserving the estimated LRU budget at every cache
mutation. Each request pins only its requested cached rows during its own work;
requests whose visible set cannot fit reject explicitly rather than looping.
Published reader models are rebuilt before yielding after eviction. A later request
may evict earlier profiles; callers do not acquire indefinite pins. Decoding a single
snapshot/projection still has transient memory outside the retained-row estimate.
Underlying already-issued worker IO is not physically cancelled; its response is
invalidated, and the worker still serializes native work.

Thirteen concurrency/cancellation regression tests, including controlled-Promise
interleavings, cover disjoint/overlapping/successive
requests, release while IO is held, refresh/token/generation invalidation, stale
errors, read errors, LRU eviction, oversized and concurrently pinned visible sets.

### Commit outcomes and recovery

Cause: repository commit and local reconciliation were treated as one generic
failure. The dispatcher now distinguishes pre-commit work, authoritative abort,
unknown commit outcome, confirmed commit with failed reconciliation, and success.
PersistenceError.commitOutcome defaults to unknown; only native onabort or the
memory adapter's discarded transaction candidate proves not-applied. Error codes,
network failures or lost acknowledgment do not prove rollback. Native oncomplete
catches notification failures and rejects as uncertain instead of leaving the
Promise unsettled after a durable write.

Unknown/confirmed-unreconciled outcomes latch recovery state and block Current,
Save and Delete before touching the old projection/token. Save/Delete compare the
complete readback token with the confirmed token; a foreign commit requires reload.
UI locks editing, cancels retained History work, keeps draft owners/values and
shows an explicit message and Reload planning action. Nested pending cleanup no
longer erases the recovery message. File and string import activation use the same
recovery guard; versionchange also blocks editing. Reload requires confirmation
when drafts exist; cancelling keeps them. Startup reads persisted authority and
rebuilds a new coherent session, projection and token. There is no automatic draft
replacement/rebase or synthetic local revision. Drafts are RAM-only: explicitly
confirmed reload discards them; this correction adds no draft persistence system.

Retry of the same refused operation keeps operationId; Save also retains its exact
capture/timestamp, with no repeat engine calculation. Receipt lookup remains before
CAS. Nine dispatcher tests exercise UI-facing error results, all blocked mutation
paths, Save/Delete readback failures, foreign Current commit, failed RAM publication,
proven abort/retry, lost acknowledgment, unknown failure and explicit recovery.

### Validation paths and transaction audit

Cause: content() assigned validationVersion=1 independently of complete validation,
and the worker trusted that metadata after checksum verification. No private
certificate is emitted now. Creation validates against the token-bound Current
before add; import/legacy migration validate every source capture before staging,
then stored captures/Current/indexes before sealing. Incomplete resume revalidates
source and stored artifacts; activation requires a sealed complete job and CAS.
Complete existing jobs are immutable through repository APIs. Existing generations
are checked lazily with full business validation on each capture read; startup
still reads only Current/indexes. Old metadata cannot bypass the validator.

Nine regression tests cover legacy certificates, structural/business invalidity
with valid digests, absent/unknown versions, later Current edits, corruption,
interrupted staging/resume and invalid mixed import without activation. Native
browser tests cover both actual worker paths, native staging and receipt retries.

All transaction awaits were reviewed: they await adapter requests only. Heavy
business validation/hashing remains outside transactions. Owned Current-prefix
comparisons were moved out of the write transaction, using normalized candidate
inputs and a token-bound Current read; final CAS prevents a foreign change between
validation and commit. Receipt is checked before that read and again in mutate.
No IndexedDB dependency enters Application ports, Domain or engine.

### Corrective verification and residual limits

Final gates: typecheck/build/diff-check PASS; **935/935 Node tests, 96 suites**,
0 failed/skipped/cancelled/todo; **31 added** (13 History, 9 dispatcher, 9 validation).
The targeted repository/transfer/concurrency suite passes **41/41** (included in
the complete suite, not additional unique tests). The separate portable-server
suite passes **3/3**, bringing the unique Node total to **938**, 0 failures/skips.
No portable-server test was added. Edge **154.0.4258.53** passes
the existing native repository/UI suite (15 repository assertions plus UI/quota/
upgrade/layout checks) and **11/11 added browser scenarios**, 0 failed/skipped.
Migration, interrupted recovery, portable V7 export/import, receipts, native abort,
worker validation and UI drafts/reload are exercised. Detailed results are in the
corrective delivery and
[corrective browser report](./lot11d0_audit_browser_verification.txt).
[Corrective performance measurements](./lot11d0_audit_measurements.json) rerun the
same three sparse fixtures and distinguish validation read overhead from Current
engine startup costs. They remain sampled local measurements, not latency/absolute
RAM guarantees. Worker validation and snapshot reads match the final implementation;
the final between-sample totals cancellation guard was added after that performance
run, so cap durations are reference measurements before this additional guard. The original full-horizon/large-import limitations remain applicable.

| S×P×D | Validated snapshot open median ms | Current write median ms | History summaries ms | Reference cap ms | Export ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5×20×365 | 3.5 | 1.9 | 17.5 | 16.8 | 17.4 |
| 25×100×730 | 34.8 | 5.1 | 730.2 | 771.4 | 807.7 |
| 100×200×1095 | 110.6 | 14.1 | 8581.5 | 9349.6 | 10206.9 |

Snapshot open rises from the original 1.0/7.7/25.2 ms to 3.5/34.8/110.6 ms.
Safety takes priority over certificate reuse; validation remains off the main
thread in the browser worker. History remains lazy, but summary/cap/export scan
all requested captures and now pay full validation cost. All three engine digests
match the original measurements; retained-row cache after release is zero.

Native quota rollback is tested by injected refusal; an attempted physical quota
probe was not enforced by Edge. No physical-quota saturation success is claimed.

**11B DONE; 11C DONE; 11D.0 IMPLEMENTED — IN REVIEW.** Independent re-audit of the
corrective commit is required before any closure.

### Corrective file inventory

- `docs/current_canon.md`
- `docs/current_plan.md`
- `docs/steps/STORAGE/lot11d0_audit_browser_verification.txt`
- `docs/steps/STORAGE/lot11d0_audit_measurements.json`
- `docs/steps/STORAGE/lot11d0_canon.md`
- `docs/steps/STORAGE/lot11d0_plan.md`
- `scripts/browser-storage-audit-test.mjs`
- `src/application/history/repositoryHistoryReader.test.ts`
- `src/application/history/repositoryHistoryReader.ts`
- `src/application/persistence/createPlanningRepository.ts`
- `src/application/persistence/planningRepository.ts`
- `src/application/persistence/repositoryStorage.ts`
- `src/application/persistence/validateStoredSnapshot.test.ts`
- `src/application/persistence/validateStoredSnapshot.ts`
- `src/infrastructure/persistence/indexedDbRepositoryStorage.ts`
- `src/infrastructure/persistence/memoryRepositoryStorage.ts`
- `src/infrastructure/persistence/planningStorageWorker.ts`
- `src/main/createPersistentPlanningApplication.ts`
- `src/main/planning/createRepositoryPlanningDispatcher.test.ts`
- `src/main/planning/createRepositoryPlanningDispatcher.ts`
