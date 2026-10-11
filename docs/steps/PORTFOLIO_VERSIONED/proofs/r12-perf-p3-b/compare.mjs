import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
const [p,mode]=process.argv.slice(2);
const hashes={};const comparisons=[];
for(const corpus of ['oracle','supplement','copy','business']) {
 const file=`${p}/a1-${corpus}.jsonl.gz`;hashes[file]=createHash('sha256').update(readFileSync(file)).digest('hex');
 if(mode==='seal' && corpus==='business')continue;
 const other=mode==='seal'?`docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf-p3-a1/a1-${corpus}.jsonl.gz`:`${p}/b-${corpus}.jsonl.gz`;
 const iterator=f=>createInterface({input:createReadStream(f).pipe(createGunzip()),crlfDelay:Infinity})[Symbol.asyncIterator]();
 const a=iterator(file),b=iterator(other);let count=0;
 while(true){const x=await a.next(),y=await b.next();assert.equal(x.done,y.done);if(x.done)break;assert.deepEqual(JSON.parse(x.value),JSON.parse(y.value),`${corpus}/${count}`);count++;}
 comparisons.push({corpus,cases:count,divergences:0});
}
if(mode==='seal'){
 hashes[`${p}/business-oracle.mjs`]=createHash('sha256').update(readFileSync(`${p}/business-oracle.mjs`)).digest('hex');
 writeFileSync(`${p}/baseline-seal.json`,JSON.stringify({at:new Date().toISOString(),baseline:'1d1c66b2b38a6599f1ab0950c4dd1fdffd1e6e74',historicalReplay:comparisons,hashes},null,2)+'\n');
}else{
 for(const [file,hash] of Object.entries(JSON.parse(readFileSync(`${p}/baseline-seal.json`)).hashes))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,file);
 writeFileSync(`${p}/differential.json`,JSON.stringify({comparisons,total:comparisons.reduce((n,c)=>n+c.cases,0),divergences:0,sealVerified:true},null,2)+'\n');
}
console.log(comparisons);
