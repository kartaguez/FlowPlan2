# Lot 11D.1 — RAF Model delivery

**Status: IN REVIEW.** 2026-10-09. Independent ChatGPT implementation audit is
required. 11D.0 remains DONE; UX redesign, replay, inputs-only and following
lots remain NOT STARTED. No DONE closure is inferred from this delivery.

Initial SHA: `6ce922e55621423c4e00e21e374ae53a6deb1efa`.
Branch: `codex/lot11a-portfolio-snapshots`. Before any modification: fetch
succeeded, exact branch/HEAD verified, clean working tree, origin divergence
0/0. The user reports the amended [plan](./lot11d1_raf_model_plan.md) READY FOR
IMPLEMENTATION after independent audit and explicitly authorizes code, tests,
documentation, commit and normal push. The final SHA is in Git delivery history,
not self-referenced in this commit.

## Implemented P1–P6 contracts

Requirements are the sole current RAF authority. Domain permits exact
nonnegative numerical divergence from immutable Project snapshot RAF and
retained V4 RAF, preserving membership, history, references and provenance.
Snapshot factories, consecutive versions, period identity, coverage, zero
knowledge and retired markers retain their existing validations.

Command A `update-project-current-raf` carries a nonempty unique member patch
and an immutable RAM opening base: Project identity, exclusive source,
ordered requirements, canonical RAF and caps. It checks source/membership
and targeted RAF before comparison. It preserves all untargeted fields,
Actuals history and legacy provenance. Exact equality returns the same state
without clock, snapshot, projection or write. It never reconciles legacy.
Disjoint RAF patches remain safely reconcilable without a per-Team version.

Command B `replace-project-actuals` carries the full Project opening base and
whole Actuals candidate. Application checks published base first, validates
structure/identity, compares canonical knowledge and current RAF, then selects:

| Actuals | Current RAF | Effective operation |
| --- | --- | --- |
| unchanged | unchanged | complete no-op |
| unchanged | changed | A, zero Actuals snapshots |
| changed | unchanged | B, one Actuals snapshot |
| changed | changed | B, one Actuals snapshot |

Knowledge includes participation, retired markers, coverage/partition and exact
consumption, excluding RAF and technical IDs. A consumption-only change is B.
Technical period-ID substitutions remain subject to identity validation. B
rebuilds requirements from the new **validated snapshot**, preserving the old
prefix. Numerical equality is its atomic postcondition only. A native first
knowledge or explicit legacy reconciliation needs coverage, including zero;
RAF alone creates neither first V5 nor a new raf-only version. Old raf-only
snapshots remain valid, referenceable and unrenumbered.

R1 confirmations are the union of all participating Teams for changed
coverage/partition, affected Teams for changed consumption at unchanged
partition, numerically changed current RAF, and existing membership obligations.
An unchanged RAF can be explicitly confirmed. Divergence from historical RAF
alone adds no obligation. Retirement keeps the existing mandatory confirmation,
covering both historic-positive/current-zero and historic-zero/current-positive;
nonzero current consumption remains prohibitive. Reintroduction supplies new
explicit cells and RAF, without restoration.

The existing UI keeps its layout, card Apply/Cancel and modal steps. Quick RAF
uses A. Update Actuals supplies its candidate/proofs to Application R2. Both RAF
views initialize from requirements. Forecast commands carry explicit untouched
RAF intent and refuse hidden numeric revisions; new autonomous members still
have explicit initial RAF. Dependent membership uses the existing single B
handoff. Unsupported RAF + other Forecast edits still require sequencing.
No additional RAF button, compact table, exact-decimal redesign or visual
modal refactoring is included.

Drafts retain the actual opening ViewModel/base separately from the refreshed
model. Rebase compares opening/local/recent quantities by exact canonical value,
detects RAF changes even at unchanged Actuals version, preserves invalid and
equivalent entered text, and renews dependent evidence. Conflicting fields,
incompatible source/partition/membership/parameters or an open modal require
review. Success cleans only its owner; failure keeps branches and other dirty
cards. Drafts remain RAM-only.

11D.0 `prepare → private projection → writeCurrent CAS → publish` is retained.
A/B use one session candidate, at most one projection/write, with no nested
dispatch or A-then-B publication. No-op avoids storage conversion. Known abort
publishes nothing; uncertain commit or failed local publication requires
recovery and blocks further mutations. No automatic uncertain retry is added.
11C Forecast eligibility and engine `/2` are unchanged.

## Compatibility and storage

New opaque Current inputs use root `rafModelVersion: 2`; new captures use
`inputsSchemaVersion: 2`. Portable export/import is V8. Forecast schema2 and
`planning-engine-v1/actuals-aware/2` remain unchanged. Physical IndexedDB schema2,
storage data1, stores, indexes, keys, receipts and CAS are unchanged.

