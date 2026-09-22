export const GEOMETRY_EPSILON = 1e-9;

export function snapToGeometryBoundary(
  value: number,
  boundary: number,
): number {
  return Math.abs(value - boundary) <= GEOMETRY_EPSILON ? boundary : value;
}
