# Lot 11B — Project History

Status: **IN REVIEW**, pending independent audit and human validation. 11A and
11A.2 remain DONE. Implementation baseline:
`7a3ea6bf1c6c97e248075a75bc718279158ad0f5` on
`codex/lot11a-portfolio-snapshots`, clean and origin 0/0 after the required fetch.
The [reviewed plan, §§5–14](./lot11a2_11b_plan.md) remains the functional contract.
No functional scope was added or reduced.

## Projection and exactness

`src/application/history/buildProjectHistoryViewModel.ts` consumes only validated
Portfolio Snapshots. `readHistoryMetadata` reads planning and Project/catalog
metadata directly from the captured `PlanningInputsDto`; it neither decodes the
business inputs nor hydrates, clones or reconstructs V5 source histories. No
current Portfolio, PlanningResult or engine callback enters this API.

Snapshots use the canonical `(createdAt, snapshotId)` comparator. The reference
owns the only horizon. The Project union has S rows per Project, including
explicit absent rows. Reference members follow their historical priority;
disappeared members follow last-known priority then lexical Project ID. Group
labels come from the last presence; individual rows retain their own metadata.

Schema 1 is `unavailable-legacy`, never synthesized into an empty daily profile.
Schema 2 preserves source coverage, sparse exact Actuals/Forecast, first positive
Forecast, and whole-Project Actuals/RAF/EAC. Empty sparse profiles, uncovered
knowledge, covered zero, inactive Projects, partial allocations and unallocated
RAF remain distinct. Forecast status uses exact rational comparisons: positive
RAF with daily Forecast equal to RAF is `fully allocated`; a positive sum below
RAF is `partially allocated`; zero is `no allocation within horizon`. Inactive,
zero RAF and unavailable schema 1 retain their specific qualifications.

Comparisons skip absent snapshots to the previous presence of the same ID.
Priority and signed EAC deltas, start/end dates and absence reasons, Programme,
Pas and activation are historical. Association comparison uses both ID and label.
`civilDayDifference` uses the existing epoch-day implementation, independent of
local clocks or DST. The final ViewModel is deeply immutable and DOM-independent.

## Planning ownership and lifecycle

Characterization preceded production changes. The initial suite passed
**755/755 tests, 89 suites**; a new ownership characterization passed at 756
before lifecycle extraction. Existing cursor, viewport, tooltip, reorder,
editor, Actuals workflow, hidden-draft and global-dirty tests retain their
behavioral expectations. The geometry dependency allowlist adds only the newly
extracted temporal module; no Planning expectation was rewritten for History.

| Owner | State retained across modes | Suspension |
| --- | --- | --- |
| Timeline UI coordinator | Published projection, viewport/date/progress/tab, card/Team expansion; Project/Reservation Forecast and Actuals stores | Global dirty notifications detached; queued notifications check lifetime |
| Editor/Create/Settings controllers | Instances, DOM fields, invalid/hidden/unapplied drafts and local editor context | Entire Planning surface hidden/inert, capture-phase interaction shield; no Apply/Cancel/rebase/setModel |
| Cursor and temporal range | Selected date, viewport; UI range preview only transient | Local/global keys and pointer listeners detached; capture and preview released |
| Viewport, hover and reorder | Viewport and priority state | Pan/range/reorder captures cancelled, hover cleared, listeners detached |
| Actuals and diagnostics | Draft owners and closed dialog DOM | Global focus/key listeners detached |
| Workspace mode shell | Last Planning focus | Modal observer disconnected in History; focus moves to History and returns to connected visible Planning target |

`suspend()` and `resume()` are idempotent and retain owners/DOM. `destroy()` is
final, idempotent, and never used to switch modes. History is composed above
Planning in `createPlanningDemoApplication`; switching invokes no mount,
renderProjection, setModel, dispatch, storage write or engine reconstruction.

Every existing modal blocks the toggle and its callback. No dialog is cancelled
to make a switch possible. Inline Create and dirty Forecast/RAF can switch;
Save remains blocked when they return. Portfolio Projects and Reservations,
current diagnostics/progress and editors all belong to the hidden Planning
surface. The DOM shield complements inert; global listeners and observers are
explicitly suspended, not delegated to inert.

## Geometry, viewport and cache