Dedicated Current codecs dispatch absence of the discriminant to historical
V5 validation and presence to model2. The historical numeric RAF validator is
shared by V1–V7 readers, inputs1 hydration and downgrade encoders. Old inputs
validate before lossless semantic conversion; strict round-trip uses the input
schema's encoder. Unknown discriminants/extra fields refuse. V8 mixes inputs1/2
and forecast1/2 captures, retaining exact IDs, sources, results and legacy
provenance. Historical totals use captured requirements, never owner Current
RAF or source snapshot RAF.

Repository, worker, staging/read-back, export and historical hydration all use
the versioned boundary. Old Current startup and no-op do not write. Save can add
inputs2 while leaving old Current intact; a later Current edit changes Current
only. Owned-prefix comparisons preserve complete legacy evidence **including
its RAF authority map**. Import invalidity never activates a partial generation.
Selected old V5/raf-only/legacy sources remain resolvable after A and B. No
historical replay, profile enrichment or historical payload rewrite is added.

Historical fixtures retain original values. `legacyCapture.fixture.ts` is an
inputs1-only test producer excluded from the application build, supporting
existing V6/V7 negative matrices; production Save always produces inputs2.
Tests previously expecting quick initial/raf-only snapshots now assert zero
snapshots/unchanged version, keeping atomicity, proofs and draft assertions.
The former combined Forecast/RAF edit now tests its rejection and explicit
sequencing; RAF projection tests call A directly. Existing tests are retained,
with no skip, deletion or weakened historical numeric validation.

## Executed verification

[Raw gate report](./lot11d1_raf_model_validation.txt) and
[native browser scenarios/review](./lot11d1_raf_model_browser.json).

| Gate | Actual result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, 994/994 tests, 96 suites; 59 new tests over 935 baseline |
| `npm run build` | PASS, exit 0 |
| `npm run test:portable` | PASS, 3/3 tests, exit 0 |
| `npm run test:storage` | PASS, native Edge isolated suite; 15 repository assertions plus UI, upgrade, layout and injected quota checks |
| `node scripts/browser-storage-audit-test.mjs` | PASS, 22/22 native scenarios, no failure/skip |
| `git diff --check` | PASS, no output |

**997 unique Node tests**, no failure/cancelled/skipped/todo. Targeted tests are
included in that count, not added again. Browser assertions/scenarios are
reported separately. No new benchmark was executed or claimed.

The original storage regression suite remains executable. The expanded native
suite covers both Application R2 and real modal submission for all four cases,
full base staleness, two native connections with lost CAS, confirmed abort and
explicit retry, lost acknowledgment after RAF commit, blocked mutation/recovery,
worker validation, mixed inputs1/2 export/staging/reimport/reopen, old Current
read/Save without rewrite and preservation of captured identity/source.
The mounted application additionally applies Atlas RAF `2/3` while historical
snapshot RAF remains `1/3` at version1, keeping Boreal's invalid `1/` dirty text.
Save remains dirty-guarded. Screenshots were visually inspected with production
CSS: [1440 px](./lot11d1-raf-ui/planning-1440.png) and
[390 px](./lot11d1-raf-ui/planning-390.png). Document width equals scrollWidth
at both sizes; the existing matrix uses its own horizontal scroll.

| Plan acceptance groups | Evidence executed |
| --- | --- |
| D1–D5 | New model factories/legacy divergence, exact quantities, negative membership/history checks, divergent retirement/reintroduction; existing snapshot intent, split/merge/extension/erosion/identity suites retained |
| A1–A6 | Independent RAF across five source modes and active/inactive, no-op/stale/invalid patches, first reconciliation, B after several A, untouched Forecast RAF and hidden-revision refusal |
| R1a–R1c | Consumption-only Team A proof without Team B; partition/bounds/total erosion all-Team proofs; membership union; concurrent consumption invalidates dependent RAF proof |
| R2a–R2b | Four direct Application branches with projection/write/version counters; canonical equivalence, no-op confirmations, identity substitution and stale full bases |
| C1–C4 | Same-version independent RAF, disjoint/invalid/equivalent text, modal review and proof renewal; retained multidraft/coordinator, Cancel/handoff/suspend/remount tests and mounted two-card review |
| T1–T3 | RAF validation/projection/abort/uncertain/local-publication/CAS failures; native abort/retry, receipt and recovery regressions |
| K1–K6 | Retained V1–V7 matrices and fixtures; V8 exact divergent sources; old/new Current with mixed inputs1/2; old selected sources after B, reserved IDs, invalid import and export/reopen |
| F1–F2 | Positive Forecast allocations strictly after coverage in R2 runs; retained complete 11C temporal/boundary/Mandatory suites and exact metrics/profile tests; inactive/zero/large fraction independent RAF |
| S1 | A/B repository observers prove no History content/metadata access, no-op zero write; retained storage Save/Delete/owned-prefix tests |

## Residual limits and stopping point

