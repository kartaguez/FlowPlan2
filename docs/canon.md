# FlowPlan2 durable canon

This document is the durable product, domain, and architecture truth for
FlowPlan2. It is not a phase log. For the implementation currently in force,
see the [current canon](./current_canon.md). For the ordered work still to do,
see the [current plan](./current_plan.md).

`canon.md` = durable truth. `current_canon.md` = currently active
implementation/trajectory truth. A rule belongs here when future lots must not
re-invent it.

## Product and business purpose

FlowPlan2 is a planning projection tool. It displays, on one chronological
global horizon, how teams could work through globally prioritized projects.
It is a deterministic projection from current planning inputs, not a record of
work already performed and not a global optimization solver.

The central conceptual model is:

```text
Planning
├── horizon
├── working weekdays
└── maxParallelProjects

Portfolio
├── Teams
├── Projects
├── Programs
├── PriorityFamilies
├── priorityOrder
└── Reservations
```

Each Project and Reservation has an `isActive` flag, active by default. It
controls participation in the current forecast only. An inactive entity remains
in the Portfolio with its identity, associations, exact quantities, and
editable business data; future actuals or history may remain attached to it.
Activation never deletes or reorders an entity and never relaxes Portfolio
structural validation. `Portfolio.priorityOrder` remains the sole Project
priority source, including inactive Projects. The planner skips inactive
Projects in Team admission and inactive Reservations in reserved demand; active
Reservation requests retain their existing non-clamped semantics.

The engine answers this question:

> Given known capacity, calculated daily Actual occupation, prioritized projects,
> remaining workload (RAF) by Team, capacity reservations, Project dates, and a parallelism limit, how
> should Team usage be projected day by day?

## Actuals knowledge stays upstream of planning

```text
current object snapshot or pending V4 legacy → deterministic reconstruction → daily Project/Reservation occupation
current RAF + daily occupation + forecast inputs → Planning Engine
```

Snapshot histories and retained legacy records remain upstream. Each object
has exactly one active Actuals source: its current V5 snapshot, or pending V4
legacy before reconciliation. The engine receives only exact, non-negative
calculated daily occupation by Team/date; an absent row means zero. It never
owns records, partitions, reconstruction weights, or snapshots. A Project's
current snapshot RAF is mirrored into its forecast requirements and is never
reduced again by the engine. V5 preserves immutable history; V4 records remain
read-only migration evidence after explicit reconciliation.

## Layered architecture

```text
Domain
  ↓
Application
  ↓
PlanningResult / adapters
  ↓
TimelineViewModel
  ↓
TimelineGeometry
  ↓
Vanilla DOM / SVG UI
```

- Domain owns business entities, exact quantities, validation, capacity
  semantics, and planning decisions. It never depends on UI or browser APIs.
- Application owns editable session state and typed use cases/commands. It
  coordinates the domain without duplicating its rules.
- `PlanningResult` is the engine output. Presentation adapters join and reshape
  it with Portfolio identity and labels; they do not re-plan.
- `TimelineViewModel` is a semantic presentation projection without pixels,
  DOM, or SVG.
- `TimelineGeometry` positions already-decided semantic data. It makes no
  business decision.
- UI renders and translates user intent. Visual presentation must never be
  used to infer a business rule.

ViewModels and Geometry are immutable, disposable projections. They are never
sources of truth and are never mutated as application state.

