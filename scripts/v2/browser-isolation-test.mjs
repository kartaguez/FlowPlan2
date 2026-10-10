import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { checkAssets, projectRoot } from './boundaries.mjs';
import { withBrowser, eventually, installAudit } from './browser-harness.mjs';

const originFor = port => `http://127.0.0.1:${port}`;
export async function startProcess(script, args = [], cwd = projectRoot, env = process.env) {
  const child = spawn(process.execPath,[script,...args],{cwd,env,stdio:['ignore','pipe','pipe']});
  let output=''; child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
  let error; child.on('error',e=>{error=e;});
  await eventually(()=>{if(error)throw error;if(child.exitCode!==null)throw Error(output);return output.includes('ready:');},'server readiness');
  return { child, output:()=>output, stop:async()=>{ if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');} } };
}
async function exited(script,args=[],env=process.env) {
  const child=spawn(process.execPath,[script,...args],{cwd:projectRoot,env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
  const [code]=await once(child,'exit');return {code,output};
}
function fixtureStorage(seed, backup = 'valid') {
  return (async () => {
    const dbs = await indexedDB.databases();
    if (seed) {
      for (const [name,version,stores] of [['flowplan-planning',2,['control','current','snapshotMetadata','snapshotContent','snapshotIdentityRefs','identityReservations','jobs','receipts']],['flowplan-history-workspace',1,['chunks']],['r01-unrelated-witness',1,['witness']]]) {
        const db = await new Promise((yes,no)=>{const request=indexedDB.open(name,version);request.onupgradeneeded=()=>{for(const store of stores){ const created=request.result.createObjectStore(store);if(store==='receipts')created.createIndex('revision','token.revision'); }};request.onsuccess=()=>yes(request.result);request.onerror=()=>no(request.error);});
        await new Promise((yes,no)=>{const tx=db.transaction(stores,'readwrite');tx.oncomplete=yes;tx.onabort=()=>no(tx.error);for(const store of stores){tx.objectStore(store).put({marker:'legacy-'+store,payload:'1/3',bytes:[0,19,255]},store==='jobs'?'migration-source':'sentinel');}});db.close();
      }
      localStorage.setItem('flowplan.backup.v1',backup==='invalid'?'{invalid legacy JSON':JSON.stringify({format:'flowplan',version:8,data:{sentinel:'R0.1 laboratory only'}}));
      localStorage.setItem('r01.unrelated','preserve-me');
    }
    const inventory=seed?await indexedDB.databases():dbs;
    const data=[];
    for (const meta of inventory.sort((a,b)=>a.name.localeCompare(b.name))) {
      const db=await new Promise((yes,no)=>{const request=indexedDB.open(meta.name);request.onsuccess=()=>yes(request.result);request.onerror=()=>no(request.error);});
      const stores=[];
      for(const name of Array.from(db.objectStoreNames)) {
        const rows=await new Promise((yes,no)=>{const tx=db.transaction(name,'readonly'),store=tx.objectStore(name),keys=store.getAllKeys(),values=store.getAll();const schema={name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,indexes:Array.from(store.indexNames).map(n=>{const i=store.index(n);return{name:n,keyPath:i.keyPath,unique:i.unique,multiEntry:i.multiEntry};})};tx.oncomplete=()=>yes({...schema,keys:keys.result,values:values.result});tx.onabort=()=>no(tx.error);}); stores.push(rows);
      }
      data.push({name:db.name,version:db.version,stores});db.close();
    }
    const storage=Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]);
    return {data,storage};
  })();
}
const fixtureExpression=(seed,backup)=>`(${fixtureStorage.toString()})(${seed},${JSON.stringify(backup)})`;
const auditSource=`(${installAudit.toString()})();`;
async function instrument(page) {
  await page.send('Runtime.addBinding',{name:'__flowplanAudit'});
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:auditSource});
}
const auditCalls=page=>page.events().filter(e=>e.method==='Runtime.bindingCalled'&&e.params.name==='__flowplanAudit').map(e=>JSON.parse(e.params.payload));
async function empty(page) {
  try { await eventually(()=>page.evaluate(`!!document.querySelector('[data-flowplan-ready="true"]')`).catch(()=>false),'V2 ready'); } catch (error) { console.error(JSON.stringify({dom:await page.evaluate('document.documentElement.outerHTML'),events:page.events().filter(e=>['Runtime.exceptionThrown','Runtime.bindingCalled','Network.loadingFailed','Network.responseReceived'].includes(e.method))},null,2)); throw error; }
  const result=await page.evaluate(`({origin:location.origin,title:document.title,status:document.querySelector('[role="status"]').textContent,state:document.querySelector('[data-portfolio-state]').dataset.portfolioState,counts:Array.from(document.querySelectorAll('[data-count]')).map(n=>n.textContent),forms:document.querySelectorAll('form,input,button,iframe').length,overflow:document.documentElement.scrollWidth>innerWidth})`);
  assert.equal(result.title,'FlowPlan2 V2');assert.equal(result.status,'Portfolio vide');assert.equal(result.state,'empty');assert.deepEqual(result.counts,['0','0','0','0']);assert.equal(result.forms,0);assert.equal(result.overflow,false);return result;
}
async function canary(browser,origin) {
  const page=await browser.page();await instrument(page);await page.navigate(origin,true);
  assert.equal(await page.evaluate('window.__flowplanHooks.length'),28);
  const cases=['indexedDB.open("flowplan-planning")','indexedDB.deleteDatabase("flowplan-planning")','indexedDB.databases()','localStorage.getItem("flowplan.backup.v1")','sessionStorage','Storage.prototype.getItem.call({},"flowplan.backup.v1")','new BroadcastChannel("flowplan-planning-revisions")','new Worker("/old.js")','fetch("/old.js")','navigator.serviceWorker.register("/old.js")','caches.open("legacy")','navigator.storage.persist()','document.cookie'];
  for(const expression of cases) assert.equal(await page.evaluate(`(()=>{try{${expression};return false;}catch{return true;}})()`),true);
  await eventually(()=>auditCalls(page).length===cases.length,'canary binding journal');
  const journal=auditCalls(page);await page.close();return journal;
}
async function series(browser,origin,backup,proofDirectory) {
  const witness=await browser.page();await witness.navigate(origin,true);
  const before=await witness.evaluate(fixtureExpression(backup!==null,backup));
  await witness.evaluate(`window.peerMessages=[];window.peer=new BroadcastChannel('flowplan-planning-revisions');window.peer.onmessage=e=>peerMessages.push(e.data);`);
  const app=await browser.page();await instrument(app);await app.navigate(origin);
  assert.equal(await app.evaluate('window.__flowplanHooks.length'),28);
  const observations=[await empty(app)];
  for(const width of [1440,390]) {
    await app.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});observations.push(await empty(app));
    if(backup===null) { const {data}=await app.send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(proofDirectory,`${origin.endsWith('4274')?'dev':'portable'}-${width}.png`),Buffer.from(data,'base64')); }
  }
  await witness.evaluate(`peer.postMessage({type:'committed',legacy:true});`);
  await app.evaluate(`window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));window.dispatchEvent(new StorageEvent('storage',{key:'flowplan.backup.v1',newValue:'changed-by-witness'}));`);
  // Test-only import of the already loaded V2 module, never an additional product entrypoint.
  const lifecycle=await app.evaluate(`(async()=>{const {createV2Application}=await import('/js/main/createV2Application.js');const root=document.getElementById('app');const instance=createV2Application(root);const state=instance.state;instance.destroy();instance.destroy();const removed=!document.querySelector('[data-flowplan-ready]');createV2Application(root);return{removed,state};})()`);
  assert.equal(lifecycle.removed,true);assert.deepEqual(lifecycle.state,{kind:'empty',teams:[],projects:[],reservations:[],snapshots:[]});
  observations.push(await empty(app));
  await app.send('Page.reload',{ignoreCache:true});observations.push(await empty(app));
  const second=await browser.page();await instrument(second);await second.navigate(origin);observations.push(await empty(second));
  await new Promise(r=>setTimeout(r,200));
  const responses=[app,second].flatMap(page=>page.events().filter(e=>e.method==='Network.responseReceived').map(e=>({url:e.params.response.url,status:e.params.response.status,type:e.params.type})));
  for(const response of responses)assert.equal(response.status,new URL(response.url).pathname==='/favicon.ico'?404:200);
  const calls=[...auditCalls(app),...auditCalls(second)];assert.deepEqual(calls,[]);
  assert.deepEqual(await witness.evaluate('peerMessages'),[]);
  for(const page of [app,second]) {
    assert.deepEqual(page.events().filter(e=>e.method==='Runtime.exceptionThrown'),[]);
    for(const event of page.events().filter(e=>e.method==='Network.requestWillBeSent')) {
      const url=new URL(event.params.request.url);assert.equal(url.origin,origin);
      assert.ok(['/','/index.html','/styles.css','/js/main/main.js','/js/main/createV2Application.js','/js/bootstrap/emptyPortfolioShellState.js','/js/environment/browserIsolation.js','/js/ui/renderV2Shell.js','/favicon.ico'].includes(url.pathname),url.pathname);
    }
    assert.equal(await page.evaluate(`document.querySelectorAll('iframe').length`),0);
  }
  const after=await witness.evaluate(fixtureExpression(false,backup));assert.deepEqual(after,before);
  await witness.evaluate('peer.close()');await app.close();await second.close();await witness.close();
  return {origin,backup:backup??'absent',observations,hooksInstalled:28,apiAttempts:calls,responses,before,after,beforeSha256:createHash('sha256').update(JSON.stringify(before)).digest('hex'),afterSha256:createHash('sha256').update(JSON.stringify(after)).digest('hex'),sentinelsIntact:true};
}
export async function browserIsolation({seaRunning=false}={}) {
  const artifacts=await checkAssets(), servers=[];
  const proofDirectory=resolve(projectRoot,'docs/steps/PORTFOLIO_VERSIONED/proofs/r01');await mkdir(proofDirectory,{recursive:true});
  const report={node:process.version,platform:process.platform,artifacts,series:[],canaries:[],seaRunning};
  try {
    servers.push(await startProcess(resolve(projectRoot,'scripts/v2/dev.mjs')));
    if(!seaRunning) servers.push(await startProcess(resolve(projectRoot,'scripts/v2/portable-server.cjs'),['--test-assets',JSON.stringify({root:resolve(projectRoot,'dist-v2'),assets:artifacts.assets})]));
    const badPort=await exited(resolve(projectRoot,'scripts/v2/dev.mjs'),[],{...process.env,PORT:'4174'});assert.notEqual(badPort.code,0);assert.match(badPort.output,/fixed at 4274/);report.refusedPort=badPort;
    const collision=await exited(resolve(projectRoot,'scripts/v2/dev.mjs'));assert.notEqual(collision.code,0);assert.match(collision.output,/EADDRINUSE/);report.collision=collision;
    for(const port of [4274,4275]) {
      const wrongHost=await new Promise((yes,no)=>{const req=request(originFor(port),{headers:{Host:`localhost:${port}`}},res=>{res.resume();yes(res.statusCode);});req.on('error',no);req.end();});assert.equal(wrongHost,400);
      for(const path of ['/src/main/main.ts','/js/domain/index.js','/.sea/config.json']) assert.equal((await fetch(originFor(port)+path)).status,404);
    }
    // Each series has a new isolated profile; absent really means no previous DB.
    for(const backup of [null,'valid','invalid']) await withBrowser(async browser=>{
      report.browser=browser.browser;
      const legacyWitnesses=[];
      for(const port of [4174,4175]){const page=await browser.page();await page.navigate(originFor(port),true);legacyWitnesses.push({page,origin:originFor(port),before:await page.evaluate(fixtureExpression(true,'valid'))});}
      for(const port of [4274,4275]) {
        const origin=originFor(port);report.canaries.push({origin,backup,journal:await canary(browser,origin)});
        report.series.push(await series(browser,origin,backup,proofDirectory));
      }
      for(const witness of legacyWitnesses){const after=await witness.page.evaluate(fixtureExpression(false,'valid'));assert.deepEqual(after,witness.before);(report.legacyOriginWitnesses??=[]).push({origin:witness.origin,backup,before:witness.before,after,sentinelsIntact:true});await witness.page.close();}
      const workers=browser.events.filter(e=>e.method==='Target.targetCreated'&&['worker','shared_worker','service_worker'].includes(e.params.targetInfo.type));
      assert.deepEqual(workers.filter(e=>!e.params.targetInfo.url.startsWith('chrome-extension://')),[]);
      report.browserExtensionWorkers=workers.map(e=>e.params.targetInfo.url);
    });
    // Wrong-origin refusal: identical V2 assets, test-only server; no old app loaded.
    const contents=new Map(await Promise.all(artifacts.assets.map(async name=>[name,await readFile(resolve(projectRoot,'dist-v2',name))])));
    const refusal=createServer((req,res)=>{const key=req.url==='/'?'index.html':req.url.slice(1);const bytes=contents.get(key);res.writeHead(bytes?200:404,{'Content-Type':key.endsWith('.js')?'text/javascript':key.endsWith('.css')?'text/css':'text/html'}).end(bytes);});
    await new Promise((yes,no)=>{refusal.once('error',no);refusal.listen(4276,'127.0.0.1',yes);});
    try { await withBrowser(async browser=>{const page=await browser.page();await instrument(page);await page.navigate(originFor(4276));await eventually(()=>page.evaluate(`document.querySelector('[role="alert"]')?.textContent.includes('Origine non autorisée')`),'origin refusal');assert.equal(await page.evaluate(`!!document.querySelector('[data-flowplan-ready]')`),false);assert.deepEqual(auditCalls(page),[]);report.refusedOrigin=originFor(4276);}); }
    finally { await new Promise(yes=>refusal.close(yes)); }
    report.status='PASS';await writeFile(resolve(proofDirectory,'browser-isolation.json'),JSON.stringify(report,null,2)+'\n');return report;
  } finally { for(const server of servers.reverse()) await server.stop(); }
}
if(import.meta.main){try{const report=await browserIsolation({seaRunning:process.argv.includes('--sea-running')});console.log(`Browser isolation PASS: ${report.series.length} series, zero app API attempts; sentinel equality on both origins`);}catch(e){console.error(e);process.exitCode=1;}}
