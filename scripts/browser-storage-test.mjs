// Run after npm run build. Real IndexedDB/UI gates in an isolated temporary profile.
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { withStorageBrowser } from "./storageBrowserHarness.mjs";
await withStorageBrowser(async ({ call, evaluate, browser, origin }) => {
  const result = await evaluate(`(async () => {
    const {openIndexedDbPlanningRepository,openIndexedDbRepositoryStorage} = await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const {createDemoPlanningScenario} = await import('/js/main/demo/createDemoPlanningScenario.js');
    const {buildPlanningSessionProjection} = await import('/js/main/planning/buildPlanningSessionProjection.js');
    const {capturePortfolioSnapshot} = await import('/js/application/portfolioSnapshots/capturePortfolioSnapshot.js');
    const {encodePlanningInputs} = await import('/js/application/backup/planningInputCodec.js');
    const {decodeFlowplanBackup} = await import('/js/application/backup/flowplanBackupV8.js');
    const {exportRepositoryBackup,assertLegacyUnchanged} = await import('/js/application/persistence/repositoryTransfer.js');
    const assert=(value,message)=>{if(!value)throw Error(message)};
    const repo=await openIndexedDbPlanningRepository({factory:indexedDB,name:'gate'}), state=createDemoPlanningScenario();
    const stage=await repo.stageImport(state,'seed'); const base=await repo.activateImport(stage,null,'init',{fingerprint:'absent',document:null});
    const run=buildPlanningSessionProjection({state,geometryViewport:{width:1000,teamLaneHeight:100,timeAxisHeight:76}});
    const capture=id=>capturePortfolioSnapshot(state,run.planningResult,run.actualsReconstruction,id,'2026-10-08T10:00:00.000Z');
    const a=await repo.createSnapshot(capture('a'),base.currentRevision,base,'a');
    const retry=await repo.createSnapshot(capture('a'),base.currentRevision,base,'a'); assert(retry.revision===a.revision,'Save retry duplicated revision');
    const other=await openIndexedDbPlanningRepository({factory:indexedDB,name:'gate'});
    const races=await Promise.allSettled([repo.writeCurrent(encodePlanningInputs(state),a,'one'),other.writeCurrent(encodePlanningInputs(state),a,'two')]);
    assert(races.filter(r=>r.status==='fulfilled').length===1,'CAS did not choose one winner');
    const now=(await repo.readCurrent()).token;
    await assertLegacyUnchanged(repo,()=>null); // Normal Current edits never conflict with unchanged legacy.
    let stale=false;try{await repo.createSnapshot(capture('stale'),base.currentRevision,now,'stale')}catch(e){stale=e.code==='CONFLICT'}assert(stale,'stale run accepted');
    const b=await repo.createSnapshot(capture('b'),now.currentRevision,now,'b'); const gone=await repo.deleteSnapshot('a',b,'delete');
    assert(gone.currentRevision===now.currentRevision,'Delete rewrote Current');assert((await repo.listSnapshotMetadata(gone)).items.length===1,'target Delete failed');
    const exported=(await exportRepositoryBackup(repo)).join(''); assert(decodeFlowplanBackup(exported).portfolioSnapshots.length===1,'V8 export incomplete');
    const afterImport=await repo.stageImport(decodeFlowplanBackup(exported),'import');assert((await repo.readInfo()).token.generation===gone.generation,'stage published early');
    const imported=await repo.activateImport(afterImport,gone,'import');assert(imported.generation!==gone.generation,'activation did not switch generation');
    other.close();repo.close();const restart=await openIndexedDbPlanningRepository({factory:indexedDB,name:'gate'});assert((await restart.readInfo()).token.revision===imported.revision,'restart lost commit');
    const before=await restart.readCurrent();let aborted=false;
    const fault=await openIndexedDbRepositoryStorage({factory:indexedDB,name:'gate'});
    try{await fault.transaction(['current'],'readwrite',async tx=>{await tx.put('current',[imported.generation],{text:'bad',digest:'bad'});throw Error('injected abort')})}catch{aborted=true}
    assert(aborted,'native transaction did not abort');assert(JSON.stringify(encodePlanningInputs((await restart.readCurrent()).state))===JSON.stringify(encodePlanningInputs(before.state)),'aborted write leaked');fault.close();
    window.storageGate={repo:restart,token:imported,state};
    return {assertions:15,exportBytes:new TextEncoder().encode(exported).length,token:imported};
  })()`);
  let quota;
  try {
    const actualOrigin = await evaluate("location.origin");
    assert.equal(actualOrigin, origin);
    await call("Storage.overrideQuotaForOrigin", { origin: actualOrigin, quotaSize: 1024 });
    console.log("Quota override:", JSON.stringify(await call("Storage.getUsageAndQuota", { origin: actualOrigin })));
    quota = await evaluate(`(async()=>{
      const {repo,token,state}=window.storageGate;
      const {encodePlanningInputs}=await import('/js/application/backup/planningInputCodec.js');
      const dto=encodePlanningInputs(state);dto.portfolio.projects[0].name=Array.from({length:10000},()=>crypto.randomUUID()).join('');
      let code;try{await repo.writeCurrent(dto,token,'quota')}catch(e){code=e.code}
      const after=await repo.readInfo();
      if(code==='QUOTA'&&after.token.revision!==token.revision)throw Error('quota failure published a revision');
      if(!code)await repo.writeCurrent(encodePlanningInputs(state),after.token,'restore-after-quota-probe');
      const {createPlanningRepository}=await import('/js/application/persistence/createPlanningRepository.js');
      const {openIndexedDbRepositoryStorage}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
      const {sha256}=await import('/js/infrastructure/persistence/fingerprint.js');
      const backend=await openIndexedDbRepositoryStorage({factory:indexedDB,name:'gate'});
      const fault=createPlanningRepository({close:()=>backend.close(),transaction:(stores,mode,body)=>backend.transaction(stores,mode,async tx=>{const result=await body(tx);if(mode==='readwrite')throw new DOMException('Injected quota refusal','QuotaExceededError');return result;})},sha256);
      const before=await repo.readCurrent();let nativeCode;
      try{await fault.writeCurrent(encodePlanningInputs(state),before.token,'injected-native-quota')}catch(e){nativeCode=e.code}
      if(nativeCode!=='QUOTA'||(await repo.readInfo()).token.revision!==before.token.revision)throw Error('native quota abort was not atomic');
      fault.close();return {overrideAccepted:true,physicalQuotaEnforced:code==='QUOTA',nativeInjectedQuotaAtomic:true,nativeCode};
    })()`);
  } finally { await call("Storage.overrideQuotaForOrigin", { origin }).catch(() => {}); }
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const ui = await evaluate(`(async()=>{
    const assert=(value,message)=>{if(!value)throw Error(message)};
    const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
    const {encodeFlowplanBackupV8}=await import('/js/application/backup/flowplanBackupV8.js');
    const {capturePortfolioSnapshot}=await import('/js/application/portfolioSnapshots/capturePortfolioSnapshot.js');
    const {buildPlanningSessionProjection}=await import('/js/main/planning/buildPlanningSessionProjection.js');
    const state=createDemoPlanningScenario(), run=buildPlanningSessionProjection({state,geometryViewport:{width:1000,teamLaneHeight:100,timeAxisHeight:76}});
    const captured=capturePortfolioSnapshot(state,run.planningResult,run.actualsReconstruction,'seed','2026-10-08T10:00:00.000Z');
    const raw=encodeFlowplanBackupV8({...state,portfolioSnapshots:[captured]});localStorage.setItem('flowplan.backup.v1',raw);
    const style=document.createElement('link');style.rel='stylesheet';style.href='/styles.css';document.head.append(style);
    document.body.innerHTML='<div id="app"></div>';
    const {createPersistentPlanningApplication}=await import('/js/main/createPersistentPlanningApplication.js');
    const app=await createPersistentPlanningApplication(document.getElementById('app'));assert(app,'application did not open');window.storageUiApp=app;
    const wait=async test=>{for(let i=0;i<300;i++){if(test())return;await new Promise(r=>setTimeout(r,20))}throw Error('UI did not settle: '+document.querySelector('.history-storage-status')?.textContent)};
    const save=[...document.querySelectorAll('button')].find(b=>b.textContent==='Save portfolio snapshot');save.click();
    await wait(()=>document.querySelector('.portfolio-snapshot-actions [role=status]')?.textContent==='Portfolio snapshot saved.');
    assert(localStorage.getItem('flowplan.backup.v1')===raw,'legacy source rewritten');
    const history=document.querySelector('button[aria-label="Project History"]'),planning=document.querySelector('button[aria-label="Planning"]');
    history.click();await wait(()=>document.querySelectorAll('.history-row-entry').length>0&&document.querySelector('.history-storage-status').textContent==='');
    await wait(()=>document.querySelectorAll('.history-timeline path').length>0);
    const first=document.querySelector('button.history-row-entry');first.focus();
    await wait(()=>!document.querySelector('.history-tooltip').hidden&&!document.querySelector('.history-tooltip').textContent.includes('Loading exact'));
    assert(document.querySelector('.history-tooltip').textContent.includes('EAC'),'historical details missing');
    for(let i=0;i<3;i++){planning.click();history.click();await wait(()=>document.querySelectorAll('.history-row-entry').length>0&&document.querySelector('.history-storage-status').textContent==='')}
    planning.click();assert(document.querySelectorAll('.history-row-entry').length===0,'closed History retained gutter rows');
    assert(localStorage.getItem('flowplan.backup.v1')===raw,'navigation wrote legacy');
    return {migrated:true,save:true,history:true,details:true,cycles:3,legacyPreserved:true,closedHistoryRows:0};
  })()`);
  const blockedUpgrade = await evaluate(`(async()=>{
    const {openIndexedDbRepositoryStorage}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const old=await new Promise((resolve,reject)=>{const request=indexedDB.open('blocked-upgrade',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    let blocked=false,code;try{await openIndexedDbRepositoryStorage({factory:indexedDB,name:'blocked-upgrade',onBlocked:()=>blocked=true})}catch(e){code=e.code}finally{old.close()}
    if(!blocked||code!=='BLOCKED')throw Error('blocked upgrade was not reported');return{blocked,code};
  })()`);
  const historyLayouts = [];
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await evaluate(`document.querySelector('button[aria-label="Project History"]').click()`);
    await evaluate(`(async()=>{for(let i=0;i<300;i++){if(document.querySelectorAll('.history-row-entry').length&&document.querySelector('.history-storage-status').textContent==='')return;await new Promise(r=>setTimeout(r,20))}throw Error('History did not load')})()`);
    for (const theme of ["light", "dark"]) {
      await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
      historyLayouts.push(await evaluate(`({theme:'${theme}',width:innerWidth,scrollWidth:document.documentElement.scrollWidth})`));
      const shot=await call("Page.captureScreenshot",{format:"png"});
      await mkdir('/private/tmp/flowplan11d-ui',{recursive:true});await writeFile(`/private/tmp/flowplan11d-ui/history-${theme}-${width}.png`,Buffer.from(shot.data,'base64'));
    }
    await evaluate(`document.querySelector('button[aria-label="Planning"]').click()`);
  }
  const layout = [];
  for (const width of [1440, 390]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    layout.push(await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})`));
    const screenshot=await call("Page.captureScreenshot",{format:"png"});
    await mkdir('/private/tmp/flowplan11d-ui',{recursive:true});await writeFile(`/private/tmp/flowplan11d-ui/planning-${width}.png`,Buffer.from(screenshot.data,'base64'));
  }
  console.log(JSON.stringify({ browser: browser.product, result, quota, ui, blockedUpgrade, layout, historyLayouts, originIsolated: true }, null, 2));

});
