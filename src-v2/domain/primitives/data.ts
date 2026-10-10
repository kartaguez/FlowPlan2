import { invalid, success, type DomainResult } from './result.js';
/** Inspect own data descriptors without invoking getters. No exotic objects/symbol keys. */
export function dataRecord(input: unknown, path: string): DomainResult<Readonly<Record<string, unknown>>> {
  if (input === null || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input)) || Object.getOwnPropertySymbols(input).length !== 0)
    return invalid('INVALID_RECORD', path);
  const entries: [string, unknown][] = [];
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid('INVALID_DATA_PROPERTY', `${path}.${key}`);
    entries.push([key, descriptor.value]);
  }
  return success(Object.freeze(Object.fromEntries(entries)));
}
/** Natural traversal of inspected records; no dynamic execution or browser capability. */
export function field(record: Readonly<Record<string, unknown>>, key: string): unknown {
  for (const [name, value] of Object.entries(record)) if (name === key) return value;
  return undefined;
}
export function hasKeys(record: Readonly<Record<string, unknown>>, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(record);
  return required.every(k => keys.includes(k)) && keys.every(k => required.includes(k) || optional.includes(k));
}
