export const PROJECT_COLOR_COUNT = 10;

/**
 * Projects a domain identifier onto the fixed UI palette. The FNV-1a-style
 * hash is stable and depends on neither render order nor mutable state.
 */
export function projectColorIndex(projectId: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < projectId.length; index += 1) {
    hash ^= projectId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0) % PROJECT_COLOR_COUNT;
}
