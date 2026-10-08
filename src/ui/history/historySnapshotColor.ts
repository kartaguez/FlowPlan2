/** Linear sRGB channels, used only to keep the presentation palette in gamut. */
export function historyColorChannels(lightness: number, chroma: number, hue: number): readonly number[] {
  const angle = hue * Math.PI / 180, a = chroma * Math.cos(angle), b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
/** Stable v1 ID-only color policy. No collection-dependent recoloring. */
export function historySnapshotColor(id: string) {
  let hash = 2166136261;
  for (const character of id) { hash ^= character.codePointAt(0)!; hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b); hash ^= hash >>> 16;
  const hue = (hash >>> 0) % 360;
  const lightness = 0.58 + ((hash >>> 17) % 3) * 0.03;
  let chroma = 0.12 + ((hash >>> 9) % 3) * 0.02;
  while (historyColorChannels(lightness, chroma, hue).some((channel) => channel < 0 || channel > 1)) chroma *= 0.95;
  let pastelChroma = chroma * 0.45;
  while (historyColorChannels(0.85, pastelChroma, hue).some((channel) => channel < 0 || channel > 1)) pastelChroma *= 0.95;
  return Object.freeze({ actuals: `oklch(${lightness} ${chroma} ${hue})`, forecast: `oklch(0.85 ${pastelChroma} ${hue})`, hue, chroma, lightness });
}
