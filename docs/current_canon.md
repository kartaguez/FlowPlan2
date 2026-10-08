# FlowPlan2 current canon

This document describes the currently active product/build trajectory.
For durable invariants and architecture, see [canon](./canon.md).

`canon.md` is durable truth. `current_canon.md` is the truth of the currently
active implementation and trajectory. The remaining work is in the
[current plan](./current_plan.md).

## Validated implementation baseline

`06e7fbb94d71fe73a35e244d4cee6626b65777c2` (11A.2 final code/test baseline, verified on
2026-10-08 from `c295db34937dca2dbe86f403319dc8880563d94c`; documentation
closure follows on the same branch). 11A and 11A.2 are **DONE**.
11B is **IN REVIEW** from implementation baseline `7a3ea6bf1c6c97e248075a75bc718279158ad0f5`; independent audit and human validation remain required. See [11B contract, gates and measurements](./steps/HISTORY/lot11b_canon.md).

The active application implements a pure planning projection over an editable
session, restored from a local backup when available and otherwise initialized
from the demo. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team creation with one or more initial capacity periods, restrictive Team
  deletion, and Team Settings for name and structural capacity-period editing;
- Project creation and confirmed deletion, plus editing of name, dates, and
  Team requirements; Project priority is reordered from Portfolio Projects;
- global multi-Team Reservations with ratio and fixed-daily modes, created,
  edited, and deleted in inline Portfolio cards;
- immutable Project and Reservation Actuals snapshot histories, exact daily
  reconstruction, Actuals-aware planning projection, and transactional V7 persistence;
- whole-object Actuals partition/RAF editing and read-only V4/snapshot history in Portfolio cards;
- immediate Project and Reservation activation controls; inactive entities
  remain in the Portfolio and do not participate in the forecast;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, semantic hit testing,
  and hover;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics, cumulative Team and global exact Actual/forecast load,
  occupancy and both overload causes, and Project / Program / Pas progress at
  the shared cursor date.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

Lot 9H complete local planning backup/restore is validated and **DONE**. The
browser loads a validated versioned document from one localStorage key, or the
demo when the key is absent. A present but invalid document is reported and left
untouched at startup. Accepted commands persist their candidate state before
the session publishes it. Planning Settings can export the complete business
state to JSON or import a validated file after confirmation; a successful
import reloads the page. Current backups are compact V7 documents. V1–V6 remain
readable; V1 migrates Projects and Reservations as active. The V1–V5 readers retain their historical repair policy: they remove
orphan catalog entries, repair missing or invalid Program and own colors, and
remove residual own colors from Program members before Domain validation. V6/V7
validate current and historical inputs strictly, without repair or pruning.
Other invalid business data is rejected. Every successful import is persisted
as V7. Startup never rewrites an older valid document. V4 Actuals records are retained losslessly for explicit reconciliation.

Lot 9I Project and Reservation forecast activation is validated and **DONE** at
`c77558c3e8b2912532afbb8113ac8183fe737c18`. Both entity types default
to active. Portfolio cards expose immediate Active/Inactive controls outside
their Apply/Cancel drafts; ordinary Apply preserves the current activation
state. Inactive Projects retain their global priority position exactly in
`Portfolio.priorityOrder` but have no Team plan, allocations, markers, forecast
diagnostics, or projected progress metrics. Inactive Reservations retain their
configured request and 9G display order but contribute no forecast demand,
timeline segment, or Team/global occupancy. `TEAM_OVER_RESERVED` remains a Team
aggregate of all active Reservation requests. Independent drafts and UI context
survive a successful toggle. The existing localStorage key is unchanged.

Lot 9A is validated and **DONE** as the original Program/PriorityFamily
foundation. The validated corrective lot extends both optional associations to
Reservations and makes catalogs usage-driven across both entity types. An
inactive reference retains its catalog entry; only active members contribute
to forecast progress. Cards offer None, an existing value, or a new normalized
value directly, without separate catalog management. The UI calls
PriorityFamily « Pas »; the technical name remains. Associations still have no
effect on planning priority or admission.

