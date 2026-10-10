import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createId, type EntityId, type VersionId } from '../primitives/identity.js';
import { createExactReference, createEntityIdentity, versionKinds, type ExactReference } from '../primitives/exactReference.js';
import type { DomainResult } from '../primitives/result.js';
import { createOwner } from './owner.js';
import { createVersionEnvelope, createTypedVersionEnvelope, validateVersionContext, validateActualPeriodOwner } from './versionEnvelope.js';
import { copyImmutableValue } from './immutableValue.js';
function value<T>(r: DomainResult<T>): T { assert.equal(r.ok,true); if (!r.ok) throw new Error("Expected success"); return r.value; }
const id = (s: string) => value(createId('EntityId',s));
const vid = (s: string) => value(createId('VersionId',s));
const ref = (v: string,e='settings') => value(createExactReference('ProjectSettings',{kind:'ProjectSettings',entityId:id(e),versionId:vid(v)}));
const owner = (s='project') => ({type:'Project',projectId:value(createId('ProjectId',s))});
const envelope = (v: string, predecessor?: string, payload: unknown = {nested:{values:[1n,2n]}}) => value(createVersionEnvelope('ProjectSettings',{
  ref:ref(v),owner:owner(),payload,provenance:[],...(predecessor===undefined?{}:{predecessor:ref(predecessor)})
}));
function rejected(r: DomainResult<unknown>, code?: string) { assert.equal(r.ok,false); if (!r.ok && code) assert.equal(r.errors[0]?.code,code); }
test('V01 opaque identities, exact references and compile/runtime family separation', () => {
  assert.equal(value(createId('EntityId',' x ')).value,' x ');
  for (const bad of ['', '  ',null,7]) rejected(createId('EntityId',bad));
  for (const kind of versionKinds) assert.equal(value(createExactReference(kind,{kind,entityId:id('same'),versionId:vid('opaque')})).kind,kind);
  assert.notDeepEqual(ref('a'),ref('b'));
  rejected(createExactReference('PT',{kind:'RT',entityId:id('same'),versionId:vid('v')}));
  rejected(createExactReference('ProjectSettings',{kind:'ProjectSettings',entityId:vid('a'),versionId:id('b')}));
  rejected(createExactReference('ProjectSettings',{kind:'ProjectSettings',entityId:id('a')}));
  // @ts-expect-error EntityId and VersionId are distinct nominal families.
  const swapped: EntityId = vid('same'); assert.equal(swapped.family,'VersionId');
  // @ts-expect-error EntityId cannot be a VersionId.
  const swappedVersion: VersionId = id('same'); assert.equal(swappedVersion.family,'EntityId');
  // @ts-expect-error PT and RT exact references are not substitutable.
  const rt: ExactReference<'RT'> = value(createExactReference('PT',{kind:'PT',entityId:id('p'),versionId:vid('v')})); assert.equal(rt.kind,'PT');
  // Same context regardless of chronological labels or order; report exposes no selection.
  const versions = [envelope('z'),envelope('a','z'),envelope('past','z')];
  assert.deepEqual(value(validateVersionContext(versions)),value(validateVersionContext([...versions].reverse())));
  assert.equal(Object.keys(value(validateVersionContext(versions))).includes('current'),false);
  const unknown = {kind:'Latest',entityId:id('x'),versionId:vid('x')};
  rejected(createExactReference('Latest' as 'PT',unknown));
});
test('V02 complete owner matrix and explicitly supplied AP owner checks', () => {
  const project = value(createId('ProjectId','p')), reservation=value(createId('ReservationId','r')), team=value(createId('TeamId','t'));
  const portfolio=value(createId('PortfolioId','portfolio'));
  const ap=value(createEntityIdentity('ActualPeriod',{kind:'ActualPeriod',entityId:id('ap')}));
  const sp=value(createEntityIdentity('ActualSubPeriod',{kind:'ActualSubPeriod',entityId:id('sp')}));
  const pt=value(createEntityIdentity('PT',{kind:'PT',entityId:id('pt')})), rt=value(createEntityIdentity('RT',{kind:'RT',entityId:id('rt')}));
  for (const kind of ['ProjectSettings','ActualPeriod'] as const) assert.equal(createOwner(kind,{type:'Project',projectId:project}).ok,true);
  for (const kind of ['ReservationSettings','ActualPeriod'] as const) assert.equal(createOwner(kind,{type:'Reservation',reservationId:reservation}).ok,true);
  for (const kind of ['TeamSettings','TeamCapacity'] as const) assert.equal(createOwner(kind,{type:'Team',teamId:team}).ok,true);
  for (const kind of ['Program','Pas','PlanningSettings','PortfolioOrder'] as const) assert.equal(createOwner(kind,{type:'Portfolio',portfolioId:portfolio}).ok,true);
  assert.equal(createOwner('PT',{type:'ProjectTeam',projectId:project,teamId:team}).ok,true);
  assert.equal(createOwner('RT',{type:'ReservationTeam',reservationId:reservation,teamId:team}).ok,true);
  assert.equal(createOwner('ActualSubPeriod',{type:'ActualPeriod',actualPeriod:ap}).ok,true);
  assert.equal(createOwner('PTEC',{type:'PT',pt}).ok,true);
  for (const [type,association] of [['PTSubPeriod',pt],['RTSubPeriod',rt]] as const) assert.equal(createOwner('TeamActual',{type,association,subPeriod:sp}).ok,true);
  rejected(createOwner('ProjectSettings',{type:'Reservation',reservationId:reservation}));
  rejected(createOwner('PT',{type:'ReservationTeam',reservationId:reservation,teamId:team}));
  rejected(createOwner('PTEC',{type:'PT',pt:rt}));
  rejected(createOwner('TeamActual',{type:'PTSubPeriod',association:rt,subPeriod:sp}));
  rejected(createOwner('ProjectSettings',{type:'Project',projectId:reservation}));
  // @ts-expect-error Project and Reservation owners are separate families.
  const projectOwner: ReturnType<typeof owner> = value(createOwner('ReservationSettings',{type:'Reservation',reservationId:reservation})); assert.equal(projectOwner.type,'Reservation');
  const apRef=value(createExactReference('ActualPeriod',{kind:'ActualPeriod',entityId:id('ap'),versionId:vid('v')}));
  const apVersion=value(createVersionEnvelope('ActualPeriod',{ref:apRef,owner:owner(),payload:{},provenance:[]}));
  assert.equal(value(validateActualPeriodOwner(apRef,owner(),apVersion)),'established');
  assert.equal(value(validateActualPeriodOwner(apRef,owner(),undefined)),'not-established');
  rejected(validateActualPeriodOwner(apRef,owner('other'),apVersion),'ACTUAL_PERIOD_OWNER_MISMATCH');
  const changed = {...envelope('child','root'),owner:owner('other')};
  rejected(validateVersionContext([envelope('root'),changed]),'IMMUTABLE_OWNER_MISMATCH');
  rejected(validateVersionContext([envelope('a'),{...envelope('b'),owner:owner('other')}]),'IMMUTABLE_OWNER_MISMATCH');
});
test('V03 deep copy/freeze archives, input/output mutations and exotic rejection', () => {
  const input={ref:ref('v'),owner:owner(),payload:{nested:{values:[1n,2n]}},provenance:[ref('source','other')]};
  const archived=value(createVersionEnvelope('ProjectSettings',input));
  input.payload.nested.values.push(3n); input.payload.nested.values[0]=9n;
  input.ref={...ref('replacement')}; input.owner=owner('changed'); input.provenance.length=0;
  assert.deepEqual(archived.payload,{nested:{values:[1n,2n]}}); assert.equal(archived.ref.versionId.value,'v'); assert.equal(archived.provenance.length,1);
  function frozen(x: unknown) { if (x!==null && typeof x==='object') {assert.equal(Object.isFrozen(x),true); for (const v of Object.values(x)) frozen(v);} }
  frozen(archived);
  assert.notStrictEqual(archived.ref,input.ref); assert.notStrictEqual(archived.payload,input.payload);
  const mutableRef=archived.ref as unknown as {versionId:{value:string}};
  assert.throws(()=>{mutableRef.versionId.value='replaced';},TypeError);
  const output=archived as unknown as {payload:{nested:{values:bigint[]}};owner:{projectId:{value:string}};provenance:unknown[]};
  assert.throws(()=>output.payload.nested.values.push(3n),TypeError); assert.throws(()=>{output.payload.nested.values[0]=8n;},TypeError);
  assert.throws(()=>{output.owner.projectId.value='mutated';},TypeError); assert.throws(()=>output.provenance.pop(),TypeError);
  const cycle: {self?:unknown}={}; cycle.self=cycle;
  for (const bad of [new Map(),new Set(),new Date(),cycle,()=>1,Object.create({inherited:1}),{x:undefined},{x:NaN},{x:0.1},[,,1],Object.assign([1],{extra:2}),{[Symbol('x')]:1}]) rejected(copyImmutableValue(bad));
  let invoked=false; rejected(copyImmutableValue({get x(){invoked=true;return 1;}})); assert.equal(invoked,false);
  const array=[1]; Object.defineProperty(array,'0',{get(){invoked=true;return 2;}}); rejected(copyImmutableValue(array)); assert.equal(invoked,false);
  // DAG sharing is copied, not mistaken for a cycle.
  const shared={x:1n}; assert.deepEqual(value(copyImmutableValue({a:shared,b:shared})),{a:{x:1n},b:{x:1n}});
});
test('V04 roots, chains, branching, missing exact parent, self/long cycles', () => {
  const root=envelope('root'), left=envelope('left','root'),right=envelope('right','root'),leaf=envelope('leaf','left');
  assert.equal(value(validateVersionContext([right,leaf,root,left])).status,'established');
  const missing=value(validateVersionContext([left])); assert.equal(missing.status,'not-established'); assert.deepEqual(missing.missingPredecessors,[root.ref]);
  // An entity with another version is not the explicitly referenced missing parent.
  assert.equal(value(validateVersionContext([left,envelope('unrelated')])).status,'not-established');
  rejected(createVersionEnvelope('ProjectSettings',{...root,predecessor:root.ref}),'LINEAGE_CYCLE');
  rejected(validateVersionContext([envelope('a','b'),envelope('b','c'),envelope('c','a')]),'LINEAGE_CYCLE');
  rejected(createVersionEnvelope('ProjectSettings',{...left,predecessor:ref('root','other')}),'PREDECESSOR_IDENTITY_MISMATCH');
  rejected(createVersionEnvelope('ProjectSettings',{...left,predecessor:{kind:'RT',entityId:id('settings'),versionId:vid('root')}}));
  rejected(createVersionEnvelope('ProjectSettings',{...root,predecessors:[left.ref,right.ref]}),'INVALID_VERSION_ENVELOPE');
  rejected(createVersionEnvelope('ProjectSettings',{...root,predecessor:[left.ref,right.ref]}));
});
test('V05 identical repetition and divergent collisions in every envelope component', () => {
  const root=envelope('root'), v=envelope('v','root',{a:1n,b:[2n]});
  const repeated=value(validateVersionContext([v,{...v,payload:{b:[2n],a:1n}},root])); assert.deepEqual(repeated.identicalRepetitions,[v.ref]);
  for (const changed of [{...v,payload:{a:2n,b:[2n]}},{...v,owner:owner('other')},{...v,predecessor:ref('other')},{...v,provenance:[ref('source','other')]}]) rejected(validateVersionContext([v,changed,root]),'DIVERGENT_VERSION_COLLISION');
  assert.equal(value(validateVersionContext([v,root,envelope('another','root')])).status,'established');
  assert.deepEqual(v.payload,{a:1n,b:[2n]});
});
test('V06 multiple provenance is independent of lineage; no source selection', () => {
  const root=envelope('root'); const sources=[ref('source1','sourceA'),ref('source2','sourceB')];
  const v=value(createVersionEnvelope('ProjectSettings',{ref:ref('new','newIdentity'),owner:owner(),payload:{},provenance:sources}));
  assert.equal(v.predecessor,undefined); assert.equal(v.provenance.length,2);
  // Unprovided sources do not become ancestors or trigger a resolver; provenance closure belongs to R1.2.
  assert.equal(value(validateVersionContext([v])).status,'established');
  rejected(createVersionEnvelope('ProjectSettings',{...root,provenance:[root.ref]}),'SELF_PROVENANCE');
  rejected(createVersionEnvelope('ProjectSettings',{...root,provenance:[sources[0],sources[0]]}),'DUPLICATE_PROVENANCE');
  const child=envelope('child','root');
  assert.equal(value(validateVersionContext([{...child,provenance:[root.ref]}])).status,'not-established');
  assert.equal(value(validateVersionContext([{...root,provenance:sources}])).missingPredecessors.length,0);
  rejected(createVersionEnvelope('ProjectSettings',{...root,provenance:sources,selected: sources[0]}),'INVALID_VERSION_ENVELOPE');
});

