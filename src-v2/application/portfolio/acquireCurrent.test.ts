import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from '../../domain/portfolio/transitions/r13.fixture.js';
import { sameReference, type ExactReference, type VersionKind } from '../../domain/primitives/exactReference.js';
import { success } from '../../domain/primitives/result.js';
import { createId } from '../../domain/primitives/identity.js';
import { createCurrentAcquisitionCell } from '../../adapters/memory/currentRamAdapter.js';
import { createCurrentAcquisitionService } from './acquireCurrent.js';

function setup() {
  const f = fixture(), cell = createCurrentAcquisitionCell(f.current.manifest.portfolioId), service = createCurrentAcquisitionService(cell.binding);
  let current: unknown = f.current, marker: object = Object.freeze({});
  const owner=Object.freeze({});
  let reads = 0;
  const source = {
    capture: () => success({current,marker,scope:Object.freeze({portfolioId:f.current.manifest.portfolioId,owner})}),
    isCurrent: (candidate: object) => candidate === marker
  };
  const reader = {readExactVersions: async (refs: readonly ExactReference<VersionKind>[]) => {
    reads++;
    return success(refs.map(ref => f.versions.find(v => sameReference(v.ref,ref))));
  }};
  return {f,cell,service,source,reader,setCurrent(value: unknown) {current=value; marker=Object.freeze({});},advanceMarker(){marker=Object.freeze({});},readCount:()=>reads};
}

test('T01/T02 acquisition certifies every selected kind and rejects unknown wrappers and incomplete exact reads',async()=>{
  const s=setup(), installed=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(installed.ok,true,installed.ok?'':JSON.stringify(installed.errors));
  if (!installed.ok) return;
  assert.equal(installed.value.graph.versions.length,s.f.current.manifest.planningSettings ? installed.value.selected.length : -1);
  assert.equal(new Set(installed.value.selected.map(v=>v.ref.kind)).size,14);
  assert.strictEqual(s.cell.read(),installed.value);
  const count=s.readCount();
  s.setCurrent({...s.f.current,revision:''});
  assert.equal((await s.service.acquireCurrent(s.source,s.reader)).ok,false);
  assert.equal(s.readCount(),count);
  assert.strictEqual(s.cell.read(),installed.value);
  s.setCurrent(s.f.current);
  const incomplete={readExactVersions:async (refs:readonly ExactReference<VersionKind>[])=>success(refs.slice(1).map(ref=>s.f.versions.find(v=>sameReference(v.ref,ref))))};
  const failed=await s.service.acquireCurrent(s.source,incomplete);
  assert.equal(failed.ok,false);
  if (!failed.ok) assert.equal(failed.errors[0]?.code,'READ_REFERENCE_MISMATCH');
  assert.strictEqual(s.cell.read(),installed.value);
});

test('T03/T04 capture change and ABA replacement preserve opaque token semantics',async()=>{
  const s=setup(), first=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(first.ok,true); if(!first.ok) return;
  const before=s.cell.read();
  const changing={readExactVersions:async (refs:readonly ExactReference<VersionKind>[])=>{s.advanceMarker(); return s.reader.readExactVersions(refs);}};
  const stale=await s.service.acquireCurrent(s.source,changing);
  assert.equal(stale.ok,false);
  if (!stale.ok) assert.equal(stale.errors[0]?.code,'StaleCurrentCapture');
  assert.strictEqual(s.cell.read(),before);
  const second=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(second.ok,true); if(!second.ok) return;
  assert.notStrictEqual(second.value.token,first.value.token);
  assert.equal(s.cell.isTokenCurrent(first.value.token),false);
  assert.equal(s.cell.isTokenCurrent(second.value.token),true);
  assert.deepEqual(second.value.selection,first.value.selection);
  assert.equal(s.cell.isTokenCurrent({...second.value.token}),false);
});

test('T01 getter input is rejected without executing the getter or installing a capability',async()=>{
  const s=setup(); let calls=0;
  s.setCurrent({get manifest(){calls++; throw new Error('getter called');},revision:'x'});
  const r=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(r.ok,false);
  assert.equal(calls,0);
  assert.equal(s.cell.read(),null);
});

test('T01/T02 oracle failure, foreign scope and forged acquisition do not install',async()=>{
  const s=setup();
  assert.throws(()=>createCurrentAcquisitionService(s.cell.binding),/RamAcquirerAlreadyBound/);
  s.setCurrent({...s.f.current,manifest:{...s.f.current.manifest,ptecs:[]}});
  const invalidGraph=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(invalidGraph.ok,false);
  if(!invalidGraph.ok) assert.equal(invalidGraph.errors[0]?.code,'PTEC_SELECTION_MISMATCH');
  assert.equal(s.cell.read(),null);
  s.setCurrent(s.f.current);
  const foreignId=createId('PortfolioId','foreign'); assert.equal(foreignId.ok,true); if(!foreignId.ok) return;
  const foreign={...s.source,capture:()=>success({current:s.f.current,marker:{},scope:{portfolioId:foreignId.value,owner:{}}})};
  const wrong=await s.service.acquireCurrent(foreign,s.reader);
  assert.equal(wrong.ok,false);
  if(!wrong.ok) assert.equal(wrong.errors[0]?.code,'FOREIGN_PORTFOLIO');
  assert.equal(s.cell.read(),null);
});

test('T03 concurrent capture finishing late cannot replace the newer certified installation',async()=>{
  const s=setup(); let release!:()=>void;
  const wait=new Promise<void>(resolve=>{release=resolve;});
  const slow={readExactVersions:async (refs:readonly ExactReference<VersionKind>[])=>{await wait; return s.reader.readExactVersions(refs);}};
  const first=s.service.acquireCurrent(s.source,slow);
  const second=await s.service.acquireCurrent(s.source,s.reader);
  assert.equal(second.ok,true); if(!second.ok) return;
  release();
  const stale=await first;
  assert.equal(stale.ok,false);
  if(!stale.ok) assert.equal(stale.errors[0]?.code,'StaleCurrentCapture');
  assert.strictEqual(s.cell.read(),second.value);
});
