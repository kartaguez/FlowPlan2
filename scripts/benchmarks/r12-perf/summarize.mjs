import { readFile,writeFile } from 'node:fs/promises';
const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length) throw new Error('Usage: summarize.mjs output.json input.json ...');
const percentile=(sorted,p)=>{const x=(sorted.length-1)*p,lo=Math.floor(x);return sorted[lo]+(sorted[Math.ceil(x)]-sorted[lo])*(x-lo);};
function stats(values) {
  if(!values.length) return null;
  const s=values.toSorted((a,b)=>a-b),mean=s.reduce((a,b)=>a+b,0)/s.length;
  return {n:s.length,min:s[0],median:percentile(s,.5),max:s.at(-1),mean,populationSD:Math.sqrt(s.reduce((a,b)=>a+(b-mean)**2,0)/s.length),iqr:percentile(s,.75)-percentile(s,.25)};
}
const rows=[];
for(const input of inputs) {
  const report=JSON.parse(await readFile(input,'utf8'));
  for(const run of report.runs) {
    const samples=run.samples??[],measured=samples.filter(s=>s.phase.startsWith('measured'));
    rows.push({input,size:run.size,variant:run.variant,operation:run.operation,status:run.status,fixture:run.fixture,adapterSetupMs:run.adapterSetupMs,coldMs:samples.find(s=>s.phase==='cold')?.ms,warmupMs:samples.find(s=>s.phase==='warmup')?.ms,elapsedMs:stats(measured.map(s=>s.ms)),cpuMs:stats(measured.map(s=>s.cpuUserMs+s.cpuSystemMs)),heapEndpointObservedMaxMiB:samples.length?Math.max(...samples.flatMap(s=>[s.before.heapUsed,s.after.heapUsed,s.retainedWithResult.heapUsed,s.afterReleaseGC.heapUsed]))/2**20:null,rssEndpointObservedMaxMiB:samples.length?Math.max(...samples.flatMap(s=>[s.before.rss,s.after.rss,s.retainedWithResult.rss,s.afterReleaseGC.rss]))/2**20:null,processLifetimeMaxRSSMiB:samples.length?Math.max(...samples.map(s=>s.processMaxRSSKiB))/1024:null,heapRetainedWithResultMiB:stats(measured.map(s=>s.retainedWithResult.heapUsed/2**20)),heapAfterReleaseGCMiB:stats(measured.map(s=>s.afterReleaseGC.heapUsed/2**20)),heapDeltaNoGC_MiB:stats(measured.map(s=>(s.after.heapUsed-s.before.heapUsed)/2**20)),heapRetainedResultDeltaMiB:stats(measured.map(s=>(s.retainedWithResult.heapUsed-s.before.heapUsed)/2**20)),heapAfterReleaseDeltaMiB:stats(measured.map(s=>(s.afterReleaseGC.heapUsed-s.before.heapUsed)/2**20)),interruptedPhase:run.interruptedPhase,interruptedElapsedMs:run.interruptedElapsedMs,completedSamples:samples.length,interruptedPhases:run.status.startsWith('INTERRUPTED')?1:0,interruptedAPICalls:run.status.startsWith('INTERRUPTED')&&/^(cold|warmup|measured-)/.test(run.interruptedPhase??'')?1:0,failedProcess:run.status==='FAILED'?1:0});
  }
}
await writeFile(output,JSON.stringify(rows,null,2)+'\n');
console.log('| Scenario | API | cold ms | median ms [min–max] | SD ms | heap endpoints MiB | RSS lifetime MiB | status |');
console.log('|---|---|---:|---:|---:|---:|---:|---|');
const n=v=>v==null?'—':v.toFixed(1);
for(const r of rows) console.log(`| ${r.size}/${r.variant} | ${r.operation} | ${n(r.coldMs)} | ${r.elapsedMs?`${n(r.elapsedMs.median)} [${n(r.elapsedMs.min)}–${n(r.elapsedMs.max)}]`:'—'} | ${n(r.elapsedMs?.populationSD)} | ${n(r.heapEndpointObservedMaxMiB)} | ${n(r.processLifetimeMaxRSSMiB)} | ${r.status}${r.interruptedPhase?` (${r.interruptedPhase} ≥${n(r.interruptedElapsedMs)} ms)`:''} |`);