The corrective lot is validated and **DONE**. Programs own a color; an ungrouped
Project or Reservation owns its color; a Program member has no hidden own
color. Cards preview their derived pastel locally until Apply, and frises use
the exact effective color while keeping their Project/Reservation distinction.
Only an Apply that actually edits Color can replace a Program color changed by
another draft. A new Program gets one suggested color at the transition to New;
typing its name leaves the draft color stable. Program to None suggests a new
own color, while None to None preserves the existing color. New name inputs
appear only while New is selected. Suggested colors remain freely editable.
Reservation progress counts exact demand in the
inclusive planning horizon as its total charge, and demand through the
Projection date in that same horizon as consumed work. Group progress divides
sums of consumed work by sums of charges, without averaging percentages.

The corrective Mandatory performance fix keeps exact allocations and the
existing deadline semantics. The engine caches each Team's base Project
capacity by civil date, skips future residual trajectory materialization when
no later admitted mandatory Project can read it, and cancels rational factors
before multiplying large numerators and denominators. The real V3 backup
`FP2-DTO-2026.10.01.json`, with `12178 - SDD` changed to Mandatory at its
2027-02-28 objective, produces the same exact planning-result digest as the
pre-fix engine. It separates the finite-loop termination guarantee from
practical cost: on this case the full projection fell from about 46 seconds
to under 0.4 seconds in a local Node measurement.

Lot 9B is validated and **DONE**. A pure adapter projects exact
cumulative Team utilization and Project, Program, and PAS progress for an
inclusive selected-date interval. The current-run RAF baseline comes from the
same Portfolio used to plan; Portfolio and horizon references travel with the
PlanningResult in the disposable session projection. Lot 9C is validated and
**DONE**. It adds exact daily non-compensating over-reservation and its ratio,
and renders cumulative Team metrics plus an exclusive Projects / Programs / Pas
progress view at the shared cursor date. Lot 9C.1 is validated and **DONE**.
The subsequent FlowPlan visual adaptation and corrective pass are also
validated and **DONE**. Lot 9D priority drag/drop is validated and **DONE**.
It adds pointer and keyboard handles, derived `#N` badges, and a temporary
insertion preview to Portfolio Projects. Reordering preserves Project and
Reservation drafts and the current projection controls.

Lot 9E Team structural CRUD is validated and **DONE**. Create Team accepts a
name and one or more exact initial capacity periods, validated as one schedule
under a session-generated ID. Confirmed deletion is refused while a persisted
Project requirement or Reservation allocation references the Team. The UI
separately protects unapplied Project and Reservation draft changes concerning
that Team before dispatch. Successful lifecycle changes follow the existing
single-reprojection pipeline. The global metrics cartouche is titled, and
Create Team appears between it and the first Team panel.

Lot 9F Project structural CRUD is validated and **DONE**. Create Project starts
with no Team enabled and requires at least one explicit Team requirement with
exact RAF. A session-generated Project ID is collision-safe; creation appends the
Project once at the end of `Portfolio.priorityOrder`, where 9D can then reorder
it. Delete Project follows the Team deletion pattern: dirty local edits are
discarded only after confirmation, followed by an inline deletion
confirmation. The deleted Project's card and draft disappear; other Project
and Reservation drafts, temporal controls, and the progress view survive the
reprojection. The Delete Team UI guard also protects a Team enabled in an
unapplied Create Project draft. Persisted Project requirements continue to
block Team deletion restrictively.

The Projection date presentation pass is validated and **DONE**. Its implementation
places the date in the global and Team timeline bands and in the projected
progress heading, while preserving one selected date and one temporal X
coordinate.

