# FlowPlan2 current plan

Current validated baseline:
`b630e4e0c30acdee82711b4d3f792a5239645ce3`

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

The roadmap uses `9A`–`9G`: Phase 8C and its validated UI correction are the
baseline, and each Phase 9 lot is intended to fit one commit or a small,
coherent commit set. Actuals/History is a later trajectory, not a Phase 9 lot.

## Completed

- Planning Engine V1 and exact rational domain quantities;
- `PlanningResult` → `TimelineViewModel` → `TimelineGeometry` projections;
- static SVG rendering, global time axis, diagnostics, and Project markers;
- shared cursor, viewport, zoom/pan, hit testing, hover, and selection;
- atomic application editing pipeline;
- global Planning settings, Team settings, and Project editing;
- global multi-Team Reservations with ratio and fixed-daily requests;
- Portfolio tabs and stacked Team panel UI.

## Ordered remaining lots

```text
9A Program / PAS foundations
        ↓
9B Cursor metrics projection
        ↓
9C Cursor metrics UI
        ↓
9D Priority drag/drop
        ↓
9E Team structural CRUD
        ↓
9F Project structural CRUD
        ↓
9G Reservation and capacity-period structural CRUD

Later trajectory: Actuals / History
```

The recommended execution order is `9A` through `9G`. `9A → 9B` is a hard
dependency because Program/PAS aggregated progress needs the grouping
dimensions. `9B → 9C` separates metric semantics from rendering. `9D` has no
hard dependency on metrics but follows them in this roadmap to keep one clear
next lot at a time. The CRUD series establishes Team referential-integrity
policy before Project and Reservation membership workflows.

## 9A — Program / PAS foundations

**Goal**

Add the two optional Project grouping dimensions already selected for future
analysis: Program and `PriorityFamily` / PAS.

**Scope**

- A Project may optionally belong to one Program and one PriorityFamily/PAS.
- The dimensions are labels/identities for grouping and analysis only.
- `Portfolio.priorityOrder` remains the sole global Project priority.

**Domain changes**

Introduce the minimum explicit Program and PriorityFamily/PAS identities and
optional Project references, with Portfolio referential validation. Neither
dimension affects eligibility, admission, allocation, deadlines, or capacity.

**Application changes**

Carry and preserve the optional associations in Project editing commands and
edit ViewModels. Decide the initial catalog/source representation explicitly;
do not smuggle general structural CRUD into this lot.

**UI changes**

Expose optional Program and PAS assignment in Project editing and display the
grouping labels where useful in the Portfolio surface.

**Tests**

Cover optional membership, invalid references, immutable updates, preservation
through unrelated edits, and proof that planning output is unchanged when only
grouping changes.

**Explicit non-goals**

No priority semantics, metrics, drag/drop, generalized CRUD, persistence, or
actuals/history.

**Exit criteria**

Projects can be grouped by both dimensions; both survive the full editing and
projection path; engine allocations are invariant under grouping-only changes.

**Dependencies**

Current Project/Portfolio model and editing pipeline. Required before 9B.

## 9B — Cursor metrics projection

**Goal**

Define and compute exact cumulative metrics for the current planning run,
independently of UI layout.

**Scope**

For each Team, over the inclusive interval
`[planning.horizon.start, selectedDate]`, compute:

- Effective capacity;
- requested Reserved capacity;
- Project Allocated capacity;
- utilization = `(Reserved + Allocated) / Effective`.

If Effective is zero, utilization is undefined / N/A. Utilization is not
clamped and may exceed 100% under over-reservation.

Project progress is:

```text
cumulative allocations / current-run baseline RAF
```

The baseline is the RAF supplied to the current projection run, before that
run's allocations. Baseline zero means 100% progress. Program and PAS progress
is workload-weighted: sum cumulative allocations divided by sum current-run
baseline RAF for the grouped Project requirements, not an average of Project
percentages.

**Domain changes**

