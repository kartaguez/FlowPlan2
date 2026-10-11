import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [dir] = process.argv.slice(2);
const read = p => JSON.parse(readFileSync(resolve(dir, p)));
const rows = [];
const p2 = read('p2-summary.json'), a1 = read('a1-summary.json');
for (let i = 0; i < p2.length; i++) {
  const b = p2[i], a = a1[i];
  if ([b.size,b.variant,b.operation].join() !== [a.size,a.variant,a.operation].join()) throw new Error('Scenario order differs');
  rows.push({ size:b.size,variant:b.variant,operation:b.operation,p2:b,a1:a,percentLatencyChange:b.elapsedMs&&a.elapsedMs?(a.elapsedMs.median/b.elapsedMs.median-1)*100:null });
}
writeFileSync(resolve(dir,'comparison.json'),JSON.stringify(rows,null,2)+'\n');
const f = x => x == null ? '—' : x.toFixed(1);
const table = ['| Scénario | API | P2 médiane ms | A1 médiane ms | Variation | P2/A1 CPU ms | P2/A1 heap endpoint Mio | P2/A1 RSS lifetime Mio |','| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',...rows.map(r=>`| ${r.size}/${r.variant} | ${r.operation} | ${f(r.p2.elapsedMs?.median)} | ${f(r.a1.elapsedMs?.median)} | ${f(r.percentLatencyChange)} % | ${f(r.p2.cpuMs?.median)}/${f(r.a1.cpuMs?.median)} | ${f(r.p2.heapEndpointObservedMaxMiB)}/${f(r.a1.heapEndpointObservedMaxMiB)} | ${f(r.p2.processLifetimeMaxRSSMiB)}/${f(r.a1.processLifetimeMaxRSSMiB)} |`)];
writeFileSync(resolve(dir,'comparison.md'),table.join('\n')+'\n');
const profiles = [];
const categories = {
  copy: f => /immutableValue\.js#(copy|copyImmutableValue):/.test(f),
  ancestorArraysAndCopyTemporaries: f => /immutableValue\.js/.test(f) && /#<anonymous>/.test(f),
  dataRecord: f => /data\.js#dataRecord:/.test(f),
  envelope: f => /versionEnvelope\.js#create(VersionEnvelope|TypedVersionEnvelope):/.test(f),
  payload: f => /payloadValidation\.js/.test(f),
  registry: f => /versionRegistry\.js/.test(f),
  gc: f => /\(garbage collector\)/.test(f)
};
for (const label of ['p2','a1']) {
  for (const p of read(`${label}-profiles-summary.json`)) {
    const summary = {label,path:p.path,sampledMs:p.sampledMs,categories:{}};
    // Sums of self rows are exclusive sampled attribution. Inclusive grouping
    // must count each category only once per sample; calculate from raw profile.
    const raw = JSON.parse(readFileSync(p.path)); const nodes = new Map(raw.nodes.map(n=>[n.id,n])); const parents = new Map();
    for (const node of raw.nodes) for (const child of node.children??[]) parents.set(child,node.id);
    const key = node => `${node.callFrame.url}#${node.callFrame.functionName||'<anonymous>'}:${node.callFrame.lineNumber+1}`;
    for (const [name,matches] of Object.entries(categories)) {
      let self=0,inclusive=0;
      for(let i=0;i<raw.samples.length;i++) {
        const dt=raw.timeDeltas[i]??0;let id=raw.samples[i]; if(matches(key(nodes.get(id))))self+=dt;
        let present=false;while(id!==undefined){if(matches(key(nodes.get(id))))present=true;id=parents.get(id);}if(present)inclusive+=dt;
      }
      summary.categories[name]={selfSampledMs:self/1000,selfPercent:self/(p.sampledMs*1000)*100,inclusiveSampledMs:inclusive/1000,inclusivePercent:inclusive/(p.sampledMs*1000)*100};
    }
    profiles.push(summary);
  }
}
writeFileSync(resolve(dir,'profiles-analysis.json'),JSON.stringify({limitations:'Ancestor membership, push/pop, array spreads and descriptor arrays have no reliably separate sampled frame. Anonymous copy rows cannot uniquely identify ancestor allocations. Inclusive categories overlap; no subtraction/conversion to exclusive elapsed durations. Self values are direct sample attribution, affected by JIT/inlining/GC and sampling.',profiles},null,2)+'\n');
console.log(table.join('\n'));