test('typed payload assembly preserves static type and readonly collections', () => {
  const settingsOwner=value(createOwner('ProjectSettings',owner()));
  const payload={name:'native',amount:1n,lines:[{value:2n}]};
  const version=value(createTypedVersionEnvelope('ProjectSettings',{ref:ref('typed'),owner:settingsOwner,payload,provenance:[]}));
  const name: string=version.payload.name; assert.equal(name,'native');
  payload.lines[0]!.value=8n; assert.equal(version.payload.lines[0]?.value,2n);
  const attempt=()=>{
    // @ts-expect-error Published payload collections are deeply readonly.
    version.payload.lines.push({value:3n});
  };
  assert.throws(attempt,TypeError);
  const rt=value(createExactReference('RT',{kind:'RT',entityId:id('rt'),versionId:vid('v')}));
  // @ts-expect-error Kind argument fixes ref/owner families; it cannot widen to accept RT.
  const wrong=createTypedVersionEnvelope('ProjectSettings',{ref:rt,owner:settingsOwner,payload:{},provenance:[]});
  rejected(wrong);
});

// Every fixture passes the public factory; no owner is replaced after creation.
const ownedVersion = (v: string, project = 'project', predecessor?: ExactReference<'ProjectSettings'>) =>
  value(createVersionEnvelope('ProjectSettings', {
    ref: ref(v), owner: owner(project), payload: {}, provenance: [],
    ...(predecessor === undefined ? {} : { predecessor })
  }));

