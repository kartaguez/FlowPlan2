import { serializeQuantity, type CivilDate, type ProjectId, type ReservationId, type TeamId } from "../../domain/index.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface ActualsTeamViewModel {
  readonly teamId: TeamId;
  readonly label: string;
  readonly previousConsumedExact: string;
  readonly currentRafExact?: string;
  readonly rafAuthority?: "current-configuration" | "latest-actuals";
}
export interface ActualsRecordViewModel {
  readonly actualsThroughDate: CivilDate;
  readonly teams: readonly Readonly<{ teamId: TeamId; label: string; cumulativeConsumedExact: string; remainingWorkloadExact?: string }>[];
}
export interface ActualsViewModel {
  readonly kind: "project" | "reservation";
  readonly id: ProjectId | ReservationId;
  readonly actualsFromDate?: CivilDate;
  readonly records: readonly ActualsRecordViewModel[];
  readonly teams: readonly ActualsTeamViewModel[];
}

export function buildProjectActualsViewModel(state: PlanningSessionState, id: ProjectId): ActualsViewModel | undefined {
  const project = state.portfolio.projects.find((item) => item.id === id);
  if (!project) return undefined;
  const labels = new Map(state.portfolio.teams.map((team) => [team.id, team.name]));
  const previous = new Map<TeamId, string>();
  const records = (project.actuals?.records ?? []).map((record) => {
    const teams = record.teams.map((entry) => {
      const cumulativeConsumedExact = serializeQuantity(entry.cumulativeConsumed);
      previous.set(entry.teamId, cumulativeConsumedExact);
      return Object.freeze({ teamId: entry.teamId, label: labels.get(entry.teamId) ?? String(entry.teamId),
        cumulativeConsumedExact, remainingWorkloadExact: serializeQuantity(entry.remainingWorkload) });
    });
    return Object.freeze({ actualsThroughDate: record.actualsThroughDate, teams: Object.freeze(teams) });
  });
  return Object.freeze({ kind: "project", id,
    ...(project.actuals ? { actualsFromDate: project.actuals.actualsFromDate } : {}),
    records: Object.freeze(records),
    teams: Object.freeze(project.requirements.map((requirement) => Object.freeze({
      teamId: requirement.teamId, label: labels.get(requirement.teamId) ?? String(requirement.teamId),
      previousConsumedExact: previous.get(requirement.teamId) ?? "0/1",
      currentRafExact: serializeQuantity(requirement.remainingWorkload),
      rafAuthority: requirement.rafAuthority ?? "current-configuration",
    }))),
  });
}

export function buildReservationActualsViewModel(state: PlanningSessionState, id: ReservationId): ActualsViewModel | undefined {
  const reservation = state.portfolio.reservations.find((item) => item.id === id);
  if (!reservation) return undefined;
  const labels = new Map(state.portfolio.teams.map((team) => [team.id, team.name]));
  const previous = new Map<TeamId, string>();
  const records = (reservation.actuals?.records ?? []).map((record) => {
    const teams = record.teams.map((entry) => {
      const cumulativeConsumedExact = serializeQuantity(entry.cumulativeConsumed);
      previous.set(entry.teamId, cumulativeConsumedExact);
      return Object.freeze({ teamId: entry.teamId, label: labels.get(entry.teamId) ?? String(entry.teamId), cumulativeConsumedExact });
    });
    return Object.freeze({ actualsThroughDate: record.actualsThroughDate, teams: Object.freeze(teams) });
  });
  return Object.freeze({ kind: "reservation", id,
    ...(reservation.actuals ? { actualsFromDate: reservation.actuals.actualsFromDate } : {}),
    records: Object.freeze(records),
    teams: Object.freeze(reservation.teamAllocations.map((allocation) => Object.freeze({
      teamId: allocation.teamId, label: labels.get(allocation.teamId) ?? String(allocation.teamId),
      previousConsumedExact: previous.get(allocation.teamId) ?? "0/1",
    }))),
  });
}
