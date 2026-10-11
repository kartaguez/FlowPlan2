import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const [root,out]=process.argv.slice(2);
const load=p=>import(pathToFileURL(resolve(root,p)));
const {fixture}=await load('scripts/benchmarks/r12-perf/fixture.mjs');
const {createVersionRegistry,withVersions,lookupExact,lookupExactBatch}=await load('.test-dist-v2/domain/versioning/versionRegistry.js');
const {validateVersionContext}=await load('.test-dist-v2/domain/versioning/versionEnvelope.js');
const {resolvePortfolioManifest}=await load('.test-dist-v2/domain/portfolio/graphResolver.js');
const {certifyPortfolioGraph}=await load('.test-dist-v2/domain/portfolio/validatedPortfolioGraph.js');
const {createMemoryPortfolioReadAdapter}=await load('.test-dist-v2/adapters/memory/memoryPortfolioReadAdapter.js');
const {loadSnapshotGraph,loadCurrentGraph}=await load('.test-dist-v2/application/portfolio/loadPortfolioGraph.js');
const clone=structuredClone;
// Tagged structural transport: record-key order irrelevant, list order and BigInt type preserved.
const encode=x=>typeof x==='bigint'?['bigint',String(x)]:Array.isArray(x)?['array',x.map(encode)]:x!==null&&typeof x==='object'?['record',Object.keys(x).sort().map(k=>[k,encode(x[k])])]:[typeof x,x];
// Stream tagged complete responses; bounded serialization memory, same canonical hashes.
writeFileSync(out+'.jsonl.gz','');
const outputHash=createHash('sha256'),corpusHash=createHash('sha256');
outputHash.update('[');corpusHash.update('[');
const outputs={length:0,push(value){if(this.length++)outputHash.update(',');const line=JSON.stringify(value);outputHash.update(line);appendFileSync(out+'.jsonl.gz',gzipSync(line+'\n',{mtime:0}));}};
const inputs={length:0,push(value){if(this.length++)corpusHash.update(',');corpusHash.update(JSON.stringify(value));}};
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
// P1 extension: public APIs and batch against real sequential baseline lookups.
const {createPortfolioManifest,selectedReferences,manifestTables}=await load('.test-dist-v2/domain/portfolio/manifest.js');
const {success}=await load('.test-dist-v2/domain/primitives/result.js');
const record=(name,input,output)=>{inputs.push([name,encode(input)]);outputs.push([name,encode(output)]);};
for(const variant of ['sparse','dense','history']) {
 const f=fixture('small',variant), refs=selectedReferences(f.manifest);
 const registry=createVersionRegistry(f.versions);if(!registry.ok)throw Error('fixture registry');
 const missing=clone(refs[3]);missing.versionId.value='absent';
 for(const requests of [[],refs,[...refs].reverse(),[...refs,...refs], [missing,null],[refs[0],null,missing],[refs[0],missing,null]]) {
  let batch;
  if(lookupExactBatch)batch=lookupExactBatch(registry.value,requests);
  else {const values=[];batch={result:success(values),failedIndex:null};for(const [i,r] of requests.entries()){const found=lookupExact(registry.value,r);if(!found.ok){batch={result:found,failedIndex:i};break;}values.push(found.value);}}
  const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[f.snapshot]);
  record(`p1/${variant}/requests/${inputs.length}`,requests,{batch,reader:await adapter.value.versions.readExactVersions(requests)});
 }
 for(const response of [f.versions,[...f.versions].reverse(),[...f.versions,clone(f.versions[0])],[],f.versions.slice(1),[...f.versions.slice(1),{...clone(f.versions[0]),ref:missing}], [...f.versions,{...clone(f.versions[0]),ref:{...clone(f.versions[0].ref),versionId:{family:'VersionId',value:'extra'}}}], [...f.versions,{...clone(f.versions[0]),payload:{bad:true}}]]) {
  const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[f.snapshot]);
  const reader={async readExactVersions(){return success(response);}};
  record(`p1/${variant}/port/${inputs.length}`,response,{snapshot:await loadSnapshotGraph(adapter.value.snapshots,reader,f.snapshot.snapshotId),current:f.current?await loadCurrentGraph(adapter.value.current,reader):null});
 }
 for(const [table,kind] of manifestTables) {
  for(const index of [0,1,17,99]) {
   const manifest=clone(f.manifest);manifest[table]=Array.from({length:100},(_,i)=>({kind,entityId:{family:'EntityId',value:` /:é __proto__ ${i}`},versionId:{family:'VersionId',value:'v'}}));
   if(index>0)manifest[table][index]=clone(manifest[table][0]);
   record(`p1/${variant}/${table}/duplicate/${index}`,manifest,{manifest:createPortfolioManifest(manifest,'custom'),resolve:resolvePortfolioManifest(manifest,[null])});
   manifest[table][index].kind='PlanningSettings';
   record(`p1/${variant}/${table}/kind/${index}`,manifest,createPortfolioManifest(manifest,'custom'));
  }
 }
}
// Supplement frozen separately: adversarial batch keys across all kinds and
// deserialized certification / historical Snapshot with divergent Current.
for(const kind of kinds) {
 const root=clone(all.find(v=>v.ref.kind===kind));delete root.predecessor;root.provenance=[];
 const versions=[];
 for(const bytes of ['/',':','é💡',' a ','__proto__','a/b:c']) {
  const v=clone(root);v.ref.versionId.value=bytes;versions.push(v);
  const branch=clone(v);branch.ref.versionId.value+='branch';branch.predecessor=clone(v.ref);versions.push(branch);
 }
 const registry=createVersionRegistry(versions);if(!registry.ok)throw Error(kind);
 const absent=clone(root.ref);absent.versionId.value='absent';
 for(const requests of [[...versions.map(v=>v.ref)].reverse(),[...versions.map(v=>v.ref),...versions.map(v=>v.ref)],[absent,null]]) {
  let batch;
  if(lookupExactBatch)batch=lookupExactBatch(registry.value,requests);
  else {const values=[];batch={result:success(values),failedIndex:null};for(const [i,r] of requests.entries()){const found=lookupExact(registry.value,r);if(!found.ok){batch={result:found,failedIndex:i};break;}values.push(found.value);}}
  record(`p1/supplement/${kind}/${inputs.length}`,[versions,requests],batch);
 }
}
{
 const f=fixture('small','sparse'), oldSnapshot=clone(f.snapshot);
 const old=f.versions.find(v=>v.ref.kind==='ProjectSettings');
 const next=clone(old);next.ref.versionId.value='divergent';next.predecessor=clone(old.ref);next.payload.name='Current divergent';f.versions.push(next);
 f.manifest.projectSettings[0]=clone(next.ref);
 const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[oldSnapshot]);if(!adapter.ok)throw Error('divergent adapter');
 const historical=await loadSnapshotGraph(adapter.value.snapshots,adapter.value.versions,oldSnapshot.snapshotId);
 const current=await loadCurrentGraph(adapter.value.current,adapter.value.versions);
 record('p1/supplement/snapshot-current-divergent',f,{historical,current});
 const wrapper={source:'snapshot',snapshot:oldSnapshot,versions:f.versions};
 const serialized=JSON.stringify(wrapper,(_,v)=>typeof v==='bigint'?{bigint:String(v)}:v);
 const deserialized=JSON.parse(serialized,(_,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&typeof v.bigint==='string'?BigInt(v.bigint):v);
 record('p1/supplement/deserialized',deserialized,certifyPortfolioGraph(deserialized));
 deserialized.snapshot.manifest.ptecs=[];
 record('p1/supplement/deserialized-invalid',deserialized,certifyPortfolioGraph(deserialized));
}

