import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { projectRoot } from './boundaries.mjs';
import { run } from './build.mjs';
import { createHash } from 'node:crypto';
import { fixtureStorage } from './browser-isolation-test.mjs';
import { withBrowser, eventually } from './browser-harness.mjs';
const baseline='1c2b08c727af9fb8002b7678bd7403fcc0d39c27';
const proofDirectory=resolve(projectRoot,'docs/steps/PORTFOLIO_VERSIONED/proofs/r01');

export async function proveReference({buildOnly=false}={}) {
  const directory=await mkdtemp(resolve(tmpdir(),'flowplan-r01-reference-'));
  const checkout=resolve(directory,'checkout');let child;
  try {
    const codeHead=(await run('git',['rev-parse','HEAD'])).trim();
    const paths=(await run('git',['ls-tree','-r','--name-only',baseline,'--','src','public','scripts','tsconfig.app.json','tsconfig.test.json'])).trim().split('\n');
    assert.equal(await run('git',['diff',baseline,'--',...paths]),'');
    await run('git',['clone','--no-hardlinks','--quiet',projectRoot,checkout]);
    await run('git',['switch','--detach',baseline],checkout);
    assert.equal((await run('git',['rev-parse','HEAD'],checkout)).trim(),baseline);
    const commands=[];
    const npm=process.platform==='win32'?'npm.cmd':'npm';
    for(const args of [['ci'],['run','typecheck'],['run','build'],['run','test:portable']]) {
      const output=await run(npm,args,checkout);commands.push({command:'npm '+args.join(' '),status:'PASS',output});
    }
    await writeFile(resolve(proofDirectory,'legacy-build.json'),JSON.stringify({baseline,codeHead,unchangedLegacyFiles:paths.length,commands,status:'PASS: exact detached legacy checkout build/typecheck/3 portable tests'},null,2)+'\n');
    if(buildOnly)return {baseline,codeHead,commands,status:'PASS legacy build/typecheck/portable tests; browser not started'};
    child=spawn(process.execPath,['scripts/dev.mjs'],{cwd:checkout,env:{...process.env,PORT:'4174'},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
    await eventually(()=>{if(child.exitCode!==null)throw Error(output);return output.includes('FlowPlan development server: http://127.0.0.1:4174');},'historical dev');
    const browserProof=await withBrowser(async browser=>{
      const page=await browser.page();await page.navigate('http://127.0.0.1:4174');
      await eventually(()=>page.evaluate(`!document.getElementById('app').inert && !!Array.from(document.querySelectorAll('button')).find(n=>n.textContent==='Save portfolio snapshot')`),'historical Current loaded');
      assert.equal(await page.evaluate(`!!document.querySelector('[data-flowplan-runtime="v2"]')`),false);
      await page.evaluate(`Array.from(document.querySelectorAll('button')).find(n=>n.textContent==='Save portfolio snapshot').click()`);
      await eventually(()=>page.evaluate(`document.querySelector('.portfolio-snapshot-actions ul').children.length>0`),'historical capture saved');
      await page.evaluate(`document.querySelector('button[aria-label="Project History"]').click()`);
      await eventually(()=>page.evaluate(`!!document.querySelector('.history-legend-entry') && !!document.querySelector('.history-row-entry')`),'historical History consultation');
      const result=await page.evaluate(`({origin:location.origin,currentTeams:document.querySelectorAll('.team-panel').length,snapshots:document.querySelectorAll('.history-legend-entry').length,historyRows:document.querySelectorAll('.history-row-entry').length,v2Loaded:!!document.querySelector('[data-flowplan-runtime="v2"]')})`);
      assert.ok(result.snapshots>0);assert.ok(result.historyRows>0);
      const {data}=await page.send('Page.captureScreenshot',{format:'png'});await mkdir(proofDirectory,{recursive:true});await writeFile(resolve(proofDirectory,'legacy-history-4174.png'),Buffer.from(data,'base64'));
      const errors=page.events().filter(e=>e.method==='Runtime.exceptionThrown');assert.deepEqual(errors,[]);
      return {browser:browser.browser,...result,errors};
    });
    child.kill('SIGTERM');await once(child,'exit');child=undefined;
    const rollback=await rollbackCheckout(checkout,codeHead);
    const report={status:'PASS (available platform evidence)',baseline,codeHead,unchangedLegacyFiles:paths.length,commands,browserProof,rollback,legacyPortableWindows:'NOT EXECUTED: old SEA on 4175 requires Windows; server historical unit tests PASS'};
    await writeFile(resolve(proofDirectory,'legacy-and-rollback.json'),JSON.stringify(report,null,2)+'\n');return report;
  } finally {if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}await rm(directory,{recursive:true,force:true});}
}
async function rollbackCheckout(checkout,codeHead) {
  await run('git',['switch','--detach',codeHead],checkout);
  await rm(resolve(checkout,'dist-v2'),{recursive:true,force:true});await rm(resolve(checkout,'.test-dist-v2'),{recursive:true,force:true});
  return withBrowser(async browser=>{
    const witnesses=[];
    for(const port of [4174,4175,4274,4275]) {const page=await browser.page();await page.navigate(`http://127.0.0.1:${port}`,true);witnesses.push({page,origin:`http://127.0.0.1:${port}`,before:await page.evaluate(`(${fixtureStorage.toString()})(true,'valid')`)});}
    const commits=(await run('git',['rev-list',`${baseline}..${codeHead}`],checkout)).trim().split('\n');
    for(const commit of commits)await run('git',['-c','user.name=R0.1 rollback proof','-c','user.email=r01-proof@example.invalid','revert','--no-edit',commit],checkout);
    const baselineTree=(await run('git',['rev-parse',baseline+'^{tree}'],checkout)).trim();
    const revertedTree=(await run('git',['rev-parse','HEAD^{tree}'],checkout)).trim();assert.equal(revertedTree,baselineTree);assert.equal(await run('git',['status','--short'],checkout),'');
    const sentinels=[];
    for(const witness of witnesses){const after=await witness.page.evaluate(`(${fixtureStorage.toString()})(false,'valid')`);assert.deepEqual(after,witness.before);sentinels.push({origin:witness.origin,beforeSha256:createHash('sha256').update(JSON.stringify(witness.before)).digest('hex'),afterSha256:createHash('sha256').update(JSON.stringify(after)).digest('hex'),intact:true});await witness.page.close();}
    return {codeHead,revertedCommits:commits,baselineTree,revertedTree,workingTreeClean:true,dataConversion:false,sentinels};
  });
}
export async function proveRollback() {
  const directory=await mkdtemp(resolve(tmpdir(),'flowplan-r01-rollback-'));
  const checkout=resolve(directory,'checkout');
  try {await run('git',['clone','--no-hardlinks','--quiet',projectRoot,checkout]);const report=await rollbackCheckout(checkout,(await run('git',['rev-parse','HEAD'])).trim());await writeFile(resolve(proofDirectory,'rollback.json'),JSON.stringify(report,null,2)+'\n');return report;}
  finally {await rm(directory,{recursive:true,force:true});}
}
if(import.meta.main){try{const report=process.argv.includes('--rollback-only')?await proveRollback():await proveReference({buildOnly:process.argv.includes('--build-only')});console.log(JSON.stringify(report,null,2));}catch(e){console.error(e);process.exitCode=1;}}