None to planning decisions. Add a pure exact metric contract/calculator at the
appropriate result/adapter boundary; do not mutate `PlanningResult` or session
state.

**Application changes**

Make the current-run RAF baseline and the current `selectedDate` available to
the metric projection without turning cursor state into domain state.

**UI changes**

None beyond any minimal contract integration required for 9C.

**Tests**

Cover inclusive date bounds, cross-Team aggregation, zero Effective, values
above 100%, zero RAF, partial completion, and workload-weighted Program/PAS
aggregation using exact rationals.

**Explicit non-goals**

No visual dashboard, historical baseline, actual consumption, forecast
mutation, or monthly snapshot.

**Exit criteria**

A pure, deterministic, exact metric projection produces all defined Team,
Project, Program, and PAS values for any selected horizon date.

**Dependencies**

9A and the existing `TimelineViewModel`/cursor date semantics.

## 9C — Cursor metrics UI

**Goal**

Present the 9B cumulative metrics for the selected date without changing
planning or temporal interaction.

**Scope**

Extend the selected-date/cursor information surface with Team cumulative
Effective, Reserved, Allocated, and utilization plus Project, Program, and PAS
progress.

**Domain changes**

None.

**Application changes**

Wire the pure metric projection into the existing projection/coordinator
cycle. Cursor movement remains a presentation update and causes no recompute.

**UI changes**

Render exact-derived, human-readable values; render undefined utilization as
N/A and preserve values above 100%. Keep one selected date and one shared
cursor for all Team panels.

**Tests**

Cover rendering, selected-date updates, N/A, >100%, grouped progress, keyboard
cursor changes, and no planning dispatch/recompute on cursor movement.

**Explicit non-goals**

No charts unless separately approved, no editable metrics, no persistence,
and no actuals/history.

**Exit criteria**

All 9B metrics are visible and update correctly from the shared cursor without
altering session state or planning output.

**Dependencies**

9B.

## 9D — Priority drag/drop

**Goal**

Provide direct reordering of Projects while preserving the existing priority
model.

**Scope**

Drag/drop changes only `portfolio.priorityOrder`. It triggers the normal
atomic application command and a business recompute because admission order
can change.

**Domain changes**

No new priority source. Continue enforcing that every Project appears exactly
once in `priorityOrder`.

**Application changes**

Add a focused reorder command or reuse a clearly atomic reorder use case.
Dates, RAF, Team requirements, and Project metadata must remain unchanged.

**UI changes**

Add accessible pointer and keyboard reordering to the Project list, with clear
drop position and failure recovery.

**Tests**

Cover upward/downward/no-op moves, boundary positions, keyboard parity,
unchanged Project fields, one recompute on success, and none on rejection.

**Explicit non-goals**

No date dragging, RAF editing by drag, Team assignment, multi-select, or
Program/PAS priority.

**Exit criteria**

The displayed order and `portfolio.priorityOrder` stay identical after every
supported reorder, and successful reorder performs exactly one recompute.

**Dependencies**

Existing Portfolio sidebar and editing pipeline; independent of 9A–9C after
integration conflicts are avoided.

## 9E — Team structural CRUD

**Goal**

Add and remove Teams with explicit referential-integrity behavior.

**Scope**

Create Team with a valid schedule and remove Team only through a deliberate
policy for Project requirements and Reservation allocations.

**Domain changes**

Retain unique IDs and Portfolio reference validation. Specify whether deletion
is blocked while referenced or uses an explicit atomic cascade; never leave
dangling Project or Reservation references.

**Application changes**

Add typed create/remove commands, deterministic ID handling, and atomic
candidate validation.

**UI changes**

Add Team creation/removal flows with reference-impact confirmation and safe
editing-context reconciliation.

**Tests**

Cover ID collisions, referenced deletion policy, immutable failure, projection
rebuild count, and selection/context cleanup.

**Explicit non-goals**