Lot 9G Reservation and capacity-period structural CRUD is validated and
**DONE**.
Create Reservation begins with a local empty-name draft at the planning horizon
and no enabled Team; a validated Reservation may have zero allocations even
when no Team exists. Session-generated IDs skip collisions. Confirmed deletion
discards only the target Reservation draft and preserves independent drafts.
Cards use a derived start/end/exact-requested-total/name display order, with ID
only as a deterministic tie-break; Portfolio order is not changed. The total
uses canonical daily Reservation request calculations across the full inclusive
interval and Team schedules and exceptions, including dates outside the
planning horizon. Delete Team also protects a Team enabled in a local Create
Reservation draft.

Team Settings now adds and removes capacity periods, including the last one.
Unapplied rows may be invalid; Apply validates and sorts the final schedule
chronologically while preserving exact untouched quantities and all existing
capacity exceptions. Cancel restores the persisted schedule without a session
mutation or planning recomputation. Create Team still requires at least one
initial period. There is no manual period reorder or Domain period ID.

## Current objective — Lot 10: Actuals & History

10A through 10C.2 are validated **DONE** lots (10C.2 closed by the user
for the 11A pass). 10D is **superseded by 11A**, not DONE. 10E is
**largely superseded by 11B**, with advanced replay/navigation/comparison deferred. The current business contract is the
[10C.1 snapshot canon](./steps/ACTUALS/lot10c1_canon.md);
the 10A–10C documents describe their historical releases.

### Current object knowledge

Each Project and Reservation can own consecutive immutable whole-object
Actuals snapshots with a stable ID, version and application-clock knowledge
date. A snapshot lists current Team participants and a separate set of
retired zero Teams. Its optional Actuals coverage is a common inclusive range
partitioned into contiguous periods, each with exact nonnegative consumed
values for every participating Team. Project snapshots additionally contain
exact RAF for every current Team, mirrored into its forecast requirement. A
snapshot without coverage can still carry Project RAF. Absent knowledge is
distinct from explicitly zero values. The end of coverage cannot exceed the
snapshot knowledge date, but Actuals may lie outside Forecast and planning
bounds.

The full-object transaction can add, replace, split, merge, extend or erode
coverage, edit RAF alone, or change Team membership. Changed nonzero cells
need explicit values; an all-zero prior zone can propagate zero through a
repartition. A changed Actuals end date requires explicit validation of all
current Project RAF. Removing a Team requires zero current consumed values
and confirms current RAF zero; historical snapshots retain prior values.
Reintroduction requires explicit current values and RAF. An effective Apply
increments the object's version. No-op, invalid, stale and failed projection
or persistence actions publish nothing.

### Legacy V4 and V5 persistence

V5 remains the object Actuals schema; V7 is the live backup and export envelope. V1–V3 import without Actuals
snapshots. Imported V4 cumulative records remain lossless, read-only
`legacyV4Actuals` migration evidence. Until an object is explicitly
reconciled, only the legacy adapter reconstructs its Actuals. Reconciliation
requires a complete validated current partition and Project RAF, then creates
its first V5 snapshot at the application clock date. Afterward only its
current V5 snapshot reconstructs simulated Actuals; the V4 payload remains
exportable but never combines with it. V4 append commands are disabled.
Historical object and Team identities remain protected while referenced.
V5 import rejects any snapshot whose knowledge date is later than the UTC
civil date of the backup's canonical `exportedAt`, across both object types
and the full history. This legacy V5-reader rule is unchanged. V6/V7 impose no
technical-clock relation between exportedAt, createdAt and knowledgeDate, so
clock rollback remains round-trippable; internal Actuals invariants still apply.

### Daily reconstruction, planning and UI

Each current snapshot period's exact amount is distributed across its own
civil dates using effective Team capacity weights. If all weights are zero,
working weekdays and capacity-exception dates share the amount equally; if
none exist, all civil dates share it. The sum is exact. This daily occupation
is a calculated projection, never a claim of daily observation. Capacity is a
weight, not a ceiling. Project and Reservation Actuals may overlap and exceed
capacity. Source kind, object, snapshot, period, Team and day flow to timeline
hit testing and tooltips. Metrics and overload diagnostics use only the active
source mode for each object and the current projected run.

