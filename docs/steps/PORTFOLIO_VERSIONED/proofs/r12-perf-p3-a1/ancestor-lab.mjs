// Disposable compiled-JS instrumentation only. Never imported by production/official benchmarks.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Session } from 'node:inspector/promises';
const [labRoot,p2Root,a1Root,output] = process.argv.slice(2);
if (!global.gc) throw new Error('Run with --expose-gc');
const modules = [];
for(const [label,root] of [['p2',p2Root],['a1',a1Root]]) {
  const original=readFileSync(resolve(root,'.test-dist-v2/domain/versioning/immutableValue.js'),'utf8');
  let s = 'export const counters = { calls:0, arrays:0, objects:0, ancestorSlots:0, maxDepth:0, pushes:0, pops:0, live:0 };\n'+original;
  s=s.replace("export function copyImmutableValue(input, path = 'payload') {", "export function copyImmutableValue(input, path = 'payload') {\n    counters.calls++; counters.arrays++;");
  if(label==='p2') s=s.replace('const next = [...ancestors, value];', 'counters.objects++; counters.arrays++; counters.ancestorSlots += ancestors.length+1; counters.maxDepth=Math.max(counters.maxDepth,ancestors.length+1);\n        const next = [...ancestors, value];');
  else s=s.replace('ancestors.push(value);','counters.objects++; counters.pushes++; counters.live++; counters.maxDepth=Math.max(counters.maxDepth,ancestors.length+1);\n        ancestors.push(value);').replace('ancestors.pop();','ancestors.pop();\n            counters.pops++; counters.live--;');
  assert.notEqual(s,original);const file=resolve(labRoot,`.test-dist-v2/domain/versioning/immutableValue-${label}-lab.js`);writeFileSync(file,s);
  modules.push({label,sourceSHA256:createHash('sha256').update(original).digest('hex'),instrumentedSHA256:createHash('sha256').update(s).digest('hex'),module:await import(pathToFileURL(file))});
}
const inputs=[];let deep={leaf:1n};for(let i=0;i<512;i++)deep={child:deep};inputs.push(['depth512',deep]);
const shared={nested:[1n,{n:2}]};inputs.push(['dag400',Array.from({length:400},()=>shared)]);
const invalid={};invalid.self=invalid;inputs.push(['cycle',invalid],['refusal',{child:{bad:undefined}}],['throw',{child:new Proxy({}, {ownKeys(){throw new Error('reflection');}})}]);
const rows=[];
for(const {label,module,sourceSHA256,instrumentedSHA256} of modules) for(const [scenario,input] of inputs) {
  const counters=module.counters;for(const key of Object.keys(counters))counters[key]=0;
  global.gc();const before=process.memoryUsage();const session=new Session();session.connect();
  await session.post('HeapProfiler.startSampling',{samplingInterval:1024,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  const start=performance.now();let result,thrown=null;try{result=module.copyImmutableValue(input);}catch(e){thrown=e.message;}
  const elapsedMs=performance.now()-start;const after=process.memoryUsage();
  const {profile}=await session.post('HeapProfiler.stopSampling');session.disconnect();
  global.gc();const retained=process.memoryUsage();const ok=result?.ok??null;
  result=null;global.gc();const released=process.memoryUsage();
  assert.equal(counters.live,0);if(label==='a1')assert.equal(counters.pushes,counters.pops);
  assert.ok(counters.calls>0);if(scenario==='depth512'||scenario==='dag400')assert.equal(ok,true);
  rows.push({label,scenario,sourceSHA256,instrumentedSHA256,ok,thrown,counters:{...counters},elapsedMs,heapBefore:before.heapUsed,heapAfterNoGC:after.heapUsed,heapRetainedWithResult:retained.heapUsed,heapAfterReleaseGC:released.heapUsed,sampledAllocationBytes:profile.samples.reduce((n,s)=>n+s.size,0)});
}
writeFileSync(output,JSON.stringify({environment:{node:process.version},limitations:'Single instrumented trial per scenario, not official latency. Counter writes, Inspector allocation sampling and forced GC add overhead. Ancestor arrays/slots counts exact at instrumented sites; backing-store capacity allocations not counted. sampledAllocationBytes is statistical sampled allocation mass, not exact cumulative allocations; heap endpoints are retained observations, not peaks or graph-exclusive bytes. No elapsed sample attribution to individual stack operations.',rows},null,2)+'\n');console.log(rows.map(r=>({label:r.label,scenario:r.scenario,arrays:r.counters.arrays,objects:r.counters.objects,slots:r.counters.ancestorSlots,depth:r.counters.maxDepth,live:r.counters.live,ms:r.elapsedMs})));
