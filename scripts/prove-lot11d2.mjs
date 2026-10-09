// Isolated proof runner. Compile with tsconfig.test.json first.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
const root=new URL('../.test-dist/',import.meta.url);
const {cases}=await import(new URL('proof/lot11d2/inputs.fixture.js',root));
const lab=await import(new URL('proof/lot11d2/replay.fixture.js',root));
const {buildPlanningSessionProjection}=await import(new URL('main/planning/buildPlanningSessionProjection.js',root));
const {capturePortfolioSnapshot}=await import(new URL('application/portfolioSnapshots/capturePortfolioSnapshot.js',root));
const {captureLegacyInputs}=await import(new URL('application/portfolioSnapshots/legacyCapture.fixture.js',root));
const sha=value=>createHash('sha256').update(value).digest('hex');
const digest=value=>sha(JSON.stringify(value));
const chainFiles=['src/application/backup/planningInputCodec.ts','src/application/portfolioSnapshots/capturePortfolioSnapshot.ts','src/domain/actuals/reconstruction.ts','src/domain/actuals/projectActualsKnowledge.ts','src/domain/planning/engine.ts','src/domain/capacity/calculations.ts','src/domain/planning/projectEstimatedDates.ts','src/domain/portfolioSnapshots/portfolioSnapshot.ts'];
const output={baseline:'633dfc9459c7398f800abfb47439e1251e7bd7aa',chainFiles:Object.fromEntries(chainFiles.map(p=>[p,sha(readFileSync(p))])),canonicalContract:'lot11d2-business/1',cases:[]};
for(const {name,state} of cases()) for(const schema of ['independent-raf','complex-rationals-overload'].includes(name)?[2]:[1,2]) {
 const reference=buildPlanningSessionProjection({state,geometryViewport:{width:1000,teamLaneHeight:100,timeAxisHeight:76}});
 const snapshot=(schema===1?captureLegacyInputs:capturePortfolioSnapshot)(state,reference.planningResult,reference.actualsReconstruction,'proof','2026-10-09T10:00:00.000Z');
 const bytes=JSON.stringify(snapshot),historical=lab.resolve(snapshot,state),replay=lab.run(historical);
 assert.deepEqual(lab.resolvedInputs(historical),lab.resolvedInputs(state));assert.deepEqual(replay.canonical,lab.canonical(state,reference.actualsReconstruction,reference.planningResult));
 const result=digest(replay.canonical);for(let n=0;n<10;n++)assert.deepEqual(lab.run(historical).canonical,replay.canonical);
 assert.equal(JSON.stringify(snapshot),bytes);
 output.cases.push({name,inputsSchemaVersion:schema,parity:true,repetitions:10,canonicalDigest:result,resolvedDigest:digest(lab.resolvedInputs(historical)),projects:replay.canonical.projects,diagnostics:replay.canonical.diagnostics,actualContributions:replay.actuals.contributions.length});
}
output.freshProcessProof=['UTC','Europe/Paris','Pacific/Honolulu'].map(TZ=>({TZ,digest:execFileSync(process.execPath,['scripts/characterize-lot11d2.mjs','--proof'],{env:{...process.env,TZ},encoding:'utf8'}).trim()}));
assert.ok(output.freshProcessProof.every(p=>p.digest===output.freshProcessProof[0].digest));
const {resourceRisk}=await import(new URL('proof/lot11d2/resourceRisk.fixture.js',root));
const resource=resourceRisk();output.notExecutedValidArtifact=resource.diagnostic;
const file=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
if(file)writeFileSync(file,JSON.stringify(output,null,2)+'\n');
console.log(`PASS: ${output.cases.length} Current/historical pairs, 10 identical repetitions each, 3 fresh timezone processes.`);
