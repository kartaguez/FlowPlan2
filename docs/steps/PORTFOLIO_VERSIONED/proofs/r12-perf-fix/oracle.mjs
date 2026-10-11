import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const [root,out]=process.argv.slice(2);
const load=p=>import(pathToFileURL(resolve(root,p)));
const {fixture}=await load('scripts/benchmarks/r12-perf/fixture.mjs');
const {createVersionRegistry,withVersions,lookupExact}=await load('.test-dist-v2/domain/versioning/versionRegistry.js');
const {validateVersionContext}=await load('.test-dist-v2/domain/versioning/versionEnvelope.js');
const {resolvePortfolioManifest}=await load('.test-dist-v2/domain/portfolio/graphResolver.js');
const {certifyPortfolioGraph}=await load('.test-dist-v2/domain/portfolio/validatedPortfolioGraph.js');
const {createMemoryPortfolioReadAdapter}=await load('.test-dist-v2/adapters/memory/memoryPortfolioReadAdapter.js');
const {loadSnapshotGraph,loadCurrentGraph}=await load('.test-dist-v2/application/portfolio/loadPortfolioGraph.js');
const clone=structuredClone;
// Tagged structural transport: record-key order irrelevant, list order and BigInt type preserved.
const encode=x=>typeof x==='bigint'?['bigint',String(x)]:Array.isArray(x)?['array',x.map(encode)]:x!==null&&typeof x==='object'?['record',Object.keys(x).sort().map(k=>[k,encode(x[k])])]:[typeof x,x];
const outputs=[],inputs=[];
function run(name,vs,batch=[]) {
  inputs.push([name,encode(vs),encode(batch)]);
  const registry=createVersionRegistry(vs,'oracle');
  outputs.push([name,encode({registry,context:validateVersionContext(vs,'oracle.context'),...(registry.ok?{append:withVersions(registry.value,batch),lookups:vs.map(v=>lookupExact(registry.value,v?.ref))}: {})})]);
}
const all=fixture('small','history').versions;
const kinds=[...new Set(all.map(v=>v.ref.kind))];
for(const kind of kinds) {
  const v=clone(all.find(v=>v.ref.kind===kind));
  const alt=clone(v);alt.ref.versionId.value='next';
  const other=clone(v);other.ref.entityId.value='other';
  run(`${kind}/roots`,[v,alt]);run(`${kind}/mapping`,[v,other]);
  run(`${kind}/repeat`,[v,clone(v),alt,clone(v),clone(alt)]);
  const reordered=Object.fromEntries(Object.entries(v).reverse());run(`${kind}/key-order`,[v,reordered]);
  for(const field of ['payload','owner','predecessor','provenance']) {
    const divergent=clone(v);
    if(field==='payload') divergent.payload={...v.payload,extra:1n};
    if(field==='owner') { const change=x=>{for(const [k,y] of Object.entries(x)) {if(k==='value'){x[k]+='changed';return true;}if(y&&typeof y==='object'&&change(y))return true;}return false;};change(divergent.owner); }
    if(field==='predecessor') divergent.predecessor={...clone(v.ref),versionId:{family:'VersionId',value:'missing'}};
    if(field==='provenance') divergent.provenance=[{...clone(v.ref),versionId:{family:'VersionId',value:'source'}}];
    run(`${kind}/divergent-${field}`,[v,divergent]);
    if(field==='owner') {divergent.ref.versionId.value='next';run(`${kind}/owner-change`,[v,divergent]);}
  }
  const a=clone(v),b=clone(alt),c=clone(alt);c.ref.versionId.value='branch';b.predecessor=clone(a.ref);c.predecessor=clone(a.ref);delete a.predecessor;
  run(`${kind}/branch`,[c,b,a]);run(`${kind}/missing`,[c,b]);
  a.predecessor=clone(b.ref);run(`${kind}/cycle`,[c,b,a]);
  run(`${kind}/multi-owner-cycle`,[a,{...b,owner:{...b.owner,type:'Malformed'}}]);
  run(`${kind}/batch`,[v],[alt,v]);run(`${kind}/batch-atomic`,[v],[alt,other,{bad:true}]);
  for(const value of ['__proto__','a/b:c',' a ','é💡','x'.repeat(1024)]) {
    const x=clone(v),y=clone(alt);x.ref.entityId.value=value;y.ref.entityId.value=value;x.ref.versionId.value='a/b';y.ref.versionId.value='a:b';
    delete x.predecessor;delete y.predecessor;run(`${kind}/adversarial/${value}`,[x,y,x]);
  }
  run(`${kind}/malformed-last`,[v,{...v,payload:{bad:true}}]);
}
// Additional deterministic permutations and adversarial owner bytes, across every owner shape.
for(const kind of kinds) {
  const root=clone(all.find(v=>v.ref.kind===kind));delete root.predecessor;root.provenance=[];
  const editValues=(x,suffix)=>{for(const [k,v] of Object.entries(x)){if(k==='value')x[k]=suffix;else if(v&&typeof v==='object')editValues(v,suffix);}};
  for(const bytes of ['__proto__',' a/b:c é💡 ','x'.repeat(1024)]) {
    const a=clone(root),b=clone(root);editValues(a.owner,bytes);editValues(b.owner,bytes+'different');
    b.ref.entityId.value+='other';run(`${kind}/owner-bytes/${bytes}`,[a,b]);
    b.owner=clone(a.owner);run(`${kind}/owner-conflict/${bytes}`,[b,a]);
  }
  const a=clone(root),b=clone(root),c=clone(root),d=clone(root);
  b.ref.versionId.value='b';c.ref.versionId.value='c';d.ref.entityId.value+='other';
  a.predecessor={...clone(root.ref),versionId:{family:'VersionId',value:'missing-1'}};
  b.predecessor=clone(a.ref);c.predecessor={...clone(root.ref),versionId:{family:'VersionId',value:'missing-2'}};
  for(const order of [[a,b,c,a],[c,b,a,c],[b,a,c,b]])run(`${kind}/ordered-missing-${order[0].ref.versionId.value}` ,order);
  a.predecessor=clone(b.ref);b.predecessor=clone(a.ref);
  run(`${kind}/cycle-before-mapping`,[d,a,b]);
  const ownerMismatch=clone(b);editValues(ownerMismatch.owner,'different');
  run(`${kind}/owner-before-cycle`,[a,b,ownerMismatch]);
  const divergent=clone(a);divergent.provenance=[{...clone(root.ref),versionId:{family:'VersionId',value:'source'}}];
  run(`${kind}/collision-before-cycle`,[a,b,divergent]);
  for(const defect of [null,{}, {ref:root.ref}, {...clone(root),provenance:[root.ref,root.ref]}, {...clone(root),predecessor:root.ref}])run(`${kind}/malformed-${JSON.stringify(encode(defect))}`,[root,defect]);
}
const pt=clone(all.find(v=>v.ref.kind==='PT')),rt=clone(all.find(v=>v.ref.kind==='RT'));
pt.owner.projectId.value='a/b';pt.owner.teamId.value='c';const pt2=clone(pt);pt2.ref.entityId.value='other';pt2.owner.projectId.value='a';pt2.owner.teamId.value='b/c';
run('composite-delimiter',[pt,pt2]);run('cross-kind',[pt,rt]);
const tas=all.filter(v=>v.ref.kind==='TeamActual');run('ta-discriminants',[tas[0],tas.at(-1)]);
const ps=clone(all.find(v=>v.ref.kind==='ProjectSettings'));delete ps.predecessor;ps.provenance=[];
const collision={...clone(ps),payload:{...ps.payload,name:'changed'}};
const changedOwner={...clone(ps),ref:{...clone(ps.ref),versionId:{family:'VersionId',value:'v2'}},owner:{type:'Project',projectId:{family:'ProjectId',value:'other'}}};
run('collision-before-owner',[ps,changedOwner,collision]);run('malformed-before-collision',[ps,collision,{bad:true}]);
run('unknown',[null]);run('invalid-list',{bad:true});
for(const variant of ['dense','sparse','history']) {
  for(const mutation of ['none','reverse','repeat','missing','manifest','collision','tombstone','extra-port']) {
    const f=fixture('small',variant);
    if(mutation==='reverse') f.versions.reverse();
    if(mutation==='repeat') f.versions.push(clone(f.versions[0]));
    if(mutation==='missing') f.versions.pop();
    if(mutation==='manifest') f.manifest.teamActuals.push(clone(f.manifest.teamActuals[0]));
    if(mutation==='collision') f.versions.push({...clone(f.versions[0]),payload:{...f.versions[0].payload,maxParallelProjects:99}});
    if(mutation==='tombstone') f.versions.find(v=>v.ref.kind==='PT').payload.lifecycle='deleted';
    inputs.push([variant,mutation,encode(f)]);
    const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[f.snapshot]);
    let loaded,current;
    if(adapter.ok) {
      const reader=mutation==='extra-port'?{async readExactVersions(refs){const r=await adapter.value.versions.readExactVersions(refs);return r.ok?{ok:true,value:[...r.value,{...clone(f.versions[0]),ref:{...clone(f.versions[0].ref),versionId:{family:'VersionId',value:'extra'}}}]}:r;}}:adapter.value.versions;
      loaded=await loadSnapshotGraph(adapter.value.snapshots,reader,f.snapshot.snapshotId);
      if(f.current)current=await loadCurrentGraph(adapter.value.current,reader);
    }
    outputs.push([`${variant}/${mutation}`,encode({resolve:resolvePortfolioManifest(f.manifest,f.versions),certify:certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot,versions:f.versions}),adapter:adapter.ok?{ok:true}:adapter,loaded,current})]);
  }
}
const corpus=JSON.stringify(inputs),result=JSON.stringify(outputs);
writeFileSync(out+'.json.gz',gzipSync(result,{mtime:0}));
const meta={cases:outputs.length,kinds,corpusSHA256:createHash('sha256').update(corpus).digest('hex'),outputSHA256:createHash('sha256').update(result).digest('hex')};
writeFileSync(out+'.meta.json',JSON.stringify(meta,null,2)+'\n');console.log(meta);