Cursor metrics are a separate exact adapter projection over the current run's
Portfolio, PlanningResult, horizon, and a presentation-selected date. They
accumulate inclusive daily Team effective, Project Actual, Reservation Actual,
forecast Reservation demand, and Project forecast allocation capacities.
Utilization is `(Project Actual + Reservation Actual + forecast Reservation + Project forecast) / effective`,
undefined when effective is zero and otherwise unclamped. Project progress
divides cumulative allocations across all Teams by the sum of its requirements'
RAF at the start of that run. Program and PriorityFamily (shown as Pas)
progress divides the sum of active members' consumed work by the sum of their
charges, across Projects and Reservations. For a Reservation, both quantities
use exact requested demand only inside the inclusive planning horizon; the
consumed quantity stops at the Projection date. This Reservation quantity
calculation stays in the metrics adapter so future actuals can replace forecast
consumption without changing the planning engine. A zero baseline for a
non-empty projected group means exact completion. Inactive members retain
their catalog references but do not contribute to forecast progress. Cursor
changes do not recompute planning.
For each Team, cumulative over-reservation on the same inclusive interval is
`Σ max(0, Reserved(day) - Effective(day))`, summed day by day; unused capacity
on another day never offsets an over-reserved day. Its ratio is cumulative
over-reservation divided by cumulative effective capacity, and is undefined
when cumulative effective capacity is zero. Both remain exact Rational metrics.
The global capacity summary sums exact Team capacity, occupied capacity
(`requested reserved + allocated`), and daily over-reservation first, then
divides the global quantities for occupancy and over-reservation ratios. It
does not average Team ratios or offset one Team's daily excess with another
Team's unused capacity.

## Editable application state and transaction pipeline

```text
PlanningSessionState
├── portfolio
├── planning
└── portfolioSnapshots
```

The session owns the editable source. The canonical pipeline is:

```text
UI intent
→ typed application command
→ immutable state update
→ recomputePlanning
→ build TimelineViewModel
→ build TimelineGeometry
→ rerender
```

Edits are atomic:

```text
invalid edit
→ state unchanged
→ projection unchanged
→ no recompute

valid Apply
→ one mutation
→ one recompute
```

When browser persistence is active, a candidate edit is validated, projected,
encoded, and written as one complete versioned document before the in-memory
session publishes it. A failed write leaves the session and prior document
unchanged. The Domain and session know no browser storage API. Import validates
the complete document and projection before replacing the single stored value;
an invalid import never clears existing planning data.

Typing changes local form state only. It must not recompute planning.

## Portfolio Snapshot historical artifact

A Portfolio Snapshot is created only by explicit user Save, is deeply immutable,
and can only be deleted as a whole. Its unique stable `snapshotId` is its identity;
`createdAt` is the canonical UTC technical clock read at Save, independent of
Projection date and Actuals dates. Same-day, identical timestamps and backward
clocks are valid; list order is deterministically `(createdAt, snapshotId)`.

Save is forbidden while any Forecast, Actuals/RAF, Team, Create or Planning
Settings draft remains unapplied, including hidden or invalid drafts. The UI
aggregates owner state and the dedicated service rechecks it at the actual Save.
No dirty flag is persisted and Domain has no UI/store dependency.

Historical inputs reuse the complete non-recursive backup input boundary:
planning settings, horizon/calendar/concurrency, capacity schedules/exceptions,
all active/inactive objects, requirements/allocations, grouping/colors,
constraints and complete priority order. V5 Actuals select an explicit owned
snapshot ID; validation uses the consecutive prefix ending at that ID. Pending
V4 uses exclusive frozen legacy evidence and RAF provenance. Save never invents
a V5 ID, reconciles or mutates a current object, or double counts legacy and V5.

The dedicated forecast stores exact whole-Project Actuals, RAF, EAC = Actuals +
RAF, full-order 1-based priority, estimated start/end and explicit absence
reasons, with input/forecast schemas and engine version. None, uncovered RAF and
covered zero remain distinct. No full PlanningResult, daily capacities,
allocations, Team plans or diagnostics are persisted in this artifact.

Estimated start is the earliest positive canonical Project Actuals contribution
or positive Forecast allocation across Teams, without cursor/horizon clipping.
No activity means `no-activity`; inactive Projects can have an Actuals start.
Estimated end uses the same pure helper as Timeline: inactive → `inactive`, any
incomplete Team → `incomplete-within-horizon`, all complete → latest defined
Team end, otherwise `no-allocation`. There is no horizon extrapolation.

