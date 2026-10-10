# FlowPlan2 current plan — point d'entrée unique

## Trajectoire active — FlowPlan2 V2 / R0 PLAN

**Statut : PLAN documentaire livré pour audit indépendant ; aucune implémentation
ni création de branche autorisée.** R0 initialisation et R1–R6 NOT STARTED.
Dépôt `kartaguez/FlowPlan2`, branche de référence/livraison
`codex/lot11a-portfolio-snapshots`, baseline R0 vérifiée le 2026-10-10 :
`98737b1521e2877031b7cb0dd2624c268823d51e`. Fetch réussi, arbre initial propre,
origin 0/0. Aucun nouveau runtime/format ni accès aux données utilisateur en R0.

**Lire dans cet ordre pour reprendre sans conversation :**

1. Cette section : état et prochaine action.
2. [Plan normatif R0 autonome](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md), intégralement : décisions, modèle, inventaire, architecture, Git/stockage, lots, invariants, exercice de reprise et GO.
3. [Current canon](./current_canon.md) : cible distinguée des acquis réellement livrés.
4. [Plan architectural antérieur](./steps/PORTFOLIO_VERSIONED/architecture_plan.md), §3–§6, sous les remplacements R0 ; puis canons et plans patrimoniaux référencés dans R0 §2.

Décisions définitives : **Option B, reconstruction avec extraction sélective**,
branche future `rewrite/portfolio-versioned` partageant l'historique, référence
préservée et reprises auditées sans merge automatique. Modèle Portfolio versionné,
identités stables/versions immuables/refs exactes, Current/Snapshots inputs-only,
AP/SubPeriod/TeamActual/PT/RT/PTEC, Settings/Order versionnés, CAS/atomicité/recovery.
T01–T11 et T13–T15 maintenus selon portée R0 ; **T12 remplacée par T12-R** :
nouveau dépôt initial vide, format exclusivement natif, aucune migration V4–V8,
aucun import automatique/hybride/autorité legacy. T14 migrée inapplicable mais
non-inférence de completed maintenue en natif ; I22 migration remplacé dans le
chemin V2 par I22-R import natif robuste. I01–I21/I23 maintenus. M01–M04 ne
bloquent plus V2. Ancien Portfolio sauvegardé indépendamment avant bascule.

Trajectoire recommandée : R0 PLAN → audit/autorisation → R0 initialisation
(branche/squelette sûrs) → **R1 Domain et simulation verticale mémoire** →
**R2 Storage natif et verticale durable** → R3 moteur/service complet →
R4 commandes atomiques → R5 UI/consultation minimale → R6 History/comparaisons.
Service Snapshot minimum en R2/R3, consultation minimale avant Save UI R5.
Les gates/tests/risques/rollback de chaque lot sont dans R0 §8–§10.

**Prochaine étape : audit indépendant de R0 et exercice de reprise à froid
(R0 §11), puis autorisation explicite par SHA avant création de branche ou code.**
Le prompt minimal de reprise et les sources de chaque réponse sont dans R0.
Arrêt obligatoire après livraison Git du PLAN. Aucun lot nouveau commencé ici.

R0 fait autorité pour la cible V2. Le plan précédent reste consultable comme trace,
mais T12/migration/V1–V7/switch et ses bloqueurs ne sont plus la trajectoire active.
11D.0/11D.1/11D.2 G1 et tous canons DONE restent les acquis de l'ancienne app,
avec leurs limites ; ils ne certifient pas V2. Les sections suivantes sont des
**archives de suivi de l'application de référence** : leurs « current », gates
et statuts intermédiaires ne remplacent pas cette section ni le plan R0.

## Archives de suivi — application de référence

Current validated baseline:
`ee66a72cb6073c753681af95acae5122f93f13d3` (11D.2 G1 proof implementation validated by
favorable independent audit; documentary DONE closure authorized by the user on 2026-10-09)

This is the operational roadmap for the active trajectory. Durable product and
architecture rules live in [canon](./canon.md); current implementation facts
and temporary constraints live in [current canon](./current_canon.md).