The planning engine receives current RAF and exact daily occupation, not
snapshot histories. Actual Project and Reservation occupation is applied
before Reservation forecast and Project forecast. `isActive` affects only
forecast participation. Project, Program and Pas progress stays forecast
based, so Actuals occupation is not subtracted from RAF a second time.

Project and Reservation cards show the current Team × period matrix, Team
participation, current Project RAF or Reservation allocation, and read-only
snapshot and V4 history. Drafts remain local until Apply; Cancel clears only
the Actuals draft. The card submits one atomic whole-object command. Disjoint
field edits can rebase on a newer snapshot; concurrent partition changes and
conflicting fields become stale. A local Forecast membership or RAF draft must
be sequenced and rebased before a dependent Actuals Apply. The matrix scrolls
horizontally in narrow cards while labels and action controls retain keyboard
focus styling.

11A captures the cross-object, Forecast and capacity knowledge formerly scoped
by 10D. Its immutable Portfolio artifact is distinct from object Actuals and
from the disposable planning projection. Project drift is implemented in read-only 11B (IN REVIEW);
advanced replay/navigation/comparison remain deferred beyond that promise.

## Portfolio Snapshots — Lot 11A

Status: **DONE** at `f477dd6e1a31f3be7be949dad9fea4cae9667770`,
validated baseline supplied for the 11A.2 pass.

