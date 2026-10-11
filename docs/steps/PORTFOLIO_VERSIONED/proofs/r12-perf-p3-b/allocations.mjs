// Isolated lab only: instruments disposable emitted JS, never delivered Domain.
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { Session } from 'node:inspector/promises';
import { PerformanceObserver } from 'node:perf_hooks';
const [root,label,out]=process.argv.slice(2);
const file=resolve(root,'.test-dist-v2/domain/versioning/immutableValue.js');
const original=readFileSync(file,'utf8');
const injected=original.replace('export function copyImmutableValue(input, path = \'payload\') {',`export const lab = {calls:0,nodes:0,containers:0,copyMs:0,control:false,controlCopies:0,controlNodes:0,controlContainers:0,controlMs:0};
export function copyImmutableValue(input, path = 'payload') {
 lab.calls++;const control=lab.control;if(control)lab.controlCopies++;const labStart=performance.now();`).replace('function copy(value, at) {','function copy(value, at) { lab.nodes++;if(control)lab.controlNodes++;').replace('return success(Object.freeze(items));','lab.containers++;if(control)lab.controlContainers++; return success(Object.freeze(items));').replace('return success(Object.freeze(Object.fromEntries(entries)));','lab.containers++;if(control)lab.controlContainers++; return success(Object.freeze(Object.fromEntries(entries)));').replace('return copy(input, path);','try { return copy(input, path); } finally { const ms=performance.now()-labStart;lab.copyMs += ms;if(control)lab.controlMs+=ms; }');
if(injected===original)throw Error('instrumentation failed');writeFileSync(file,injected);
const businessFile=resolve(root,'.test-dist-v2/domain/portfolio/payloadValidation.js');
const businessOriginal=readFileSync(businessFile,'utf8');
const businessInjected=businessOriginal.replace('import { copyImmutableValue }', 'import { copyImmutableValue, lab }').replace('const copied = copyImmutableValue(input, path);', 'const copied = (()=>{lab.control=true;try{return copyImmutableValue(input,path);}finally{lab.control=false;}})();');
writeFileSync(businessFile,businessInjected);
const load=p=>import(pathToFileURL(resolve(root,p)));
const {lab}=await load('.test-dist-v2/domain/versioning/immutableValue.js');
const {createBusinessVersion}=await load('.test-dist-v2/domain/portfolio/payloadValidation.js');
const {fixture}=await load('scripts/benchmarks/r12-perf/fixture.mjs');
const rows=[];
for(const variant of ['sparse','dense']) {
 const input=fixture('medium',variant).versions;
 // Warm-up separately; sampling includes objects collected by major/minor GC.
 for(const v of input.slice(0,100))createBusinessVersion(v);
 global.gc();const before=process.memoryUsage();Object.assign(lab,{calls:0,nodes:0,containers:0,copyMs:0,controlCopies:0,controlNodes:0,controlContainers:0,controlMs:0});
 const session=new Session();session.connect();await session.post('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
 const gcEvents=[];const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())gcEvents.push({durationMs:e.duration,kind:e.detail.kind,flags:e.detail.flags});});observer.observe({entryTypes:['gc']});
 const cpu=process.cpuUsage(),start=performance.now();let outputs=input.map(v=>createBusinessVersion(v));
 const elapsedMs=performance.now()-start,cpuUsed=process.cpuUsage(cpu);if(outputs.some(v=>!v.ok))throw Error('lab invalid');
 const after=process.memoryUsage();global.gc();const retained=process.memoryUsage();
 const {profile}=await session.post('HeapProfiler.stopSampling');session.disconnect();
 let sampledBytes=0;function sum(n){sampledBytes+=n.selfSize;for(const c of n.children)sum(c);}sum(profile.head);
 const counts={...lab};outputs=null;global.gc();const released=process.memoryUsage();
 await new Promise(resolve=>setTimeout(resolve,20));observer.disconnect();
 rows.push({label,variant,versions:input.length,counts,elapsedMs,cpuUsed,before,after,retained,released,sampledBytes,gcEvents});
 writeFileSync(out+'-'+variant+'-sampling.json',JSON.stringify(profile)+'\n');
}
writeFileSync(out+'.json',JSON.stringify({label,instrumentation:'Emitted immutableValue.js in disposable clone; 1 timer pair per complete copy; counters per visited node/successful output container. Time includes inspection and instrumentation overhead. Sampling estimates cumulative allocation including collected objects, not exact bytes. Retention endpoints are GC observations, not proof of ownership or peak. GC events include forced retention/release GC and sampling overhead. Closure/routing cost is included in whole-operation measurements, not independently isolated.',businessOriginalSHA256:createHash('sha256').update(businessOriginal).digest('hex'),businessInstrumentedSHA256:createHash('sha256').update(businessInjected).digest('hex'),originalSHA256:createHash('sha256').update(original).digest('hex'),instrumentedSHA256:createHash('sha256').update(injected).digest('hex'),rows},null,2)+'\n');console.log(rows.map(r=>({label,variant:r.variant,...r.counts,sampledBytes:r.sampledBytes})));
