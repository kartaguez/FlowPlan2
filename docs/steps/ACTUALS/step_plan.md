# Lot 10A — implementation plan

Status: **PLAN for human review; implementation not started**. Read the
[step canon](./step_canon.md) first. Lot 10 stays OPEN; completion of an
implementation pass would mark 10A IN REVIEW until human audit.

## Current architecture and changed assumptions

At `1551407b7f8b94f0eac628da158e77bec23de4bf`, `src/domain/model/entities.ts`
defines Project, Team, requirements and Portfolio validation;
`src/domain/capacity/reservation.ts` defines forecast allocations;
`src/domain/capacity/calculations.ts` supplies `effectiveCapacity`;
`src/domain/model/date.ts`, `rational.ts`, and `scalars.ts` supply exact dates
and quantities. `src/application/session/planningSession.ts` owns atomic
commands. `src/main/planning/createPlanningProjectionDispatcher.ts` builds a
candidate projection and writes its backup before committing session state.
`src/application/backup/flowplanBackupV1.ts` currently encodes V3 and strictly
decodes V1–V3. Import, export and startup use that codec. The engine still
reads current Project RAF and active forecast Reservations; 10A does not change
its input or capacity contracts.

Earlier 10A planning assumed an in-memory demo. Lot 9H's transaction and V3
backup make that assumption obsolete. User decision for this plan: add V4
persistence in 10A. Lot 9I also requires Actuals to remain attached to
inactive Projects and Reservations. Grouping, colors, and forecast progress
must survive entity reconstruction and V4 migration without behavioral change.

## Interfaces and validation

1. Add distinct `ProjectActualsRecord` and `ReservationActualsRecord` types.
   Use an optional immutable `actuals` chronology on each entity, containing
   `actualsFromDate` and an append-ordered `records` array. A record has
   `actualsThroughDate` and immutable `teams` entries. Project entries have
   `teamId`, `cumulativeConsumed`, `remainingWorkload`; Reservation entries
   have `teamId`, `cumulativeConsumed`. Introduce a non-negative exact
   `ConsumedWorkload` scalar, serialized as a canonical rational. Do not
   persist derived deltas, prior cumulative values, daily amounts, or Team
   start dates. Existing entities omit `actuals` until their first record.
2. Extend `createProject` and `createReservation` to deep-copy/freeze and
   validate supplied chronologies: start present iff records are nonempty,
   first date at/after start, subsequent dates strictly increasing, unique
   Team IDs per record, exact non-negative quantities, and per-Team cumuls
   nondecreasing against the last earlier entry containing that Team. Permit
   empty Team entries for a Reservation record. Keep existing activation,
   grouping, color, date, and forecast validations. `createPortfolio` checks
   that every historical Team ID still exists; it does **not** require an old
   record's Teams to match current requirements or allocations. For each
   currently required Project Team with a past entry, validate exact RAF
   equality to its latest recorded RAF. New requirements without a past entry
   keep their editable RAF.
3. Add Domain append operations for the two entity types. The first append
   requires an explicit `actualsFromDate`; later appends reject a new or
   changed start. Each append takes a complete record for the entity's
   *currently configured Team membership*, regardless of the object's
   `isActive` forecast flag, compares its Team IDs to requirements or
   allocations at that moment, finds each Team's latest historical cumulative
   (or zero), rejects a decrease, and returns a new validated entity. A
   Project append also updates corresponding requirements' RAF. A Team that
   disappeared and reappeared uses its last historical cumulative value, but
   its delta belongs solely to the newest object period. A zero-Team
   Reservation may append an empty record and advance its object date.
4. Add `append-project-actuals` and `append-reservation-actuals` typed session
   commands. Application resolves the target and current Portfolio Teams;
   Domain enforces the timeline and quantities. Commands atomically replace
   the target and run Portfolio validation. Update/create/activation/grouping
   commands must preserve existing chronologies. Ordinary `update-project`
   rejects a direct change to RAF for any Team with a historical entry,
   including one removed and later reintroduced; its reintroduced requirement
   must initially carry the last recorded RAF. Ordinary Reservation editing
   changes only forecast fields. Block Project/Reservation deletion with
   records and Team deletion when referenced by any record, with explicit
   error codes and no state change. Inactive status grants no exception.

## Reconstruction and persistence