The minimum `TemporalGeometry`, time-axis builder, date/X contract, viewport
math and primary-pointer range gesture are shared. Planning retains its cursor
anchor, 1.25 zoom, inclusive ranges, 4 CSS px threshold, seven-day minimum,
Shift pan, pointer cancellation, keyboard and typography behavior. History
anchors zoom at the visible center and has its own viewport. Axis and Project
surfaces accept range/pan, using the same primitives; they share temporal width.

`buildProjectHistoryGeometry` produces independent History geometry, never
fake Teams or PlanningResults. Two sparse paths per present row stack saturated
Actuals below pastel Forecast, with zero gaps intact. Clipping intersects
inclusive daily cells with the reference horizon and viewport. The Actuals
knowledge marker sits at the end edge of `actualsRange.through`, including a
covered-zero profile and the final horizon day. No marker is invented at a
clipped edge. Legacy profiles receive no shape; proved no-activity may receive
a neutral line. Absent rows are visually empty and announce absence only.

The exact cap uses positive daily totals across all Projects, not mounted rows:
nearest-rank quartiles/IQR fence for n≥8, lower median ×3 otherwise, 1 for empty.
Pixel ratios are bounded integer quotients before Number conversion. Loads
above the common cap shrink both components proportionally, keep their exact
values, and receive a visible accessible excess indicator. Only presentation
is capped, never Domain quantities or metrics.

`createProjectHistoryCache` compares the ordered snapshot-ID sequence, not
array/object identities. Ordinary state copies retain VM, viewport and cap.
Effective zoom-width changes alone resample the cap and advance zoomRevision;
pan, same-width translations, no-ops, mode return and resize retain it.
Backward-clock Save and non-reference Delete rebuild data/cap on the retained
window. Reference change/Delete resets to its new horizon. Empty collections
clear the cache. Import reload creates a new application/cache as before.

Surface geometry is windowed in X via binary lookup in sparse days, and in Y
by visible Project groups with one group overscan. Full DOM gutter rows remain
for complete sequential keyboard access; no daily DOM nodes are created. The
axis stays outside the inner vertical scroll, aligned with the plot including
scrollbar width. Pointer hover and scroll redraw use animation frames. Pan does
no VM build, daily decoding, quantile sorting or business work.

## Information, colors and accessibility

Every present row, including empty and legacy, has a keyboard entry. Focus
opens historical metadata; Left/Right initialize at the first visible day,
then move daily, Home/End use visible bounds. Hover and tap resolve indexed
geometry hits; marker/excess information keeps real exact quantities. Escape
and Close dismiss information without changing modes. Pending hover frames
are cancelled on dismiss/suspend. Legacy daily amounts remain unavailable;
omitted schema-2 days are simulated zero with independent coverage text.

Tooltips include full local timestamp with seconds/milliseconds/zone and UTC
source, snapshot and Project IDs, labels/activation/priority, exact and formatted
Actuals/RAF/EAC, coverage, estimated dates/reasons, allocation status, previous
presence comparisons, and daily Actuals/Forecast/total/cap. Group labels may
ellipsis on narrow layouts; full historical metadata remains accessible.

The v1 ID-only OKLCH color policy uses hue/chroma/lightness, reduces chroma into
sRGB gamut, and preserves colors when peers are added/deleted or modes/viewport
change. The tested 50-ID set has saturated-load contrast above 3:1 against
white and the dark background. Colors are independent of Programme. Arbitrary
IDs can still produce close colors, especially at 24/50 captures; legend dates,
IDs, fixed ordering and tooltips remain necessary identity channels.

## Created and modified components

- Application: `src/application/history/buildProjectHistoryViewModel.ts`, its
  projection/metadata/comparison types, test fixture and isolated tests.
- Geometry: `src/adapters/history/geometry/buildProjectHistoryGeometry.ts` and
  tests; `src/adapters/temporal/temporalGeometry.ts` extracts the time-axis builder
  and shared contract; `src/domain/model/date.ts` adds only civil-day difference.
- History UI: `createProjectHistoryCoordinator`, `createProjectHistoryCache`,
  `renderProjectHistorySvg`, `renderProjectHistoryTooltip`, `historySnapshotColor`
  and their unit/DOM tests under `src/ui/history/`.
- Shell/lifecycle: `src/ui/createWorkspaceModeController.ts`,
  `src/ui/interactionLifecycle.ts`, `src/ui/timeline/createTemporalRangeController.ts`;
  integration in `renderApp.ts`, `createPlanningDemoApplication.ts` and scoped CSS.
