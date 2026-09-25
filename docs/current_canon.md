# FlowPlan2 current canon

This document describes the currently active product/build trajectory.
For durable invariants and architecture, see [canon](./canon.md).

`canon.md` is durable truth. `current_canon.md` is the truth of the currently
active implementation and trajectory. The remaining work is in the
[current plan](./current_plan.md).

## Validated implementation baseline

`5700731671f0a6fa3ad5cba98ca81850ddb02d03` (validated lot 9G Reservation
and capacity-period structural CRUD). The separate Projection date presentation
pass remains in review outside this validated baseline.

The active application implements a pure planning projection over an in-memory
demo session. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team creation with one or more initial capacity periods, restrictive Team
  deletion, and Team Settings for name and structural capacity-period editing;
- Project creation and confirmed deletion, plus editing of name, dates, and
  Team requirements; Project priority is reordered from Portfolio Projects;
- global multi-Team Reservations with ratio and fixed-daily modes, created,
  edited, and deleted in inline Portfolio cards;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, semantic hit testing,
  and hover;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics, cumulative Team and global Capacity / Occupied /
  Occupancy / Over-reservation metrics, and Project / Program / PAS progress at
  the shared cursor date.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

Lot 9A is validated and **DONE**. Program and PriorityFamily (shown as
PAS) are optional Project associations. Their catalogs are static in the demo
session; the Project editor offers two optional selects, and each Portfolio
Project card shows `Program <name or —> · PaS <name or —>` beneath its title.
The associations have no effect on the planning result.

Lot 9B is validated and **DONE**. A pure adapter projects exact
cumulative Team utilization and Project, Program, and PAS progress for an
inclusive selected-date interval. The current-run RAF baseline comes from the
same Portfolio used to plan; Portfolio and horizon references travel with the
PlanningResult in the disposable session projection. Lot 9C is validated and
**DONE**. It adds exact daily non-compensating over-reservation and its ratio,
and renders cumulative Team metrics plus an exclusive Projects / Programs / PAS
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

The Projection date presentation pass is **IN REVIEW**. Its implementation
places the date in the global and Team timeline bands and in the projected
progress heading, while preserving one selected date and one temporal X
coordinate. This separate status does not advance the validated implementation
baseline.

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

Lot 10 is the active product and architecture target; none of 10A–10E is
implemented yet. The current run still starts from the RAF stored on each
Project/Team requirement and produces a disposable projection. The in-memory
session has no actuals records, historical progression, or snapshots.

### Business knowledge and dates

Each Project and each Reservation has its own `actualsThroughDate`: its
consumption is known through that date. These dates may differ between objects;
there is no required global consumption cutoff. A later knowledge snapshot has
its own date, distinct from every object's `actualsThroughDate`, and may contain
objects with different actuals dates.

Successive actuals updates preserve immutable business records. A Project
record carries its actuals date and, for each Team, cumulative consumed work
and remaining workload (RAF) known at that date. A Reservation record carries
its own actuals date and cumulative consumed work per Team. Exact types and
names remain to be designed in 10A. A Project's new RAF is a new business
estimate, not a value derivable forever from its initial RAF. For consecutive
Project records, `consumedDelta = newCumulativeConsumed -
previousCumulativeConsumed`; the later workflow proposes
`max(0, previousRemaining - consumedDelta)` but lets the user correct it.

Reservation actual consumption is separate from Reservation forecast demand.
The latter remains a ratio of effective daily capacity or an exact fixed-daily
request over applicable dates. Fixed-daily is neither RAF nor a total workload
to spread across the interval. Actual/forecast and Project/Reservation are
independent axes.

### Reconstructed daily occupation and forecast