The validated baseline includes the Program/Pas, Reservation progress, colors,
temporal zoom corrective lots, Lot 10A Actuals with V4 backup, Lot 10B
Actuals-aware planning projection, Lot 10C Actuals workflows and UI, and
Lot 10C.1 object-scoped knowledge snapshots with V5 persistence and
Lot 10C.2 Actuals/RAF workflow corrections, and Lot 11A Portfolio Snapshots
with immutable historical inputs, exact Project metrics and V6 persistence,
plus Lot 11A.2 exact daily profiles and V7 persistence.

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
- 9I Project and Reservation forecast activation (DONE);
- separate Projection date presentation pass (DONE);
- anchored temporal zoom and range drag (DONE);
- usage-driven Program/Pas, Reservation progress, colors, and backup V3 (DONE).
- 10A Actuals model, reconstruction, and backup V4 (DONE).
- 10B Actuals-aware planning projection (DONE).
- 10C Actuals workflows and UI (DONE).
- 10C.1 Actuals knowledge snapshots and V5 migration (DONE).
- 10C.2 Actuals / RAF workflow UX (DONE).
- 11A Portfolio Snapshots & Forecast History Capture (DONE).
- 11A.2 Historical daily load profiles (DONE).
- 11B Project History (DONE — explicit user closure).
- 11C Actuals / Forecast separation (DONE — explicit user closure).
- 11D.0 Storage Architecture & Scalability (DONE — favorable independent audit and explicit user closure).
- 11D.2 Historical Inputs Contract & Replay Feasibility (DONE — G1 only, favorable independent audit and explicit user closure).

Current trajectory: **11D.2 — DONE (G1 proof only)**;
**11D.1 RAF Model — DONE; 11D.1 UX — DONE**;
**11D.0 — Storage Architecture & Scalability remains DONE**;
**11B — Project History view is DONE**, following validated DONE
11A.2. See the
[detailed implementation plan](./steps/HISTORY/lot11a2_11b_plan.md).
11A.2 is implemented, verified and closed. Final plan review concludes
**11B READY FOR IMPLEMENTATION** at baseline `7a3ea6b`; implementation is **DONE** by explicit user closure. See [11B delivery](./steps/HISTORY/lot11b_canon.md).

## Current objective and ordered sub-lots

```text
10A (DONE) → 10B (DONE) → 10C (DONE) → 10C.1 (DONE) → 10C.2 (DONE)
11A (DONE) → 11A.2 (DONE) → 11B (DONE)
11C: DONE — Actuals / Forecast temporal separation
11D.0: DONE — Storage Architecture & Scalability
11D.1 RAF Model: DONE — favorable independent audit and final V1/V2 verification
11D.1 UX: DONE — favorable independent audit, final Cancel S1–S6 gates pass
11D.2: DONE — G1 historical replay proof and direct CPU/RAM characterization
11D.3 / 11D.4 / 11D.5: ENVISAGED — NOT STARTED; independent audit and authorization required
11A.1: DEFERRED / not adopted as product work; no dependency for 11B
10D: superseded by 11A (not DONE)
10E: largely superseded by 11B; advanced replay/navigation/comparison deferred
```

Final 11B plan review (2026-10-08): branch `codex/lot11a-portfolio-snapshots`,
starting HEAD `507e85d5af8ed3158f9ce449e2e354609212e7b5`, clean and synchronized
with origin (0/0) after fetch. The 11A.2 canon records the completed capture and
755-test validation. That review was documentation-only. The subsequent authorized implementation
was then IN REVIEW; explicit user closure subsequently marked 11B DONE.

## 11D.2 — Inputs-only historical architecture and replay contract

**Status: 11D.2 — DONE — G1 proof only, 2026-10-09.**
Favorable independent audit and explicit user closure authorization received.
Audited implementation / documentary closure baseline
`ee66a72cb6073c753681af95acae5122f93f13d3`, branch
`codex/lot11a-portfolio-snapshots`, clean and origin 0/0 after fetch.
The [dedicated architectural plan](./steps/STORAGE/lot11d2_plan.md) confronts
existing contracts with the new user-validated trajectory. 11D.0 and both
11D.1 sub-lots remain DONE; durable canons continue to describe delivered code.

