import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [root,out] = process.argv.slice(2);
const load = p => import(pathToFileURL(resolve(root,p)));
const api = await load('.test-dist-v2/domain/portfolio/payloadValidation.js');
const { fixture } = await load('scripts/benchmarks/r12-perf/fixture.mjs');
const encode = x => typeof x === 'bigint' ? ['bigint',String(x)] : typeof x === 'number' ? ['number',Object.is(x,-0)?'-0':String(x)] : Array.isArray(x) ? ['array',x.map(encode)] : x !== null && typeof x === 'object' ? ['record',Object.keys(x).sort().map(k=>[k,encode(x[k])])] : [typeof x,x];
const lines=[];
const frozen=x=>{if(x && typeof x==='object'){assert.ok(Object.isFrozen(x));Object.values(x).forEach(frozen);}};
function run(name,v) {
  const a=api.validateBusinessPayload(v.ref.kind,v.payload,'probe.payload');
  const b=api.createBusinessVersion(v,'probe');
  lines.push([name,encode({payload:a,version:b})]);
  if(a.ok){frozen(a.value);assert.notEqual(a.value,v.payload);}
  if(b.ok){frozen(b.value);assert.notEqual(b.value,v);assert.notEqual(b.value.payload,v.payload);}
}
const all=fixture('small','history').versions;
for(const kind of new Set(all.map(v=>v.ref.kind))) {
  const v=structuredClone(all.find(v=>v.ref.kind===kind)); delete v.predecessor;v.provenance=[];
  run(kind+'/valid',v);
  run(kind+'/null-prototype',{...v,payload:Object.assign(Object.create(null),v.payload)});
  run(kind+'/frozen',Object.freeze({...v,payload:Object.freeze(structuredClone(v.payload))}));
  for(const key of Object.keys(v.payload)) {
    const missing=structuredClone(v);delete missing.payload[key];run(kind+'/missing/'+key,missing);
    for(const value of [null,undefined,false,0,-0,NaN,Infinity,-Infinity,0.5,Number.MAX_SAFE_INTEGER+1,10n**100n,'',[],{}]) {
      const x=structuredClone(v);x.payload[key]=value;run(kind+'/value/'+key+'/'+String(value),x);
    }
  }
  const bad={...v,payload:{bad:true}};run(kind+'/business',bad);
  run(kind+'/frozen-business',{...bad,payload:Object.freeze(bad.payload)});
  for(const [name,change] of [
    ['provenance',x=>{x.provenance=[{}];}],
    ['self-provenance',x=>{x.provenance=[x.ref];}],
    ['duplicate-provenance',x=>{const r=structuredClone(x.ref);r.versionId.value='other';x.provenance=[r,r];}],
    ['owner',x=>{x.owner={};}],['ref-family',x=>{x.ref.entityId.family='ProjectId';}],
    ['predecessor',x=>{x.predecessor={...x.ref,entityId:{family:'EntityId',value:'other'}};}]
  ]) {const x=structuredClone(bad);change(x);run(kind+'/multi/'+name,x);}
  const shared={leaf:[1n,-0]};
  const direct={};direct.self=direct;const indirect={child:{}};indirect.child.back=indirect;
  const getter=Object.defineProperty({},'late',{get(){throw Error('getter executed');},enumerable:true});
  for(const [name,late] of [ ['dag',{left:shared,right:shared}],['direct',direct],['indirect',indirect],['late-cycle',{first:shared,last:direct}],['hole',[1,,3]],['proto',Object.create({})],['getter',getter],['hidden',Object.defineProperty({},'x',{value:1})],['symbol',{[Symbol('x')]:1}],['array-getter',Object.defineProperty([0],'0',{get(){throw Error('getter executed');},enumerable:true})] ]) {
    run(kind+'/late/'+name,{...bad,payload:{...bad.payload,late}});
  }
  const output=api.createBusinessVersion(v);assert.ok(output.ok);
  if(output.ok){const before=encode(output);v.payload.extra='mutated';v.ref.entityId.value='mutated';v.provenance.push({});assert.deepEqual(encode(output),before);assert.throws(()=>{output.value.payload.extra=1;},TypeError);}
}
assert.deepEqual(Object.keys(api).sort(),['catalogNameKey','createBusinessVersion','validateBusinessPayload']);
const dag={family:'ProjectId',value:'shared'};
const ordered=api.validateBusinessPayload('PortfolioOrder',{projectIds:[dag,{family:'ProjectId',value:'other'}]});assert.ok(ordered.ok);frozen(ordered);
lines.push(['unknown-kind',encode(api.validateBusinessPayload('Forged',{x:undefined},'probe'))]);
lines.push(['forged-envelope',encode(api.createBusinessVersion({validated:true,trusted:true,payload:{}}))]);
const text=lines.map(x=>JSON.stringify(x)+'\n').join('');
writeFileSync(out+'.jsonl.gz',gzipSync(text,{mtime:0}));
const meta={cases:lines.length,outputSHA256:createHash('sha256').update(text).digest('hex'),runtime:'PASS: public JS exports, deep freeze, detached input, mutation rejection, unknown kind acquisition'};
writeFileSync(out+'.meta.json',JSON.stringify(meta,null,2)+'\n');console.log(meta);
