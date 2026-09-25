# FlowPlan2 current plan

Current validated baseline:
`ad087b75d9613830b712bd505423726ab6ac6065`

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

Validated 9H complete planning backup and restore forms the baseline.
Lot 10 — Actuals & History is the current objective. Its next sub-lot is 10A,
which remains to plan and implement.

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
- 9D Priority drag/drop (DONE);
- 9E Team structural CRUD (DONE);
- 9F Project structural CRUD and Team membership (DONE);
- 9G Reservation and capacity-period structural CRUD (DONE);
- 9H Complete planning backup and restore (DONE);
- separate Projection date presentation pass (DONE).

## Current objective and ordered sub-lots

```text
Lot 10 — Actuals & History (OPEN)
10A → 10B → 10C → 10D → 10E
```

Lots through 9H and the separate Projection date presentation pass are
validated.

## 9C.1 — Planning UI cleanup

**Status: DONE** — three corrective passes implemented and validated at
`d6ae53bd08442f5a391d2db68b29f0b0966c98e0`.

The Planning header places dated cumulative progress, compact
red/grey diagnostic counts, then viewport controls immediately before the
shared Timeline. Team headers are more compact. The former daily Team summary
is removed; cumulative Team and Projects / Programs / PAS metrics remain at the
shared cursor date. Ctrl+ArrowLeft/Right moves that date outside editable
fields and modals without planning recomputation. Every Timeline click moves
only the Projection date; Project allocation and named Reservation segments
retain business tooltips. Timeline selection and its summary have been removed.
The separate validated UI pass moves the Projection date display into a small
band above the global year/month axis and repeats it above every Team lane.
These bands and the other temporal surfaces share a pale blue background and
the same click-to-date pipeline. This pass is **DONE** following human
validation.

Portfolio Projects and Reservations use compact cards with independent inline
editors, Apply/Cancel, and Team subcards. Several cards and Teams may remain
expanded, including across tab changes. Local drafts and dirty borders survive
collapse and projection rerenders; an Apply cleans only its own card and rebases
other drafts on the new session. A Team OFF has no visible details control.
Project Objective end has one Mandatory toggle that maps to the existing Domain
deadline field; divergent historical deadlines require explicit resolution.
The Project update command adds/removes Team requirements atomically; 9F
subsequently completed Project entity CRUD. A Team lane hit never opens Team
Settings and leaves any editing context unchanged. Only the Team Settings
button opens that editor.

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

**Status: DONE** — validated implementation at
`29f67e65ebd384505c1abcf23570a7ce4467be2e` (lifecycle
`3ff540c7f4528c9cc8713b2d5eda1a706efe1445`, followed by the validated
UI placement correction).

Create Team accepts a name and 1..N exact initial capacity periods; the
Application validates the schedule atomically and generates a collision-safe
session Team ID. Delete Team is restrictive: persisted Project requirements
and Reservation allocations block removal, with no cascade. A separate UI
guard protects unapplied draft changes concerning the Team before dispatch;
unmodified Team options and unrelated dirty fields do not block removal.
Accepted operations reproject once, while refusals preserve state and
projection. Team Settings protects local edits across context changes and
rerenders. The global metrics cartouche has a title, and Create Team sits
between it and the first Team panel, aligned with the shared Timeline.

Validation before closure: TypeScript typecheck, 454 automated tests, build,
and desktop browser inspection passed. Reservation entity CRUD and structural
editing of existing capacity periods were subsequently completed in 9G.

## 9F — Project structural CRUD and Team membership

**Status: DONE** — validated implementation at
`87bc3c4f9f8a0c19c5e9fb8ba86c27e2344c730c`.
Project creation and confirmed removal are implemented.
Creation requires explicit Team activation and exact RAF, assigns a
collision-safe session ID, and appends the Project to `priorityOrder`.
Deletion removes the Project and its priority entry while preserving unrelated
drafts and projection controls. The 9E Team deletion UI guard now includes
enabled Teams in an unapplied Create Project draft. The existing
`update-project` membership path remains in use. The separate Projection date
presentation pass is DONE.

Implementation checks: TypeScript typecheck, 472 automated tests across 70
suites, and build passed. Edge browser checks at 1440 px and 390 px covered
empty Team selection, exact RAF creation, derived priority badge, dirty-draft
delete confirmation/cancel, successful removal, and narrow Portfolio layout.

## 9G — Reservation and capacity-period structural CRUD

**Status: DONE** — validated implementation at
`5700731671f0a6fa3ad5cba98ca81850ddb02d03`.

Create Reservation starts as a local draft with an empty name, horizon dates,
and no enabled Team. The Application validates it under a collision-safe
session ID; zero allocations and zero Teams are allowed. Delete Reservation
uses the validated Project dirty-draft and inline confirmation sequence.
Successful lifecycle operations preserve independent drafts and reproject once.