Validated target decisions: new Portfolio Snapshots retain historical inputs
and immutable shared Actuals references; no calculated results in new captures.
Team/Project/Reservation configurations are copied into each capture; only
Actuals knowledge is shared by immutable references. V5 versions remain
object-scoped, with common periods and exact per-Team consumption; V4 retains
its historical representation. Full entity normalization is outside scope.
Normal consultation of **all** snapshots will use the current calculation chain,
with no promise of exact reproduction of old forecasts. Historical requirements
remain the RAF authority; no Current input substitution. 11C temporal separation
and 11D.1 historical Actuals RAF remain intact. Unresolvable or unsimulable inputs
show “Recalcul indisponible” with diagnostics, without captured-result fallback,
automatic repair or snapshot rewrite. Old inputs/results/profiles/versions/IDs
and references remain preserved; explicit conversion is outside scope.

The [11D.2 feasibility report](./steps/STORAGE/lot11d2_feasibility.md) records
Current/historical exact parity, dependency closure, reconstruction conservation,
representative determinism, independent historical inputs and measured direct
CPU/RAM costs. Coverage is bounded by the fixtures; extreme valid legacy input
is diagnosed and left unexecuted for resource risk. It does not
certify future worker, cache, concurrency or UI performance; those and definitive
budgets belong to their implementation lots. An exploratory budget overrun
requires analysis and possible architectural adjustment, not automatic rejection
of inputs-only. The audited G1 implementation added only proof tests/fixtures, laboratory scripts
and tracking documents. This closure changes only three Markdown tracking documents.
No production code, format, engine, repository or UI is changed.

The future Application pipeline supports Current and historical snapshots,
independent of UI/ViewModels/geometries. Four stages distinguish indexed snapshot
listing, progressive entity discovery, Actuals resolution/business facts, and
simulated results. Unexamined presence remains unknown; the initial display does
not promise a complete historical catalogue. RAM cache limits do not bound
simulation peaks: prior cost estimation, temporary/worker copy characterization
and explicit refusal of unsustainable runs must preserve Current availability.
A published Current projection matching exact inputs and calculation chain may
be reused without duplicate simulation; CAS, atomic publication, dirty drafts
and recovery stay intact. Chain identity covers business transformations without
purely visual invalidations. Diagnostics distinguish non-resimulable valid
captures, missing dependencies, unsupported formats, corruption and transient
read/resource errors, with distinct repository reactions and no old-result fallback.

No initial persistent cache or systematic full-history calculation on opening.
The global exact cap at cold opening conflicts with progressive loading; scope
arbitration is deferred to History/Trends integration, without blocking 11D.2
feasibility or designing a new interaction. Functional Trends evolution remains
outside scope. G1 is accepted following the favorable independent audit and
explicit user authorization. 11D.2 is DONE; 11D.3, 11D.4 and 11D.5 remain
**NOT STARTED**. The inputs-only production architecture is not deployed.

Closure evidence: [49 new tests](../src/proof/lot11d2/replay.test.ts),
1,104/1,104 global tests in 96 suites with no skips; typecheck/build PASS,
portable 3/3 PASS, native storage PASS after the sandbox listen restriction
was resolved. Physical quota enforcement remains uncertified.
[Exact proof results](./steps/STORAGE/lot11d2_proof_results.json) record
26 Current/historical pairs, 260 repetitions and three fresh processes.
[CPU/RAM measurements](./steps/STORAGE/lot11d2_measurements.json) cover seven
cases, two warmups and ten samples per case; the
[feasibility report](./steps/STORAGE/lot11d2_feasibility.md) retains all gate
results, stage CPU process times and measurement qualifications. Total wall
median/max: target 363.06/370.20 ms, stress 2164.56/2270.21 ms, adverse
4598.46/4639.46 ms. Observed maximum heap growth / process RSS: target
152.43/442.72 MiB, stress 1136.61/2102.73 MiB, adverse 779.98/1750.42 MiB.
These observations are not absolute peaks or production budgets. No application
gate or benchmark is rerun for this documentary closure.

Residual limits are explicitly handed to **11D.4 (NOT STARTED)**: targeted
Actuals resolution instead of whole-Current encoding; exact rational DTO
transport; worker copies, scheduling, concurrency, cancellation and cache
release; estimation of off-horizon contributions, prefixes and lookahead before
admission; reduced dense extraction and simultaneous structures; stage/cause
diagnostics distinguishing incomplete results from unavailable replay. Universal
compatibility, the valid extreme legacy case left unexecuted, absolute memory
peaks and integrated CPU/RAM budgets remain unproven. UI cycles, cold global-cap
arbitration and integration remain for 11D.5; format/persistence closure remains
for 11D.3. This handoff starts none of these lots.