Implementation and final gate record: [11A canon](./steps/PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
The Planning header offers Save portfolio snapshot and a local-time list ordered
by `(createdAt, snapshotId)` ascending. Save is clean-only with a live global
dirty precondition; Delete confirms one entire snapshot. All inputs and exact
minimal Project metrics are deeply copied and frozen. The published run supplies
estimated dates without recomputation. Shared helpers implement first positive
Actuals/Forecast activity and the Timeline completion/end rule.

Complete V7 documents retain current-owned Actuals histories once. Each capture
selects a fixed V5 ID or exclusive frozen legacy evidence, never a latest-at-read
rule. Historical validation hydrates prefixes privately, without invoking the
engine. None, uncovered RAF-only and covered zero knowledge stay distinct.
Save/Delete leave the cursor, viewport, tabs, open cards, drafts and planning
projection intact. Ordinary commands retain the collection and reproject once.
Historical IDs remain reserved for all five entity kinds while a retained
snapshot references them; removing history does no implicit Actuals collection.


## Historical daily load profiles — Lot 11A.2

Status: **DONE**. [Contract and verification](./steps/HISTORY/lot11a2_canon.md).
New Saves use forecast schema 2 with an obligatory Project `dailyProfile`:
`actualsRange` (nullable source knowledge coverage), `forecastRange` (complete
planning horizon), and sorted unique `days` with canonical exact rational
`actualsWorkload` and `forecastWorkload`. Only days with at least one positive
component are stored. Covered zero and missing coverage remain distinct, as do
legacy schema 1 without a profile and schema 2 with an empty list.

Actuals come from the published reconstruction contributions, Forecast from
published Project allocations, aggregated across all Teams without clipping
Actuals to the horizon. Exact conservation, source ranges, activity dates and
deep immutability are validated. Every active Project has at least one Team
requirement, all referenced Teams exist, and the priority order covers every
Project exactly once. The engine publishes one plan per active requirement even
without admission/allocation; positive unallocated RAF produces incomplete plans,
not an empty plan list. Save verifies fully allocated run equality;
partial/unallocated RAF stays in the independent RAF total. No new Actuals
snapshot, legacy reconciliation, engine run or historical redistribution occurs.

V7 accepts schema 1 and 2 together. V6 remains schema 1 only; import preserves
its captures unchanged and never manufactures daily profiles. V6 encoding
rejects schema 2. Save/Delete and ordinary accepted commands write V7 before
publication using the same storage key. Quota/codec errors preserve previous
state and document without purge. 11A.2 itself introduced no UI mode, view, renderer or Timeline
refactoring; the separate 11B implementation follows below. Final edge-case verification found no production defect;
755/755 tests, typecheck, build and diff checks pass. The user-authorized closure
is complete. The separate 11B implementation is now **IN REVIEW**; the 11A.2 release itself introduced no History UI.


## Project History — Lot 11B

Status: **IN REVIEW**. [Implementation, acceptance coverage and measurements](./steps/HISTORY/lot11b_canon.md).
The workspace selector defaults to Planning and opens read-only Project History
in the main space. Planning DOM/editor owners survive idempotent suspend/resume;
modals explicitly block switching. Drafts, dirty, viewport/date, cards/tabs and
focus return unchanged, without projection rebuilding or persistence.

History reads validated captured DTOs only, with no current-label fallback,
V5 hydration or engine replay. It displays the historical Project union, S rows
per group, exact sparse daily Actuals/Forecast stacks, inclusive knowledge markers,
legacy-profile unavailability and previous-presence comparisons. The reference
snapshot owns one horizon; History has an independent viewport and a common
exact visual cap, resampled on effective zoom/dataset changes and stable at pan.
The cache compares canonical ordered snapshot IDs rather than collection copies.

Rows support hover, focus, daily keyboard navigation and touch. Exact metrics,
coverage/status, timestamps/IDs, dates/reasons and deltas remain in accessible
details; Escape closes them. ID-derived snapshot colors are Programme-independent.
Heavy surfaces are windowed by date and visible Project groups; full gutter rows
retain sequential keyboard access. No Reservations frise, edit, restore, replay,
reference selection or advanced analysis is included. Final suite: 792 tests /
93 suites; typecheck/build/diff checks pass. Desktop/narrow and light/dark review,
benchmark data and known memory/storage/color limits are recorded in the canon.

## Current UI structure

```text
Planning
├── global Settings icon, Save portfolio snapshot and snapshot list/Delete
├── cumulative Projects / Programs / Pas progress, titled with the Projection date
├── compact diagnostics counts → details modal
├── viewport controls
├── global Projection date band, then year/month rows with the shared marker
├── titled global cumulative Capacity / Occupied / Occupancy / Over-reservation
├── Create Team control for the Team panel collection
├── Team panel
│   ├── Team header + Settings icon + the same four cumulative metrics
│   └── Projection date band above the Project/Reservation lane
├── Team panel...
└── Project and Reservation hover tooltips

Portfolio sidebar
├── Projects → Create Project; reorder handles and #N badges; expandable cards with inline editor, Team subcards and Delete Project
└── Reservations → Create Reservation; expandable cards with inline editor, Team subcards and Delete Reservation
```

The Team panels are aligned with lanes in one SVG/Geometry and one temporal
coordinate system. The date marker crosses the year/month axis and Team lanes;
the global metrics row and Team headers share the SVG's vertical layout. Team
panels are not independent timelines. The pale blue axis rows, Projection date
bands, Team collection row outside its Create Team button, and Team lanes are
clickable temporal surfaces. The Team collection row shows the blue marker
segment without a date label. Each Projection date band repeats the
formatted date beside the same blue marker. The Timeline itself accepts
Left/Right, Home/End keyboard navigation; Ctrl+Left/Right remains global outside
editable fields and modals. The four cumulative metrics use the
inclusive horizon-start-to-selected-date interval. Occupied is requested
reservations plus allocations. The global cartouche sums exact Team quantities
before calculating its ratios; over-reservation remains non-compensating.

The temporal zoom interaction is validated and **DONE**. Zoom +/− uses the
Projection date as its visual anchor while it is in view, or the nearest
visible edge after a pan places it out of view. The date itself does not
change. A primary-pointer click moves that date only when confirmed on pointer
release. Horizontal drag of at least 4 CSS pixels selects an inclusive date
range, shows its two dates
and a translucent preview, and changes the shared viewport on release. A
shorter range expands symmetrically to the seven-day minimum, then clamps to
the horizon. Shift + drag remains pan. The range preview is transient UI
state; Project and Reservation segments remain unselected, and their tooltips
are hidden only while a range drag is active. Native text selection is
disabled on timeline surfaces, not on editable controls.

## Current editing behavior

Project and Reservation cards open independently from the Portfolio lists.
Several cards can stay open and dirty across tab changes. Each card has a
local UI draft; input and change events never dispatch Planning commands.
Apply updates only its entity and rebases other drafts against the new session;
Cancel abandons only its own draft. Dirty borders reflect actual differences
from the current session reference, including Team subcards. Collapsing a card
or Team leaves its draft intact. Team Settings remains a separate modal opened
only from its Settings button.

Every confirmed Timeline click moves only the Projection date according to its
temporal X coordinate. The Timeline has no selected entity or selection summary. The
reserved Timeline region remains one aggregate capacity surface subdivided
visually into identifiable Reservation contributions. Only allocation and
Reservation-segment hits show a business tooltip. The Project tooltip uses the
Team requirement's initial RAF, a global Project estimated end date when all
requirements complete within the horizon, and exact whole-Project progress at
the shared Projection date.

Project Objective end and Mandatory are presented as one date and a toggle.
Mandatory maps to the same date in the existing deadline field; historical
divergent deadlines must be explicitly aligned or removed before Apply.

## Current application commands

The editable session currently accepts:

- `update-planning-settings`: replaces horizon, global working pattern, and
  global parallelism setting;
- `update-project`: replaces editable fields and the final set of Team
  requirements, including optional Program/Pas associations, without changing
  Project priority;
- `create-project`: creates one Project with explicitly supplied Team
  requirements and appends it to global priority;
- `remove-project`: removes one Project and its priority entry atomically;
- `reorder-project`: moves one existing Project to a 1-based position in
  `portfolio.priorityOrder`, leaving every Project field unchanged;
- `create-team`: creates a Team with one or more initial capacity periods and a
  collision-safe session ID;
- `remove-team`: removes only an unreferenced Team, without cascade;
- `update-team-name`: renames one existing Team;
- `update-team-capacity-periods`: atomically replaces a Team's capacity periods
  with a validated schedule, including an empty schedule;
- `create-reservation`: creates one validated global Reservation with a
  collision-safe session ID and optionally zero Team allocations;
- `update-reservation`: replaces one existing global Reservation and all its
  enabled Team allocations;
- `remove-reservation`: removes one existing global Reservation.

Every ordinary accepted input change immutably replaces session state and triggers one
projection rebuild. Dedicated Portfolio Snapshot Save/Delete persist first and
reuse the projection with zero recomputation. A same-position reorder retains the existing state and
projection. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from the hard-coded demo when no valid local backup is
  available; an invalid stored document is preserved and reported;
- existing Project Team requirement membership continues to use
  `update-project`;
- capacity periods can be added or removed for an existing Team, but have no
  manual reorder control;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- Project priority is reordered through Portfolio Projects handles; card
  badges show derived positions;
- Program/Pas catalogs are derived from Project and Reservation references;
  they have no separate management or global rename UI;
- the former daily Team summary is removed; cumulative metrics remain in Team
  headers and the Projects / Programs / Pas surface;
- Ctrl+ArrowLeft/Right moves the Projection date outside editable fields and
  modals without recomputing planning;
- Reservation allocation rows may be enabled/disabled for existing Teams;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- separate Program / PriorityFamily management screens or global rename;
- undo/redo;
- advanced historical replay/navigation/comparison and restoration (deferred).

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
