import { performance } from 'node:perf_hooks';
import { Session } from 'node:inspector';
import { writeFile } from 'node:fs/promises';
import { fixture } from './fixture.mjs';
import { createVersionRegistry } from '../../../.test-dist-v2/domain/versioning/versionRegistry.js';
import { resolvePortfolioManifest } from '../../../.test-dist-v2/domain/portfolio/graphResolver.js';
import { validatePortfolioGraph } from '../../../.test-dist-v2/domain/portfolio/graphValidation.js';
import { certifyPortfolioGraph } from '../../../.test-dist-v2/domain/portfolio/validatedPortfolioGraph.js';
import { createMemoryPortfolioReadAdapter } from '../../../.test-dist-v2/adapters/memory/memoryPortfolioReadAdapter.js';
import { loadSnapshotGraph,loadCurrentGraph } from '../../../.test-dist-v2/application/portfolio/loadPortfolioGraph.js';
const [size,variant,operation,repeatsArg,profilePath] = process.argv.slice(2);
const repeats=Number(repeatsArg);
function send(data) { process.send(data); }
function ok(result) { if(!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
const input=fixture(size,variant);
send({event:'fixture',metadata:input.metadata});
let adapter;
if(operation==='M5' || operation==='M6') {
  send({event:'start',phase:'adapter-setup'});
  const start=performance.now();
  adapter=ok(createMemoryPortfolioReadAdapter(input.versions,input.current,[input.snapshot]));
  send({event:'setup',ms:performance.now()-start});
}
const calls={
  M1:()=>createVersionRegistry(input.versions),
  M2:()=>resolvePortfolioManifest(input.manifest,input.versions),
  M3:()=>validatePortfolioGraph(input.manifest,input.versions),
  M4:()=>certifyPortfolioGraph({source:'snapshot',snapshot:input.snapshot,versions:input.versions}),
  M5:()=>loadSnapshotGraph(adapter.snapshots,adapter.versions,input.snapshot.snapshotId),
  M6:()=>loadCurrentGraph(adapter.current,adapter.versions),
};
if(!calls[operation]) throw new Error('Unknown operation');
const session=profilePath?new Session():null;
const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(e,r)=>e?reject(e):resolve(r)));
if(session) { session.connect(); await post('Profiler.enable'); await post('Profiler.setSamplingInterval',{interval:1000}); }
// No module import / fixture generation / adapter setup inside API timing.
for(let i=0;i<repeats+2;i++) {
  const phase=i===0?'cold':i===1?'warmup':`measured-${i-1}`;
  global.gc();
  const before=process.memoryUsage();
  send({event:'start',phase,before});
  if(session && i===2) await post('Profiler.start');
  const cpu=process.cpuUsage(), start=performance.now();
  let result=await calls[operation]();
  const ms=performance.now()-start, used=process.cpuUsage(cpu), after=process.memoryUsage();
  if(session && i===2) { const {profile}=await post('Profiler.stop'); await writeFile(profilePath,JSON.stringify(profile)); }
  ok(result);
  const withResult=process.resourceUsage();
  global.gc();
  const retained=process.memoryUsage();
  const observed={versions:result.value.versions.length,context:result.value.context.status};
  result=null;
  global.gc();
  const released=process.memoryUsage();
  send({event:'sample',phase,ms,cpuUserMs:used.user/1000,cpuSystemMs:used.system/1000,before,after,retainedWithResult:retained,afterReleaseGC:released,processMaxRSSKiB:withResult.maxRSS,observed});
}
if(session) session.disconnect();
send({event:'done'});
process.disconnect();
