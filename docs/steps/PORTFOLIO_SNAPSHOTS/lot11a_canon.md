# Lot 11A — Portfolio Snapshots & Forecast History Capture

Status: **IN REVIEW**. Human audit is required
before DONE. The validated [plan](./lot11a_plan.md) is unchanged; the user has
closed 10C.2 and authorized implementation on 2026-10-07.

## Baseline and architecture

Initial workspace HEAD: `2d5695848035462bf6e4fc70754ec4d3bc6d5c94`, clean,
one commit behind origin after fetch. Fast-forwarded to the validated plan
revision `da79f2c243bcba487f68c8ee441fe6efe1e65514`. Implementation branch:
`codex/lot11a-portfolio-snapshots`, retaining both documentary commits.

- `application/backup/planningInputCodec.ts` extracts the existing V1–V5
  input codecs. Backup and capture share this non-recursive boundary. Strict
  mode validates factories and lossless canonical round-trip, rejecting repair,
  sorting loss, invalid colors, discarded fields or orphan catalog pruning.
- `domain/portfolioSnapshots/portfolioSnapshot.ts` owns immutable artifacts,
  exact Project totals, forecast validation, canonical identity/time and sort.
  Inputs are serialized JSON values; Application supplies the validated
  historical Portfolio. Domain imports no Application codec or UI store.
- `application/portfolioSnapshots/capturePortfolioSnapshot.ts` assembles
  capture, selects exclusive Actuals sources and privately resolves historical
  consecutive prefixes. Complete Actuals histories remain with current owners.
- `domain/planning/projectEstimatedDates.ts` supplies the shared pure start
  and end semantics. Timeline and capture consume the same end rule.
- `main/planning/createPlanningProjectionDispatcher.ts` checks the injected
  live dirty callback and published-state reference. History commits write V6
  before publication and reuse the same projection object. Save/Delete are
  absent from the generic input-command union.
- Session freeze/rebuild paths preserve history. Generators and grouping
  resolution include IDs found in retained historical inputs, refreshed after
  transactions and loading. Removing the last trace releases that reservation
  according to the existing generator lifecycle; no Actuals GC is introduced.
- `flowplanBackupV6.ts` validates the entire V6 document and every capture.
  V1–V5 remain readable with empty Portfolio history; all old encoders refuse
  downgrade when history exists. The storage key remains unchanged.
- `ui/portfolio-snapshots/` renders Save, precise local dates, deterministic
  list, targeted Delete confirmation and status. It updates only this surface.
  The coordinator checks all four draft stores plus Team/Create/Settings owners,
  with delegated edit notifications and store callbacks covering hidden drafts.

## Historical contract

Each capture has unique opaque `snapshotId`, canonical `createdAt`,
`inputsSchemaVersion = 1`, complete `inputs`, explicit `actualsSources`, and
`forecast = {forecastSchemaVersion: 1, engineVersion, projects}`. The engine
contract is `planning-engine-v1/actuals-aware/1`. Equal timestamps and backward
technical clocks are accepted without fabricated time. Sort is ascending by
createdAt and lexical snapshotId.

Every Project row stores projectId, canonical rational strings for actuals,
raf and eac, explicit actualsKnowledge (`none`, `uncovered`, `covered` or
`legacy-v4`), full-order 1-based priority, nullable estimated dates and nullable
absence reasons. Actuals are the complete current source, not cursor progress;
legacy totals use the latest cumulative per Team, including intermittent and
historically positive Teams outside current membership. RAF is applied
requirements; EAC is one exact rational addition.

Start is first positive canonical Project Actuals contribution or positive
Forecast allocation, all Teams and without clipping; absence is `no-activity`.
End is inactive / incomplete-within-horizon / no-allocation or the latest
completed Team end, identical to Timeline. No full PlanningResult or
Reservation-specific metric aggregate is captured.

V5 source tuples freeze kind/objectId/snapshotId. Hydration temporarily injects
the shared history prefix up to that ID and validates historical memberships,
Teams and RAF. Pending legacy uses frozen V4 evidence plus RAF provenance;
Save creates no Actuals, makes no reconciliation and never changes the current
object. Reconciled V5 remains the exclusive active source even when evidence
is retained. Deep copies/freeze prevent aliasing or later mutation.

V6 imposes no technical time relation among createdAt/exportedAt/knowledgeDate;
internal V5 knowledge/coverage/version invariants remain unchanged. Historical
metrics are structurally and arithmetically validated, never replaced by a
current engine. Any invalid capture aborts the complete import. Startup retains
invalid documents and uses the existing error/fallback without writing.

## Verification

Automated matrix covers repeated/equal/backward-time Saves, rich exact inputs,
none/RAF-only/covered-zero/V5/legacy/reconciled sources, old Project and
Reservation prefixes after later versions and Project membership evolution,
legacy intermittency/positive non-members/future coverage/provenance, minimal
forecast, Timeline end parity and first activity, deep immutability,
transaction failures/mismatch/no recompute, all five reserved identity kinds
and release after history deletion, V1–V5 migration/downgrade, strict malformed
V6 and invalid-middle-capture rejection, startup/import preservation, hidden
multi-drafts and invalid Create/Settings forms, UI list/Save/Delete/focus.

Verification on 2026-10-08: `npm run typecheck` passed; `npm test` passed
**696/696 tests, 87 suites**, no skipped/cancelled/todo tests; `npm run build`
passed; `git diff --check` passed. A separate targeted run passed **119/119**
tests covering Actuals V5, Portfolio capture/V6, import/export, persistence
transactions, the real Mandatory fixture, multidraft coordinator and Timeline
estimated dates. No test failure is waived.

Visual review completed on 2026-10-08 in Edge at **1440 px and 390 px** on
isolated `http://127.0.0.1:4181` demo storage. Verified explicit Save, precise
local-time list, pristine Create opening, dirty Create disabling Save with an
explanation, Cancel restoring Save, targeted Delete confirmation/success,
keyboard Tab → Delete → Enter, and focus returning to the snapshot summary.
The Projection date and existing planning metrics remained intact. The new
buttons match existing control styling. Native snapshots show no clipped
snapshot actions or major layout overflow. Measured in the inspected page:
`{width:390,scrollWidth:390}` and `{width:1440,scrollWidth:1440}`.
The only resource error in the console was the existing absent `favicon.ico`
(404); no application exception was observed. Disposable review snapshots were
deleted. The existing user-origin portfolio was only read, never modified.

No business-contract deviation is identified. The optional collection on
pre-V6 in-process seed callers is normalized to a frozen empty array on session
creation; V6 always requires the persisted collection. No historical metric is
recomputed at import. Review does not constitute human audit: **11A
IMPLEMENTATION: IN REVIEW**, not DONE.

## Roadmap boundary

10D is **superseded by 11A**, not DONE. 10E is **largely superseded by 11B**;
advanced replay/navigation/comparison are deferred. No 11B code, graph,
restoration, historical browser or selectable historical engine is included.
