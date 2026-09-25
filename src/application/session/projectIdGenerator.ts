import { createProjectId, type ProjectId } from "../../domain/index.js";

export interface ProjectIdGenerator {
  readonly next: () => ProjectId;
}

export function createProjectIdGenerator(
  existingIds: () => readonly ProjectId[],
  prefix = "project-session",
): ProjectIdGenerator {
  let sequence = 1;
  return Object.freeze({
    next: (): ProjectId => {
      const occupied = new Set(existingIds());
      while (true) {
        const result = createProjectId(`${prefix}-${sequence}`);
        sequence += 1;
        if (!result.ok) throw new TypeError("Project ID generator is invalid.");
        if (!occupied.has(result.value)) return result.value;
      }
    },
  });
}