test('audit A1 same identity and owner establish the root/child link', () => {
  const root = ownedVersion('root'), child = ownedVersion('child', 'project', root.ref);
  assert.deepEqual(value(validateVersionContext([root, child])), {
    status: 'established', missingPredecessors: [], identicalRepetitions: []
  });
});
test('audit A2 different owners reject a factory-created root/child pair', () => {
  const root = ownedVersion('root'), child = ownedVersion('child', 'other', root.ref);
  rejected(validateVersionContext([root, child]), 'IMMUTABLE_OWNER_MISMATCH');
});
test('audit A3 missing exact predecessor stays not-established without implicit resolution', () => {
  const root = ownedVersion('root'), child = ownedVersion('child', 'project', root.ref);
  const expected = { status: 'not-established', missingPredecessors: [root.ref], identicalRepetitions: [] };
  assert.deepEqual(value(validateVersionContext([child])), expected);
  // Neither a different version of the identity nor provenance supplies the exact parent.
  const unrelated = ownedVersion('unrelated');
  const sourced = value(createVersionEnvelope('ProjectSettings', { ...child, provenance: [root.ref] }));
  assert.deepEqual(value(validateVersionContext([unrelated, sourced])), expected);
  assert.deepEqual(value(validateVersionContext([root, child])).missingPredecessors, []);
  // A later call cannot reuse a predecessor supplied to a previous call.
  assert.deepEqual(value(validateVersionContext([child])), expected);
});
test('audit A4 another predecessor identity or kind is rejected at envelope creation', () => {
  const child = ownedVersion('child');
  rejected(createVersionEnvelope('ProjectSettings', { ...child, predecessor: ref('root', 'other') }),
    'PREDECESSOR_IDENTITY_MISMATCH');
  rejected(createVersionEnvelope('ProjectSettings', {
    ...child, predecessor: { kind: 'RT', entityId: id('settings'), versionId: vid('root') }
  }));
});
test('audit A5 branches with the same owner establish the whole context', () => {
  const root = ownedVersion('root');
  const left = ownedVersion('left', 'project', root.ref), right = ownedVersion('right', 'project', root.ref);
  assert.deepEqual(value(validateVersionContext([root, left, right])), {
    status: 'established', missingPredecessors: [], identicalRepetitions: []
  });
});
test('audit A6 one divergent branch rejects the whole context', () => {
  const root = ownedVersion('root');
  const left = ownedVersion('left', 'project', root.ref), right = ownedVersion('right', 'other', root.ref);
  rejected(validateVersionContext([root, left, right]), 'IMMUTABLE_OWNER_MISMATCH');
});
test('audit A7 reversed contexts preserve acceptance, rejection and missing-parent reports', () => {
  const root = ownedVersion('root'), left = ownedVersion('left', 'project', root.ref);
  const right = ownedVersion('right', 'project', root.ref), divergent = ownedVersion('divergent', 'other', root.ref);
  for (const context of [[root, left], [root, divergent], [left, right],
    [ownedVersion('unrelated'), left], [root, left, right], [root, left, divergent]]) {
    assert.deepEqual(validateVersionContext(context), validateVersionContext([...context].reverse()));
  }
});

