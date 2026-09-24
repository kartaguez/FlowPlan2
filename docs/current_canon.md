# FlowPlan2 current canon

This document describes the currently active product/build trajectory.
For durable invariants and architecture, see [canon](./canon.md).

`canon.md` is durable truth. `current_canon.md` is the truth of the currently
active implementation and trajectory. The remaining work is in the
[current plan](./current_plan.md).

## Validated implementation baseline

`29f67e65ebd384505c1abcf23570a7ce4467be2e` (validated lot 9E Team
structural CRUD, including its UI placement correction).

The active application implements a pure planning projection over an in-memory
demo session. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team creation with one or more initial capacity periods, restrictive Team
  deletion, and Team Settings for name and existing capacity periods;
- Project editing for name, dates, and Team requirements; Project priority is
  reordered from Portfolio Projects;
- global multi-Team Reservations with ratio and fixed-daily modes, edited in
  inline Portfolio cards;
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

The Projection date presentation pass is **IN REVIEW**. Its implementation
places the date in the global and Team timeline bands and in the projected
progress heading, while preserving one selected date and one temporal X
coordinate. This status does not advance the validated implementation baseline
or close the later structural CRUD lots.

## Current product trajectory

The trajectory remains **projection planning first**. The current run starts
from the RAF stored on each Project/Team requirement and produces a disposable
projection. It has no persistence or historical progression model.

Explicitly deferred:

- actuals/history and actual resource consumption;
- periodic or monthly snapshots;
- persistence, synchronization, import/export, and undo/redo.

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
├── Projects → reorder handles and #N badges; expandable cards with inline editor and Team subcards
└── Reservations → expandable cards with inline editor and Team subcards
```

The Team panels are aligned with lanes in one SVG/Geometry and one temporal
coordinate system. The date marker crosses the year/month axis and Team lanes;
the global metrics row and Team headers share the SVG's vertical layout. Team
panels are not independent timelines. The pale blue axis rows, Projection date
bands, Team collection row outside its Create Team button, and Team lanes are
clickable temporal surfaces. Each band repeats the
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
- `reorder-project`: moves one existing Project to a 1-based position in
  `portfolio.priorityOrder`, leaving every Project field unchanged;
- `create-team`: creates a Team with one or more initial capacity periods and a
  collision-safe session ID;
- `remove-team`: removes only an unreferenced Team, without cascade;
- `update-team-name`: renames one existing Team;
- `update-team-capacity-periods`: replaces existing periods by position while
  preserving the period count and order;
- `update-reservation`: replaces one existing global Reservation and all its
  enabled Team allocations.

Every accepted change immutably replaces session state and triggers one
projection rebuild. A same-position reorder retains the existing state and
projection. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from a hard-coded demo scenario; there is no persistence;
- structural CRUD remains absent for Projects and Reservations;
- Project Team-requirement membership can be added or removed through the
  existing Project update command; this is a targeted anticipation of 9F;
- capacity periods can be supplied when creating a Team; periods of an
  existing Team can be edited but not added, removed, or reordered;
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
- Reservation allocation rows may be enabled/disabled for existing Teams, but
  the Reservation entity itself cannot be created or deleted;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- Program / PriorityFamily (PAS) structural CRUD;
- Project and Reservation structural CRUD and their deletion workflows;
- persistence, import/export, undo/redo;
- actuals/history, resource actual consumption, and snapshots.

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
