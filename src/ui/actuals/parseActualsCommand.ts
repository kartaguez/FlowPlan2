import { parseExactQuantityInput, type ActualsViewModel, type AppendProjectActualsCommand,
  type AppendReservationActualsCommand } from "../../application/index.js";
import { consumedWorkloadFromSerialized, createCivilDate, remainingWorkloadFromSerialized,
  type DomainError, type ProjectActualsTeamEntry, type ReservationActualsTeamEntry,
  type ProjectId, type ReservationId } from "../../domain/index.js";
import type { ActualsDraft } from "./actualsDraftStore.js";

export type ParsedActualsCommand =
  | { readonly ok: true; readonly command: AppendProjectActualsCommand | AppendReservationActualsCommand }
  | { readonly ok: false; readonly errors: readonly DomainError[] };

export function parseActualsCommand(model: ActualsViewModel, draft: ActualsDraft): ParsedActualsCommand {
  const errors: DomainError[] = [];
  const through = createCivilDate(draft.through, "actualsThroughDate");
  if (!through.ok) errors.push(...through.errors);
  const from = model.records.length === 0 ? createCivilDate(draft.from, "actualsFromDate") : undefined;
  if (from && !from.ok) errors.push(...from.errors);
  const rows = model.teams.map((team, index) => {
    const row = draft.teams.find((item) => item.teamId === team.teamId);
    if (!row || row.unresolved) {
      errors.push({ code: "MISSING_ACTUALS_TEAM", path: `teams[${index}]`, message: `Enter Actuals for ${team.label}.` });
      return undefined;
    }
    const consumedExact = row.consumed === row.consumedReference ? row.consumedExact : parseExactQuantityInput(row.consumed);
    const consumed = consumedExact === undefined ? undefined : consumedWorkloadFromSerialized(consumedExact, `teams[${index}].cumulativeConsumed`);
    if (!consumed) errors.push({ code: "INVALID_CONSUMED_WORKLOAD", path: `teams[${index}].cumulativeConsumed`, message: "Enter an exact non-negative quantity." });
    else if (!consumed.ok) errors.push(...consumed.errors);
    if (model.kind === "reservation") return consumed?.ok ? { teamId: team.teamId, cumulativeConsumed: consumed.value } : undefined;
    const rafExact = row.raf === row.rafReference ? row.rafExact : parseExactQuantityInput(row.raf ?? "");
    const raf = rafExact === undefined ? undefined : remainingWorkloadFromSerialized(rafExact, `teams[${index}].remainingWorkload`);
    if (!raf) errors.push({ code: "INVALID_ACTUALS_RAF", path: `teams[${index}].remainingWorkload`, message: "Enter an exact non-negative RAF." });
    else if (!raf.ok) errors.push(...raf.errors);
    return consumed?.ok && raf?.ok ? { teamId: team.teamId, cumulativeConsumed: consumed.value, remainingWorkload: raf.value } : undefined;
  });
  if (errors.length || !through.ok || (from && !from.ok)) return { ok: false, errors };
  if (model.kind === "project") return { ok: true, command: {
    kind: "append-project-actuals", projectId: model.id as ProjectId,
    ...(from?.ok ? { actualsFromDate: from.value } : {}),
    record: { actualsThroughDate: through.value, teams: rows as ProjectActualsTeamEntry[] },
  } };
  return { ok: true, command: {
    kind: "append-reservation-actuals", reservationId: model.id as ReservationId,
    ...(from?.ok ? { actualsFromDate: from.value } : {}),
    record: { actualsThroughDate: through.value, teams: rows as ReservationActualsTeamEntry[] },
  } };
}
