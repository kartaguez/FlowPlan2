import { error, failure, success, type DomainResult } from "./result.js";

export type Color = string;

export function createColor(value: string, path = "color"): DomainResult<Color> {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return failure([error("INVALID_COLOR", path, "Color must be a six-digit hexadecimal value.")]);
  }
  return success(value.toUpperCase());
}

/** Stable, spaced suggestions; colors are preferences, never unique keys. */
export function suggestColor(key: string, used: readonly string[] = []): Color {
  const candidates = ["#4879B8", "#B76583", "#4B987D", "#A9764D", "#806FB6",
    "#AF9444", "#4C91AA", "#A75C58", "#728F50", "#776F9B"];
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const start = (hash >>> 0) % candidates.length;
  for (let offset = 0; offset < candidates.length; offset++) {
    const candidate = candidates[(start + offset) % candidates.length]!;
    if (!used.includes(candidate)) return candidate;
  }
  return candidates[start]!;
}

export function normalizeCatalogName(name: string): string {
  return name.trim().replace(/\s+/gu, " ");
}

export function catalogNameKey(name: string): string {
  return normalizeCatalogName(name).toLocaleLowerCase("fr");
}
