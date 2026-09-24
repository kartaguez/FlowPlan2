# FlowPlan2 current canon

This document describes the currently active product/build trajectory.
For durable invariants and architecture, see [canon](./canon.md).

`canon.md` is durable truth. `current_canon.md` is the truth of the currently
active implementation and trajectory. The remaining work is in the
[current plan](./current_plan.md).

## Validated implementation baseline

The active application implements a pure planning projection over an in-memory
demo session. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team Settings for name and existing capacity periods;
- Project editing for name, priority position, dates, and Team requirements;
- global multi-Team Reservations with ratio and fixed-daily modes, edited in
  inline Portfolio cards;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, hover, semantic hit
  testing, and selection;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics, cumulative Team metrics, and Project / Program / PAS
  progress at the shared cursor date.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

Lot 9A is validated and **DONE**. Program and PriorityFamily (shown as
PAS) are optional Project associations. Their catalogs are static in the demo
session; the Project editor offers two optional selects, and each Portfolio
Project card shows `Program <name or —> · PAS <name or —>` beneath its title.
The associations have no effect on the planning result.

Lot 9B is validated and **DONE**. A pure adapter projects exact
cumulative Team utilization and Project, Program, and PAS progress for an
inclusive selected-date interval. The current-run RAF baseline comes from the
same Portfolio used to plan; Portfolio and horizon references travel with the
PlanningResult in the disposable session projection. Lot 9C is validated and
**DONE**. It adds exact daily non-compensating over-reservation and its ratio,
and renders cumulative Team metrics plus an exclusive Projects / Programs / PAS
progress view at the shared cursor date. Lot 9C.1 is **IN REVIEW**; its UI
cleanup has not advanced the validated baseline. Lot 9D waits for its human
validation.

The UI structure and interaction descriptions below include the implemented
9C.1 changes under review; they do not redefine the validated 9C baseline.

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
├── Projection date control
├── cumulative Projects / Programs / PAS progress
├── compact diagnostics counts → details modal
├── viewport controls
├── global time axis
├── Team panel
│   ├── Team header + Settings icon + cumulative metrics
│   └── lane
├── Team panel...
└── selection summary

Portfolio sidebar
├── Projects → expandable cards with inline editor and Team subcards
└── Reservations → expandable cards with inline editor and Team subcards
```

The Team panels are aligned with lanes in one SVG/Geometry and one temporal
coordinate system. They are not independent timelines.

## Current editing contexts

The coordinator has one mutually exclusive editing context:

- `project`, opened from the Project list or a marker/allocation hit;
- `team`, opened only from a Team Settings button;
- `reservation`, opened from the Reservations list or a Reservation segment hit.

Changing context hydrates only the matching editor and clears the other two.
Timeline selection and editing context are independent and reconciled
separately on rerender. Allocation and Project-marker hits open the Project
card; a named Reservation segment opens its Reservation card. Team and empty
hits only change Timeline selection, leaving any open editor unchanged. The
reserved Timeline region remains one aggregate capacity surface subdivided
visually into identifiable Reservation contributions. Only allocation and
Reservation-segment hits show a business tooltip. The Project tooltip uses the
Team requirement's initial RAF, a global Project estimated end date when all
requirements complete within the horizon, and exact whole-Project progress at
the shared Projection date.

Only one Portfolio card is edited at a time. Team association and detail
expansion are independent local draft states. Cancel discards the draft;
opening another card or changing tabs also discards it. A successful Apply
keeps the card open and rehydrates it from session state; a rejected Apply
preserves the draft without recomputation.

## Current application commands

The editable session currently accepts:

- `update-planning-settings`: replaces horizon, global working pattern, and
  global parallelism setting;
- `update-project`: replaces editable fields and the final set of Team
  requirements, including optional Program/PAS associations and a
  priority-position move;
- `update-team-name`: renames one existing Team;
- `update-team-capacity-periods`: replaces existing periods by position while
  preserving the period count and order;
- `update-reservation`: replaces one existing global Reservation and all its
  enabled Team allocations.

Every accepted command immutably replaces session state and triggers one
projection rebuild. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from a hard-coded demo scenario; there is no persistence;
- structural CRUD is absent for Teams, Projects, and Reservations;
- Project Team-requirement membership can be added or removed through the
  existing Project update command; this is a targeted anticipation of 9F;
- capacity periods can be edited but not added, removed, or reordered;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- priority is editable as a numeric position, but there is no drag/drop;
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
- priority drag/drop;
- structural CRUD and referential-integrity workflows around deletion;
- persistence, import/export, undo/redo;
- actuals/history, resource actual consumption, and snapshots.

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
