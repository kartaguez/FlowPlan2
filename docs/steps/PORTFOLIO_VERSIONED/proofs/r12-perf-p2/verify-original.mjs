import assert from 'node:assert/strict';
import {readFileSync,createReadStream} from 'node:fs';
import {gunzipSync,createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
const p='docs/steps/PORTFOLIO_VERSIONED/proofs/';
const original=JSON.parse(gunzipSync(readFileSync(p+'r12-perf-p1/p1-full-oracle.json.gz')));
const replay=JSON.parse(gunzipSync(readFileSync(p+'r12-perf-p2/p1-original.json.gz')));
assert.deepEqual(replay,original);
const lines=createInterface({input:createReadStream(p+'r12-perf-p2/p1-frozen.jsonl.gz').pipe(createGunzip())});let i=0;
for await(const line of lines){assert.deepEqual(JSON.parse(line),original[i]);if(++i===941)break;}
assert.equal(i,941);console.log('941 original P1 cases and complete responses unchanged in the extended frozen corpus');