Envisaged lots: 11D.3 Inputs-Only Capture & Persistence; 11D.4 Historical
Simulation Service; 11D.5 Historical Views Integration. Recommended delivery
order puts the service and legacy-view integration before activating inputs-only
Save, or uses one gated activation after all are ready. A capture must never be
available in production without a working consultation service. Each stage
requires independent audit and explicit implementation authorization.

This target supersedes the earlier proposed persistence of full daily
Team/Project/Reservation results in 11D.0 §5.4; it does not alter the delivered
storage, CAS, receipts, atomicity or recovery guarantees. Existing 11A/11A.2/11B
captured-result contracts below remain historical implementation records until
an authorized integration changes consultation. Planning/Trends source boundaries
are anticipated only: no selection, navigation, rename, comparison-interaction
or visual redesign is planned or implemented here.

## 11D.1 — RAF Model

**Status: DONE — RAF Model only.** Conditional user closure follows the favorable
independent implementation audit and final V1/V2 checks from
`cc81b9901e1a617c5eddc2051ee9946aa70fb5af`: three demonstrated editor/draft
anomalies corrected, 1009 Node tests plus 3 portable tests, storage gate and
22 existing + 11 new native browser scenarios pass. See the final verification
section in the delivery canon. Original implementation authorization followed independent audit of
[the amended plan](./steps/ACTUALS/lot11d1_raf_model_plan.md) at
`6ce922e55621423c4e00e21e374ae53a6deb1efa`. The required branch was clean,
at that exact HEAD and origin 0/0 after fetch. P1–P6 implementation separates
current requirement RAF from immutable snapshot RAF, introduces command A,
Application R2 routing, conditional R1 evidence, immutable RAM bases, safe draft
rebase, V8/inputs2 compatibility and minimal existing UI wiring.
[Delivery, matrix and executed gates](./steps/ACTUALS/lot11d1_raf_model_canon.md).

11D.0 remains DONE; 11C and its engine version remain unchanged. IndexedDB
physical schema/stores/keys/CAS are unchanged. Historical documents and captures
retain their original contracts and values; old/new Current and mixed captures
are validated at the codecs, repository and worker boundaries.

The [amended UX plan](./steps/ACTUALS/lot11d1_plan.md) received favorable
independent audit with R1/R2/R3 reservations. Amendment committed/pushed before
implementation from `075b2a6c18175eabdcbdb401556a81591f32635f`.
**11D.1 UX — DONE** following the favorable independent implementation audit
reported by the user and authorized final verification from
`0d73ad950f0ee17f896e4e7d1d9b60258b23d229`.
S1–S6 pass: mixed Forecast/RAF Cancel, isolated owners, published reopening,
compatible/stale rebase, certain refusal and modal guard. Missing Cancel handler
guard reproduced before correction; minimal Project controller/coordinator fix.
Final gates: 1055/1055 Node + 3/3 portable, 80/80 targeted included in Node total,
22/22 native audit + 11/11 V1/V2/R1 + 4/4 mounted UX, native storage,
typecheck/build/diff check. No failures, cancellations, skips or todos.
[Final closure and limits](./steps/ACTUALS/lot11d1_ux_canon.md);
[historical IN REVIEW delivery](./steps/ACTUALS/lot11d1_ux_review.md) unchanged.
Requirements RAF, proofs/R2, V1/V2/R1, historical/persistence/11C invariants remain
normative. No replay, inputs-only or 11D.2/11D.3; mission ends after delivery.

## 11D.0 — Storage Architecture & Scalability

**Status: DONE — explicit user closure on 2026-10-09 after favorable independent audit.**
Validated corrective implementation: `8d95f7406ff40a6d2d041b41784a3915173989c8`. User-authorized implementation after
explicit 11B/11C DONE closure at baseline
`eb38a3df8fceab30d82253cac6bc5cd325625444`. The A → B → C → D → E sequence is
implemented; see [plan and implementation record](./steps/STORAGE/lot11d0_plan.md)
and [delivery, gates and measurements](./steps/STORAGE/lot11d0_canon.md).