test('audit B1 typed assembly preserves inferred/explicit fields and deep readonly output', () => {
  type Payload = { label: string; nested: { lines: { amount: bigint }[] } };
  const payload: Payload = { label: 'fixture', nested: { lines: [{ amount: 2n }] } };
  const input = { ref: ref('typed-audit'), owner: value(createOwner('ProjectSettings', owner())), payload, provenance: [] };
  const inferred = value(createTypedVersionEnvelope('ProjectSettings', input));
  const explicit = value(createTypedVersionEnvelope<'ProjectSettings', Payload>('ProjectSettings', input));
  const label: string = inferred.payload.label;
  const amount: bigint | undefined = explicit.payload.nested.lines[0]?.amount;
  assert.equal(label, 'fixture'); assert.equal(amount, 2n);
  assert.deepEqual(inferred, explicit);
  assert.notStrictEqual(inferred.payload.nested.lines, payload.nested.lines);
  payload.nested.lines[0]!.amount = 9n;
  assert.equal(inferred.payload.nested.lines[0]?.amount, 2n);
  assert.equal(Object.isFrozen(inferred.payload.nested), true);
  assert.equal(Object.isFrozen(inferred.payload.nested.lines[0]), true);
  const mutate = () => {
    // @ts-expect-error Nested record fields remain statically readonly.
    explicit.payload.nested.lines[0]!.amount = 7n;
  };
  assert.throws(mutate, TypeError);
  // Compile-time witnesses are not executed as mutations.
  const staticChecks = () => {
    // @ts-expect-error The preserved label type is string, not bigint.
    const wrong: bigint = inferred.payload.label; void wrong;
    // @ts-expect-error The whole published payload is readonly.
    explicit.payload = payload;
    // @ts-expect-error Nested collections are readonly.
    inferred.payload.nested.lines.push({ amount: 3n });
  };
  void staticChecks;
});
test('audit B2 typed assembly applies admissible-data runtime checks', () => {
  const cycle: { self?: unknown } = {}; cycle.self = cycle;
  const settingsOwner = value(createOwner('ProjectSettings', owner()));
  for (const payload of [new Map(), new Set(), new Date(), cycle, () => 1, { x: undefined }, { x: 0.1 }]) {
    rejected(createTypedVersionEnvelope('ProjectSettings', {
      ref: ref('invalid-typed'), owner: settingsOwner, payload, provenance: []
    }));
  }
});
test('audit B3 a claimed TypeScript payload type is not runtime schema validation', () => {
  // A synthetic shape only: no R1.2 business entity/schema is implemented here.
  type ClaimedPayload = { label: string };
  const input = { ref: ref('unvalidated-typed'), owner: value(createOwner('ProjectSettings', owner())),
    payload: { unrelated: true }, provenance: [] };
  // @ts-expect-error Explicit P does not allow a mismatched payload in sound TypeScript.
  const mismatched = createTypedVersionEnvelope<'ProjectSettings', ClaimedPayload>('ProjectSettings', input);
  assert.equal(mismatched.ok, true); // Runtime checks data admissibility, not P's erased schema.
  const forged = value(createTypedVersionEnvelope<'ProjectSettings', ClaimedPayload>('ProjectSettings', {
    ...input, payload: input.payload as unknown as ClaimedPayload
  }));
  assert.deepEqual(forged.payload, { unrelated: true });
  assert.equal(Object.hasOwn(forged.payload, 'label'), false);
  assert.equal(Object.isFrozen(forged.payload), true);
});