Save/Delete verify state/run coherence, persist complete V6 before publication,
and reuse the current projection without engine recomputation. A failure
publishes nothing and leaves inputs, drafts, history and projection intact.
Delete removes only the requested capture, with no Actuals purge or garbage
collection. Ordinary commands retain history.

V6 is self-contained: current-owned full Actuals histories are stored once;
historical inputs use references plus required frozen migration evidence.
V1–V5 readers migrate with empty Portfolio history and their encoders refuse
history-bearing downgrade. V6 rejects any invalid capture/reference/input or
metric as a whole, without repair or recalculating historical metrics with a
current engine. Invalid startup documents remain preserved and reported.
Historical IDs for Project, Reservation, Team, Program and Pas remain reserved
while retained captures reference them, without an eternal identity registry.

11A adds capture/list/Delete only. Project drift belongs to 11B; advanced replay,
historical navigation, comparisons and restore remain deferred.

## Planning

```text
Planning
├── startDate
├── endDate
├── workingPattern / workingWeekdays
└── maxParallelProjects
```

The inclusive horizon, working weekdays, and parallelism setting are global.
They are not Team properties. A globally configured
`maxParallelProjects = N` is enforced independently by each Team simulation;
it is never a Portfolio-wide pool of `N` slots.

## Team and capacity schedule

```text
Team
├── id
├── name
└── capacitySchedule
    ├── capacityPeriods
    └── exceptions
```

A Team does not own a working pattern, a maximum parallel project count, or
Reservations.

Capacity periods use inclusive `[start, end]` bounds. Gaps are valid and mean
no period capacity. Overlaps are invalid. Daily capacity is an exact,
non-negative rational quantity. Period unavailability is an exact ratio in
`[0, 1]`. After applying global working weekdays:

```text
effectiveCapacity
= dailyCapacity × (1 - unavailabilityRatio)
```

A capacity exception, where present, supplies the exact effective capacity for
its date. Schedule exceptions are domain-supported even though the current UI
does not edit them.

## Project

```text
Project
├── id
├── name
├── programId?                         (optional grouping)
├── priorityFamilyId?                  (optional grouping; Pas in UI)
├── global priority                     (in Portfolio.priorityOrder)
├── earliestStartDate?
├── objectiveEndDate?
├── mandatoryDeadline?
└── teamRequirements[]
    ├── teamId
    ├── remainingWorkload
    └── dailyCap?
```

Project dates are global to the Project, not duplicated per Team:

- `earliestStartDate` is a hard lower eligibility bound;
- `objectiveEndDate` is descriptive only and never changes planning;
- `mandatoryDeadline` is a planning constraint evaluated independently for
  each Team requirement;
- no artificial `objectiveEndDate >= earliestStartDate` validation is imposed;
- an impossible but structurally valid deadline is accepted and diagnosed by
  the planner rather than rejected by editing.

`dailyCap` remains a domain and planner concept. It may be hidden from a UI,
but an unrelated Project Apply must preserve any existing exact value.

Program and PriorityFamily are independent Portfolio catalogs, displayed as
Program and Pas. Each Project and Reservation may reference at most one entry
from each catalog, independently. A catalog entry exists exactly while at
least one Project or Reservation references it, regardless of `isActive`.
Names are trimmed, internal whitespace is collapsed, and equivalent names are
deduplicated without regard to case while preserving the existing label.
Application editing resolves and prunes catalog entries in the same atomic
transition; Portfolio validation rejects unknown references, duplicate
normalized names, and orphans. There is no separate catalog editor or global
rename. These dimensions do not affect priority or planning admission;
`Portfolio.priorityOrder` remains the sole global Project priority.

Every Program has a mutable color represented as `#RRGGBB`. A Project or
Reservation without a Program has `ownColor`; with a Program it has no
`ownColor` and derives its effective color from that Program. Changing a
Program color through any member's Apply changes all members together.
Automatic colors seek variety but need not be unique; the picker is free.
Timeline allocations and Reservation segments use the exact effective color.
The main card background derives a light pastel from it without persisting a
second color; internal sections keep their own styling. Draft previews remain
local until Apply, and Cancel has no shared business effect. Among concurrent
drafts, the latest Apply that actually edits Color wins. A new Program receives
one suggested color when New is selected; editing its name leaves that color
stable. Leaving a Program suggests a new own color, while staying on None
preserves an existing own color.