Post-audit corrections from baseline `8086ddf14f609d0f1c9e16cd480bf17de3f13f6b`
coordinate concurrent History requests, require recovery after uncertain commits
or failed local reconciliation, and remove the validation-certificate shortcut.
The independent re-audit is favorable: all three MAJOR findings are corrected
and validated. The user authorized this strictly documentary closure.
Recorded implementation gates: typecheck/build PASS; 935/935 application Node
tests (96 suites), 3/3 portable-server tests, 938 unique Node tests total;
41/41 targeted tests included in the application total; native Edge suite and
11/11 added browser scenarios PASS. These are existing verification results,
not tests rerun during closure.

Current session no longer owns Portfolio captures. Async Application repository,
IndexedDB, separate Current/History/metadata/identity indexes, CAS/receipts,
resumable staging and atomic activation are implemented. Legacy is preserved and
tracked by migration fingerprint; normal Current edits do not conflict with it.
V1–V7 readers and autonomous V7 export remain, with no engine or backup bump.
Lazy worker projections, bounded row caches, external exact cap calculation and
History release on return Planning preserve historical metrics and Planning drafts.
Persistent summaries and the future full daily Team/Reservation capture model
remain absent. 11D.2/11D.3 are not implemented by this storage delivery.

Residual limits remain explicit: unapplied RAM-only drafts are lost after
confirmed reload; systematic snapshot validation adds read/summary/cap/export
cost. Other retained limits: large-file transient buffers, browser
storage quota/eviction, estimated cache budgets and current Planning projection
costs on large horizons/Reservations. Physical quota refusal was not forced by
Edge's accepted DevTools override; native rollback and visible QUOTA errors were
verified with injected native transaction refusal. The favorable independent audit
and explicit user instruction close this lot.
No code, test, script or dependency changes; no other lot starts.
**11B DONE; 11C DONE; 11D.0 DONE.**

## Corrective lot — anchored temporal zoom and range drag

**Status: DONE** — human validated implementation at
`08e47fc41ae4ba23c0c6a4db1720e43dffa4802a`. Zoom +/− anchors on the
Projection date when visible, or on the nearest viewport edge after pan,
without changing that date. A confirmed click changes the Projection date.
A horizontal drag of at least 4 CSS pixels previews an inclusive date range
with both dates and zooms to it on release; ranges shorter than seven days expand within the
horizon. Shift + drag remains pan. Tooltips resume after the range gesture;
timeline surfaces suppress native text selection. Viewport state and clamps
remain in the shared viewport controller and Geometry remains the only
temporal coordinate system. This lot changes no planning or simulation rule.

## Corrective lot — Program/Pas, Reservation progress, colors, backup V3

**Status: DONE** — human validated at
`80c7e65ba45c7763a49973c389e5f4ae2e905ff9`. Project and Reservation
cards manage optional Program and Pas values, including normalized creation,
case-insensitive reuse, and
automatic removal after the last reference disappears. Inactive references
retain catalog values, but inactive entities do not contribute to forecast
progress. Reservation progress uses exact requested demand inside the inclusive
planning horizon, with consumption stopping at the Projection date; Program/Pas
progress divides total consumed work by total charge across active Projects
and Reservations. Project progress remains Project-only.

Each Program owns a freely editable color; ungrouped Projects and Reservations
own their colors, with no hidden own color after joining a Program. Frises use
the exact effective color, while main card backgrounds derive a light pastel.
Independent drafts preview locally; Cancel is inert for shared state, and the
last Apply that actually edits Color wins. New Program color is suggested once
on selecting New and remains stable while naming it; Program to None suggests
a new own color, while None to None preserves the current color. The new-name
inputs appear only with New. The engine batches full 0.5-unit fair-allocation
rounds to avoid workload-sized iteration while preserving admission and exact
allocations. Backup V3 persists associations and colors, reads V1/V2, and
repairs the specified orphan/color cases at import.
Mathematical termination follows from a finite horizon and Project list,
finite deadline lookaheads, and exact fair sharing that advances or stops.
Practical complexity also matters. The real V3 backup
`FP2-DTO-2026.10.01.json` exposed a 46-second full projection when
`12178 - SDD` became Mandatory. Caching per-date base capacity, omitting
unobserved future trajectories, and cancelling rational factors before
large products reduced the same full projection to under 0.4 seconds locally.
The exact planning-result digest matches the pre-fix engine and the fixture
test guards both output and interaction-scale performance.
This corrective lot did not begin 10A.

## 9I — Activation of Projects and Reservations in the simulation

