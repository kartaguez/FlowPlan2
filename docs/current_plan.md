# FlowPlan2 current plan

Current validated baseline:
`00fa92101e2150fbfea220fbc4742d45fa622249`

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

The roadmap uses `9A`–`9G`, with intermediate lot `9C.1` between 9C and 9D.
Validated 9C remains the baseline, and each Phase 9 lot
is intended to fit one commit or a small, coherent commit set. Actuals/History
is a later trajectory, not a Phase 9 lot.

## Completed

- Planning Engine V1 and exact rational domain quantities;
- `PlanningResult` → `TimelineViewModel` → `TimelineGeometry` projections;
- static SVG rendering, global time axis, diagnostics, and Project markers;
- shared cursor, viewport, zoom/pan, hit testing, hover, and selection;
- atomic application editing pipeline;
- global Planning settings, Team settings, and Project editing;
- global multi-Team Reservations with ratio and fixed-daily requests;
- Portfolio tabs and stacked Team panel UI;
- 9A Program / PAS foundations (DONE);
- 9B Cursor metrics projection (DONE);
- 9C Cursor metrics UI (DONE).

## Ordered remaining lots

```text
9C.1 Planning UI cleanup (IN REVIEW)
        ↓ human validation
9D Priority drag/drop (NOT STARTED; waiting for 9C.1 validation)
        ↓
9E Team structural CRUD
        ↓
9F Project structural CRUD
        ↓
9G Reservation and capacity-period structural CRUD

Later trajectory: Actuals / History
```

The remaining execution order is `9C.1`, then `9D` through `9G`. Validated 9C completes
the cursor metrics UI; 9C.1 awaits human validation before 9D starts. The CRUD series establishes
Team referential-integrity policy before Project and Reservation membership
workflows.

## 9C.1 — Planning UI cleanup

**Status: IN REVIEW** — implementation and automated verification complete;
validated baseline remains the 9C implementation commit above.

The Planning header places one Projection date, cumulative progress, compact
red/grey diagnostic counts, then viewport controls immediately before the
shared Timeline. Team headers are more compact. The former daily Team summary
is removed; cumulative Team and Projects / Programs / PAS metrics remain at the
shared cursor date. Ctrl+ArrowLeft/Right moves that date outside editable
fields and modals without planning recomputation. Project allocation and named
Reservation segments have business tooltips; Team lanes and Project markers
remain selectable without tooltips.

Portfolio Projects and Reservations use compact cards with inline editors,
global Apply/Cancel, and independently expandable Team subcards. Their Team
toggles change only a local draft until Apply. One card is edited at a time;
Cancel closes it, while a successful Apply keeps it open with current session
values. The Project update command now adds/removes Team requirements atomically,
anticipating only that narrow part of 9F; Project and Team entity CRUD remain
future work. A Team lane hit never opens Team Settings and leaves any editing
context unchanged. Only the Team Settings button opens that editor.

Human validation should confirm the layout, keyboard interactions, modal focus,
inline card drafts, Portfolio exclusivity, and Team lane/editor separation in a browser. Do not
advance the baseline or start 9D before validation.

## 9D — Priority drag/drop

**Status: NOT STARTED** — waiting for human validation of 9C.1.

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

Add/remove Project entities and finish structural workflows around Team
requirements; keep `portfolio.priorityOrder` complete and unique. Editing the
requirement membership of an existing Project was delivered early in 9C.1.

**Domain changes**

Preserve the rule that a Project has at least one unique, valid Team
requirement. Define insertion position in global priority explicitly.

**Application changes**

Add atomic commands for Project lifecycle; retain the existing atomic
`update-project` membership path, RAF validation, and hidden `dailyCap`
preservation where a requirement is untouched.

**UI changes**

Provide Project creation/removal and their confirmation and editing-context
reconciliation; retain the Team-assignment controls introduced in 9C.1.

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

After implementing a lot, record **IN REVIEW** only when code, automated tests,
TypeScript build, and documentation are consistent. Keep the validated baseline
SHA and downstream dependency status unchanged until human validation.

After each validated lot:

1. update `current_canon.md` if current behavior changed;
2. update `canon.md` only if a durable invariant or architecture decision
   changed;
3. mark the lot completed in `current_plan.md`;
4. update the baseline SHA;
5. refine next lots only if new information requires it.

These documents are not an exhaustive history. Remove stale information; do
not append every commit, audit, fixed defect, or previous prompt.
