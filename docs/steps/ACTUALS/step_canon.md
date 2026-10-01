# Lot 10A — Actuals model & deterministic reconstruction: step canon

Status: **PLAN for review**. This step defines the 10A target; no 10A behavior
is implemented yet. The implementation plan is [step_plan](./step_plan.md).

## Repository baseline and boundary

Inspected on `main` at `1551407b7f8b94f0eac628da158e77bec23de4bf`, with a clean
working tree and local `origin/main` at the same SHA. The validated product
baseline declared by `docs/current_plan.md` is
`80c7e65ba45c7763a49973c389e5f4ae2e905ff9`. Lots through 9I, the
grouping/color and temporal zoom corrections are DONE; Lot 10A has not started.

The current Domain has `ProjectTeamRequirement.remainingWorkload` as the RAF
read by the forecast engine. Reservations have `ratio` or `fixed-daily`
forecast allocations. Both entity types now have an `isActive` flag that only
controls forecast participation. The session has transactional local backup,
import, and export in strict V3 format. Project/Reservation progress labeled
"consumed" in the current metrics is forecast-derived; it is not an Actuals
record. These existing meanings must stay intact during 10A.

## Business truth

- Each Project and Reservation owns an independent Actuals chronology. An
  object's first record fixes one immutable `actualsFromDate`. Its first period
  is `[actualsFromDate, firstActualsThroughDate]`; later periods are
  `(previousActualsThroughDate, currentActualsThroughDate]`. The first end date
  may equal the start (a one-day interval) but cannot precede it; subsequent
  end dates are strictly increasing. Planning horizon, Project
  `earliestStartDate`, and Reservation `startDate`
  never supply an implicit Actuals start date.
- A Project record contains its date and, per Team, cumulative consumed work
  and the RAF estimated at that date. A Reservation record contains its date
  and cumulative consumed work per Team. The two kinds of record remain
  distinct. Records are immutable business knowledge, stored in append order.
  No reconstructed daily observation, previous-consumed reference, or
  Team-specific period start is stored in a record.
- For each Team in a new record, previous consumed is its cumulative value in
  the most recent earlier record containing that Team, or zero if absent. The
  non-negative delta belongs to the **new object's period**, even after the
  Team was absent from intervening records. A Team added for the first time
  likewise has previous consumed zero and uses that current object period.
- A record retains its own Team IDs when current requirements or allocations
  change. Append validation uses the currently configured Team membership
  *at append time*. Existing records are never compared retroactively with
  current membership.
  Historical Team identities must remain resolvable in the Portfolio while
  their owning object exists.
- Actuals exist regardless of `isActive`. Turning forecast participation off
  does not remove records or exempt them from validation. Reservation Actuals
  do not alter ratio or fixed-daily forecast demand. Fixed-daily remains a
  daily request, not RAF or a total workload.
- A Project requirement that has remained present since its Team's latest
  Actuals entry takes its current RAF from that entry. Ordinary Project editing
  cannot change that RAF. Removing the requirement breaks this RAF authority:
  if the Team is later reintroduced, its new requirement takes the RAF
  explicitly supplied for the new configuration, even when older records name
  the Team. That RAF remains editable until the Team's next Actuals append.
  The older records remain immutable, and the last historical
  `cumulativeConsumed` still supplies `previousConsumed` for the next delta;
  that cumulative continuity does not impose historical RAF on the new
  configuration. A Team with no earlier entry likewise uses its configured
  requirement RAF until its first record. Each Project append atomically
  updates the journal and current RAF, making the new entry authoritative
  while the requirement remains present. The 10C suggestion
  `max(0, previousRemaining - consumedDelta)` is not a 10A Domain rule.
- The final Project requirements plus Actuals journal cannot reveal whether a
  current requirement was removed and later reintroduced. The Domain must
  therefore retain current requirement RAF provenance across transitions and
  V4 persistence: whether its RAF is governed by its latest Actuals entry or
  by the current configuration. A stateless Portfolio factory can validate
  equality to the latest recorded RAF only for an explicitly Actuals-governed
  requirement; it cannot infer continuity from historical Team presence.
- Until deletion history has a separate lifecycle, a Project or Reservation
  with records cannot be deleted, and a Team named in any record cannot be
  deleted. Objects without such history keep current deletion semantics.

## Calculated daily occupation

Reconstruction is pure and deterministic for the records, current Team capacity
schedules, and global working pattern supplied. It runs independently for each
Project/Team and Reservation/Team contribution. Exact Team/day sums may exceed
effective capacity and never clamp one another.

For each delta, enumerate all civil dates in its object period and choose one
of three distributions:

1. If positive effective capacity exists, weight **all dates** by the existing
   `effectiveCapacity(team, date, workingPattern)`. Exceptions take priority
   there, even on a non-working date or outside a capacity period. A zero
   weight receives zero; each positive day's amount is
   `delta × effectiveCapacity(day) / sumPositiveEffectiveCapacity`.
2. If every capacity weight is zero, divide the delta equally among normally
   eligible dates: global working weekdays or dates carrying an explicit Team
   capacity exception, including an exception of zero. A working day in a
   schedule gap is eligible with zero weight. Other dates receive zero.
3. If there is no normally eligible date, divide the delta equally among **all
   civil dates** of the nonempty period, including weekends. Declared work is
   never refused because the calendar or capacity is zero.

All operations use exact Domain rationals; the sum of daily amounts equals the
declared delta exactly. Daily amounts are computed projections, never saved as
claimed observations. Because current schedules and working patterns can be
edited, recomputing old contributions with new inputs may change their daily
shape. Preserving versions of capacity knowledge belongs to 10D/10E.

## Persistence and downstream boundary

Since accepted session edits now persist before publication, 10A must add a
strict backup **V4** that stores the Actuals business chronologies. V1–V3
remain readable and migrate with no Actuals records. V4 stores no reconstructed
daily data. Persistence of these records is distinct from future knowledge
snapshots. The existing localStorage key and import/export transaction remain.

Project Actuals update current RAF, so the existing forecast is recomputed
from that RAF. A Reservation Actuals append currently goes through the same
session transaction and projection rebuild; it does not change forecast
semantics. 10A passes no Actuals occupation to `PlanningInput` and adds no
Actuals diagnostics, cursor metrics, timeline display, Update actuals UI,
snapshots, historical navigation, or drift comparison. Those remain 10B–10E.

Both append commands follow candidate state → projection → persistence →
publication. A Project append publishes its journal, resulting RAF, Portfolio/
session state, reconstructed projection, and V4 backup as one atomic result.
If reconstruction, projection, or backup writing fails after Domain validation,
neither the candidate journal nor RAF becomes visible in the published session.
A Reservation append has the same atomic boundary, without changing RAF.

The durable `docs/canon.md` RAF-only diagram is an incomplete description of
the later 10B projection input, but its separation of historical state from
the engine remains valid. This step does not change that document.
