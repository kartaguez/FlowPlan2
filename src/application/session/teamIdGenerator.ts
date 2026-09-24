import { createTeamId, type TeamId } from "../../domain/index.js";

export interface TeamIdGenerator {
  readonly next: () => TeamId;
}

export function createTeamIdGenerator(
  existingIds: () => readonly TeamId[],
  prefix = "team-session",
): TeamIdGenerator {
  let sequence = 1;
  return Object.freeze({
    next: (): TeamId => {
      const occupied = new Set(existingIds());
      while (true) {
        const result = createTeamId(`${prefix}-${sequence}`);
        sequence += 1;
        if (!result.ok) throw new TypeError("Team ID generator is invalid.");
        if (!occupied.has(result.value)) return result.value;
      }
    },
  });
}
