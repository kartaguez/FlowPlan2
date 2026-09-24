import type { CreateTeamCommand } from "../../application/index.js";
import type { DomainError } from "../../domain/index.js";
import { parseTeamCapacityPeriodRows, type TeamCapacityPeriodFormValues } from "./parseTeamEditCommand.js";

export interface CreateTeamFormValues {
  readonly name: string;
  readonly capacityPeriods: readonly TeamCapacityPeriodFormValues[];
}

export function parseCreateTeamCommand(values: CreateTeamFormValues):
  Readonly<{ ok: true; command: CreateTeamCommand }> |
  Readonly<{ ok: false; errors: readonly DomainError[] }> {
  const errors: DomainError[] = [];
  const name = values.name.trim();
  if (!name) errors.push(Object.freeze({ code: "EMPTY_TEAM_NAME", path: "team.name",
    message: "Team name must not be empty." }));
  if (values.capacityPeriods.length === 0) errors.push(Object.freeze({
    code: "EMPTY_TEAM_CAPACITY_PERIODS", path: "team.capacityPeriods",
    message: "A new Team needs at least one capacity period.",
  }));
  const parsed = parseTeamCapacityPeriodRows(values.capacityPeriods);
  if (!parsed.ok) errors.push(...parsed.errors);
  if (errors.length > 0 || !parsed.ok) return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  return Object.freeze({ ok: true, command: Object.freeze({ kind: "create-team", name,
    capacityPeriods: parsed.capacityPeriods }) });
}