Users declare cumulative consumption at dated records, not observed daily
values. For the delta between successive records, FlowPlan2 reconstructs a
deterministic daily distribution. This distribution is a computed projection,
not a historical claim or a persisted user observation. Effective Team
capacity weights eligible days. When the period's positive effective capacity
sum is nonzero, each day's share is `consumedDelta ×
effectiveCapacity(day) / totalEffectiveCapacity(period)`; zero-capacity days
normally receive zero. If all eligible days have zero effective capacity, a
deterministic fallback still distributes the entire declared delta across
eligible days. Capacity is a weight, never a ceiling on actuals. Multiple
Project and Reservation actuals can overlap and exceed capacity. The precise
eligibility and first-record boundary rules belong to 10A.

For each Team/day, actual Project occupation and actual Reservation occupation
are preserved in full. Forecast Reservation demand retains its current
non-clamped semantics, including over-reservation. Forecast Project allocation
alone is bounded by remaining capacity. Conceptually, the order is Project
actual, Reservation actual, Reservation forecast, then Project forecast, and
`capacityForProjectForecast = max(0, effectiveCapacity - actualLoad -
forecastReservationLoad)`. This expresses the target business behavior, not a
premature engine API. Actual overload and forecast Reservation overload need
distinct diagnostics; a combined overload flag would lose their causes.

### Architecture and historical knowledge

The intended boundary is:

```text
immutable Actuals Records
→ deterministic reconstruction
→ calculated daily actual occupation
→ Planning Engine
→ forecast and disposable presentation projections
```

Actuals records, their knowledge dates, snapshots, historical version
selection, and drift comparison stay upstream of the Planning Engine. The
engine will need calculated daily occupation to determine Project forecast
capacity, including in deadline feasibility calculations; it must not become
the owner of historical records or replay. The current `PlanningInput`,
`TeamDayCapacity`, diagnostics, timeline adapter, cursor metrics, and session
recomputation contain forecast-only contracts and will need deliberate review
in 10B. The Project requirement's `remainingWorkload` currently initializes
the engine's per-Team RAF; future current RAF must remain consistent with the
latest known Project estimate without treating forecast allocations as actuals.

Knowledge snapshots in 10D preserve immutable views of what FlowPlan2 knew
at a snapshot date; they are distinct from per-object actuals records. In 10E,
historical reconstruction and drift comparison may compare consumed work,
RAF, projections, estimated dates, and capacity/overload using the knowledge
available at different snapshot dates.

The durable [canon](./canon.md) currently says actuals/history feed only a
revised RAF into the engine. Its enduring prohibition on historical state in
the engine stands; its RAF-only diagram and wording require refinement when
10B introduces calculated daily actual occupation as a projection input.
The current formulas for `projectCapacity`, `TEAM_OVER_RESERVED`, and occupied
cursor metrics describe the implemented forecast-only system and cannot be
read as complete Lot 10 formulas. No code or durable canon change is made by
this documentary framing pass.

Open decisions include exact record types, date/Team validation and the
first-record interval, snapshot contract and storage, migration, 10C UI,
historical comparison UX, and drift visualization. Persistence,
synchronization, import/export, and undo/redo are not specified here.

## Current UI structure

```text
Planning
├── global Settings icon
├── cumulative Projects / Programs / PAS progress, titled with the Projection date
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

## Current editing behavior

Project and Reservation cards open independently from the Portfolio lists.
Several cards can stay open and dirty across tab changes. Each card has a
local UI draft; input and change events never dispatch Planning commands.
Apply updates only its entity and rebases other drafts against the new session;
Cancel abandons only its own draft. Dirty borders reflect actual differences
from the current session reference, including Team subcards. Collapsing a card
or Team leaves its draft intact. Team Settings remains a separate modal opened
only from its Settings button.

Every Timeline click moves only the Projection date according to its temporal
X coordinate. The Timeline has no selected entity or selection summary. The
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
  requirements, including optional Program/PAS associations, without changing
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

Every accepted change immutably replaces session state and triggers one
projection rebuild. A same-position reorder retains the existing state and
projection. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from a hard-coded demo scenario; there is no persistence;
- existing Project Team requirement membership continues to use
  `update-project`;
- capacity periods can be added or removed for an existing Team, but have no
  manual reorder control;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- Project priority is reordered through Portfolio Projects handles; card
  badges show derived positions;
- Program and PriorityFamily/PAS catalogs are static; they have no create,
  delete, or rename UI;
- the former daily Team summary is removed; cumulative metrics remain in Team
  headers and the Projects / Programs / PAS surface;
- Ctrl+ArrowLeft/Right moves the Projection date outside editable fields and
  modals without recomputing planning;
- Reservation allocation rows may be enabled/disabled for existing Teams;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- Program / PriorityFamily (PAS) structural CRUD;
- persistence, import/export, undo/redo;
- actuals records, resource actual consumption, and knowledge snapshots
  (the Lot 10 target above, not yet implemented).

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
