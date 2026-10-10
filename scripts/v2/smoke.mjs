import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, writeFile, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { checkSources, checkAssets, projectRoot } from './boundaries.mjs';
import { build, tsc, run } from './build.mjs';
import { testV2 } from './test.mjs';
import { browserIsolation, startProcess } from './browser-isolation-test.mjs';
import { eventually } from './browser-harness.mjs';

export async function technicalCopy(work) {
  const root = await mkdtemp(resolve(tmpdir(),'flowplan-v2-copy-'));
  try {
    for(const name of ['src-v2','public-v2','scripts/v2','package.json','tsconfig.json','tsconfig.v2.app.json','tsconfig.v2.test.json']) await cp(resolve(projectRoot,name),resolve(root,name),{recursive:true});
    await symlink(resolve(projectRoot,'node_modules'),resolve(root,'node_modules'),'junction');
    return await work(root);
  } finally { await rm(root,{recursive:true,force:true}); }
}
async function compilationIsolation() {
  return technicalCopy(async root=>{
    const results=[];
    for(const mode of ['legacy-absent','legacy-invalid']) {
      if(mode==='legacy-invalid'){await mkdir(resolve(root,'src'));await writeFile(resolve(root,'src/main.ts'),'THIS IS DELIBERATELY INVALID TYPESCRIPT !!!');}
      for(const command of ['typecheck:v2','build:v2','test:v2']) {
        const output=await run(process.platform==='win32'?'npm.cmd':'npm',['run',command],root);results.push({mode,command,status:'PASS',testCount:Number(output.match(/^# tests (\d+)$/m)?.[1])||null});
      }
    }
    return results;
  });
}
async function watchIsolation() {
  return technicalCopy(async root=>{
    const server=await startProcess(resolve(root,'scripts/v2/dev.mjs'),[],root);
    const initial=await (await fetch('http://127.0.0.1:4274/js/main/main.js')).text();
    try {
      await writeFile(resolve(root,'public-v2/styles.css'),(await readFile(resolve(root,'public-v2/styles.css'),'utf8'))+'\n/* watch-sentinel */\n');
      await eventually(()=>server.output().includes('V2 rebuild validated'),'safe V2 watch rebuild');
      assert.match(await (await fetch('http://127.0.0.1:4274/styles.css')).text(),/watch-sentinel/);
      assert.equal(await (await fetch('http://127.0.0.1:4274/js/main/main.js')).text(),initial);
      assert.match(await (await fetch('http://127.0.0.1:4274/')).text(),/FlowPlan2 V2/);
      await writeFile(resolve(root,'public-v2/index.html'),'<script type="module" src="./js/domain/index.js"></script>');
      const [code]=await once(server.child,'exit');assert.notEqual(code,0);assert.match(server.output(),/Boundary/);
      return {safeUpdate:'PASS',compiledModulesPreserved:true,legacyEntrypointRejected:true,serverStoppedOnInvalidBuild:true};
    } finally {await server.stop();}
  });
}
async function portsReleased() {
  for(const port of [4274,4275]) {
    const server=createServer();await new Promise((yes,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',yes);});await new Promise(yes=>server.close(yes));
  }
  return true;
}
export async function smoke() {
  const sources=await checkSources();await tsc('-p','tsconfig.v2.app.json','--noEmit');const artifacts=await build();const tests=await testV2();
  const report={status:'PASS (available platform gates)',node:process.version,platform:process.platform,sources,artifacts,tests,compilationIsolation:await compilationIsolation(),watch:await watchIsolation(),browser:(await browserIsolation()).status,portsReleased:await portsReleased(),seaWindows:'NOT EXECUTED: requires Windows x64 Node 26 and actual executable'};
  await checkAssets();
  await writeFile(resolve(projectRoot,'docs/steps/PORTFOLIO_VERSIONED/proofs/r01/technical-gates.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(import.meta.main){try{console.log(JSON.stringify(await smoke(),null,2));}catch(error){console.error(error);process.exitCode=1;}}
