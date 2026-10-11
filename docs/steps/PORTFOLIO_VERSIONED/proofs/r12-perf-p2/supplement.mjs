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

const {createPortfolioManifest,selectedReferences,manifestTables}=await load('.test-dist-v2/domain/portfolio/manifest.js');
const record=(name,input,output)=>{inputs.push([name,encode(input)]);outputs.push([name,encode(output)]);};
const kinds=[];
// P2 extension: real public responses, no reconstructed validator.
const {validatePortfolioGraph,validateSnapshotGraph}=await load('.test-dist-v2/domain/portfolio/graphValidation.js');
async function p2(name,f) {
 const adapter=createMemoryPortfolioReadAdapter(f.versions,f.current,[f.snapshot]);
 const result={validate:validatePortfolioGraph(f.manifest,f.versions),snapshot:validateSnapshotGraph(f.snapshot,f.versions),resolve:resolvePortfolioManifest(f.manifest,f.versions),certify:certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot,versions:f.versions}),currentCertificate:certifyPortfolioGraph({source:'current',manifest:f.manifest,versions:f.versions}),adapter:adapter.ok?{ok:true}:adapter};
 if(adapter.ok){result.loaded=await loadSnapshotGraph(adapter.value.snapshots,adapter.value.versions,f.snapshot.snapshotId);if(f.current)result.current=await loadCurrentGraph(adapter.value.current,adapter.value.versions);}
 record('p2/'+name,f,result);
}
function remove(f,v){f.versions.splice(f.versions.indexOf(v),1);for(const [table] of manifestTables)f.manifest[table]=f.manifest[table].filter(r=>r!==v.ref);}

for(const variant of ['sparse','dense','history'])for(const mode of ['empty','covered-no-association','deleted-roots']) {
 const f=fixture('small',variant);
 for(const v of f.versions.filter(v=>['PT','RT'].includes(v.ref.kind)))v.payload.lifecycle='deleted';
 for(const v of [...f.versions].filter(v=>v.ref.kind==='PTEC'||v.ref.kind==='TeamActual'))remove(f,v);
 if(mode==='empty') {
  for(const v of [...f.versions].filter(v=>v.ref.kind==='ActualSubPeriod'))remove(f,v);
  for(const v of f.versions.filter(v=>v.ref.kind==='ActualPeriod'))v.payload={coverage:'empty',from:null,through:null,subPeriods:[]};
 }
 if(mode==='deleted-roots')for(const v of f.versions.filter(v=>['ProjectSettings','ReservationSettings','TeamSettings'].includes(v.ref.kind)))v.payload.lifecycle='deleted';
 await p2(variant+'/'+mode,f);
}
outputHash.update(']');corpusHash.update(']');
const meta={cases:outputs.length,kinds,corpusSHA256:corpusHash.digest('hex'),outputSHA256:outputHash.digest('hex')};
writeFileSync(out+'.meta.json',JSON.stringify(meta,null,2)+'\n');console.log(meta);