The independent implementation audit is outstanding. This is an isolated
headless Edge 154 review, not a physical mobile/assistive-reader audit or an
inventory of user IndexedDB. Two connections exercise native concurrency; a
manual multi-browser/multi-device audit is not claimed. Physical quota exhaustion
was not achieved: the browser override did not force it; injected native quota
rollback is verified. Large-file buffers, estimated cache budgets, retained
inactive generations and Current projection costs remain the 11D.0 limits.
Unapplied RAM drafts are lost after explicitly confirmed recovery reload.

No independent RAF change journal is added. No precision-rendering redesign,
UX refactor, replay service, inputs-only capture, new storage format or future
lot is started. Commit/push is the authorized stopping point. **11D.1 RAF Model
— IN REVIEW**, pending independent ChatGPT audit.

## Changed files

- `docs/canon.md`
- `docs/current_canon.md`
- `docs/current_plan.md`
- `docs/steps/ACTUALS/lot10c1_canon.md`
- `docs/steps/ACTUALS/lot11d1-raf-ui/planning-1440.png`
- `docs/steps/ACTUALS/lot11d1-raf-ui/planning-390.png`
- `docs/steps/ACTUALS/lot11d1_plan.md`
- `docs/steps/ACTUALS/lot11d1_raf_model_browser.json`
- `docs/steps/ACTUALS/lot11d1_raf_model_canon.md`
- `docs/steps/ACTUALS/lot11d1_raf_model_plan.md`
- `docs/steps/ACTUALS/lot11d1_raf_model_validation.txt`
- `scripts/browser-storage-audit-test.mjs`
- `scripts/browser-storage-test.mjs`
- `src/application/backup/flowplanBackupV1.ts`
- `src/application/backup/flowplanBackupV5.test.ts`
- `src/application/backup/flowplanBackupV6.ts`
- `src/application/backup/flowplanBackupV7.ts`
- `src/application/backup/flowplanBackupV8.ts`
- `src/application/backup/planningInputCodec.ts`
- `src/application/backup/portableBackupParts.test.ts`
- `src/application/backup/portableBackupParts.ts`
- `src/application/history/buildProjectHistoryViewModel.test.ts`
- `src/application/history/historyTestFixture.ts`
- `src/application/index.ts`
- `src/application/persistence/createPlanningRepository.ts`
- `src/application/persistence/repositoryTransfer.test.ts`
- `src/application/persistence/repositoryTransfer.ts`
- `src/application/persistence/validateStoredSnapshot.ts`
- `src/application/portfolioSnapshots/capturePortfolioSnapshot.ts`
- `src/application/portfolioSnapshots/dailyProfiles.test.ts`
- `src/application/portfolioSnapshots/legacyCapture.fixture.ts`
- `src/application/portfolioSnapshots/portfolioSnapshots.test.ts`
- `src/application/session/lot11d1RafModel.test.ts`
- `src/application/session/planningSession.lot10c1.test.ts`
- `src/application/session/planningSession.test.ts`
- `src/application/session/planningSession.ts`
- `src/application/session/projectCurrentRaf.ts`
- `src/application/session/projectEditViewModel.ts`
- `src/application/session/snapshotActualsViewModel.ts`
- `src/domain/actuals/requirements.ts`
- `src/domain/actuals/transition.ts`
- `src/domain/model/entities.ts`
- `src/domain/portfolioSnapshots/portfolioSnapshot.ts`
- `src/infrastructure/persistence/indexedDbRepositoryStorage.ts`
- `src/infrastructure/persistence/planningStorageWorker.ts`
- `src/main/planning/buildPlanningSessionProjection.test.ts`
- `src/main/planning/createPlanningProjectionDispatcher.test.ts`
- `src/main/planning/createRepositoryPlanningDispatcher.ts`
- `src/main/planning/lot11cTemporalSeparation.test.ts`
- `src/main/planning/planningBackupOperations.test.ts`
- `src/main/planning/planningBackupOperations.ts`
- `src/main/planning/planningPersistenceTransaction.test.ts`
- `src/main/planning/synchronousPlanningDispatcher.fixture.ts`
- `src/ui/actuals/actualsForecastConflict.ts`
- `src/ui/actuals/actualsWorkflow.test.ts`
- `src/ui/actuals/createSnapshotActualsCardController.test.ts`
- `src/ui/actuals/createSnapshotActualsCardController.ts`
- `src/ui/actuals/parseSnapshotActualsCommand.ts`
- `src/ui/actuals/snapshotActualsDraftStore.ts`
- `src/ui/project-edit/createProjectEditController.test.ts`
- `src/ui/project-edit/createProjectEditController.ts`
- `src/ui/project-edit/parseProjectEditCommand.ts`
- `src/ui/project-edit/projectDraftStore.ts`
- `src/ui/timeline/createTimelineUiCoordinator.multidraft.test.ts`
- `src/ui/timeline/createTimelineUiCoordinator.ts`