5. Add a pure Domain reconstruction module with a shared exact distribution
   primitive. For each object record and Team entry, derive the delta from
   the last *earlier entry for that Team* or zero, but take the interval from
   the previous **object** record (or `actualsFromDate` for the first). Use
   `civilDatesInclusive` and compare dates to implement the first closed
   interval and later left-open intervals; avoid `addDays` overflow at the
   maximum CivilDate. Enumerate all dates once per interval. Use existing
   `effectiveCapacity`; if total positive weight is nonzero, distribute
   proportionally. Otherwise divide equally among working weekdays plus
   exception dates; if there are none, divide equally among all calendar
   dates. Use `Rational` and non-negative Domain scalar conversion throughout,
   and assert exact equality of contribution sum and delta. Return immutable
   source-identified daily Project or Reservation contributions and a pure
   exact Team/day sum of those contributions for 10B; persist neither output.
6. Evolve the strict backup codec to V4 under the existing `flowplan` format
   and localStorage key. Encode optional chronologies on Projects and
   Reservations, using canonical rational strings and ISO CivilDates. Decode
   V4 strictly through Domain factories and Portfolio validation. Decode
   V1–V3 as entities without Actuals; successful import writes V4. Switch
   automatic saves, import normalization, and export to V4. Do not silently
   drop Actuals if a legacy V1/V2/V3 encoder is called on a state containing
   records: reject that use explicitly. Preserve `isActive`, Program/Pas
   associations, colors, and existing import repair behavior. A failed V4
   decode, projection, or
   store write leaves the session unchanged and follows the existing failure
   path. No knowledge snapshots or historical capacity versions are added.
7. Keep the existing projection dispatcher path for both append commands.
   Project append rebuilds forecast from the updated RAF. Reservation append
   also rebuilds once because the current dispatcher rebuilds every changed
   state before persisting; special-casing this no-op forecast change would
   complicate its transaction. Do not pass Actuals to Planning Engine V1 or
   change diagnostics, timeline, or metrics. Current Reservation and group
   progress remains forecast-derived, regardless of any new Actuals records.

## Implementation order and acceptance tests

Implement Domain scalar/records and factory validation first; then append
operations and reconstruction; then session commands and lifecycle guards;
then V4 codec and transaction wiring; finally documentation. Keep every
intermediate change compatible with record-free demo and V1–V3 backups.

- **Domain records:** first `[from, through]` and later `(previous, through]`
  intervals; immutable start and records; date equality/reversal rejected;
  exact non-negative and nondecreasing cumuls; RAF retained; object dates
  independent; duplicate/unknown Teams; empty Reservation Team set; no
  retroactive membership validation; inactive entity records retained.
- **Membership:** first Team's previous cumul is zero; newly added Team uses
  current object interval; removed Team's old record persists; reintroduced
  Team resumes last known cumul but distributes only over the current object
  interval. Verify Project and Reservation cases and preserved record values
  after ordinary edits, activation toggles, grouping/color edits, and Team
  capacity changes.
- **Distribution:** positive constant/variable weights, zero-weight days,
  capacity exception on weekend and outside a period, zero-capacity fallback
  over normal days, all-calendar fallback over a weekend-only interval,
  schedule gaps, sub-capacity and over-capacity deltas, rational fractions,
  successive intervals, exact `sum == delta`, independent overlapping
  Project/Reservation sources with no clamp, and dates at period boundaries.
- **Session/lifecycle:** Project append synchronizes RAF and produces one
  current forecast projection; direct RAF edits after an entry fail; absent
  and returning Teams follow the stated RAF rule; Reservation append does not
  change forecast demand; all three protected deletions fail without state,
  projection, or backup writes; record-free deletions still work. Failed
  append and failed persistence never publish a candidate state.
- **Backup:** V4 round-trip preserves complete journals and exact quantities;
  V1–V3 migrate with empty histories; invalid chronology, malformed fields,
  non-canonical quantities and unknown historical Teams are rejected; import,
  export, startup recovery and transactional write failure remain correct;
  V4 keeps activation/grouping/color data and the current localStorage key.
  Run `npm run typecheck`, `npm test`, and `npm run build` at implementation
  review. Check the git diff for no 10B–10E changes.

## Documentation and deferred work

During implementation, update `docs/current_canon.md` with delivered 10A
behavior, backup V4, and the capacity-version limitation. Update
`docs/current_plan.md` to **10A IN REVIEW**, not DONE, while Lot 10 stays OPEN.
`docs/arch/ARCHITECTURE.md` remains an index. Change `docs/canon.md` only if
the implemented Domain invariants warrant a durable update; retain its rule
that history stays upstream of Planning. 10B will revisit its RAF-only diagram
when daily Actual occupation enters the engine.

Deferred: actual-aware planning capacity, overload diagnostics, Actuals
timeline/metrics, 10C UI and RAF suggestion, knowledge snapshots, historical
navigation, drift comparison, and persistence of reconstructed daily values.

This plan pass changes documentation only. No production or test code is
modified, and no 10A implementation is started.
