// New P2 analysis, never alters the seven historical tools.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const directory=process.argv[2];
const rows=[];
for(const label of ['p1','p2'])for(const variant of ['sparse','dense'])for(const operation of ['M3','M5']) {
 const path=`${directory}/${label}-cpu/medium-${variant}-${operation}.cpuprofile`;
 if(!existsSync(path)){rows.push({label,variant,operation,status:'NOT_OBTAINED',reason:'Two reference-tool attempts timed out at cold phase, 30s retained. Historical P1 M5 profile kept separate.'});continue;}
 const p=JSON.parse(readFileSync(path)),nodes=new Map(p.nodes.map(n=>[n.id,n])),parents=new Map();
 for(const n of p.nodes)for(const c of n.children??[])parents.set(c,n.id);
 const self=new Map(),inclusive=new Map();let total=0;
 const categories=n=>{
  const {url,functionName,lineNumber}=n.callFrame,line=lineNumber+1;
  const tags=[];
  if(url.endsWith('/graphValidation.js')){
   tags.push('structural-validation');
   if(functionName==='validateResolved')tags.push('validateResolved');
   if(functionName==='actualCellParts')tags.push('cell-projection');
   if(label==='p1'&&line===120)tags.push('historical-grid-callback');
   if(functionName==='ofKind')tags.push('ofKind');
   if(functionName==='equal')tags.push('structured-equality-wrapper');
  }
  if(url.endsWith('/localVersionTables.js'))tags.push('local-tables-all-phases');
  if(url.endsWith('/versionRegistry.js'))tags.push('registry');
  if(url.endsWith('/immutableValue.js'))tags.push('immutable-values');
  if(url.endsWith('/payloadValidation.js'))tags.push('payload-validation');
  if(url.endsWith('/versionEnvelope.js'))tags.push('envelopes-context');
  if(functionName==='(garbage collector)')tags.push('GC');
  return tags;
 };
 for(let i=0;i<p.samples.length;i++){
  const dt=p.timeDeltas[i]??0;total+=dt;
  for(const tag of categories(nodes.get(p.samples[i])))self.set(tag,(self.get(tag)??0)+dt);
  const seen=new Set();let id=p.samples[i];while(id!==undefined){for(const tag of categories(nodes.get(id)))seen.add(tag);id=parents.get(id);}
  for(const tag of seen)inclusive.set(tag,(inclusive.get(tag)??0)+dt);
 }
 const values=m=>Object.fromEntries([...m].map(([k,v])=>[k,{sampledMs:v/1000,percent:100*v/total}]));
 rows.push({label,variant,operation,path,samples:p.samples.length,sampledMs:total/1000,self:values(self),inclusive:values(inclusive)});
}
writeFileSync(directory+'/profile-posts.json',JSON.stringify({method:'Time-delta weighted stacks; category counted once per sample; inclusive overlaps, not additive or exclusive durations. JIT/inlining/sampling limits apply. Table frames cover all phases; dedicated grid cost measured only in separate laboratory.',rows},null,2)+'\n');