- Existing Planning controllers: cursor, viewport, interaction, diagnostics,
  Project reorder, Actuals card and UI coordinator add suspension of their
  interactions. Shared viewport application/range render/date-X signatures accept
  TemporalGeometry; Planning math, rendering and business behavior stay intact.
  Characterization/controller tests cover the preserved contracts.
- Verification/docs: `scripts/benchmark-history.mjs`, this canon, raw measurements,
  UI screenshots, durable/current canons, current plan and original lot records.

## Gates and UI review

Incremental complete-suite gates passed at 756 (characterization), 762 (VM),
766 (lifecycle/shell), 776 (geometry/cap), 779 (cache), 785 (DOM interactions),
then **792/792 tests across 93 suites** after added RAF, comparisons, paths,
colors, axis and cause tests. No skipped, cancelled or todo tests.
Final validation: `npm run typecheck`, `npm test`, `npm run build`,
`git diff --check` all pass. This adds 37 tests and four suites to the baseline.

The native computer tool could not access the locked Mac; the user explicitly
authorized temporary headless review using the already-installed Chromium.
A disposable profile and local CDP were used, with no new repository dependency
or permanent E2E stack. Screenshots were inspected:
[1440 light](./lot11b-ui/light-1440.png),
[1440 dark](./lot11b-ui/dark-1440.png),
[390 light](./lot11b-ui/light-390.png),
[390 dark](./lot11b-ui/dark-390.png),
[zoom](./lot11b-ui/zoom-1440.png), and 24/50 snapshot legends in both themes.
Reference axis, daily gaps/overlap, capped spike, unavailable/empty/inactive
profiles, marker, typography, narrow gutters, focus and scroll were reviewed.
Document scrollWidth equals innerWidth at 1440 and 390 in both themes; target
axis and plot widths both measured 1214 CSS px. Legends scroll internally when
long (50 snapshots: 173 px content / 144 px viewport).

Real DOM checks verified hover/focus/daily keyboard/Escape, native emulated touch
at 390 px, and five consecutive mode round-trips with an invalid Project name:
same input instance/value, SVG, viewport and backup string, restored field focus,
Save still disabled. Ctrl+Right in History left the Planning date unchanged.
Settings, Team Settings, Create Team and Actuals refused direct callback
activation while open and retained the workflow. Automated tests additionally
cover diagnostics/modal guarding, all dirty controller owners, hidden Forecast,
invalid quick RAF, captures/cancellation and listener cardinality.

## Measurements and limitations

Reproducible Node harness: `npm run build`, then
`node --expose-gc scripts/benchmark-history.mjs S P D`.
`HISTORY_BENCHMARK_COMPLEX=1` adds sparse spikes and long rational denominators.
It creates validated synthetic captured artifacts, not historical engine replay.
Raw measurements are in [lot11b_measurements.json](./lot11b_measurements.json).

| Local single-run measurement | Small 3×5×30 | Target 24×100×730 | Stress 50×200×1095 |
| --- | ---: | ---: | ---: |
| Sparse days | 90 | 350,400 | 2,190,000 |
| Logical rows | 15 | 2,400 | 10,000 |
| Compact V7 bytes | 22,447 | 26,631,198 | 162,683,010 |
| Decode ms | 0.84 | 470.56 | 3,160.64 |
| VM ms | 0.81 | 432.29 | 2,780.53 |
| Zoom cap ms | 0.034 | 8.86 | 50.95 |
| Pan cache median ms | 0.0008 | 0.0010 | 0.0010 |
| Windowed geometry median / P95 ms | 0.006 / 0.011 | 0.184 / 0.318 | 0.547 / 0.744 |
| End heap / RSS MB | 5.84 / 59.16 | 480.44 / 665.80 | 2,276.37 / 2,534.48 |

The complex target (spikes + 40-digit rational denominators) measured VM
474.53 ms, zoom cap 13.33 ms, windowed geometry median/P95 0.235/0.349 ms;
27,520,798 compact bytes. It likewise performs no decoding or cap sampling at pan.

Browser target: decode 460.1 ms; initial History mount including VM, cap, gutters
and initial drawing 480.7 ms; zoom through two animation frames 36.3 ms; pan
frame intervals median 16.7 ms / P95 17.8 ms (30 frames). 2,400 keyboard rows,
7,776 DOM nodes, 48 windowed paths. The target backup was loaded into memory
for measurement, not written to localStorage. Frames include browser scheduling;
these are indicative local measurements, not absolute hardware gates.