Reservation cards use a derived display order: start date, end date, exact
requested total descending over the entire inclusive interval, name, then ID
as a deterministic tie-break. The total uses Domain daily request semantics,
including Team capacity schedules and exceptions. Portfolio storage order is
unchanged.

Existing Teams may add or delete capacity periods, including the last one.
The UI keeps invalid and structural changes local until Apply; Cancel restores
the persisted schedule without recomputation. Apply preserves exact untouched
quantities and existing exceptions, rejects overlaps, allows gaps, and displays
the Domain-normalized chronological schedule. There is no manual reorder or
Domain period identity. Create Team still requires an initial period.

Implementation checks: TypeScript typecheck, 489 automated tests across 73
suites, and build passed. Local Edge checks at 1440 px and 390 px covered
Reservation creation/deletion and focus, the narrow Portfolio panel without
horizontal overflow, and Team period Add/Cancel/empty-schedule Apply.

No capacity-exception editor, recurrence, actuals/history,
snapshots, or new analytics are included. The separate Projection date pass
is DONE on its own track.

## 9H — Complete planning backup and restore

**Status: DONE** — validated implementation at
`ad087b75d9613830b712bd505423726ab6ac6065`. One versioned JSON document
contains the full current `PlanningSessionState`. The same document is stored
under one localStorage key; successful edits persist before the session commits.
Planning Settings provides
Import and Export. Import validates the full state and projection before asking
for confirmation, then replaces the key and reloads the page. Invalid startup
data is preserved and reported while the demo loads in memory. Actuals/history
are absent from the current schema because they are not implemented yet.

Implementation checks: TypeScript typecheck, 498 automated tests across 76
suites, and build passed. Human validation closed the lot.

## 10A — Actuals model & deterministic reconstruction

**Status: NEXT — to plan, then implement; not started.**

Establish immutable dated Actuals Records as business knowledge for each
Project and Reservation, independently of any global actuals cutoff. Project
records retain per-Team cumulative consumed work and the RAF estimate known at
the same date; Reservation records retain per-Team cumulative consumed work.
Define Domain validation and successive-record invariants, including dates,
Team association, cumulative deltas, and the initial record boundary after
inspecting current entity lifecycles. Preserve the existing Project
requirement RAF and Reservation ratio/fixed-daily forecast semantics.

Reconstruct exact daily actual occupation deterministically from aggregated
deltas between records. Effective Team capacity weights eligible days but
never limits the declared consumption. Cover zero-capacity periods with a
deterministic fallback, overlapping actual loads, consumption beyond capacity,
and successive periods with meaningful Domain tests. Reconstruction must
remain a derived projection, not persisted observed daily consumption. 10A
does not introduce historical knowledge snapshots, historical version
selection, or a Planning Engine integration contract; those follow in 10B–10E.
The next PLAN pass should decide the exact record types, eligible interval and
first-record rules, validation, and ownership within the existing Domain and
Application boundaries before coding.

## 10B — Actuals-aware planning projection

Feed calculated daily actual occupation into planning without passing raw
history. Preserve all Project and Reservation actuals even above effective
capacity, retain non-clamped forecast Reservation demand, and limit Project
forecast to remaining capacity. Extend the relevant planning, diagnostics,
timeline, and cursor-metric projections; distinguish actual overload from
forecast Reservation overload. Review deadline capacity lookahead as well as
daily allocation. Exact contract shapes and diagnostic names are 10B decisions.

## 10C — Actuals workflows & UI

Provide Project and Reservation Update actuals workflows: a new per-object
actuals date and per-Team cumulative consumed values. For Projects, propose
`max(0, previousRemaining - consumedDelta)` as the new RAF while allowing user
correction. Apply each update atomically and integrate actuals and diagnostics
into timelines and metrics. Detailed interaction design remains open.

## 10D — Knowledge snapshots

Capture immutable knowledge of FlowPlan2 at a snapshot date independent of
each object's `actualsThroughDate`. One snapshot may contain Projects and
Reservations whose actuals are known through different dates. The snapshot
contract and persistence mechanism remain open.

## 10E — Historical reconstruction & drift comparison

Reconstruct knowledge at different snapshot dates and compare changes in
consumed work, RAF, projection, estimated dates, capacity/overload, and other
relevant results. The comparison UI and drift visualization remain open.

The [current canon](./current_canon.md) gives the Lot 10 business and
architecture target. The durable [canon](./canon.md) still has an RAF-only
Actuals → Engine diagram: preserve its rule that history stays upstream, then
refine that diagram when 10B adds calculated daily actual occupation to the
projection input. The current `PlanningInput`, capacity/day diagnostics,
timeline adapter, cursor metrics, and application recomputation describe the
forecast-only baseline. They are likely 10B touchpoints, not contracts fixed
by this framing pass.

## Cross-cutting non-goals for Phase 9

- No actual consumption or historical replay inside Planning Engine V1.
- No second priority source for Program or PAS.
- No independent Team horizons, cursors, viewports, or time axes.
- No floating-point business quantities.
- No opportunistic synchronization or framework migration.

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
