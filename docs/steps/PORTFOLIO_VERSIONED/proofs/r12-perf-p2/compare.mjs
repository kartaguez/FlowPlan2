import assert from 'node:assert/strict';
import { createReadStream,readFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
const [baseline,candidate]=process.argv.slice(2);
const iterator=p=>createInterface({input:createReadStream(p+'.jsonl.gz').pipe(createGunzip()),crlfDelay:Infinity})[Symbol.asyncIterator]();
const a=iterator(baseline),b=iterator(candidate);let cases=0;
while(true){const x=await a.next(),y=await b.next();assert.equal(x.done,y.done);if(x.done)break;assert.deepEqual(JSON.parse(y.value),JSON.parse(x.value),`case ${cases}`);cases++;}
assert.deepEqual(JSON.parse(readFileSync(candidate+'.meta.json')),JSON.parse(readFileSync(baseline+'.meta.json')));
console.log(`${cases} full public responses identical: ${baseline} -> ${candidate}`);
