import assert from 'node:assert/strict';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
const [directory] = process.argv.slice(2);
const comparisons = [];
for (const corpus of ['oracle', 'supplement', 'copy']) {
  const iterator = label => createInterface({ input: createReadStream(`${directory}/${label}-${corpus}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity })[Symbol.asyncIterator]();
  const baseline = iterator('p2'), candidate = iterator('a1'); let cases = 0;
  while (true) {
    const a = await baseline.next(), b = await candidate.next();
    assert.equal(a.done, b.done); if (a.done) break;
    assert.deepEqual(JSON.parse(b.value), JSON.parse(a.value), `${corpus}/${cases}`); cases++;
  }
  const bm = JSON.parse(readFileSync(`${directory}/p2-${corpus}.meta.json`)), cm = JSON.parse(readFileSync(`${directory}/a1-${corpus}.meta.json`));
  assert.deepEqual(cm, bm);
  comparisons.push({ corpus, cases, divergences: 0, outputSHA256: bm.outputSHA256 });
}
const seal = JSON.parse(readFileSync(`${directory}/baseline-seal.json`));
for (const [file, hash] of Object.entries(seal.hashes)) assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), hash, file);
writeFileSync(`${directory}/differential.json`, JSON.stringify({ comparisons, total: comparisons.reduce((n, c) => n + c.cases, 0), divergences: 0, sealVerified: true }, null, 2) + '\n');
console.log(comparisons);