## Global multi-Team Reservation

```text
Reservation
├── id
├── name
├── startDate
├── endDate
└── teamAllocations[]
    ├── teamId
    └── amount
        ├── ratio
        └── fixed-daily
```

A Reservation is a global Portfolio entity with one inclusive date range. It
may allocate zero or more Teams, at most once per Team. Each Team allocation
uses exactly one amount mode.

For a ratio allocation on an applicable day:

```text
requestedReservationCapacity
= effectiveCapacity × ratio
```

The ratio is exact and individually bounded to `[0, 1]`. Overlapping
Reservations may make their total request exceed capacity.

A fixed-daily allocation means exactly `x md/day requested`. It is never RAF,
a total quantity, or a workload to spread across the Reservation interval.

Applicability is canonical:

| Team/date situation | Ratio request | Fixed-daily request |
| --- | ---: | ---: |
| Non-working global weekday | `0` | `0` |
| No Team capacity period | `0` | `0` |
| Capacity period, effective capacity `> 0` | `effective × ratio` | `fixed` |
| Capacity period, effective capacity `= 0` because unavailability is 100% | `0` | `fixed` |

For all applicable Reservations:

```text
totalRequestedReservedCapacity
= sum(applicable reservation requests)

actualLoad = projectActual + reservationActual
projectCapacity
= max(0, effectiveCapacity - actualLoad - totalRequestedReservedCapacity)

actualOverCapacity = max(0, actualLoad - effectiveCapacity)
reservationOverCapacity
= max(0, actualLoad + totalRequestedReservedCapacity - effectiveCapacity)
  - actualOverCapacity
totalOverCapacity = actualOverCapacity + reservationOverCapacity
```

Actuals and requested Reservation forecast are never clamped. Only Project
forecast capacity is floored at zero. Reservation overload is marginal after
Actuals and does not recount Actuals overload:

```text
TEAM_OVER_RESERVED
iff reservationOverCapacity > 0
```

It is not defined as `sum(ratios) > 1`; fixed-daily and mixed requests count.

## Planning Engine V1

Each Team is simulated independently for each day of the Planning horizon:

```text
CAPACITY
effective capacity
→ Project Actual + Reservation Actual
→ Reservation forecast demand
→ project capacity

ADMISSION
eligibility
→ global priority order
→ admit up to N per Team
→ admitted set frozen for the day

CONSUMPTION
deadline handling
→ residual capacity
→ normal fair sharing
→ redistribution only inside admitted set
```

### Admission and normal consumption

- Admission follows `Portfolio.priorityOrder` and is recalculated each day.
- Completed Projects and Projects that are not yet eligible are not admitted.
- A zero `dailyCap` makes that Team requirement ineligible.
- `maxParallelProjects` is applied independently per Team.
- The admitted set is frozen for the day. Completion, a daily cap, or a zero
  allocation does not free a slot for another Project that day.
- A deadline never increases admission priority and never bypasses a slot.
- Normal sharing uses exact `1/2 md` rounds in priority order. An exact smaller
  final RAF may complete a Project; otherwise a sub-quantum residue may remain
  unused. Redistribution stays inside the frozen admitted set.

### Mandatory deadlines

Deadline status is per Project/Team planning state:

- `PENDING`: no first admission has yet assessed the deadline;
- `FEASIBLE`: current RAF fits within exact accessible capacity through the
  deadline under the engine's V1 conditional trajectory;
- `UNFEASIBLE`: it does not fit; this status is permanent until it becomes
  `MISSED`;
- `MISSED`: the date has passed while RAF remains.

Feasibility is based on accessible project capacity, daily caps, and the
trajectories already imposed by higher-priority admitted feasible deadlines.
It is conditional, not a guarantee of future admission. Deadline consumption
is exact and precedes normal sharing for the admitted set. `UNFEASIBLE` and
`MISSED` Projects consume as much as possible only when admitted; they reserve
no future trajectory.