**Status: DONE** — human validated implementation at
`c77558c3e8b2912532afbb8113ac8183fe737c18`. Project and Reservation
activation is immediate and independent of Apply/Cancel drafts. Ordinary edits
preserve the current activation state. Inactive entities retain all Portfolio
data but leave the forecast. Inactive Projects retain their exact position in
`Portfolio.priorityOrder`; Project progress remains visibly Inactive without
forecast metrics. At 9I closure, backups were strict V2 documents with both activation
flags; at its closure the corrective lot wrote V3. V1 remained readable and migrated
both entity types as active. Typecheck, 511 automated tests across 77
suites, and build pass. A local Edge check at 1440 px and 390 px covered
closed-card toggles, timeline and metric changes, draft Apply after toggle,
reactivation, and narrow layout without horizontal document overflow.

At 9I closure, Lot 10 had not started.

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
were absent from the V2 schema at 9H closure.

Implementation checks: TypeScript typecheck, 498 automated tests across 76
suites, and build passed. Human validation closed the lot.

## 10A — Actuals model & deterministic reconstruction

**Status: DONE** — human validated implementation at
`ec431e527ce7fe6dacd20c5d7aa052845d80b480`.

Project and Reservation now own distinct immutable Actuals chronologies with
explicit first start dates and exact per-Team cumulative consumption. Project
records also carry RAF. Append validation uses current membership, while old
records retain historical Team IDs and cumuls. A removed and reintroduced
Project requirement receives a freely configured RAF; persisted RAF provenance
distinguishes that case from continuous membership. Protected histories prevent
deletion of their owners and referenced Teams.

Domain reconstruction distributes each delta exactly over its object interval
using effective capacity, normal-day/exception fallback, then all-date
fallback. Daily contributions and Team/day sums are disposable projections,
never persisted observations or ceilings on Actuals. V4 backup stores business
chronologies and RAF provenance, while V1–V3 remain readable. Append commands
use candidate state → projection → persistence → publication. Forecast
Reservations, metrics, and `PlanningInput` remain on their existing 10A
boundary; 10B now integrates calculated daily occupation into planning.
Current capacity schedules and working pattern can reshape reconstructed
historical days; whole-Portfolio knowledge capture is implemented in 11A and drift
visualization in 11B, with advanced historical replay/navigation deferred.

## 10B — Actuals-aware planning projection

**Status: DONE.** Human validated at
`be6c2adb922b4d86a4fdbc750ff9b1321add2c34`. The inspected implementation
contracts, capacity-source factorization, diagnostics, projections, and
acceptance tests are in the
[10B plan](./steps/ACTUALS/lot10b_plan.md). The 10A step documents remain the
separate validated record of that sub-lot.

Calculated daily Project and Reservation occupation now enters planning without
raw records. The engine uses a shared daily capacity snapshot for allocation
and lazy deadline lookahead. `TEAM_ACTUALS_OVER_CAPACITY` reports Actuals excess;
`TEAM_OVER_RESERVED` reports marginal Reservation forecast excess. Timeline
shows four distinct load categories without capacity clipping, and cursor
metrics expose their exact cumulative amounts and both overload causes.
Project/Program/Pas progress remains forecast-only.

## 10C — Actuals workflows & UI

**Status: DONE.** [10C plan and validated contract](./steps/ACTUALS/lot10c_plan.md).
At 10C completion, Project and Reservation cards exposed immutable, exact Actuals history and
independent New Actuals forms. A photo uses the currently committed Team
membership, first-only `actualsFromDate`, editable through date, exact cumulative
consumption, and Project RAF. The exact RAF suggestion is editable. A conflicting
local Forecast membership or Project RAF draft blocks Actuals Apply; successful
edits rebase other drafts by TeamId. Apply uses the existing append commands,
projection and V4 transaction. The existing 10B timeline, diagnostics and metrics
show the committed result. Actuals dirty reflects edits against the proposed
input baseline, never merely opening the form. Final validation: typecheck and
build OK, 596/596 tests passing, and desktop/narrow visual reviews validated
manually. Implementation and final dirty correction were audited at
`9dc857594db335864f740e6295b74716ce6917de` and
`18f1c20ac6343dc95654dc32bffc7032f9d5be52`.

## 10C.1 — Object-scoped Actuals knowledge snapshots

