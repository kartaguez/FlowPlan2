// EXPERIMENT ONLY: mutates compiled JS in an explicitly disposable clone.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [root,out]=process.argv.slice(2);
assert.equal(root,'/private/tmp/flowplan-p2-index-lab');
const path=root+'/.test-dist-v2/domain/portfolio/graphValidation.js';
const original=readFileSync(path,'utf8');
const instrumented="import { performance } from 'node:perf_hooks';\n"+original
 .replace('const actualCellCounts = new LocalVersionTable();',`global.gc();
    const labBefore=process.memoryUsage(), labStart=performance.now();
    const actualCellCounts = new LocalVersionTable();`)
 .replace('for (const cell of expectedCells) {',`const labBuildMs=performance.now()-labStart;
    global.gc();const labHeld=process.memoryUsage(),labVerifyStart=performance.now();
    for (const cell of expectedCells) {`)
 .replace("const order = ofKind(graph, 'PortfolioOrder').at(0);",`const labVerifyMs=performance.now()-labVerifyStart;
    let labNodes=0;const countNodes=node=>{labNodes++;for(const child of node.children.values())countNodes(child);};countNodes(actualCellCounts.root);
    globalThis.__gridLab.push({C:actuals.length,F:expectedCells.length,U:actuals.length,nodesAndMaps:labNodes,setCalls:actuals.length,getCalls:actuals.length+expectedCells.length,buildMs:labBuildMs,verifyMs:labVerifyMs,before:labBefore,heldAfterBuildGC:labHeld,retainedHeapDeltaMiB:(labHeld.heapUsed-labBefore.heapUsed)/2**20});
    const order = ofKind(graph, 'PortfolioOrder').at(0);`);
assert.notEqual(instrumented,original);assert.ok(instrumented.includes('labNodes++'));
writeFileSync(path,instrumented);
const load=p=>import(pathToFileURL(root+'/'+p));
const {fixture}=await load('scripts/benchmarks/r12-perf/fixture.mjs');
const {validatePortfolioGraph}=await load('.test-dist-v2/domain/portfolio/graphValidation.js');
globalThis.__gridLab=[];const runs=[];
for(const variant of ['sparse','dense']){
 const f=fixture('medium',variant);
 for(let i=0;i<4;i++){
  const result=validatePortfolioGraph(f.manifest,f.versions);assert.equal(result.ok,true);
  const record=globalThis.__gridLab.pop();record.variant=variant;record.phase=i===0?'warmup':`measured-${i}`;runs.push(record);
 }
}
writeFileSync(out,JSON.stringify({root,command:process.argv,originalSHA256:createHash('sha256').update(original).digest('hex'),instrumentedSHA256:createHash('sha256').update(instrumented).digest('hex'),notes:'Disposable compiled code only; GC immediately before index and after construction. Delta is retained table plus incidental locals/JIT, not exclusive peak. Instrumentation timing/GC overhead excluded from M1–M6. U=C holds for these valid fixtures. Table root read only in this laboratory.',runs},null,2)+'\n');
