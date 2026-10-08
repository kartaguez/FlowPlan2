# Lot 10C.1 — Actuals knowledge snapshot canon

Status: **DONE**. This describes the audited implementation at
`76a07ce2d6b4f4ada76c845c24cd2029a460f95e` and the V5 import correction
at `17094b03cbf4c34c8424d6fa1847e0ceebd55410`.
The [implementation plan](./lot10c1_plan.md) records acceptance details.

Each Project or Reservation owns a versioned, immutable history of complete
object-scoped Actuals knowledge. A snapshot has a stable ID, consecutive
version, application-clock knowledge date, current Team participation, retired
zero markers, and optional Actuals coverage. Project snapshots also contain
exact current RAF for every participating Team. A Reservation's first snapshot
has coverage; a later total erosion can remove it. No snapshot and a Project
snapshot with uncovered zero RAF are distinct states.

Coverage is one inclusive range partitioned into contiguous, disjoint,
arbitrary-length periods. Every period stores one exact nonnegative consumed
value, including zero, for every participating Team. Period IDs remain stable
when a period is copied unchanged. Retired Team markers mean zero current
Actuals over the full partition and, for a Project, zero current RAF; the Team
is absent from the current participation map. Earlier snapshots preserve its
historical values. Reintroduction requires explicit values and Project RAF.

Initial entry, reconciliation, RAF-only edit, membership change, extension,
erosion and scoped replacement submit one whole-object candidate with a base
version and evidence for changed cells and RAF. A changed `actualsThrough`
requires current RAF validation for every Project Team. Unchanged-through RAF
may carry forward. A wholly zero prior zone may propagate zeros through a
repartition; nonzero values are never prorated or inferred. Actuals may lie
outside Forecast and planning dates, but cannot extend beyond knowledge date.
An effective commit increments that object's version. No-op and failed
transactions do not. The current Project snapshot RAF mirrors requirements
used by the planning engine; ordinary Forecast edits cannot change it.

Only the current snapshot contributes to simulated daily Actuals. Its exact
period values are spread by effective Team capacity, then by calendar
eligibility, then equally across civil dates if needed. Daily values are
derived projections, not observed work. Timeline contributions identify
source kind, object, snapshot, period, Team and date. The planning engine
receives daily occupation and current RAF, never the history itself.

V5 backups round-trip snapshots, legacy V4 evidence and migration status.
At V5 import, every snapshot knowledge date must be no later than the UTC
civil date of the backup's canonical `exportedAt` timestamp.
V1–V3 migrate without snapshots. V4 cumulative records are imported losslessly
as read-only `legacyV4Actuals`. Before explicit reconciliation, the legacy
adapter alone supplies the object's simulated Actuals. Reconciliation creates
the first true snapshot at the current knowledge date after full user
validation. Afterward the current V5 snapshot alone supplies simulation;
legacy records remain read-only and exportable. No business command appends
V4 records. Protected Project, Reservation and Team identities cannot be
physically deleted while snapshot or retained legacy history references them.

The Project and Reservation cards edit the current Team × period matrix and
current Project RAF. Team membership and Actuals apply atomically. Snapshot
and legacy histories are read-only. Draft changes are inert until Apply;
Cancel clears only that card's Actuals draft. Disjoint field edits can rebase
onto a newer snapshot; conflicting edits or concurrent partition changes
become stale and require review. Forecast membership or RAF drafts on the
same object must be sequenced before Actuals Apply.

10D remains responsible for cross-object and Forecast knowledge needed to
replay a whole historical planning state. 10E must label historical versus
current inputs in drift comparisons. An object-scoped Actuals snapshot does
not freeze Team capacity, calendar, or unrelated objects.

## Downstream amendment — 11C (IN REVIEW)

The current metadata additionally derives the inclusive Project boundary passed
to planning, independently of daily occupation. Coverage including zero blocks
Project Forecast through its end on every Team; absent coverage/RAF-only gives
null. Current erosion/rectification is authoritative, without a maximum over
prior versions. Pending V4 uses its last object through, including accepted
future dates. Actuals/RAF contracts and distribution remain unchanged.
[11C](../HISTORY/lot11c_canon.md) changes current projection only; older Portfolio
Snapshots, including overlaps, retain exact profiles/versions without replay.
