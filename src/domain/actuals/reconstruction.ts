import { effectiveCapacity } from "../capacity/calculations.js";
import { isWorkingDay, type WorkingPattern } from "../capacity/schedule.js";
import { civilDatesInclusive, type CivilDate } from "../model/date.js";
import type { Portfolio } from "../model/entities.js";
import { addRationals, compareRationals, divideRationals, multiplyRationals, rationalFromInteger, subtractRationals, type Rational } from "../model/rational.js";
import { consumedWorkloadFromRational, rationalOf, type ConsumedWorkload, type ProjectId, type ReservationId, type TeamId } from "../model/scalars.js";
import type { ReservationActualsTeamEntry } from "./records.js";

export type ActualsDailyContribution = Readonly<{
  sourceKind: "project" | "reservation";
  sourceId: ProjectId | ReservationId;
  recordIndex: number;
  teamId: TeamId;
  date: CivilDate;
  amount: ConsumedWorkload;
}>;
export type ActualsTeamDayTotal = Readonly<{ teamId: TeamId; date: CivilDate; amount: ConsumedWorkload }>;
export interface ActualsReconstruction {
  readonly contributions: readonly ActualsDailyContribution[];
  readonly teamDayTotals: readonly ActualsTeamDayTotal[];
}
const ZERO = rationalFromInteger(0n);

function quantity(value: Rational): ConsumedWorkload {
  const result = consumedWorkloadFromRational(value);
  if (!result.ok) throw new TypeError("Actuals reconstruction produced a negative amount.");
  return result.value;
}

function distribute(team: Portfolio["teams"][number], dates: readonly CivilDate[], delta: Rational, pattern: WorkingPattern): readonly Rational[] {
  if (!dates.length) throw new TypeError("Actuals period must have at least one date.");
  const weights = dates.map((date) => rationalOf(effectiveCapacity(team, date, pattern)));
  const total = weights.reduce(addRationals, ZERO);
  if (compareRationals(total, ZERO) > 0) return weights.map((weight) => {
    const ratio = divideRationals(weight, total);
    if (!ratio.ok) throw new TypeError("Positive capacity total cannot be zero.");
    return multiplyRationals(delta, ratio.value);
  });
  const eligible = dates.map((date) => isWorkingDay(pattern, date) ||
    team.capacitySchedule.exceptions.some((exception) => exception.date === date));
  const count = eligible.filter(Boolean).length;
  const share = divideRationals(delta, rationalFromInteger(BigInt(count || dates.length)));
  if (!share.ok) throw new TypeError("Actuals period divisor cannot be zero.");
  return dates.map((_, index) => count === 0 || eligible[index] ? share.value : ZERO);
}

export function reconstructActuals(portfolio: Portfolio, pattern: WorkingPattern): ActualsReconstruction {
  const contributions: ActualsDailyContribution[] = [];
  const teamById = new Map(portfolio.teams.map((team) => [team.id, team]));
  const process = (
    kind: "project" | "reservation", id: ProjectId | ReservationId,
    actuals: { actualsFromDate: CivilDate; records: readonly { actualsThroughDate: CivilDate; teams: readonly ReservationActualsTeamEntry[] }[] } | undefined,
  ) => {
    if (!actuals) return;
    const previousCumuls = new Map<TeamId, Rational>();
    let previousThrough: CivilDate | undefined;
    actuals.records.forEach((record, recordIndex) => {
      const dates = civilDatesInclusive(previousThrough ?? actuals.actualsFromDate, record.actualsThroughDate)
        .filter((date) => previousThrough === undefined || date > previousThrough);
      for (const entry of record.teams) {
        const previous = previousCumuls.get(entry.teamId) ?? ZERO;
        const current = rationalOf(entry.cumulativeConsumed);
        const delta = subtractRationals(current, previous);
        const team = teamById.get(entry.teamId);
        if (!team) throw new TypeError(`Missing historical Team ${entry.teamId}.`);
        const amounts = distribute(team, dates, delta, pattern);
        const sum = amounts.reduce(addRationals, ZERO);
        if (compareRationals(sum, delta) !== 0) throw new TypeError("Actuals distribution lost a rational amount.");
        dates.forEach((date, index) => contributions.push(Object.freeze({
          sourceKind: kind, sourceId: id, recordIndex, teamId: entry.teamId,
          date, amount: quantity(amounts[index]!),
        })));
        previousCumuls.set(entry.teamId, current);
      }
      previousThrough = record.actualsThroughDate;
    });
  };
  portfolio.projects.forEach((project) => process("project", project.id, project.actuals));
  portfolio.reservations.forEach((reservation) => process("reservation", reservation.id, reservation.actuals));
  const totals = new Map<string, { teamId: TeamId; date: CivilDate; amount: Rational }>();
  contributions.forEach((contribution) => {
    const key = `${contribution.teamId}\u0000${contribution.date}`;
    const current = totals.get(key);
    totals.set(key, { teamId: contribution.teamId, date: contribution.date,
      amount: addRationals(current?.amount ?? ZERO, rationalOf(contribution.amount)) });
  });
  return Object.freeze({ contributions: Object.freeze(contributions),
    teamDayTotals: Object.freeze([...totals.values()].map((item) => Object.freeze({
      teamId: item.teamId, date: item.date, amount: quantity(item.amount),
    }))) });
}