**Status: DONE.** [10C.1 implementation and migration plan](./steps/ACTUALS/lot10c1_plan.md). The validated model uses immutable, whole-Project or whole-Reservation snapshots of Actuals knowledge. Each object has one current exact partition, and a Project snapshot includes current Team RAF. Replacement, extension, erosion and membership actions commit one object candidate through projection and V5 persistence. V4 cumulative records remain lossless, read-only migration evidence. Before explicit reconciliation they alone supply that object's simulated Actuals; afterward only its current V5 snapshot does. The editor shows the Team × period matrix, current RAF, and read-only history. Stable snapshot and period IDs reach timeline hit testing and tooltips. The implementation at `76a07ce2d6b4f4ada76c845c24cd2029a460f95e` and the audited V5 future-knowledge-date correction at `17094b03cbf4c34c8424d6fa1847e0ceebd55410` are validated.

## 10C.2 — Actuals / RAF workflow UX

**Status: DONE — user-validated and closed for the 11A implementation pass.** [10C.2 plan and implementation record](./steps/ACTUALS/lot10c2_plan.md). The Project card now shows an exact Actuals summary with a quick RAF draft, Apply/Revert and an explicitly confirmed first RAF. Reservation has a summary without RAF. A single Actuals draft store owns the Project three-step or Reservation two-step modal, with contiguous zone selection, period operations, per-cell evidence and explicit stale review. Forecast remains the Team membership editor; dependent membership changes enter one atomic Actuals handoff, while autonomous Forecast changes retain the normal path. The implementation reuses the 10C.1 Domain, whole-object session command, projection and V5 transaction. Desktop and 390 px browser review and automated gates are recorded in the lot document. The user has closed 10C.2; its Actuals invariants remain unchanged by 11A.

## 10D — Knowledge snapshots

**10D — superseded by 11A.** No concrete residual capture capability remains.

The historical 10D need was to freeze cross-object/Forecast knowledge that
10C.1 object snapshots do not cover: Team capacity, working pattern, Forecast
configuration and all objects at one instant. 11A complete historical inputs
cover that need, with minimal exact Project forecast metrics. This is a scope
replacement, not a DONE claim. Executable replay belongs to the residual 10E
concern rather than a separate 10D capture lot.

## 10E — Historical reconstruction & drift comparison

**10E — largely superseded by 11B.** Project drift visualization/comparison
moves to 11B. Potential residual scope: full historical-state replay, full
historical navigation and advanced comparison/reconstruction beyond promised
Project drift (including daily capacity/overload and other detailed results).
These capabilities require later explicit planning and are not implemented or
promised by 11A/11B. Comparisons must distinguish historical inputs/results
from any new replay or current configuration.

The [current canon](./current_canon.md) records the validated 10C.1 contract.

## 11A — Portfolio Snapshots & Forecast History Capture