Initial decoding/VM costs and very large memory/storage volumes remain real
limits. Memory numbers include concurrently retained source, decoded state,
serialized text and multiple projections; they are not isolated per-VM costs.
The target/stress sizes must not be assumed to fit browser storage quota.
Existing atomic quota failure/export behavior remains unchanged. No purge,
archive, compression, new persistence or hidden snapshot/day limit was added.
Manual assistive-reader and physical-touch-device audit remain human checks;
keyboard/ARIA and emulated touch were tested. Palette proximity is documented,
not fixed by recoloring other snapshots.

No engine, V6/V7 format, capture, Actuals/RAF/EAC/priority rule changed. No
Reservation frise, historical edition, restoration, replay, reference selector,
causal analysis, filtering/collapse or other out-of-11B capability was added.
**11B remains IN REVIEW, never DONE without independent audit and human validation.**

## Post-audit corrections — 2026-10-08

Initial HEAD: `665c9032665acd102c8a216d0ea39c7205c215e2`, the delivered 11B
implementation immediately following required baseline
`7a3ea6bf1c6c97e248075a75bc718279158ad0f5`. Required fetch/status/HEAD/divergence
checks passed before edits: correct branch, clean working tree, origin 0/0.

Correction A: the ViewModel previously collapsed every positive daily Forecast
sum into `allocated`. It now compares the exact sum with RAF using the existing
`compareRationals`, distinguishing fully allocated, partially allocated and no
allocation within horizon. Inactive, no remaining workload and daily allocations
unavailable retain their precedence. Tooltips display the resulting status.
No business quantity is converted to Number; metrics and captured data are unchanged.

Correction B: the tooltip previously inferred temporal visibility from
`geometry.rows`, which includes only vertically mounted groups. It now checks
positive captured daily totals against the intersection of the reference horizon
and current temporal viewport, using inclusive civil-day bounds. A vertically
unmounted row with temporally visible activity therefore retains correct details.
Absent, unavailable schema 1 and empty schema 2 rows never receive the outside-
window message. Vertical virtualization remains enabled.

Thirteen new tests (no new suite):

- `buildProjectHistoryViewModel.test.ts`: six Forecast qualifications and their
  tooltip labels; a partial RAF differing from its allocation beyond floating-
  point precision; Save → schema 2 → mixed V7 round trips → History with exact
  Actuals/Forecast and unchanged schema 1 metrics (eight tests).
- `createProjectHistoryCoordinator.test.ts`: vertical scroll with an unmounted
  focused row and retained virtualization; inclusive first/last visible days,
  range zoom, button zoom, pan and Reset; reference-axis clipping with a schema 1
  reference; absent/legacy/empty exceptions; mixed-schema Actuals and Forecast
  SVG paths, keyboard details and schema 2 label availability (five tests).
- The existing Planning multidraft characterization was strengthened: an invalid
  Project draft and a collapsed Reservation draft coexist through ten idempotent
  suspend/resume cycles; identities, session, projection, UI snapshot, dirty and
  blocked Save are checked on every cycle. No Planning production code changed.

Schema verification: old schema 1 captures remain readable with exact historical
metrics and no synthesized daily profile. Two consecutive successful Saves both
produce schema 2, persist V7 and reuse the published projection (one initial build,
exactly two writes). Import/export preserves each capture and its schema exactly.
Positive schema 2 Actuals and Forecast render actual SVG surfaces; every valid
schema 2 row in the mixed collection lacks the unavailable label in its details
and accessibility text, including empty schema 2. Existing V6/V7 validation,
source/capture and no-replay regression tests also pass. No old capture was edited.

Final gates: `npm run typecheck` PASS; `npm test` **805/805 tests, 93 suites**, zero
failures/cancelled/skipped/todo; `npm run build` PASS; `git diff --check` PASS.
The existing Planning characterizations, modal guards, listener counts, focus,
keyboard/touch/Escape, History viewport restoration and pan/Save/Delete cache tests
were replayed in the complete suite without weakening their expectations.

Only the two History production modules, History tests/shared fixture, Planning
characterization test and necessary documentation changed. No V6/V7 format,
engine, persistence layer, Actuals/RAF/EAC/priority rule or Planning behavior
changed. No scope extension. Prior volume/quota and manual accessibility/physical-
touch review limits remain; this correction pass adds no new identified risk.
**11B remains IN REVIEW pending a new independent audit and human validation.**
