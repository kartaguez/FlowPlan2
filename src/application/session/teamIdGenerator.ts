import { createTeamId, type TeamId } from "../../domain/index.js";

export interface TeamIdGenerator {
  readonly peek: () => TeamId;
  readonly next: () => TeamId;
}

export function createTeamIdGenerator(
  existingIds: () => readonly TeamId[],
  prefix = "team-session",
): TeamIdGenerator {
  let sequence = 1;
  const candidate = (): Readonly<{ id: TeamId; sequence: number }> => {
      const occupied = new Set(existingIds());
      let current = sequence;
      while (true) {
        const result = createTeamId(`${prefix}-${current}`);
        if (!result.ok) throw new TypeError("Team ID generator is invalid.");
        if (!occupied.has(result.value)) return { id: result.value, sequence: current };
        current += 1;
      }
  };
  return Object.freeze({
    peek: (): TeamId => candidate().id,
    next: (): TeamId => {
      const selected = candidate();
      sequence = selected.sequence + 1;
      return selected.id;
    },
  });
}
