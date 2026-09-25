import { createProjectId, type ProjectId } from "../../domain/index.js";

export interface ProjectIdGenerator {
  readonly peek: () => ProjectId;
  readonly next: () => ProjectId;
}

export function createProjectIdGenerator(
  existingIds: () => readonly ProjectId[],
  prefix = "project-session",
): ProjectIdGenerator {
  let sequence = 1;
  const candidate = (): Readonly<{ id: ProjectId; sequence: number }> => {
      const occupied = new Set(existingIds());
      let current = sequence;
      while (true) {
        const result = createProjectId(`${prefix}-${current}`);
        if (!result.ok) throw new TypeError("Project ID generator is invalid.");
        if (!occupied.has(result.value)) return { id: result.value, sequence: current };
        current += 1;
      }
  };
  return Object.freeze({
    peek: (): ProjectId => candidate().id,
    next: (): ProjectId => {
      const selected = candidate();
      sequence = selected.sequence + 1;
      return selected.id;
    },
  });
}
