# FlowPlan2 current canon

## Trajectoire active — V2 : socle R0.1 disponible, DONE

Point d'entrée et ordre de lecture : [current_plan](./current_plan.md).
R0 clôturé ; contrats normatifs dans [R0](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md)
et [décisions](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md).
[Plan R0.1 audité](./steps/PORTFOLIO_VERSIONED/rewrite_r01_plan.md) et
[canon de livraison](./steps/PORTFOLIO_VERSIONED/rewrite_r01_canon.md).
GO utilisateur à `1c2b08c727af9fb8002b7678bd7403fcc0d39c27` ; P0 propre,
exact et origin 0/0, nouvelle branche `rewrite/portfolio-versioned` créée à ce SHA.
La branche historique `codex/lot11a-portfolio-snapshots` reste inchangée.

**R0.1 — DONE**, clôture utilisateur le 2026-10-10 après audit indépendant
favorable de l’architecture, des frontières et preuves disponibles au SHA
`d5bb1a89c847604f2f80aaaa3270e4125f4a3fef` : nouveau shell/DTO technique vide
immutable, aucun modèle
métier ni persistence, sources/tests/build physiques distincts et cinq modules
runtime fermés. Dev 127.0.0.1:4274, portable 127.0.0.1:4275 ; Host/origine stricts,
collision sans fallback. Namespaces neufs réservés, aucune API storage/canal active.
Ancien src/public/scripts/configs app/test conservés, hors graphes V2.
G01–G14 PASS ; 39/39 tests V2, typecheck/build PASS, six séries browser natives,
zéro tentative API app, comparaison intégrale/hash de sentinelles égaux.
Rollback P1–P6 en clone jetable : tree baseline identique et sentinelles intactes.