No Project or Reservation entity CRUD, period row CRUD, persistence, or
actuals/history.

**Exit criteria**

Teams can be safely created and removed with no dangling references and one
recompute per accepted structural change.

**Dependencies**

Existing Portfolio validation and session commands. Establishes policy used by
9F and 9G.

## 9F — Project structural CRUD and Team membership

**Goal**

Create/remove Projects and structurally edit their Team requirements.

**Scope**

Add/remove Project entities; add/remove Team requirements; keep
`portfolio.priorityOrder` complete and unique.

**Domain changes**

Preserve the rule that a Project has at least one unique, valid Team
requirement. Define insertion position in global priority explicitly.

**Application changes**

Add atomic commands for Project lifecycle and requirement membership, with RAF
and hidden `dailyCap` preservation where a requirement is untouched.

**UI changes**

Provide Project creation/removal and Team-assignment controls, including
confirmation and editing-context reconciliation.

**Tests**

Cover empty/duplicate/unknown requirements, priority-order integrity, removal
of selected Projects, exact quantity preservation, and recompute atomicity.

**Explicit non-goals**

No Team or Reservation lifecycle, capacity-period row CRUD, persistence, or
actuals/history.

**Exit criteria**

Project lifecycle and Team membership are fully editable while every valid
Portfolio maintains priority and reference invariants.

**Dependencies**

9E referential-integrity policy; 9A associations must be preserved if present.

## 9G — Reservation and capacity-period structural CRUD

**Goal**

Complete current planning-structure editing without mixing in analytics or
actuals.

**Scope**

- add/remove global Reservations;
- add/remove/reorder Team capacity periods;
- preserve inclusive dates, exact quantities, chronological non-overlap, and
  Reservation Team-reference integrity.

**Domain changes**

No change to Reservation capacity semantics. Period identity/order policy must
be explicit; schedules remain normalized and non-overlapping.

**Application changes**

Replace position-only period editing with atomic structural commands and add
Reservation lifecycle commands with collision-safe IDs.

**UI changes**

Add Reservation create/delete actions and capacity-period row controls with
accessible ordering and validation feedback.

**Tests**

Cover empty schedules, period add/remove/reorder, overlap rejection, exact
value preservation, Reservation ID collisions, Team references, editor
reconciliation, and one recompute per successful Apply.

**Explicit non-goals**

No capacity-exception editor unless separately scoped, no persistence,
recurrence, actuals/history, or snapshot UI.

**Exit criteria**

Reservations and capacity-period structures can be maintained end to end with
all Portfolio/schedule invariants and atomic projection updates intact.

**Dependencies**

9E Team lifecycle/reference policy. Integrates with 9F Project lifecycle but
does not depend on Project CRUD semantics.

## Later trajectory — Actuals / History

Actuals/History begins only after the current projection and structural
planning surface are stable:

```text
periodic progression
→ actual consumed
→ revised RAF
→ next planning snapshot
```

Historical snapshots preserve prior runs while the next run receives only the
revised current RAF. This later trajectory may introduce persistence and
snapshot navigation, but it must preserve the boundary defined in
[canon](./canon.md): actuals/history stay upstream of the pure Planning Engine.
No fine implementation slicing is fixed yet.

## Cross-cutting non-goals for Phase 9

- No actual consumption or historical replay inside Planning Engine V1.
- No second priority source for Program or PAS.
- No independent Team horizons, cursors, viewports, or time axes.
- No floating-point business quantities.
- No opportunistic persistence, synchronization, or framework migration.

## Maintenance protocol

After each validated lot:

1. update `current_canon.md` if current behavior changed;
2. update `canon.md` only if a durable invariant or architecture decision
   changed;
3. mark the lot completed in `current_plan.md`;
4. update the baseline SHA;
5. refine next lots only if new information requires it.

These documents are not an exhaustive history. Remove stale information; do
not append every commit, audit, fixed defect, or previous prompt.
