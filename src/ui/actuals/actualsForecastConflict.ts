import type { ProjectDraft } from "../project-edit/projectDraftStore.js";
import type { ReservationDraft } from "../reservation-edit/reservationDraftStore.js";
import { parseExactQuantityInput } from "../../application/index.js";

export function actualsForecastConflict(draft: ProjectDraft | ReservationDraft | undefined): string | undefined {
  if (!draft) return undefined;
  const previous = new Map(draft.reference.teams.map((team) => [team.teamId, team]));
  if (draft.values.teams.some((team) => previous.get(team.teamId)?.enabled !== team.enabled)) {
    return "Apply or cancel this card's Forecast Team changes before recording Actuals.";
  }
  if ("requirements" in draft.model) {
    const project = draft as ProjectDraft;
    const changedRaf = project.values.teams.some((team) => {
      const original = project.reference.teams.find((item) => item.teamId === team.teamId);
      const authority = project.model.requirements.find((item) => item.teamId === team.teamId)?.rafAuthority;
      return team.enabled && authority !== "latest-actuals" && original !== undefined &&
        team.remainingWorkload !== original.remainingWorkload &&
        parseExactQuantityInput(team.remainingWorkload) !== original.remainingWorkloadExact;
    });
    if (changedRaf) return "Apply or cancel this card's Forecast RAF changes before recording Actuals.";
  }
  return undefined;
}