G15 consultation historique sur 4174 PASS après accord utilisateur : clone
exact, Current (3 Teams), une capture puis History (4 lignes), aucun runtime V2
ni exception. Serveur existant arrêté temporairement puis restauré sur 4174,
PID 19550 / HTTP 200. Reverts des six commits : même tree baseline, mêmes
sentinelles aux quatre origines. Typecheck/build/3 tests portable historiques PASS.
Les véritables exécutables Windows V2 sur 4275 et historique sur 4175 ainsi que
leurs vérifications natives restent **DEFERRED / NOT EXECUTED**. L’amendement
utilisateur [I-R01-C](./steps/PORTFOLIO_VERSIONED/rewrite_decisions.md#amendement-de-clôture-r01--report-windows)
retire uniquement leur caractère bloquant pour la clôture R0.1 : le packaging est
périphérique au socle/runtime/browser validé. Aucune compatibilité ou disponibilité
Windows n’est attestée. Levée : validation sur Windows x64 compatible (Node 26
pour construction) avant qualification ou distribution Windows, preuves archivées.
Les résultats partiels G15/G16 restent inchangés ; hors SEA n’est pas PASS SEA.
**R1 — CADRAGE VALIDÉ ; R1.1 — PLANNED / NOT STARTED — PLAN CORRIGÉ À RÉAUDITER**.
[PLAN R1.1](./steps/PORTFOLIO_VERSIONED/rewrite_r11_plan.md), aucune primitive,
extraction ou implémentation nouvelle. R1.2–R1.4 et R2–R6 NOT STARTED.
Audit du SHA `06d98971bf5e3ddb717e6ee87d7c295631fd6331` : quatre corrections
documentaires appliquées au PLAN, aucune implémentation. GO NON ACCORDÉ ;
prochain événement exclusivement : audit différentiel ChatGPT du nouveau SHA.
Décisions globales dans le registre ; amendements normatifs nouveaux A-R1-01/02
explicités à [R0 §13](./steps/PORTFOLIO_VERSIONED/rewrite_r0_plan.md#13-addendum-normatif-r1-du-2026-10-10) :
Snapshot borné aussi par connaissance AP déclarée ; AP vide peut la déclarer,
sans couverture/TA/cutoff. Cibles uniquement, aucune règle déjà livrée ni preuve
d'exécution nouvelle. Les archives ci-dessous restent inchangées.

Option B extraction sélective, T01–T11/T12-R/T13–T15, I01–I21/I22-R/I23 et
architecture à six modules restent le socle ; seules les clauses désignées
T09/T13/I23 sont amendées explicitement par R0 §13. Current/PortfolioSnapshots natifs,
graphe versionné, AP/SubPeriod/TA/PT/RT/PTEC, ETC/status, Settings/Order, CAS et
robustesse durable sont des cibles R1+ ; aucune de ces primitives n'est livrée
par le DTO shell R0.1. Migration T12 historique inapplicable ; aucun bridge ou
format hybride. [Registre de reprise](./steps/PORTFOLIO_VERSIONED/rewrite_reuse_registry.md)
actualisé pour adaptations/exclusions techniques seulement, zéro extraction métier.
Arbitrage Reservation ratio + exception sans période reste ouvert pour R3.

Patrimoine historique : Portfolio/RAF inline, Actuals V4/V5, formats V1–V8,
snapshots avec résultats, DB flowplan-planning et bootstrap/demo sont des faits
anciens conservés, pas des modules V2. Canons DONE suivants restent vrais pour
l'ancienne application ; G1 11D.2 n'est pas une preuve runtime V2.
Stateless : aucune conversation normative, décisions nouvelles enregistrées,
prochaine preuve/état/limites accessibles depuis current_plan et canon R0.1.
Sauvegarde/restauration utilisateur vérifiée R0 §6 reste requise avant bascule
opérationnelle réelle ; cette mission n'utilise que des profils de laboratoire.

## Archives de canon — application de référence

Les sections suivantes et [canon.md](./canon.md) décrivent les contrats livrés de
l'ancienne application ; elles ne sont pas réécrites rétroactivement. En cas de
différence de cible, R0 prévaut pour V2, les canons livrés restent vrais pour
l'ancien produit. Le [plan antérieur](./steps/PORTFOLIO_VERSIONED/architecture_plan.md)
a la même portée documentaire historique pour migration/switch/séquence ancienne.

## 11D.1 UX — DONE

Authorized implementation from `075b2a6c18175eabdcbdb401556a81591f32635f`, after
favorable independent plan audit and separate R1/R2/R3 documentary commit/push.
[Delivery for independent audit](./steps/ACTUALS/lot11d1_ux_review.md),
[performance gate](./steps/ACTUALS/lot11d1_ux_performance.md).
A–E implement exact point/comma/fraction parsing and complete finite rendering,
compact three/two-column cards, one common period, folded readonly History,
one published-member RAF editor, preserved initial RAF for new Teams, scoped
Apply/Cancel and stable form composition with the modal outside the card form.
Weak quantity/model/cell caches and operation-local readings protect measured
long decimal/rebase costs without changing precision, proof or authority.
A pristine Project Apply uses existing A base validation/no-op, avoiding a
redundant Forecast write; any Forecast change retains its existing command path.

Final gates: typecheck/build/diff check, 1055/1055 Node tests (96 suites), 3/3 portable,
native storage (15 repository assertions plus UI/upgrade/layout/injected quota),
22/22 storage audit, 11/11 V1/V2/R1 and 4/4 mounted UX scenarios. No skip/failure.
Screenshots and native keyboard reviewed at 1440/390 px. Requirements authority,
A/B/R2 and R1 proofs, V1/V2, RAM bases, confirmed publication, immutable snapshots,
V1–V8 mixed captures and 11C remain intact. Domain, commands, engine and storage
formats/CAS unchanged. This supersedes the unimplemented exact UX statements in
historical prerequisite deliveries below.
Following the favorable independent implementation audit reported by the user,
the authorized final mixed Forecast/RAF Cancel verification passes S1–S6.
A delivered Cancel card event during an open modal exposed a missing handler
guard: the Project controller now checks the coordinator's existing modal gate
before cleaning either owner. Six added Node regressions and strengthened native
S1/S2 cover scoped discard, pristine reopening/remount, compatible/stale rebase,
certain command refusal, proof/error cleanup and modal branch preservation.
[Final closure, evidence and limits](./steps/ACTUALS/lot11d1_ux_canon.md).
Baseline `0d73ad950f0ee17f896e4e7d1d9b60258b23d229`;
implementation `0b70e4888e3c8e3b9881ed62ccc91654546a9590`.
11D.1 UX is DONE by the user's conditional closure; no following lot started.

## 11D.1 RAF Model — DONE

Implemented from `6ce922e55621423c4e00e21e374ae53a6deb1efa` on the required
branch, following the independently audited amended R1/R2 plan and explicit
user authorization. [Delivery and verification](./steps/ACTUALS/lot11d1_raf_model_canon.md).
Requirements own current RAF; snapshots keep immutable historical RAF.
`update-project-current-raf` applies a validated patch without any snapshot or
legacy reconciliation. `replace-project-actuals` validates a full immutable RAM
base, then routes no-op / independent RAF / one Actuals publication in Application.
Only publication of changed Actuals aligns requirements with the new snapshot.
R1 confirms all Teams for coverage/partition changes, affected Teams for
consumption-only changes, plus numerical RAF and membership obligations.
Drafts initialize from requirements, detect RAF concurrency at unchanged
Actuals version, preserve texts/modal branches and invalidate dependent proofs.
The existing card Apply/Cancel, modal and membership handoff remain usable.

Current codecs, workers, repository, portable import/export and captures use
V8 / inputs2 / RAF model2 together. Forecast schema2 and engine `/2` are unchanged.
V1–V7 and inputs1 captures remain readable under their historical numeric
validation; mixed collections and old Current with new captures are supported.
Reads/Save/no-ops do not rewrite old Current; Current mutations never read History
payloads. Physical IndexedDB/CAS/recovery are unchanged. 11C remains enforced.
This supersedes the permanent numerical equality and quick RAF-only publication
rules described in the historical lot sections below. New UX, exact decimal
presentation, replay and inputs-only remain outside this delivery.
11D.0 remains DONE; no subsequent lot is started. Following the favorable
independent audit reported by the user, final V1/V2 verification satisfies the
explicit conditional closure: restored split/merge IDs, safe modal RAF-only
review with retained consumption and selective proof invalidation, and explicit
R1 confirmation separate from text entry. Final gates: 1009/1009 Node tests,
3/3 portable, typecheck/build/storage, 22 existing and 11 new native browser
scenarios, diff check. RAF Model is DONE; UX was not started at that prerequisite closure.
[Final evidence and limits](./steps/ACTUALS/lot11d1_raf_model_canon.md#final-v1v2-verification-and-conditional-closure--2026-10-09).

## Validated implementation baseline

Validated prerequisite baseline: `eb38a3df8fceab30d82253cac6bc5cd325625444`.
11A/11A.2 remain DONE; their historical code baseline was
`06e7fbb94d71fe73a35e244d4cee6626b65777c2`.
11B and 11C are **DONE** by explicit user closure on 2026-10-08 at
`eb38a3df8fceab30d82253cac6bc5cd325625444` (879/879 tests, typecheck and build).
11D.0 storage implementation is **DONE**, explicitly closed by the user on
2026-10-09 after favorable independent audit of `8d95f7406ff40a6d2d041b41784a3915173989c8`.
All three MAJOR findings are corrected and validated. This commit is the current
validated implementation baseline. The closure changes documentation only and
starts no other lot. Recorded gates: typecheck/build PASS, 935/935 application
Node tests (96 suites) plus 3/3 portable-server tests (938 unique total),
41/41 targeted tests included in the application total, native Edge suite and
11/11 added browser scenarios PASS; these checks were not rerun for closure.
See [11D.0 delivery, gates and closure](./steps/STORAGE/lot11d0_canon.md).

The active application implements a pure planning projection over an editable
session, restored from a local backup when available and otherwise initialized
from the demo. The following capabilities are complete and active:

- global Planning settings: horizon, working weekdays, and one
  `maxParallelProjects` value applied independently per Team;
- one shared timeline with stacked Team panels;
- Team creation with one or more initial capacity periods, restrictive Team
  deletion, and Team Settings for name and structural capacity-period editing;
- Project creation and confirmed deletion, plus editing of name, dates, and
  Team requirements; Project priority is reordered from Portfolio Projects;
- global multi-Team Reservations with ratio and fixed-daily modes, created,
  edited, and deleted in inline Portfolio cards;
- immutable Project and Reservation Actuals snapshot histories, exact daily
  reconstruction, Actuals-aware planning projection, and transactional V8 persistence;
- whole-object Actuals partition/RAF editing and read-only V4/snapshot history in Portfolio cards;
- immediate Project and Reservation activation controls; inactive entities
  remain in the Portfolio and do not participate in the forecast;
- Projects / Reservations tabs in the Portfolio sidebar;
- shared viewport, zoom, pan, selected date, cursor, semantic hit testing,
  and hover;
- exact rational parsing and untouched exact-value preservation;
- compact accessible settings icon buttons for Planning and Teams;
- planning diagnostics, cumulative Team and global exact Actual/forecast load,
  occupancy and both overload causes, and Project / Program / Pas progress at
  the shared cursor date.

The implementation follows the state, atomicity, engine, and projection
invariants in [canon](./canon.md).

Lot 9H is validated **DONE**. Its single-localStorage persistence has been
superseded by the authorized 11D.0 architecture (**DONE**). IndexedDB is
primary. Current, immutable captures, light metadata, identity reference indexes,
control/revisions, staging jobs and bounded receipts are stored separately.
The live session owns Current and minimal identity constraints, not the Portfolio
Snapshot collection. Owned Actuals histories remain in Current. Domain/engine
remain storage-free. Current changes persist only Current before RAM publication;
Save/Delete atomically affect History only and keep the published run.

V1–V8 remain readable through their versioned contracts; compact autonomous V8
export/import is independent of physical stores. Complete imports validate each
capture, Current projection and read-back/index counts in private staging before
confirmation and atomic activation. Unknown/bad captures reject the whole import.
Legacy raw localStorage is never rewritten/deleted and is archived with its
migration fingerprint. Later Current changes are normal; changed legacy indicates
an older client, with explicit resolution and separate recovery exports.
Invalid startup data is preserved and editing blocked behind recovery actions,
not silently replaced by a writable demo. An empty new depot starts from the demo.

The physical DB schema is version 2 and logical storage data version 1, separate
from the portable envelope. SHA-256 proves byte integrity only. Every snapshot read runs complete
business validation against the persisted Current, including historical Actuals
prefix resolution. Legacy validationVersion metadata is ignored; new content is
not certified. No historical engine replay.

A proven transaction abort leaves the local state usable. Unknown commit outcomes
and confirmed commits with failed local reconciliation require recovery: all
Current/History mutations are blocked, drafts remain in their owners, and a visible
message offers explicit reload. Unapplied drafts are RAM-only and are lost after
confirmation of reload; cancelling reload preserves them. Reload rebuilds
the session/projection/token from persisted authority. No local revision increment
substitutes for reconciliation. Receipt retries keep operationId stable and consult
the receipt before CAS. Post-commit notification errors are uncertain, not rollback.

History loads metadata/projections without retaining all capture payloads.
Summary projections are ephemeral, versioned and rebuildable; no persistent
historySummaries store was introduced. Worker requests and snapshot reads are
serialized. Concurrent ensureRows calls re-evaluate missing rows in FIFO order;
release/refresh invalidate obsolete work by epoch and complete repository token.
Invalidated reads cannot publish or clear newer cached rows. Decoded row LRU budget is 32 MiB estimated; compact metadata index
budget is 64 MiB estimated. Exact global cap uses date/value multiplicities and
bounded external sorting (4096 entries, fan-in eight), without changing quartiles
or metrics. Closing History releases rows, model/gutters and buffers, retaining
viewport/reference/cap state only. All Planning draft owners/DOM remain alive.

File imports pass Blob/File to the worker (512 MiB explicit parsing limit),
parse/validate one capture at a time and resume incomplete staging by source hash.
The worker still retains the file text; this is not a streaming UTF-8 importer.
Export buffers a complete portable file as chunks/Blob; large files have real
transient RAM costs. Storage estimates/persist requests are indicative/refusable,
quota failures are visible and recoverable, and storage is never unlimited.
No physical quota-exceedance test succeeded: Edge did not enforce the attempted
override; only injected native quota refusal/rollback is verified. Memory budgets
remain estimates, and systematic snapshot validation adds read/summary/cap/export
cost despite worker execution. These residual limits remain accepted at closure.
See [storage delivery, closure and measurements](./steps/STORAGE/lot11d0_canon.md).

Lot 9I Project and Reservation forecast activation is validated and **DONE** at
`c77558c3e8b2912532afbb8113ac8183fe737c18`. Both entity types default
to active. Portfolio cards expose immediate Active/Inactive controls outside
their Apply/Cancel drafts; ordinary Apply preserves the current activation
state. Inactive Projects retain their global priority position exactly in
`Portfolio.priorityOrder` but have no Team plan, allocations, markers, forecast
diagnostics, or projected progress metrics. Inactive Reservations retain their
configured request and 9G display order but contribute no forecast demand,
timeline segment, or Team/global occupancy. `TEAM_OVER_RESERVED` remains a Team
aggregate of all active Reservation requests. Independent drafts and UI context
survive a successful toggle. The existing localStorage key is unchanged.

Lot 9A is validated and **DONE** as the original Program/PriorityFamily
foundation. The validated corrective lot extends both optional associations to
Reservations and makes catalogs usage-driven across both entity types. An
inactive reference retains its catalog entry; only active members contribute
to forecast progress. Cards offer None, an existing value, or a new normalized
value directly, without separate catalog management. The UI calls
PriorityFamily « Pas »; the technical name remains. Associations still have no
effect on planning priority or admission.

The corrective lot is validated and **DONE**. Programs own a color; an ungrouped
Project or Reservation owns its color; a Program member has no hidden own
color. Cards preview their derived pastel locally until Apply, and frises use
the exact effective color while keeping their Project/Reservation distinction.
Only an Apply that actually edits Color can replace a Program color changed by
another draft. A new Program gets one suggested color at the transition to New;
typing its name leaves the draft color stable. Program to None suggests a new
own color, while None to None preserves the existing color. New name inputs
appear only while New is selected. Suggested colors remain freely editable.
Reservation progress counts exact demand in the
inclusive planning horizon as its total charge, and demand through the
Projection date in that same horizon as consumed work. Group progress divides
sums of consumed work by sums of charges, without averaging percentages.

The corrective Mandatory performance fix keeps exact allocations and the
existing deadline semantics. The engine caches each Team's base Project
capacity by civil date, skips future residual trajectory materialization when
no later admitted mandatory Project can read it, and cancels rational factors
before multiplying large numerators and denominators. The real V3 backup
`FP2-DTO-2026.10.01.json`, with `12178 - SDD` changed to Mandatory at its
2027-02-28 objective, produces the same exact planning-result digest as the
pre-fix engine. It separates the finite-loop termination guarantee from
practical cost: on this case the full projection fell from about 46 seconds
to under 0.4 seconds in a local Node measurement.

Lot 9B is validated and **DONE**. A pure adapter projects exact
cumulative Team utilization and Project, Program, and PAS progress for an
inclusive selected-date interval. The current-run RAF baseline comes from the
same Portfolio used to plan; Portfolio and horizon references travel with the
PlanningResult in the disposable session projection. Lot 9C is validated and
**DONE**. It adds exact daily non-compensating over-reservation and its ratio,
and renders cumulative Team metrics plus an exclusive Projects / Programs / Pas
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

The Projection date presentation pass is validated and **DONE**. Its implementation
places the date in the global and Team timeline bands and in the projected
progress heading, while preserving one selected date and one temporal X
coordinate.

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

10A through 10C.2 are validated **DONE** lots (10C.2 closed by the user
for the 11A pass). 10D is **superseded by 11A**, not DONE. 10E is
**largely superseded by 11B**, with advanced replay/navigation/comparison deferred. The current RAF amendment is [11D.1 RAF Model](./steps/ACTUALS/lot11d1_raf_model_canon.md),
complementing the historical [10C.1 snapshot canon](./steps/ACTUALS/lot10c1_canon.md);
the 10A–10C documents describe their historical releases.

### Current object knowledge

Each Project and Reservation can own consecutive immutable whole-object
Actuals snapshots with a stable ID, version and application-clock knowledge
date. A snapshot lists current Team participants and a separate set of
retired zero Teams. Its optional Actuals coverage is a common inclusive range
partitioned into contiguous periods, each with exact nonnegative consumed
values for every participating Team. Project snapshots additionally contain
exact historical RAF for every current Team. Current requirements may diverge
after an independent RAF revision. A
snapshot without coverage can still carry Project RAF. Absent knowledge is
distinct from explicitly zero values. The end of coverage cannot exceed the
snapshot knowledge date, but Actuals may lie outside Forecast and planning
bounds.

The full-object transaction can add, replace, split, merge, extend or erode
coverage or change Team membership. RAF alone revises requirements without
a snapshot. Changed nonzero cells
need explicit values; an all-zero prior zone can propagate zero through a
repartition. A coverage or partition change requires explicit validation of all current
Project RAF; consumption-only changes require the affected Teams, united with
RAF numeric changes and membership obligations. Removing a Team requires zero current consumed values
and confirms current RAF zero; historical snapshots retain prior values.
Reintroduction requires explicit current values and RAF. An effective publication
of changed Actuals increments the object's version; independent RAF revisions
leave it unchanged. No-op, invalid, stale and failed projection
or persistence actions publish nothing.

### Legacy V4 and V5 persistence

V5 remains the object Actuals structure; V8 is the live portable export envelope. V1–V3 import without Actuals
snapshots. Imported V4 cumulative records remain lossless, read-only
`legacyV4Actuals` migration evidence. Until an object is explicitly
reconciled, only the legacy adapter reconstructs its Actuals. Reconciliation
requires a complete validated current partition and Project RAF, then creates
its first V5 snapshot at the application clock date. Afterward only its
current V5 snapshot reconstructs simulated Actuals; the V4 payload remains
exportable but never combines with it. V4 append commands are disabled.
Historical object and Team identities remain protected while referenced.
V5 import rejects any snapshot whose knowledge date is later than the UTC
civil date of the backup's canonical `exportedAt`, across both object types
and the full history. This legacy V5-reader rule is unchanged. V6/V7 impose no
technical-clock relation between exportedAt, createdAt and knowledgeDate, so
clock rollback remains round-trippable; internal Actuals invariants still apply.

### Daily reconstruction, planning and UI

Each current snapshot period's exact amount is distributed across its own
civil dates using effective Team capacity weights. If all weights are zero,
working weekdays and capacity-exception dates share the amount equally; if
none exist, all civil dates share it. The sum is exact. This daily occupation
is a calculated projection, never a claim of daily observation. Capacity is a
weight, not a ceiling. Project and Reservation Actuals may overlap and exceed
capacity. Source kind, object, snapshot, period, Team and day flow to timeline
hit testing and tooltips. Metrics and overload diagnostics use only the active
source mode for each object and the current projected run.

The planning engine receives current RAF, exact daily occupation and mandatory
derived Project Actuals boundaries, not snapshot histories. Actual Project and Reservation occupation is applied
before Reservation forecast and Project forecast. `isActive` affects only
forecast participation. Project, Program and Pas progress stays forecast
based, so Actuals occupation is not subtracted from RAF a second time.

Project and Reservation cards show the current Team × period matrix, Team
participation, current Project RAF or Reservation allocation, and read-only
snapshot and V4 history. Drafts remain local until Apply; Cancel clears only
the Actuals draft. The card submits one atomic whole-object command. Disjoint
field edits can rebase on a newer snapshot; concurrent partition changes and
conflicting fields become stale. A local Forecast membership or RAF draft must
be sequenced and rebased before a dependent Actuals Apply. The matrix scrolls
horizontally in narrow cards while labels and action controls retain keyboard
focus styling.

11A captures the cross-object, Forecast and capacity knowledge formerly scoped
by 10D. Its immutable Portfolio artifact is distinct from object Actuals and
from the disposable planning projection. Project drift is implemented in read-only 11B (DONE);
advanced replay/navigation/comparison remain deferred beyond that promise.

## Portfolio Snapshots — Lot 11A

Status: **DONE** at `f477dd6e1a31f3be7be949dad9fea4cae9667770`,
validated baseline supplied for the 11A.2 pass.

Implementation and final gate record: [11A canon](./steps/PORTFOLIO_SNAPSHOTS/lot11a_canon.md).
The Planning header offers Save portfolio snapshot and a local-time list ordered
by `(createdAt, snapshotId)` ascending. Save is clean-only with a live global
dirty precondition; Delete confirms one entire snapshot. All inputs and exact
minimal Project metrics are deeply copied and frozen. The published run supplies
estimated dates without recomputation. Shared helpers implement first positive
Actuals/Forecast activity and the Timeline completion/end rule.

Complete V7 documents retain current-owned Actuals histories once. Each capture
selects a fixed V5 ID or exclusive frozen legacy evidence, never a latest-at-read
rule. Historical validation hydrates prefixes privately, without invoking the
engine. None, uncovered RAF-only and covered zero knowledge stay distinct.
Save/Delete leave the cursor, viewport, tabs, open cards, drafts and planning
projection intact. Ordinary commands retain the collection and reproject once.
Historical IDs remain reserved for all five entity kinds while a retained
snapshot references them; removing history does no implicit Actuals collection.


## Historical daily load profiles — Lot 11A.2

Status: **DONE**. [Contract and verification](./steps/HISTORY/lot11a2_canon.md).
New Saves use forecast schema 2 with an obligatory Project `dailyProfile`:
`actualsRange` (nullable source knowledge coverage), `forecastRange` (complete
planning horizon), and sorted unique `days` with canonical exact rational
`actualsWorkload` and `forecastWorkload`. Only days with at least one positive
component are stored. Covered zero and missing coverage remain distinct, as do
legacy schema 1 without a profile and schema 2 with an empty list.

Actuals come from the published reconstruction contributions, Forecast from
published Project allocations, aggregated across all Teams without clipping
Actuals to the horizon. Exact conservation, source ranges, activity dates and
deep immutability are validated. Every active Project has at least one Team
requirement, all referenced Teams exist, and the priority order covers every
Project exactly once. The engine publishes one plan per active requirement even
without admission/allocation; positive unallocated RAF produces incomplete plans,
not an empty plan list. Save verifies fully allocated run equality;
partial/unallocated RAF stays in the independent RAF total. No new Actuals
snapshot, legacy reconciliation, engine run or historical redistribution occurs.

V7 accepts schema 1 and 2 together. V6 remains schema 1 only; import preserves
its captures unchanged and never manufactures daily profiles. V6 encoding
rejects schema 2. Save/Delete and ordinary accepted commands write V7 before
publication using the same storage key. Quota/codec errors preserve previous
state and document without purge. 11A.2 itself introduced no UI mode, view, renderer or Timeline
refactoring; the separate 11B implementation follows below. Final edge-case verification found no production defect;
755/755 tests, typecheck, build and diff checks pass. The user-authorized closure
is complete. The separate 11B implementation is **DONE**; the 11A.2 release itself introduced no History UI.


## Project History — Lot 11B

Status: **DONE**. [Implementation, acceptance coverage and measurements](./steps/HISTORY/lot11b_canon.md).
The workspace selector defaults to Planning and opens read-only Project History
in the main space. Planning DOM/editor owners survive idempotent suspend/resume;
modals explicitly block switching. Drafts, dirty, viewport/date, cards/tabs and
focus return unchanged, without projection rebuilding or persistence.

History reads validated captured DTOs only, with no current-label fallback,
V5 hydration or engine replay. It displays the historical Project union, S rows
per group, exact sparse daily Actuals/Forecast stacks, inclusive knowledge markers,
legacy-profile unavailability and previous-presence comparisons. The reference
snapshot owns one horizon; History has an independent viewport and a common
exact visual cap, resampled on effective zoom/dataset changes and stable at pan.
The cache compares canonical ordered snapshot IDs rather than collection copies.
Forecast details distinguish fully/partially allocated and unallocated positive
RAF by exact rational comparison. Activity outside the visible window is determined
from captured days intersecting the reference horizon and temporal viewport,
independently of vertical virtualization.

Rows support hover, focus, daily keyboard navigation and touch. Exact metrics,
coverage/status, timestamps/IDs, dates/reasons and deltas remain in accessible
details; Escape closes them. ID-derived snapshot colors are Programme-independent.
Heavy surfaces are windowed by date and visible Project groups; full gutter rows
retain sequential keyboard access. No Reservations frise, edit, restore, replay,
reference selection or advanced analysis is included. Post-audit suite: 805 tests /
93 suites; typecheck/build/diff checks pass. Desktop/narrow and light/dark review,
benchmark data and known memory/storage/color limits are recorded in the canon.

## Actuals / Forecast temporal separation — Lot 11C

Status: **DONE**, explicitly closed by the user on 2026-10-08.
[Implementation, matrix, measurements and UI review](./steps/HISTORY/lot11c_canon.md).
Current Project V5 coverage supplies an inclusive Actuals end; without V5, the
last pending V4 through applies. Uncovered/RAF-only knowledge has no bound.
Zero consumption retains coverage; erosion and rectification immediately use
the current source. One immutable derived line exists for every Project,
including inactive Projects, and the engine rejects incomplete/invalid inputs.
The common admission/Mandatory predicate requires every Forecast date > this
end across all Teams, preserving priority, slots, caps and shared capacity for
other eligible Projects. Dates/metrics/Timeline consume the corrected run.
Actuals distribution, quantities, RAF and Reservations are unchanged.
New Saves use engine version `/2`; existing captures keep exact profiles and
versions, including old overlap. V5/V6/V7 and History validation/rendering remain
unchanged. 11B is **DONE** by explicit user closure.

## Current UI structure

```text
Planning
├── global Settings icon, Save portfolio snapshot and snapshot list/Delete
├── cumulative Projects / Programs / Pas progress, titled with the Projection date
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

The temporal zoom interaction is validated and **DONE**. Zoom +/− uses the
Projection date as its visual anchor while it is in view, or the nearest
visible edge after a pan places it out of view. The date itself does not
change. A primary-pointer click moves that date only when confirmed on pointer
release. Horizontal drag of at least 4 CSS pixels selects an inclusive date
range, shows its two dates
and a translucent preview, and changes the shared viewport on release. A
shorter range expands symmetrically to the seven-day minimum, then clamps to
the horizon. Shift + drag remains pan. The range preview is transient UI
state; Project and Reservation segments remain unselected, and their tooltips
are hidden only while a range drag is active. Native text selection is
disabled on timeline surfaces, not on editable controls.

## Current editing behavior

Project and Reservation cards open independently from the Portfolio lists.
Several cards can stay open and dirty across tab changes. Each card has a
local UI draft; input and change events never dispatch Planning commands.
Apply updates only its entity and rebases other drafts against the new session;
Cancel abandons only its own draft. Dirty borders reflect actual differences
from the current session reference, including Team subcards. Collapsing a card
or Team leaves its draft intact. Team Settings remains a separate modal opened
only from its Settings button.

Every confirmed Timeline click moves only the Projection date according to its
temporal X coordinate. The Timeline has no selected entity or selection summary. The
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
- `update-project-current-raf`: revises explicit current member RAF patches
  against an immutable RAM base, without snapshot creation;
- `replace-project-actuals`: validates full bases and routes R2 to no-op, RAF
  revision or atomic publication of changed Actuals plus RAF;
- `update-project`: replaces editable fields and the final set of Team
  requirements, preserving explicitly untouched existing RAF and refusing hidden
  numeric revisions, including optional Program/Pas associations, without changing
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

Every ordinary accepted input change immutably replaces session state and triggers one
projection rebuild. Dedicated Portfolio Snapshot Save/Delete persist first and
reuse the projection with zero recomputation. A same-position reorder retains the existing state and
projection. Rejected commands do neither.

## Active temporary constraints

These are current implementation facts, not durable product rules:

- the browser starts from the hard-coded demo when no valid local backup is
  available; an invalid stored document is preserved and reported;
- existing Project Team requirement membership continues to use
  `update-project`;
- capacity periods can be added or removed for an existing Team, but have no
  manual reorder control;
- capacity exceptions exist in the domain but have no editor;
- Project `dailyCap` remains active in domain/planner but is hidden and
  preserved exactly by unrelated Project Apply;
- Project priority is reordered through Portfolio Projects handles; card
  badges show derived positions;
- Program/Pas catalogs are derived from Project and Reservation references;
  they have no separate management or global rename UI;
- the former daily Team summary is removed; cumulative metrics remain in Team
  headers and the Projects / Programs / Pas surface;
- Ctrl+ArrowLeft/Right moves the Projection date outside editable fields and
  modals without recomputing planning;
- Reservation allocation rows may be enabled/disabled for existing Teams;
- no dedicated automated browser/E2E stack is present; coverage is primarily
  domain, application, adapter, geometry, controller, and DOM unit tests.

## Not part of the current implemented canon

- separate Program / PriorityFamily management screens or global rename;
- undo/redo;
- advanced historical replay/navigation/comparison and restoration (deferred).

These omissions are ordered as future work in the
[current plan](./current_plan.md); they must not be inferred from visual
placeholders or implemented incidentally in unrelated lots.
