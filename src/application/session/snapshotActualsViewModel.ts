import type { ProjectActualsChronology, ReservationActualsChronology, ProjectActualsSnapshot,
  ReservationActualsSnapshot, DailyCap, ReservationRatio, Capacity, TeamId, ProjectId, ReservationId } from "../../domain/index.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface SnapshotActualsTeamModel {
  readonly teamId: TeamId;
  readonly label: string;
  readonly participating: boolean;
  readonly dailyCap?: DailyCap;
  readonly reservationAmount?: Readonly<{ kind: "ratio"; ratio: ReservationRatio }> |
    Readonly<{ kind: "fixed-daily"; dailyCapacity: Capacity }>;
}

export type SnapshotActualsViewModel = Readonly<{
  kind: "project" | "reservation";
  id: ProjectId | ReservationId;
  teams: readonly SnapshotActualsTeamModel[];
  snapshots: readonly (ProjectActualsSnapshot | ReservationActualsSnapshot)[];
  legacyV4Actuals?: ProjectActualsChronology | ReservationActualsChronology;
}>;

export function buildProjectSnapshotActualsViewModel(state: PlanningSessionState, id: ProjectId): SnapshotActualsViewModel | undefined {
  const project = state.portfolio.projects.find((item) => item.id === id);
  if (!project) return undefined;
  const requirements = new Map(project.requirements.map((row) => [row.teamId, row]));
  return Object.freeze({ kind: "project" as const, id, snapshots: project.snapshots ?? [],
    ...(project.legacyV4Actuals ?? project.actuals ? { legacyV4Actuals: (project.legacyV4Actuals ?? project.actuals)! } : {}),
    teams: Object.freeze(state.portfolio.teams.map((team) => Object.freeze({ teamId: team.id, label: team.name,
      participating: requirements.has(team.id),
      ...(requirements.get(team.id)?.dailyCap === undefined ? {} : { dailyCap: requirements.get(team.id)!.dailyCap! }),
    }))),
  });
}

export function buildReservationSnapshotActualsViewModel(state: PlanningSessionState, id: ReservationId): SnapshotActualsViewModel | undefined {
  const reservation = state.portfolio.reservations.find((item) => item.id === id);
  if (!reservation) return undefined;
  const allocations = new Map(reservation.teamAllocations.map((row) => [row.teamId, row]));
  return Object.freeze({ kind: "reservation" as const, id, snapshots: reservation.snapshots ?? [],
    ...(reservation.legacyV4Actuals ?? reservation.actuals ? { legacyV4Actuals: (reservation.legacyV4Actuals ?? reservation.actuals)! } : {}),
    teams: Object.freeze(state.portfolio.teams.map((team) => Object.freeze({ teamId: team.id, label: team.name,
      participating: allocations.has(team.id),
      ...(allocations.get(team.id) === undefined ? {} : { reservationAmount: allocations.get(team.id)!.amount }),
    }))),
  });
}
