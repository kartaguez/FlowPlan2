// Audit regressions against native IndexedDB, the real worker and the mounted UI.
import { withStorageBrowser } from './storageBrowserHarness.mjs';
await withStorageBrowser(async ({ evaluate, browser }) => {
  const result = await evaluate(`(async () => {
    const {openIndexedDbPlanningRepository,openIndexedDbRepositoryStorage}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const {createPlanningRepository}=await import('/js/application/persistence/createPlanningRepository.js');
    const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
    const {createPlanningSession}=await import('/js/application/session/planningSession.js');
    const {createRepositoryPlanningDispatcher}=await import('/js/main/planning/createRepositoryPlanningDispatcher.js');
    const {encodePlanningInputs}=await import('/js/application/backup/planningInputCodec.js');
    const {capturePortfolioSnapshot}=await import('/js/application/portfolioSnapshots/capturePortfolioSnapshot.js');
    const {buildPlanningSessionProjection}=await import('/js/main/planning/buildPlanningSessionProjection.js');
    const {sha256}=await import('/js/infrastructure/persistence/fingerprint.js');
    const assert=(value,message)=>{if(!value)throw Error(message)}, tests=[];
    const test=async(name,work)=>{await work();tests.push(name)};
    const state=createDemoPlanningScenario(), viewport={width:1000,teamLaneHeight:100,timeAxisHeight:76};
    const run=buildPlanningSessionProjection({state,geometryViewport:viewport});
    const capture=id=>capturePortfolioSnapshot(state,run.planningResult,run.actualsReconstruction,id,'2026-10-08T10:00:00.000Z');
    const repo=await openIndexedDbPlanningRepository({factory:indexedDB,name:'audit'}), backend=await openIndexedDbRepositoryStorage({factory:indexedDB,name:'audit'});
    const stage=await repo.stageImport({...state,portfolioSnapshots:[capture('seed')]},'seed');let token=await repo.activateImport(stage,null,'activate');
    const original=await backend.transaction(['snapshotContent'],'readonly',tx=>tx.get('snapshotContent',[token.generation,'seed']));
    const put=async value=>{const text=JSON.stringify(value),digest=await sha256(text);await backend.transaction(['snapshotContent'],'readwrite',tx=>tx.put('snapshotContent',[token.generation,'seed'],{text,digest,validationVersion:1}))};
    const rejects=async work=>{let rejected=false;try{await work()}catch(e){rejected=true}assert(rejected,'invalid operation succeeded')};
    await test('valid legacy certificate: worker read and History',async()=>{await put(capture('seed'));assert((await repo.readSnapshot('seed',token)).snapshotId==='seed','worker read');assert((await repo.readHistoryProjection('seed',token,{mode:'summary'})).rows.length>0,'worker history')});
    await test('structural forgery with valid digest rejected by both worker paths',async()=>{await put({...capture('seed'),forecast:null});await rejects(()=>repo.readSnapshot('seed',token));await rejects(()=>repo.readHistoryProjection('seed',token,{mode:'summary'}))});
    await test('business forgery with valid digest rejected by both worker paths',async()=>{const invalid=structuredClone(capture('seed'));invalid.forecast.projects[0].eac='999999';await put(invalid);await rejects(()=>repo.readSnapshot('seed',token));await rejects(()=>repo.readHistoryProjection('seed',token,{mode:'profiles',projectIds:[invalid.forecast.projects[0].projectId]}))});
    await test('corruption after certification rejected',async()=>{await backend.transaction(['snapshotContent'],'readwrite',tx=>tx.put('snapshotContent',[token.generation,'seed'],{...original,validationVersion:1,text:original.text+' '}));await rejects(()=>repo.readSnapshot('seed',token))});
    await backend.transaction(['snapshotContent'],'readwrite',tx=>tx.put('snapshotContent',[token.generation,'seed'],original));
    await test('native abort proves rollback and preserves persisted authority',async()=>{const before=await repo.readCurrent();let outcome;try{await backend.transaction(['current'],'readwrite',async tx=>{await tx.put('current',[token.generation],{text:'bad',digest:'bad'});throw Error('abort')})}catch(e){outcome=e.commitOutcome}assert(outcome==='not-applied','rollback not distinguished');assert(JSON.stringify(await repo.readCurrent())===JSON.stringify(before),'abort leaked')});
    await test('post-complete notification failure rejects as uncertain and receipt retry is idempotent',async()=>{let fail=true;const failing=await openIndexedDbPlanningRepository({factory:indexedDB,name:'audit',onCommit:()=>{if(fail)throw Error('lost ack')}});const dto=encodePlanningInputs(state);let error;try{await failing.writeCurrent(dto,token,'ack')}catch(e){error=e}assert(error&&error.commitOutcome==='unknown','lost ack treated as rollback');const current=await repo.readCurrent();assert(current.token.revision===token.revision+1,'commit absent');fail=false;assert((await failing.writeCurrent(dto,token,'ack')).revision===current.token.revision,'retry duplicated');token=current.token;failing.close()});
    await test('invalid mid-import cannot activate and incomplete native staging resumes',async()=>{const invalid=structuredClone(capture('bad'));invalid.forecast.projects[0].eac='999999';await rejects(()=>repo.stageImport({...state,portfolioSnapshots:[capture('good'),invalid]},'invalid'));const jobs=await repo.listUnfinishedStages();const job=jobs.find(j=>j.generation==='stage-invalid');assert(job,'partial job absent');await rejects(()=>repo.activateImport(job,token,'premature'));assert((await repo.readInfo()).token.generation===token.generation,'partial activated');
      let fail=true;const fault=createPlanningRepository({close:()=>{},transaction:(stores,mode,body)=>backend.transaction(stores,mode,async tx=>{const value=await body(tx);if(fail&&stores.includes('snapshotContent')&&mode==='readwrite'){fail=false;throw Error('interrupted')}return value})},sha256);
      const dataset={...state,portfolioSnapshots:[capture('resumed')]};await rejects(()=>fault.stageImport(dataset,'interrupted'));const resumed=await repo.stageImport(dataset,'retry');assert(resumed.generation==='stage-interrupted','not resumed');const next=await repo.activateImport(resumed,token,'resume-activate');assert((await repo.readSnapshot('resumed',next)).snapshotId==='resumed','resume incomplete');token=next;
    });
    for(const kind of ['save','delete','current'])await test('native '+kind+' commit with failed local reconciliation blocks subsequent UI-facing mutations',async()=>{
      const current=await repo.readCurrent(),session=createPlanningSession(current.state),messages=[];let injected=false;
      const port={...repo,readCurrent:async()=>{if(injected)throw Error('read unavailable');return repo.readCurrent()},createSnapshot:async(...args)=>{const result=await repo.createSnapshot(...args);injected=true;return result},deleteSnapshot:async(...args)=>{const result=await repo.deleteSnapshot(...args);injected=true;return result}};
      const live=kind==='current'?{...session,publish:()=>({ok:false,errors:[]})}:session;
      const dispatcher=createRepositoryPlanningDispatcher({repository:port,current,session:live,geometryViewport:viewport,hasUnappliedChanges:()=>false,recoveryRequired:message=>messages.push(message)});
      const command={kind:'reorder-project',projectId:current.state.portfolio.priorityOrder[0],targetPosition:2};
      const result=kind==='save'?await dispatcher.savePortfolioSnapshot():kind==='delete'?await dispatcher.deletePortfolioSnapshot('resumed'):await dispatcher.dispatch(command);
      assert(!result.ok&&dispatcher.isReloadRequired()&&messages[0].includes('operation committed'),'missing recovery');const committed=await repo.readInfo();assert(!(await dispatcher.dispatch(command)).ok,'new mutation accepted');assert(JSON.stringify(await repo.readInfo())===JSON.stringify(committed),'blocked mutation wrote');token=committed.token;
    });
    repo.close();backend.close();
    await test('mounted UI retains drafts and blocks Save/Delete/Apply after a lost native acknowledgment; recovery rereads authority',async()=>{
      const {createPersistentPlanningApplication}=await import('/js/main/createPersistentPlanningApplication.js');
      const uiRepo=await openIndexedDbPlanningRepository({factory:indexedDB,name:'audit-ui'});const seed=await uiRepo.stageImport({...state,portfolioSnapshots:[capture('ui-seed')]},'seed');await uiRepo.activateImport(seed,null,'activate');
      document.body.innerHTML='<div id="audit-app"></div>';const root=document.getElementById('audit-app');const app=await createPersistentPlanningApplication(root,{databaseName:'audit-ui'});assert(app,'mount failed');
      const wait=async test=>{for(let i=0;i<300;i++){if(test())return;await new Promise(r=>setTimeout(r,20))}throw Error('UI timeout: '+document.querySelector('.storage-status').textContent)};
      root.querySelector('button[aria-label="Edit planning settings"]').click();const field=root.querySelector('input[name="planning.maxParallelProjects"]');assert(field,'draft field absent');field.value='123';field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));assert(app.hasUnappliedChanges(),'draft not registered');
      const post=BroadcastChannel.prototype.postMessage;BroadcastChannel.prototype.postMessage=function(){throw Error('ack lost')};
      const deleteConfirm=window.confirm;window.confirm=()=>true;try{const remove=root.querySelector('button[aria-label^="Delete snapshot"]');assert(remove,'Delete absent');remove.click();await wait(()=>root.inert&&document.querySelector('.storage-status').textContent.includes('requires recovery'));}finally{BroadcastChannel.prototype.postMessage=post;window.confirm=deleteConfirm}
      assert(field.value==='123'&&app.hasUnappliedChanges(),'draft lost');assert((await uiRepo.readInfo()).snapshotCount===0,'Delete not committed');assert(root.querySelector('.portfolio-snapshot-actions button').disabled,'dirty Save enabled');const persisted=await uiRepo.readInfo();field.closest('form').requestSubmit();await new Promise(r=>setTimeout(r,30));assert(JSON.stringify(await uiRepo.readInfo())===JSON.stringify(persisted),'Apply wrote during recovery');assert(field.value==='123','blocked Apply lost draft');
      const reload=[...document.querySelectorAll('.storage-status button')].find(b=>b.textContent==='Reload planning');assert(reload&&!reload.hidden,'reload absent');const oldConfirm=window.confirm;window.confirm=()=>false;try{reload.click()}finally{window.confirm=oldConfirm}assert(field.value==='123','cancel reload lost draft');
      const fresh=document.createElement('div');document.body.append(fresh);const recovered=await createPersistentPlanningApplication(fresh,{databaseName:'audit-ui'});assert(recovered&&!fresh.inert,'recovery failed');assert(fresh.querySelector('.portfolio-snapshot-actions summary').textContent==='Portfolio snapshots (0)','deleted snapshot reappeared');assert(field.value==='123','old drafts silently replaced');uiRepo.close();
    });
    return {tests:tests.length,passed:tests.length,failed:0,skipped:0,cases:tests};
  })()`);
  console.log(JSON.stringify({browser:browser.product,...result},null,2));
});