Deadlines affect consumption, never slot priority.

### Horizon and viewport

The Planning horizon bounds produced day capacities, admissions, allocations,
and results. A deadline feasibility check may inspect known capacity beyond
the horizon when the deadline lies later. The interactive viewport is only a
window over the full projected geometry; changing it does not change the
Planning horizon or trigger planning.

### Diagnostics

The current canonical business diagnostic codes are:

- `TEAM_ACTUALS_OVER_CAPACITY`: Actual occupation exceeds effective Team capacity;
- `TEAM_OVER_RESERVED`: forecast Reservation adds marginal overload after Actuals;
- `PROJECT_REMAINS_UNPLANNED_AT_HORIZON`: RAF remains after the last horizon
  day;
- `DEADLINE_UNFEASIBLE`: an admitted deadline Project is found structurally
  infeasible for a Team;
- `DEADLINE_MISSED`: a deadline date has passed with RAF remaining.

Diagnostics report business consequences. Edit validation errors are a
separate application concern.

## Exact rational quantity policy

```text
DISPLAY   decimal
INPUT     decimal OR fraction
DOMAIN    exact rational
```

No business capacity, ratio, workload, or allocation is represented by an
IEEE-754 floating-point quantity in the domain.

```text
1/3      → exact 1/3
0.333    → exact 333/1000
100/3 %  → exact ratio 1/3
1/3 %    → exact ratio 1/300
```

Presentation may round a non-terminating rational for display. Editable fields
must retain the original exact serialization and a dirty state:

```text
domain exact
→ rounded decimal display
→ untouched Apply
→ original exact value preserved
```

Geometry coordinates are presentation `number` values. That numeric boundary
must never flow back into domain quantities.

## Timeline architecture and temporal UI invariants

```text
PlanningResult
→ TimelineViewModel
→ TimelineGeometry
→ renderer
```

The adapter projects semantic results; Geometry projects coordinates;
the renderer creates DOM/SVG. Geometry does not decide capacity, reservation,
admission, allocation, deadline status, or priority.

There is exactly:

```text
one horizon
one temporal coordinate system
one viewport state
one zoom
one pan
one selectedDate
one cursor
one global time axis
```

This remains true with multiple Team panels. The validated layout is:

```text
global time axis
global cumulative capacity metrics

Team header + cumulative capacity metrics
Team lane

Team header + cumulative capacity metrics
Team lane

...
```

Panels are visual groupings, not independent timelines.
The Projection date marker uses the same temporal X coordinate in the global
year/month axis and every Team lane. Zoom and pan preserve that alignment.

Temporal positioning belongs to timeline space; glyphs and controls belong to
screen/UI space. Zoom changes temporal positions and distances but must not
distort glyph aspect ratio. Domain space, timeline space, and screen space
must remain distinct.

### Interaction state and hit testing

Cursor state, viewport state, hover, selection, and editing context are UI
state, not domain state. Semantic hits include Project markers, allocations,
and Team lanes. The canonical visual hit precedence is:

```text
marker > allocation > Team
```

Hit testing operates against Geometry rather than reading SVG DOM attributes.
Project markers and allocations resolve to Project interaction; Team hits
resolve to Team interaction. Moving the cursor or viewport does not recompute
planning.

## Design prohibitions

Do not:

- duplicate sources of truth;
- put business logic in Geometry or UI;
- mutate projections as state;
- recompute while typing;
- infer business rules from visual presentation;
- introduce IEEE-754 business quantities into the domain.

## Durable technology baseline

FlowPlan2 uses TypeScript in strict mode, Node.js 24+, native HTML/CSS,
native DOM/SVG, and native browser ES modules. `tsc` compiles the application;
`node:test` runs the tests. There is no frontend framework, bundler, third-party
test runner, linter, or formatter. Generated `dist/` and `.test-dist/` outputs
are disposable artifacts.
