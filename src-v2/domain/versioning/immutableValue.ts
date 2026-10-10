import { invalid, success, type DomainResult } from '../primitives/result.js';
import { dataRecord } from '../primitives/data.js';
export type ImmutableValue = null | boolean | string | bigint | number | readonly ImmutableValue[] | { readonly [key: string]: ImmutableValue };
export type DeepReadonly<T> = T extends readonly (infer E)[] ? readonly DeepReadonly<E>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
/** Numbers admitted only as safe integers (civil/count fields); quantities use BigInt wrappers. */
export function copyImmutableValue(input: unknown, path = 'payload'): DomainResult<ImmutableValue> {
  function copy(value: unknown, ancestors: readonly object[], at: string): DomainResult<ImmutableValue> {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') return success(value);
    if (typeof value === 'number') return Number.isSafeInteger(value) ? success(value) : invalid('INVALID_PAYLOAD_NUMBER', at);
    if (typeof value !== 'object') return invalid('INVALID_PAYLOAD_VALUE', at);
    if (ancestors.includes(value)) return invalid('CYCLIC_PAYLOAD', at);
    const next = [...ancestors, value];
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length) return invalid('INVALID_PAYLOAD_ARRAY', at);
      const items: ImmutableValue[] = [];
      let count = 0;
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key === 'length') continue;
        if (key !== String(count) || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid('INVALID_PAYLOAD_ARRAY', at);
        const item = copy(descriptor.value, next, `${at}.${key}`); if (!item.ok) return item;
        items.push(item.value); count += 1;
      }
      if (count !== value.length) return invalid('INVALID_PAYLOAD_ARRAY', at);
      return success(Object.freeze(items));
    }
    const record = dataRecord(value, at); if (!record.ok) return record;
    const entries: [string, ImmutableValue][] = [];
    for (const [key, entry] of Object.entries(record.value)) {
      const child = copy(entry, next, `${at}.${key}`); if (!child.ok) return child;
      entries.push([key, child.value]);
    }
    return success(Object.freeze(Object.fromEntries(entries)));
  }
  return copy(input, [], path);
}
/** Structural equality on validated data, insensitive to record key insertion order. */
export function equalImmutableValues(left: ImmutableValue, right: ImmutableValue): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.entries(left), b = Object.entries(right);
  return a.length === b.length && a.every(([key, value]) => {
    const found = b.find(([other]) => other === key);
    if (found === undefined) return false;
    const [, otherValue] = found;
    return equalImmutableValues(value as ImmutableValue, otherValue as ImmutableValue);
  });
}
