import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const [baseline,...candidates]=process.argv.slice(2);
const read=prefix=>JSON.parse(gunzipSync(readFileSync(prefix+'.json.gz')));
const expected=read(baseline);
for(const candidate of candidates) {
  assert.deepEqual(read(candidate),expected);
  const a=JSON.parse(readFileSync(baseline+'.meta.json')),b=JSON.parse(readFileSync(candidate+'.meta.json'));
  assert.deepEqual(b,a);
  console.log(`${candidate}: ${expected.length} full responses identical; corpus ${a.corpusSHA256}; output ${a.outputSHA256}`);
}
