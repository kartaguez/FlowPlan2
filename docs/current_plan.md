# FlowPlan2 current plan

Current validated baseline:
`a85d4b569a458d811e03dccc314476e8a5fb2e47`

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

The roadmap uses `9A`–`9G`, with intermediate lot `9C.1` between 9C and 9D.
Validated 9D priority drag/drop forms the baseline.
Each Phase 9 lot is intended to fit one commit or a small, coherent commit set.
Actuals/History is a later trajectory, not a Phase 9 lot.

## Completed

- Planning Engine V1 and exact rational domain quantities;
- `PlanningResult` → `TimelineViewModel` → `TimelineGeometry` projections;
- static SVG rendering, global time axis, diagnostics, and Project markers;
- shared cursor, viewport, zoom/pan, hit testing, and hover;
- atomic application editing pipeline;
- global Planning settings, Team settings, and Project editing;
- global multi-Team Reservations with ratio and fixed-daily requests;
- Portfolio tabs and stacked Team panel UI;
- 9A Program / PAS foundations (DONE);
- 9B Cursor metrics projection (DONE);
- 9C Cursor metrics UI (DONE);
- 9C.1 Planning UI cleanup (DONE);
- FlowPlan visual grammar adaptation and corrective pass (DONE);
- 9D Priority drag/drop (DONE).

## Ordered remaining lots

```text
9E Team structural CRUD
        ↓
9F Project structural CRUD
        ↓
9G Reservation and capacity-period structural CRUD

Later trajectory: Actuals / History
```

The remaining execution order is `9E` through `9G`. Lot 9D is closed and
provides the validated priority-reordering baseline. 9E is in review; 9F and
9G remain downstream until audit and human validation. The CRUD series
establishes Team referential-integrity policy before Project and Reservation
membership workflows.

## 9C.1 — Planning UI cleanup

**Status: DONE** — three corrective passes implemented and validated at
`d6ae53bd08442f5a391d2db68b29f0b0966c98e0`.

The Planning header places one Projection date, cumulative progress, compact
red/grey diagnostic counts, then viewport controls immediately before the
shared Timeline. Team headers are more compact. The former daily Team summary
is removed; cumulative Team and Projects / Programs / PAS metrics remain at the
shared cursor date. Ctrl+ArrowLeft/Right moves that date outside editable
fields and modals without planning recomputation. Every Timeline click moves
only the Projection date; Project allocation and named Reservation segments
retain business tooltips. Timeline selection and its summary have been removed.

Portfolio Projects and Reservations use compact cards with independent inline
editors, Apply/Cancel, and Team subcards. Several cards and Teams may remain
expanded, including across tab changes. Local drafts and dirty borders survive
collapse and projection rerenders; an Apply cleans only its own card and rebases
other drafts on the new session. A Team OFF has no visible details control.
Project Objective end has one Mandatory toggle that maps to the existing Domain
deadline field; divergent historical deadlines require explicit resolution.
The Project update command now adds/removes Team requirements atomically,
anticipating only that narrow part of 9F; Project and Team entity CRUD remain
future work. A Team lane hit never opens Team Settings and leaves any editing
context unchanged. Only the Team Settings button opens that editor.

Human validation has closed 9C.1; 9D has since also closed.

## FlowPlan visual grammar — corrective lot

**Status: DONE** — visual adaptation `92cc5ee`, followed by the corrective
pass `8a8c7537f8b64327533223a4a5dfc864aa8eb3bd`.

The corrective pass displays four cumulative metrics in the same compact
cartouche for each Team and globally: Capacity, Occupied (requested
reservations plus allocations), Occupancy, and Over-reservation ratio. Global
values aggregate exact Team quantities before dividing; daily over-reservation
remains non-compensating. All values use the inclusive interval from the
horizon start through the selected Projection date.

The global year/month axis sits below the zoom controls. One blue Projection
date marker and date label use the shared temporal coordinate system across
the axis and Team lanes. Zoom, date changes, and rerenders retain alignment.
The visual changes preserve the Domain → Application → adapters → DOM/SVG
boundary and existing editing interactions.

Validation at closure: `npm run typecheck`, `npm test` (425 tests, 62 suites),
and `npm run build` passed. Desktop (1440 px) and narrow (390 px) browser checks
covered the metric cartouches, cursor, zoom/date changes, and horizontal
overflow; no overflow was observed. No corrective item remains open. This lot
adds no new Phase 9 feature.

## 9D — Priority drag/drop

**Status: DONE** — validated implementation at
`a85d4b569a458d811e03dccc314476e8a5fb2e47`.

Portfolio → Projects provides a dedicated pointer and keyboard reorder handle
on each card, derived `#N` badges, and a transient insertion preview. The
`reorder-project` command changes only `Portfolio.priorityOrder`; a real move
rebuilds Planning once, while a same-position move reuses the existing state
and projection. The Project editor no longer exposes priority. Independent
Project and Reservation drafts, open cards, Projection date, viewport, progress
view, and focus survive reordering. The implementation passed TypeScript
typecheck, 434 automated tests, and build before closure.

## 9E — Team structural CRUD

**Status: IN REVIEW** — implementation awaiting pushed-commit audit and human
validation. The validated baseline remains the 9D commit above. Do not mark
9E DONE or advance the baseline in the implementation commit.

**Goal**

Add and remove Teams with explicit referential-integrity behavior.

**Scope**

Create Team with at least one initial capacity period and remove Team only when
no persisted Project requirement or Reservation allocation references it.

**Domain changes**

Retain unique IDs and Portfolio reference validation. Deletion is restrictive:
there is no implicit cascade and no dangling Project or Reservation reference.

**Application changes**

Typed create/remove commands use collision-safe session Team IDs and atomic
schedule/Portfolio validation. Accepted changes reproject once; rejected
commands leave state and projection unchanged.

**UI changes**

The collection-level Create Team form accepts 1..N initial periods. Team
Settings confirms deletion and reports persisted blockers. A separate UI guard
protects unapplied Project/Reservation draft changes concerning that Team;
unchanged inactive Team options and independent dirty fields do not block it.
Team Settings fields are protected across context changes and reprojections.

**Tests**

Cover ID collisions, exact initial schedule validation, referenced deletion,
immutable failure, projection rebuild count, independent and Team-specific
draft changes, and editing-context cleanup.

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