// P2 extension: real public responses, no reconstructed validator.
const {validatePortfolioGraph,validateSnapshotGraph}=await load('.test-dist-v2/domain/portfolio/graphValidation.js');
async function p2(name,f) {
 const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[f.snapshot]);
 const result={validate:validatePortfolioGraph(f.manifest,f.versions),snapshot:validateSnapshotGraph(f.snapshot,f.versions),resolve:resolvePortfolioManifest(f.manifest,f.versions),certify:certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot,versions:f.versions}),currentCertificate:certifyPortfolioGraph({source:'current',manifest:f.manifest,versions:f.versions}),adapter:adapter.ok?{ok:true}:adapter};
 if(adapter.ok){result.loaded=await loadSnapshotGraph(adapter.value.snapshots,adapter.value.versions,f.snapshot.snapshotId);if(f.current)result.current=await loadCurrentGraph(adapter.value.current,adapter.value.versions);}
 record('p2/'+name,f,result);
}
function remove(f,v){f.versions.splice(f.versions.indexOf(v),1);for(const [table] of manifestTables)f.manifest[table]=f.manifest[table].filter(r=>r!==v.ref);}
const mutations={
 complete:f=>{},
 zero:f=>{for(const v of f.versions.filter(v=>v.ref.kind==='TeamActual'))v.payload.consumed.value.numerator=0n;},
 missingFirst:f=>remove(f,f.versions.find(v=>v.ref.kind==='TeamActual')),
 missingMiddle:f=>remove(f,f.versions.filter(v=>v.ref.kind==='TeamActual')[100]),
 missingLast:f=>remove(f,f.versions.findLast(v=>v.ref.kind==='TeamActual')),
 extra:f=>{const v=clone(f.versions.find(v=>v.ref.kind==='TeamActual'));v.ref.entityId.value='extra';v.owner.association.entityId.value='foreign';f.versions.push(v);f.manifest.teamActuals.push(v.ref);},
 substitute:f=>{f.versions.find(v=>v.ref.kind==='TeamActual').owner.association.entityId.value='foreign';},
 foreignSP:f=>{f.versions.find(v=>v.ref.kind==='TeamActual').owner.subPeriod.entityId.value='foreign';},
 otherAP:f=>{const a=f.versions.find(v=>v.ref.kind==='TeamActual');a.owner.subPeriod=clone(f.versions.findLast(v=>v.ref.kind==='TeamActual').owner.subPeriod);},
 duplicateCell:f=>{const v=clone(f.versions.find(v=>v.ref.kind==='TeamActual'));v.ref.entityId.value='duplicate';f.versions.push(v);f.manifest.teamActuals.push(v.ref);},
 duplicateSelection:f=>f.manifest.teamActuals.push(clone(f.manifest.teamActuals[0])),
 capacityGrid:f=>{remove(f,f.versions.find(v=>v.ref.kind==='TeamCapacity'));mutations.substitute(f);},
 catalogGrid:f=>{f.versions.find(v=>v.ref.kind==='Program').payload.lifecycle='deleted';mutations.substitute(f);},
 endpointGrid:f=>{f.versions.find(v=>v.ref.kind==='PT').owner.teamId.value='absent';mutations.substitute(f);},
 ptecGrid:f=>{remove(f,f.versions.find(v=>v.ref.kind==='PTEC'));mutations.substitute(f);},
 partitionGrid:f=>{f.versions.find(v=>v.ref.kind==='ActualSubPeriod').payload.from='2023-12-31';mutations.substitute(f);},
 extraSPGrid:f=>{const v=clone(f.versions.find(v=>v.ref.kind==='ActualSubPeriod'));v.ref.entityId.value='extra-sp';f.versions.push(v);f.manifest.actualSubPeriods.push(v.ref);mutations.substitute(f);},
 gridOrder:f=>{f.versions.find(v=>v.ref.kind==='PortfolioOrder').payload.projectIds=[];mutations.substitute(f);},
 orderSnapshot:f=>{f.versions.find(v=>v.ref.kind==='PortfolioOrder').payload.projectIds=[];f.snapshot.knowledgeDate='2023-01-01';},
 deletedPT:f=>{const pt=f.versions.find(v=>v.ref.kind==='PT');pt.payload.lifecycle='deleted';remove(f,f.versions.find(v=>v.ref.kind==='PTEC'&&v.owner.pt.entityId.value===pt.ref.entityId.value));},
 deletedPTPTEC:f=>{f.versions.find(v=>v.ref.kind==='PT').payload.lifecycle='deleted';},
 deletedRT:f=>{f.versions.find(v=>v.ref.kind==='RT').payload.lifecycle='deleted';},
 deletedTeam:f=>{f.versions.find(v=>v.ref.kind==='TeamSettings').payload.lifecycle='deleted';},
 inactiveHidden:f=>{for(const v of f.versions){if(v.ref.kind==='ProjectSettings')v.payload.isActive=false;if(v.ref.kind==='TeamSettings')v.payload.isVisible=false;}},
 historical:f=>{for(const kind of ['TeamActual','PT','ActualSubPeriod']){const v=clone(f.versions.find(v=>v.ref.kind===kind));v.ref.versionId.value='archive';f.versions.push(v);}},
 partitionMissing:f=>{f.versions.find(v=>v.ref.kind==='ActualPeriod').payload.subPeriods[0].versionId.value='missing';},
 partitionDuplicate:f=>{const a=f.versions.find(v=>v.ref.kind==='ActualPeriod');a.payload.subPeriods.push(clone(a.payload.subPeriods[0]));},
 partitionReverse:f=>{f.versions.find(v=>v.ref.kind==='ActualPeriod').payload.subPeriods.reverse();},
 partitionGap:f=>{const s=f.versions.filter(v=>v.ref.kind==='ActualSubPeriod')[1];s.payload.from='2024-01-03';s.payload.through='2024-01-03';},
 wrongSPOwner:f=>{f.versions.find(v=>v.ref.kind==='ActualSubPeriod').owner.actualPeriod.entityId.value='other-ap';},
 forgedFamily:f=>{f.versions.find(v=>v.ref.kind==='TeamActual').owner.association.entityId.family='ProjectId';},
 forgedQuantity:f=>{f.versions.find(v=>v.ref.kind==='TeamActual').payload.consumed.family='ETC';},
 missingExactGrid:f=>{f.manifest.teamActuals[0].versionId.value='absent';mutations.substitute(f);},
};
for(const variant of ['sparse','dense','history'])for(const [name,mutate] of Object.entries(mutations))for(const permutation of [0,1,2]) {
 const f=fixture('small',variant);mutate(f);
 if(permutation===1){f.versions.reverse();for(const [table] of manifestTables)f.manifest[table].reverse();}
 if(permutation===2){f.versions=[...f.versions.slice(17),...f.versions.slice(0,17)];f.manifest.teamActuals.reverse();}
 await p2(`${variant}/${name}/${permutation}`,f);
}
// Rename every EntityId by kind, keeping cross-kind equal bytes and component boundaries.
for(const bytes of ['__proto__','constructor','a/b:c|','"\\\u0000',' é ','e\u0301','x'.repeat(1024)]) {
 const f=fixture('small','sparse');const names=new Map();let i=0;
 for(const v of f.versions){names.set(v.ref.kind+'\0'+v.ref.entityId.value,bytes+'-'+i++);}
 const pt=f.versions.find(v=>v.ref.kind==='PT'),rt=f.versions.find(v=>v.ref.kind==='RT');names.set('RT\0'+rt.ref.entityId.value,names.get('PT\0'+pt.ref.entityId.value));
 const visit=x=>{if(!x||typeof x!=='object')return;if(x.kind&&x.entityId){const key=x.kind+'\0'+x.entityId.value;if(names.has(key))x.entityId.value=names.get(key);return;}for(const y of Object.values(x))visit(y);};
 // Clone to break shared reference aliases before renaming.
 const detached=clone(f);const seen=new WeakSet();const walk=x=>{if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(x.kind&&x.entityId){visit(x);return;}for(const y of Object.values(x))walk(y);};walk(detached);
 await p2('adversarial/'+bytes,detached);
}

outputHash.update(']');corpusHash.update(']');
const meta={cases:outputs.length,kinds,corpusSHA256:corpusHash.digest('hex'),outputSHA256:outputHash.digest('hex')};
writeFileSync(out+'.meta.json',JSON.stringify(meta,null,2)+'\n');console.log(meta);
