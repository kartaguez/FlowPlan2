// Audit regressions against native IndexedDB, the real worker and the mounted UI.
import { mkdir, writeFile } from 'node:fs/promises';
import { withStorageBrowser } from './storageBrowserHarness.mjs';
await withStorageBrowser(async ({ evaluate, browser, call }) => {
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
    const {decodePlanningInputs,encodeCurrentPlanningInputs}=await import('/js/application/backup/planningInputCodec.js');
    const {projectCurrentBase}=await import('/js/application/session/projectCurrentRaf.js');
    const {remainingWorkloadFromSerialized,consumedWorkloadFromSerialized,createCivilDate,serializeQuantity,snapshotId}=await import('/js/domain/index.js');
    const {exportRepositoryBackup}=await import('/js/application/persistence/repositoryTransfer.js');
    const {decodeFlowplanBackup}=await import('/js/application/backup/flowplanBackupV8.js');
    const valid=result=>{assert(result.ok,JSON.stringify(result));return result.value};
    const makeRafState=()=>{const dto=encodePlanningInputs(state),p=dto.portfolio.projects[0];p.migrationStatus='native';p.requirements.forEach(row=>row.remainingWorkload='1/3');
      p.snapshots=[{snapshotId:snapshotId('project',p.id,1),version:1,knowledgeDate:'2025-01-06',participation:p.requirements.map(row=>row.teamId),retiredZeroTeams:[],raf:p.requirements.map(row=>({teamId:row.teamId,amount:row.remainingWorkload})),coverage:{actualsFrom:'2025-01-01',actualsThrough:'2025-01-02',periods:[{periodId:'original',from:'2025-01-01',through:'2025-01-02',consumed:p.requirements.map(row=>({teamId:row.teamId,amount:'0/1'}))}]}}];return decodePlanningInputs(dto,5,undefined,true)};
    for(const actualsChanged of [false,true])for(const rafChanged of [false,true])await test('11D.1 native R2 '+actualsChanged+'/'+rafChanged,async()=>{
      const name='raf-'+actualsChanged+'-'+rafChanged,rafRepo=await openIndexedDbPlanningRepository({factory:indexedDB,name}),rafState=makeRafState();
      const stage=await rafRepo.stageImport(rafState,'seed');await rafRepo.activateImport(stage,null,'activate');const current=await rafRepo.readCurrent(),session=createPlanningSession(current.state,{today:()=>valid(createCivilDate('2025-01-06'))});let projections=0;
      const dispatcher=createRepositoryPlanningDispatcher({repository:rafRepo,current,session,geometryViewport:viewport,hasUnappliedChanges:()=>false,buildProjection:input=>{projections++;return buildPlanningSessionProjection(input)}});
      const p=session.getState().portfolio.projects[0],old=p.snapshots[0],period=old.coverage.periods[0],command={kind:'replace-project-actuals',projectId:p.id,base:projectCurrentBase(p),baseVersion:1,
        teamRequirements:p.requirements.map(row=>({teamId:row.teamId,...(row.dailyCap?{dailyCap:row.dailyCap}:{})})),current:{participation:old.participation,retiredZeroTeams:[],raf:p.requirements.map((row,i)=>({teamId:row.teamId,amount:rafChanged&&i===0?valid(remainingWorkloadFromSerialized('2/3')):row.remainingWorkload})),coverage:{...old.coverage,periods:[{...period,periodId:actualsChanged?'changed':'original',consumed:period.consumed.map((row,i)=>({...row,amount:actualsChanged&&i===0?valid(consumedWorkloadFromSerialized('1/3')):row.amount}))}]}},
        intent:actualsChanged?{kind:'replace',editedZone:{from:period.from,through:period.through}}:{kind:'raf-only'},evidence:{consumedCells:actualsChanged?[{periodId:'changed',teamId:p.requirements[0].teamId}]:[],rafTeams:[p.requirements[0].teamId]}};
      const before=session.getState(),count=projections;assert((await dispatcher.dispatch(command)).ok,'R2 rejected');const next=await rafRepo.readCurrent();
      assert(projections-count===(actualsChanged||rafChanged?1:0),'projection count');assert(next.token.currentRevision-current.token.currentRevision===(actualsChanged||rafChanged?1:0),'commit count');
      assert(next.state.portfolio.projects[0].snapshots.length===(actualsChanged?2:1),'snapshot count');assert(JSON.stringify(encodePlanningInputs(before).portfolio.projects[0].snapshots[0])===JSON.stringify(encodeCurrentPlanningInputs(next.state).portfolio.projects[0].snapshots[0]),'prefix changed');
      if(!actualsChanged&&rafChanged){const stale=await dispatcher.dispatch({...command,current:{...command.current,raf:next.state.portfolio.projects[0].requirements.map(row=>({teamId:row.teamId,amount:row.remainingWorkload}))}});assert(!stale.ok,'stale RAF base accepted');}
      rafRepo.close();const reopen=await openIndexedDbPlanningRepository({factory:indexedDB,name});assert(JSON.stringify(encodeCurrentPlanningInputs((await reopen.readCurrent()).state))===JSON.stringify(encodeCurrentPlanningInputs(next.state)),'reopen changed');reopen.close();
    });
    await test('11D.1 native mixed inputs1/2, old Current startup, CAS lost, export/import/reopen',async()=>{
      const name='raf-mixed',rafState=makeRafState(),r=await openIndexedDbPlanningRepository({factory:indexedDB,name}),stage=await r.stageImport(rafState,'seed');let t=await r.activateImport(stage,null,'activate');
      const store=await openIndexedDbRepositoryStorage({factory:indexedDB,name}),text=JSON.stringify(encodePlanningInputs(rafState));
      const digest=await sha256(text);await store.transaction(['current'],'readwrite',tx=>tx.put('current',[t.generation],{text,digest}));
      const oldRaw=await store.transaction(['current'],'readonly',tx=>tx.get('current',[t.generation]));await r.readCurrent();assert(JSON.stringify(oldRaw)===JSON.stringify(await store.transaction(['current'],'readonly',tx=>tx.get('current',[t.generation]))),'startup rewrite');
      const run=buildPlanningSessionProjection({state:rafState,geometryViewport:viewport}),modern=capturePortfolioSnapshot(rafState,run.planningResult,run.actualsReconstruction,'modern','2026-10-09T12:00:00.000Z'),legacy=structuredClone(modern);legacy.snapshotId='legacy';legacy.inputsSchemaVersion=1;delete legacy.inputs.rafModelVersion;
      t=await r.createSnapshot(legacy,t.currentRevision,t,'old');t=await r.createSnapshot(modern,t.currentRevision,t,'new');assert(JSON.stringify(oldRaw)===JSON.stringify(await store.transaction(['current'],'readonly',tx=>tx.get('current',[t.generation]))),'Save rewrote old Current');
      const current=await r.readCurrent(),p=current.state.portfolio.projects[0],command={kind:'update-project-current-raf',projectId:p.id,base:projectCurrentBase(p),patch:[{teamId:p.requirements[0].teamId,remainingWorkload:valid(remainingWorkloadFromSerialized('2/3'))}]};
      const a=createRepositoryPlanningDispatcher({repository:r,current,session:createPlanningSession(current.state),geometryViewport:viewport,hasUnappliedChanges:()=>false});
      const second=await openIndexedDbPlanningRepository({factory:indexedDB,name}),b=createRepositoryPlanningDispatcher({repository:second,current,session:createPlanningSession(current.state),geometryViewport:viewport,hasUnappliedChanges:()=>false});
      assert((await a.dispatch(command)).ok,'A failed');assert(!(await b.dispatch(command)).ok&&b.isReloadRequired(),'CAS loser published');
      const latest=await r.readCurrent();assert(JSON.stringify(await r.readSnapshot('legacy',latest.token))===JSON.stringify(legacy),'old capture changed');
      const exported=(await exportRepositoryBackup(r)).join(''),dataset=decodeFlowplanBackup(exported);assert(dataset.portfolioSnapshots.map(s=>s.inputsSchemaVersion).sort().join()==='1,2','mixed export');
      const imported=await openIndexedDbPlanningRepository({factory:indexedDB,name:'raf-reimport'}),job=await imported.stagePortableDocument(exported,'import');await imported.activateImport(job,null,'activate');const reopened=await imported.readCurrent();assert(serializeQuantity(reopened.state.portfolio.projects[0].requirements[0].remainingWorkload)==='2/3','RAF lost');assert(JSON.stringify(await imported.readSnapshot('legacy',reopened.token))===JSON.stringify(legacy),'legacy input normalized');
      second.close();r.close();store.close();imported.close();
    });
    const {buildProjectSnapshotActualsViewModel}=await import('/js/application/session/snapshotActualsViewModel.js');
    const {createSnapshotActualsDraftStore}=await import('/js/ui/actuals/snapshotActualsDraftStore.js');
    const {createSnapshotActualsCardController}=await import('/js/ui/actuals/createSnapshotActualsCardController.js');
    for(const actualsChanged of [false,true])for(const rafChanged of [false,true])await test('11D.1 native Update Actuals modal R2 '+actualsChanged+'/'+rafChanged,async()=>{
      const r=await openIndexedDbPlanningRepository({factory:indexedDB,name:'modal-'+actualsChanged+'-'+rafChanged}),s=makeRafState(),job=await r.stageImport(s,'seed');await r.activateImport(job,null,'activate');
      const current=await r.readCurrent(),session=createPlanningSession(current.state,{today:()=>valid(createCivilDate('2025-01-06'))}),dispatcher=createRepositoryPlanningDispatcher({repository:r,current,session,geometryViewport:viewport,hasUnappliedChanges:()=>false});
      const p=session.getState().portfolio.projects[0],model=buildProjectSnapshotActualsViewModel(session.getState(),p.id),store=createSnapshotActualsDraftStore(),base=store.initialize(model);
      const teams=base.teams.map((row,i)=>({...row,raf:rafChanged&&i===0?'2/3':row.raf,rafConfirmed:i===0}));
      const periods=base.periods.map(row=>({...row,values:row.values.map((cell,i)=>({...cell,text:actualsChanged&&i===0?'1/3':cell.text,provenance:actualsChanged&&i===0?'user-entered':cell.provenance}))}));
      store.update(p.id,{...base,modal:{step:3,selection:{from:0,through:0},periods,teams,confirmed:true,retirementConfirmed:false,anchor:0}});
      const host=document.createElement('div');document.body.append(host);let result;const controller=createSnapshotActualsCardController({host,model,store,onDraftChange:()=>{},conflict:()=>undefined,onApply:async command=>{result=await dispatcher.dispatch(command);return result}});
      const modal=document.querySelector('.card-actuals-modal:not([hidden])');assert(modal,'modal absent');modal.querySelector('form').requestSubmit();
      for(let i=0;i<300&&!result;i++)await new Promise(resolve=>setTimeout(resolve,10));assert(result&&result.ok,'modal failed');
      const next=await r.readCurrent();assert(next.state.portfolio.projects[0].snapshots.length===(actualsChanged?2:1),'modal created wrong versions');assert(next.token.currentRevision-current.token.currentRevision===(actualsChanged||rafChanged?1:0),'modal commits');
      controller.destroy();host.remove();r.close();
    });
    for(const uncertain of [false,true])await test('11D.1 native RAF '+(uncertain?'ack lost / recovery':'abort / explicit retry'),async()=>{
      const name='raf-outcome-'+uncertain,r=await openIndexedDbPlanningRepository({factory:indexedDB,name}),job=await r.stageImport(makeRafState(),'seed');await r.activateImport(job,null,'activate');
      const current=await r.readCurrent(),session=createPlanningSession(current.state),p=current.state.portfolio.projects[0],command={kind:'update-project-current-raf',projectId:p.id,base:projectCurrentBase(p),patch:[{teamId:p.requirements[0].teamId,remainingWorkload:valid(remainingWorkloadFromSerialized('2/3'))}]};let fail=true;
      const native=await openIndexedDbRepositoryStorage({factory:indexedDB,name,onCommit:()=>{if(uncertain&&fail)throw Error('ack lost')}});
      const port=createPlanningRepository({close:()=>native.close(),transaction:(stores,mode,body)=>native.transaction(stores,mode,async tx=>{const result=await body(tx);if(!uncertain&&fail&&mode==='readwrite')throw Error('native abort');return result})},sha256);
      const dispatcher=createRepositoryPlanningDispatcher({repository:port,current,session,geometryViewport:viewport,hasUnappliedChanges:()=>false}),before=session.getState(),projection=dispatcher.getProjection();
      assert(!(await dispatcher.dispatch(command)).ok,'failure absent');assert(session.getState()===before&&dispatcher.getProjection()===projection,'failed publish');assert(dispatcher.isReloadRequired()===uncertain,'wrong recovery');
      const persisted=await r.readCurrent();assert(persisted.token.currentRevision-current.token.currentRevision===(uncertain?1:0),'wrong outcome');fail=false;
      if(uncertain){assert(!(await dispatcher.dispatch(command)).ok,'uncertain retried');const recovered=createPlanningSession(persisted.state);assert(serializeQuantity(recovered.getState().portfolio.projects[0].requirements[0].remainingWorkload)==='2/3','recovery lost RAF')}
      else assert((await dispatcher.dispatch(command)).ok,'explicit retry rejected');native.close();r.close();
    });
    window.rafReviewState=makeRafState();
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
  const review = await evaluate(`(async()=>{
    const {openIndexedDbPlanningRepository}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const {createPersistentPlanningApplication}=await import('/js/main/createPersistentPlanningApplication.js');
    const r=await openIndexedDbPlanningRepository({factory:indexedDB,name:'raf-review'}),job=await r.stageImport(window.rafReviewState,'seed');await r.activateImport(job,null,'activate');
    const viewportMeta=document.createElement('meta');viewportMeta.name='viewport';viewportMeta.content='width=device-width, initial-scale=1';document.head.append(viewportMeta);
    const style=document.createElement('link');style.rel='stylesheet';style.href='/styles.css';document.head.append(style);await new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject});
    document.body.innerHTML='<div id="raf-review-app"></div>';const root=document.getElementById('raf-review-app'),app=await createPersistentPlanningApplication(root,{databaseName:'raf-review'});
    const wait=async test=>{for(let i=0;i<300;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,10))}throw Error('review timeout')};
    const buttons=[...root.querySelectorAll('button[aria-label^="Toggle project "]')];buttons[0].click();buttons[1].click();
    const cards=[...root.querySelectorAll('.portfolio-card-content')].filter(card=>card.querySelector('[data-raf-team]'));if(cards.length<2)throw Error('cards missing');
    const a=cards[0].querySelector('[data-raf-team]'),b=cards[1].querySelector('[data-raf-team]');a.value='2/3';a.dispatchEvent(new Event('input',{bubbles:true}));b.value='1/';b.dispatchEvent(new Event('input',{bubbles:true}));
    const before=await r.readCurrent();cards[0].querySelector('form').requestSubmit();await wait(()=>!root.inert);
    await wait(()=>root.querySelector('[data-raf-team]')?.value==='2/3');const after=await r.readCurrent();
    if(after.token.currentRevision!==before.token.currentRevision+1||after.state.portfolio.projects[0].snapshots.length!==1)throw Error('quick RAF created Actuals');
    if(![...root.querySelectorAll('[data-raf-team]')].some(field=>field.value==='1/')||!app.hasUnappliedChanges())throw Error('other card draft lost');
    const history=after.state.portfolio.projects[0].snapshots[0].raf[0].amount;const {serializeQuantity}=await import('/js/domain/index.js');if(serializeQuantity(history)!=='1/3')throw Error('historic RAF changed');
    r.close();return {multipleDirtyCardsPreserved:true,currentRAF:'2/3',historicalRAF:'1/3',snapshots:1};
  })()`);
  const layouts=[];await mkdir('/private/tmp/flowplan11d1-review',{recursive:true});
  for(const width of [1440,390]){await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const field=document.querySelector('#raf-review-app [data-raf-team]');const history=field.closest('.card-actuals').querySelector('details');if(history)history.open=true;field.scrollIntoView({block:'center'});resolve()})))`);
    layouts.push(await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})'));
    const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/flowplan11d1-review/planning-'+width+'.png',Buffer.from(shot.data,'base64'));
  }
  console.log(JSON.stringify({review,layouts}));
  console.log(JSON.stringify({browser:browser.product,...result},null,2));
});
