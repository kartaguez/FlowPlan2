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
- Project editing for name, priority position, dates, and RAF by existing Team
  requirement;
- global multi-Team Reservations with ratio and fixed-daily modes;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, hover, semantic hit
  testing, and selection;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics and selected-date summaries.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

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
├── viewport controls
├── global time axis
├── Team panel
│   ├── Team header + Settings icon
│   └── lane
├── Team panel...
└── selected-date summary / selection summary / diagnostics

Portfolio sidebar
├── Projects
└── Reservations
```

The Team panels are aligned with lanes in one SVG/Geometry and one temporal
coordinate system. They are not independent timelines.

## Current editing contexts

The coordinator has one mutually exclusive editing context:

- `project`, opened from the Project list or a marker/allocation hit;
- `team`, opened from a Team Settings button or Team lane hit;
- `reservation`, opened from the Reservations list.

Changing context hydrates only the matching editor and clears the other two.
Timeline selection and shell-originated editing context are tracked separately
so a rerender can reconcile both safely.

## Current application commands

The editable session currently accepts:

- `update-planning-settings`: replaces horizon, global working pattern, and
  global parallelism setting;
- `update-project`: replaces editable fields and all existing Team
  requirements, including a priority-position move;
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
- Project Team-requirement membership cannot be added or removed;
- capacity periods can be edited but not added, removed, or reordered;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- priority is editable as a numeric position, but there is no drag/drop;
- Program and PriorityFamily/PAS dimensions do not exist yet;
- cursor summaries are daily only; cumulative cursor metrics and progress do
  not exist;
- Reservation allocation rows may be enabled/disabled for existing Teams, but
  the Reservation entity itself cannot be created or deleted;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- Program / PriorityFamily (PAS);
- cumulative cursor metrics and aggregated progress;
- priority drag/drop;
- structural CRUD and referential-integrity workflows around deletion;
- persistence, import/export, undo/redo;
- actuals/history, resource actual consumption, and snapshots.

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
