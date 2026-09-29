import {
  serializeQuantity,
  type CivilDate,
  type ReservationId,
  type ProgramId,
  type PriorityFamilyId,
  type TeamId,
} from "../../domain/index.js";
import { formatPercentageForEditing, formatQuantityForEditing } from "./editableQuantity.js";
import type { PlanningSessionState } from "./planningSession.js";

export interface ReservationEditViewModel {
  readonly reservationId: ReservationId;
  readonly name: string;
  readonly programId?: ProgramId;
  readonly priorityFamilyId?: PriorityFamilyId;
  readonly effectiveColor?: string;
  readonly programs?: readonly Readonly<{ id: ProgramId; name: string; color?: string }>[];
  readonly priorityFamilies?: readonly Readonly<{ id: PriorityFamilyId; name: string }>[];
  readonly startDate: CivilDate;
  readonly endDate: CivilDate;
  readonly teamAllocations: readonly ReservationTeamAllocationEditViewModel[];
}

export interface ReservationTeamAllocationEditViewModel {
  readonly teamId: TeamId;
  readonly teamLabel: string;
  readonly enabled: boolean;
  readonly kind: "ratio" | "fixed-daily";
  readonly value: string;
  readonly exact?: string;
}

export function buildReservationEditViewModel(
  state: PlanningSessionState,
  reservationId: ReservationId,
): ReservationEditViewModel | undefined {
  const reservation = state.portfolio.reservations.find(
    (candidate) => candidate.id === reservationId,
  );
  if (reservation === undefined) return undefined;
  return Object.freeze({
    reservationId: reservation.id,
    name: reservation.name,
    ...(reservation.programId === undefined ? {} : { programId: reservation.programId }),
    ...(reservation.priorityFamilyId === undefined ? {} : { priorityFamilyId: reservation.priorityFamilyId }),
    effectiveColor: reservation.programId === undefined ? reservation.ownColor! : state.portfolio.programs.find((program) => program.id === reservation.programId)!.color,
    programs: Object.freeze(state.portfolio.programs.map((program) => Object.freeze({ id: program.id, name: program.name, color: program.color }))),
    priorityFamilies: Object.freeze(state.portfolio.priorityFamilies.map((family) => Object.freeze({ id: family.id, name: family.name }))),
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    teamAllocations: Object.freeze(
      state.portfolio.teams.map((team) => {
        const allocation = reservation.teamAllocations.find(
          (candidate) => candidate.teamId === team.id,
        );
        if (allocation === undefined) {
          return Object.freeze({
            teamId: team.id,
            teamLabel: team.name,
            enabled: false,
            kind: "ratio" as const,
            value: "",
          });
        }
        const exact = serializeQuantity(
          allocation.amount.kind === "ratio"
            ? allocation.amount.ratio
            : allocation.amount.dailyCapacity,
        );
        return Object.freeze({
          teamId: team.id,
          teamLabel: team.name,
          enabled: true,
          kind: allocation.amount.kind,
          value:
            allocation.amount.kind === "ratio"
              ? formatPercentageForEditing(exact)
              : formatQuantityForEditing(allocation.amount.dailyCapacity),
          exact,
        });
      }),
    ),
  });
}
