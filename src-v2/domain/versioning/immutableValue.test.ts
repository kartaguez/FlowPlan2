import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyImmutableValue, type ImmutableValue } from './immutableValue.js';
import { createVersionRegistry } from './versionRegistry.js';
function copied(input: unknown): ImmutableValue {
  const result = copyImmutableValue(input, 'copy');
  assert.equal(result.ok, true); if (!result.ok) throw new Error('Expected success'); return result.value;
}
function refused(input: unknown, code: string, path: string) {
  assert.deepEqual(copyImmutableValue(input, 'copy'), { ok: false, errors: [{ code, path, message: code }] });
}
function frozen(value: ImmutableValue) {
  if (value !== null && typeof value === 'object') {
    assert.equal(Object.isFrozen(value), true); for (const child of Object.values(value)) frozen(child);
  }
}
function cycle() { const value: Record<string, unknown> = {}; value.self = value; return value; }
test('P3-A1 DAG siblings are copied independently and deeply frozen', () => {
  const shared = { nested: [1n, { flag: true }] };
  const out = copied({ left: shared, right: shared }) as Record<string, ImmutableValue>;
  assert.deepEqual(out.left, out.right); assert.notEqual(out.left, out.right); assert.notEqual(out.left, shared); frozen(out);
  assert.notEqual((out.left as Record<string, ImmutableValue>).nested, (out.right as Record<string, ImmutableValue>).nested);
});
test('P3-A1 direct cycle preserves complete diagnostic', () => { refused(cycle(), 'CYCLIC_PAYLOAD', 'copy.self'); });
test('P3-A1 indirect cycle over multiple levels', () => {
  const root: Record<string, unknown> = { a: { b: {} } };
  ((root.a as Record<string, unknown>).b as Record<string, unknown>).back = root;
  refused(root, 'CYCLIC_PAYLOAD', 'copy.a.b.back');
});
test('P3-A1 cycle in final branch after shared valid branches', () => {
  const shared = { value: [1n] }; refused({ first: shared, second: shared, last: cycle() }, 'CYCLIC_PAYLOAD', 'copy.last.self');
});
test('P3-A1 successful branch exit allows repeated object in later traversal', () => {
  const shared = { child: { n: 1n } }; copied({ early: [shared], later: { next: shared }, last: shared });
});
test('P3-A1 early refusal leaves inputs intact and independent calls succeed', () => {
  const bad = { child: { invalid: undefined }, later: { n: 1n } };
  const before = structuredClone(bad); refused(bad, 'INVALID_PAYLOAD_VALUE', 'copy.child.invalid');
  assert.deepEqual(bad, before); assert.equal(Object.isFrozen(bad.child), false);
  copied({ left: bad.later, right: bad.later }); copied(bad.later);
});
test('P3-A1 throwing reflection exits do not retain state across calls', () => {
  const value = { child: new Proxy({}, { ownKeys() { throw new Error('reflection'); } }) };
  assert.throws(() => copyImmutableValue(value), /reflection/); copied({ child: { n: 1 } });
});
test('P3-A1 array shared objects remain independent copies', () => {
  const shared = { nested: [1n] }; const out = copied([shared, shared, [shared]]) as readonly ImmutableValue[];
  assert.notEqual(out[0], out[1]); assert.notEqual(out[0], shared); frozen(out);
});
test('P3-A1 adversarial keys remain own data and detach', () => {
  const shared = { n: 1n }; const input = Object.fromEntries([['__proto__', shared], ['constructor', shared], ['\0/é💡', shared]]);
  const out = copied(input) as Record<string, ImmutableValue>;
  assert.equal(Object.hasOwn(out, '__proto__'), true); assert.equal(Object.getPrototypeOf(out), Object.prototype);
  assert.deepEqual(Object.keys(out), Object.keys(input)); assert.notEqual(out.__proto__, shared); frozen(out);
});
test('P3-A1 nonstandard record and array prototypes stay refused', () => {
  refused(Object.create({ n: 1 }), 'INVALID_RECORD', 'copy');
  refused(Object.setPrototypeOf([1], null), 'INVALID_PAYLOAD_ARRAY', 'copy');
});
test('P3-A1 late record accessor precedes invalid recursive child without executing getter', () => {
  let calls = 0; const value = Object.defineProperty({ child: undefined }, 'late', { enumerable: true, get() { calls++; return 1; } });
  refused(value, 'INVALID_DATA_PROPERTY', 'copy.late'); assert.equal(calls, 0);
});
test('P3-A1 hidden late record descriptor precedes child cycle', () => {
  refused(Object.defineProperty({ child: cycle() }, 'late', { value: 1, enumerable: false }), 'INVALID_DATA_PROPERTY', 'copy.late');
});
test('P3-A1 sparse arrays and symbols keep historical rejection priority', () => {
  refused([1, , 3], 'INVALID_PAYLOAD_ARRAY', 'copy');
  refused({ child: undefined, [Symbol('bad')]: 1 }, 'INVALID_RECORD', 'copy');
  refused(Object.assign([undefined], { [Symbol('bad')]: 1 }), 'INVALID_PAYLOAD_ARRAY', 'copy');
});
test('P3-A1 array recursion precedes later descriptor and never runs getters', () => {
  let calls = 0; const array = Object.defineProperty([undefined, 1], '1', { enumerable: true, get() { calls++; return 1; } });
  refused(array, 'INVALID_PAYLOAD_VALUE', 'copy.0'); assert.equal(calls, 0);
  refused(Object.defineProperty([1], '0', { enumerable: true, get() { calls++; return 1; } }), 'INVALID_PAYLOAD_ARRAY', 'copy'); assert.equal(calls, 0);
});
test('P3-A1 null prototype records remain admitted with historical output prototype', () => {
  const out = copied(Object.assign(Object.create(null), { nested: Object.assign(Object.create(null), { n: 1n }) }));
  assert.equal(Object.getPrototypeOf(out), Object.prototype); frozen(out);
});
test('P3-A1 exact BigInt safe integer boundaries and negative zero', () => {
  const input = [10n ** 200n, -(10n ** 200n), Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, -0];
  const out = copied(input) as readonly ImmutableValue[]; assert.deepEqual(out, input); assert.equal(Object.is(out[4], -0), true);
  for (const n of [Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1, NaN, Infinity, -Infinity, 0.5]) refused({ n }, 'INVALID_PAYLOAD_NUMBER', 'copy.n');
});
test('P3-A1 deep acyclic and deeply wrapped cyclic inputs', () => {
  let valid: unknown = { leaf: 1n }, invalid: unknown = cycle();
  for (let i = 0; i < 256; i++) { valid = { child: valid }; invalid = { child: invalid }; }
  const out = copied(valid); assert.deepEqual(out, valid); frozen(out);
  refused(invalid, 'CYCLIC_PAYLOAD', 'copy' + '.child'.repeat(256) + '.self');
});
test('P3-A1 mutation of inputs and outputs proves deep detachment and freeze', () => {
  const input = { nested: [{ n: 1n }], other: { list: [2] } }; const out = copied(input);
  input.nested[0]!.n = 9n; input.nested.push({ n: 3n }); input.other.list.push(4);
  assert.deepEqual(out, { nested: [{ n: 1n }], other: { list: [2] } }); frozen(out);
  assert.throws(() => Object.assign(out as object, { extra: 1 }), TypeError);
  const record = out as Record<string, ImmutableValue>; const list = record.nested as readonly ImmutableValue[];
  assert.throws(() => Object.assign(list, { 0: null }), TypeError);
  assert.throws(() => Object.assign(list[0] as object, { n: 0n }), TypeError);
});
test('P3-A1 registry copies entire list before business validation', () => {
  assert.deepEqual(createVersionRegistry([{ bad: true }, cycle()], 'versions'), { ok: false, errors: [{ code: 'CYCLIC_PAYLOAD', path: 'versions.1.self', message: 'CYCLIC_PAYLOAD' }] });
});
