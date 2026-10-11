// Read-only attribution of the unchanged Inspector profiles; no production instrumentation.
import { readFileSync, writeFileSync } from 'node:fs';
const [output,...paths]=process.argv.slice(2);
const rows=[];
for(const path of paths) {
 const p=JSON.parse(readFileSync(path,'utf8'));
 const nodes=new Map(p.nodes.map(n=>[n.id,n])),parents=new Map();
 for(const n of p.nodes)for(const c of n.children??[])parents.set(c,n.id);
 const sums={registry:0,manifest:0,resolverLookup:0,portCorrespondence:0,memoryLookup:0,teamActualGrid:0,collectInclusive:0,memoryReaderInclusive:0};
 let total=0;
 for(let i=0;i<p.samples.length;i++) {
  const dt=p.timeDeltas[i]??0;total+=dt;
  const frames=[];let id=p.samples[i];
  while(id!==undefined){frames.push(nodes.get(id).callFrame);id=parents.get(id);}
  const has=(file,fn)=>frames.some(f=>f.url.endsWith(file)&&f.functionName===fn);
  const registry=has('/versionRegistry.js','createVersionRegistry');
  const manifest=has('/manifest.js','createPortfolioManifest');
  const memory=has('/memoryPortfolioReadAdapter.js','readExactVersions');
  const collect=has('/loadPortfolioGraph.js','collect');
  const lookup=has('/versionRegistry.js','lookupExact')||has('/versionRegistry.js','lookupExactBatch');
  if(registry)sums.registry+=dt;
  if(manifest)sums.manifest+=dt;
  if(collect)sums.collectInclusive+=dt;
  if(memory)sums.memoryReaderInclusive+=dt;
  if(lookup&&memory)sums.memoryLookup+=dt;
  else if(lookup&&collect)sums.portCorrespondence+=dt;
  else if(lookup)sums.resolverLookup+=dt;
  // Baseline membership can be sampled in its callback or inlined into collect self.
  if(!lookup&&!registry&&!memory&&collect&&frames[0].url.endsWith('/loadPortfolioGraph.js'))sums.portCorrespondence+=dt;
  if(frames.some(f=>f.url.endsWith('/graphValidation.js')&&f.lineNumber===119))sums.teamActualGrid+=dt;
 }
 rows.push({path,sampledMs:total/1000,samples:p.samples.length,posts:Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,{sampledMs:v/1000,percent:100*v/total}]))});
}
writeFileSync(output,JSON.stringify({method:'Inclusive sampled stacks, context separates helper calls. Baseline correspondence includes collect self/callback and overhead. Inlined/JIT/GC/async frames limit attribution. Percentages overlap and are not exclusive timings.',rows},null,2)+'\n');
console.log(rows.map(r=>({path:r.path,sampledMs:r.sampledMs,posts:r.posts})));