**Status: DONE** — validated implementation at
`f477dd6e1a31f3be7be949dad9fea4cae9667770` (user-provided positive audit,
recorded in the prior planning pass and confirmed by the current framing).
Implementation follows the validated plan at
`da79f2c243bcba487f68c8ee441fe6efe1e65514`, retaining initial plan commit
`2d5695848035462bf6e4fc70754ec4d3bc6d5c94` on this branch.
See [11A canon and verification](./steps/PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
11A closure does not depend on adopting the separate 11A.1 merge study.

Explicit Save freezes complete shared-codec historical inputs, exact Actuals
source references (or frozen pending V4 evidence), and minimal exact Project
Actuals/RAF/EAC, priority and estimated dates. Identical timestamps and backward
technical clocks are accepted. Save checks every draft owner again at action
time and verifies the applied state against the published run. Save/Delete
persist V6 before publication and reuse the projection without recomputation.

V6 imports are self-contained and strict. Historical V5 sources resolve exact
IDs through consecutive prefixes with historical memberships and RAF; legacy
capture never reconciles current objects. V1–V5 readers remain and start with
empty Portfolio history; their encoders refuse history-bearing downgrades.
Historical Project/Reservation/Team/Program/Pas identities remain reserved for
as long as retained inputs reference them. No graphical drift, replay,
navigation or restore is added.

## 11A.1 — Merge historical backups into Portfolio Snapshots

**Status: DEFERRED / not adopted as product work.**
The [prior study](./steps/PORTFOLIO_SNAPSHOTS/lot11a1_plan.md) remains a
record of historical-backup merge constraints (detached V5 owners and lineage).
No merge, shared archive or lineage attestation is included in 11A.2/11B.
Those unresolved study decisions do not block the adopted Project History
trajectory. A future adoption requires separate scope/plan review.

## 11A.2 — Historical daily load profiles in Portfolio Snapshots

**Status: DONE — final verification and closure authorized by the user.**
See [11A.2 canon and verification](./steps/HISTORY/lot11a2_canon.md) and
[11A.2 / 11B plan](./steps/HISTORY/lot11a2_11b_plan.md).
Freeze exact Project-level daily Actuals and Forecast from the already-published
run at explicit Save, aggregated across Teams. Persist sparse positive daily
rows, exact rational strings and coverage semantics in forecast schema 2 under
V7; V6/schema 1 captures remain unchanged and explicitly lack a daily profile.
No engine/reconstruction during Save or future historical display, no full
PlanningResult and no artificial V4 reconciliation.
Domain/capture/persistence/tests/docs are complete. Final examination proves an
active Project cannot have zero published Team plans; no production correction
is necessary. Nine additional tests cover invalid inputs and unallocated/mixed
plans. Typecheck, 755/755 tests (89 suites), build and diff checks pass.
11A.2 is **DONE**. No 11B implementation is part of this mission.

## 11B — Project History view

**Status: DONE — explicit user closure on 2026-10-08.**
Implementation starts from mandatory baseline
`7a3ea6bf1c6c97e248075a75bc718279158ad0f5` on the existing branch.
11A.2 remains validated DONE. The [reviewed plan §§5–14](./steps/HISTORY/lot11a2_11b_plan.md)
was implemented without functional recadrage or scope extension.

The [11B canon and delivery record](./steps/HISTORY/lot11b_canon.md) describes
Planning characterization and explicit suspension, immutable historical DTO
projection, ordered-ID cache, independent viewport, exact daily stacked paths,
common pan-stable cap, clipping and inclusive knowledge marker, tooltip deltas,
colors, keyboard/touch/focus and read-only isolation. It records final gates
(initially 792/792; post-audit corrections 805/805 tests, 93 suites;
typecheck/build/diff checks), 1440/390 light/dark UI
review and small/target/stress performance measurements and residual limits.
No V6/V7 format, engine or business rule changed; no historical replay/restore,
Reservation frise, reference navigation or advanced analysis was added.

The acceptance matrix and review record remain the reference for non-regression.
11B was explicitly closed by the user on 2026-10-08; the closure is not inferred from tests alone.

## 11C — Actuals / Forecast temporal separation

**Status: DONE — explicit user closure on 2026-10-08.**
Implemented on `codex/lot11a-portfolio-snapshots` from the authorized mandatory
baseline `9ac532f0451e25a4b53564b9fc6359d3f824f318`, initially clean and origin 0/0.
The [audited plan](./steps/HISTORY/lot11c_plan.md) and mission approve P1–P7:
current V5 coverage or last pending V4 through, uncovered null, current erosion,
mandatory total derived input, common admission/Mandatory guard, unchanged
Reservations and `/2` for new captures only.

[11C implementation canon](./steps/HISTORY/lot11c_canon.md) records the source,
engine, integration/history tests, performance and 1440/390 light/dark review.
Project Forecast is strictly after its inclusive current Actuals end on every
Team; other admissible Projects retain slots/capacity. No Actuals/RAF, format,
persistence or History correction is introduced. Existing snapshots, including
old overlap and engine versions, remain exact and readable without replay.

11B and 11C were explicitly closed by the user on 2026-10-08;
11D.0 storage audit is the next action.

## Cross-cutting non-goals for Phase 9

- No raw Actuals records or historical replay inside Planning Engine V1.
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

## Storage implementation authorization — 2026-10-08

User instruction: close 11B and 11C and implement the hardened 11D.0 plan.
Both prerequisite lots are **DONE** by this explicit closure, at engine baseline
`eb38a3df8fceab30d82253cac6bc5cd325625444`; 879 tests/95 suites, typecheck and
build passed before storage changes. History contract changes required by the
plan are authorized. The roadmap sections above record the prior plan review;
implementation status is now **11D.0 IN REVIEW**, following A → B → C → D → E.
No future full daily capture model or backup version is authorized here.
