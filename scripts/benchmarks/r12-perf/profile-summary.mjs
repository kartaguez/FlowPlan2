import { readFile,writeFile } from 'node:fs/promises';
const [output,...paths]=process.argv.slice(2);
if(!output||!paths.length) throw new Error('Usage: profile-summary.mjs output.json profiles...');
const summaries=[];
for(const path of paths) {
  const p=JSON.parse(await readFile(path,'utf8'));
  const nodes=new Map(p.nodes.map(n=>[n.id,n])),parents=new Map();
  for(const n of p.nodes) for(const c of n.children??[]) parents.set(c,n.id);
  const self=new Map(),inclusive=new Map();
  let total=0;
  const key=n=>`${n.callFrame.url.replace(/^.*\/.test-dist-v2\//,'.test-dist-v2/').replace(/^file:\/\/.*\/scripts\/v2\/perf\//,'scripts/v2/perf/')}#${n.callFrame.functionName||'<anonymous>'}:${n.callFrame.lineNumber+1}`;
  for(let i=0;i<p.samples.length;i++) {
    const dt=p.timeDeltas[i]??0;total+=dt;
    const k=key(nodes.get(p.samples[i]));self.set(k,(self.get(k)??0)+dt);
    const seen=new Set();let id=p.samples[i];
    while(id!==undefined) {const k=key(nodes.get(id));if(!seen.has(k)){inclusive.set(k,(inclusive.get(k)??0)+dt);seen.add(k);}id=parents.get(id);}
  }
  const rank=map=>[...map].map(([frame,us])=>({frame,sampledMs:us/1000,percent:us/total*100})).sort((a,b)=>b.sampledMs-a.sampledMs);
  summaries.push({path,samples:p.samples.length,sampledMs:total/1000,self:rank(self),inclusive:rank(inclusive)});
}
await writeFile(output,JSON.stringify(summaries,null,2)+'\n');
for(const s of summaries) {console.log(s.path,`${s.samples} samples, ${s.sampledMs.toFixed(1)} ms`);console.log('Self:',s.self.slice(0,10));console.log('Inclusive production:',s.inclusive.filter(r=>r.frame.startsWith('.test-dist-v2')).slice(0,15));}
