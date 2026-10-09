// Final V1/V2 regressions: production editor, dispatcher and native IndexedDB.
import { withStorageBrowser } from './storageBrowserHarness.mjs';
await withStorageBrowser(async ({ evaluate, browser }) => {
  const scenarios = await evaluate(`(async () => {
    const {openIndexedDbPlanningRepository}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
    const {encodePlanningInputs,decodePlanningInputs}=await import('/js/application/backup/planningInputCodec.js');
    const {createPlanningSession}=await import('/js/application/session/planningSession.js');
    const {projectCurrentBase}=await import('/js/application/session/projectCurrentRaf.js');
    const {buildProjectSnapshotActualsViewModel}=await import('/js/application/session/snapshotActualsViewModel.js');
    const {createSnapshotActualsDraftStore}=await import('/js/ui/actuals/snapshotActualsDraftStore.js');
    const {createSnapshotActualsCardController}=await import('/js/ui/actuals/createSnapshotActualsCardController.js');
    const {createRepositoryPlanningDispatcher}=await import('/js/main/planning/createRepositoryPlanningDispatcher.js');
    const {buildPlanningSessionProjection}=await import('/js/main/planning/buildPlanningSessionProjection.js');
    const {snapshotId,remainingWorkloadFromSerialized}=await import('/js/domain/index.js');
    const assert=(value,message)=>{if(!value)throw Error(message)}, valid=result=>{assert(result.ok,'invalid fixture');return result.value};
    const results=[];
    for(const scenario of ['open','period-restored','consumption-restored','split-undone','merge-undone','equivalent','consumption-real','concurrent-A','concurrent-B','equivalent-raf-proof','numeric-raf-proof']) {
      const dto=encodePlanningInputs(createDemoPlanningScenario()),p=dto.portfolio.projects[0];
      p.requirements.forEach(row=>row.remainingWorkload='1/3');p.migrationStatus='native';
      const periods=(scenario==='merge-undone'?['2025-01-01','2025-01-02']:scenario==='period-restored'?['2025-01-01','2025-01-03']:['2025-01-01']).map((from,i)=>({periodId:'original-'+i,from,through:scenario==='merge-undone'?from:scenario==='period-restored'&&i===1?'2025-01-04':'2025-01-02',consumed:p.requirements.map(row=>({teamId:row.teamId,amount:'0/1'}))}));
      p.snapshots=[{snapshotId:snapshotId('project',p.id,1),version:1,knowledgeDate:'2025-01-06',participation:p.requirements.map(row=>row.teamId),retiredZeroTeams:[],raf:p.requirements.map(row=>({teamId:row.teamId,amount:row.remainingWorkload})),coverage:{actualsFrom:'2025-01-01',actualsThrough:periods.at(-1).through,periods}}];
      const repository=await openIndexedDbPlanningRepository({factory:indexedDB,name:'final-'+scenario});
      let controller,host;
      try {
        const stage=await repository.stageImport(decodePlanningInputs(dto,5,undefined,true),'seed');await repository.activateImport(stage,null,'activate');
        const current=await repository.readCurrent(),session=createPlanningSession(current.state,{today:()=> '2025-01-06'});let projections=0,writes=0;
        const observed=new Proxy(repository,{get(target,key){if(key==='writeCurrent')return async(...args)=>{writes++;return target.writeCurrent(...args)};return target[key]}});
        const dispatcher=createRepositoryPlanningDispatcher({repository:observed,current,session,geometryViewport:{width:1000,teamLaneHeight:100,timeAxisHeight:76},hasUnappliedChanges:()=>false,buildProjection:input=>{projections++;return buildPlanningSessionProjection(input)}});
        const store=createSnapshotActualsDraftStore(),model=()=>buildProjectSnapshotActualsViewModel(session.getState(),p.id);
        host=document.createElement('div');document.body.append(host);let result;
        const mount=()=>{controller=createSnapshotActualsCardController({host,model:model(),store,onDraftChange:()=>{},conflict:()=>undefined,onApply:async command=>{result=await dispatcher.dispatch(command);return result}})};
        mount();
        const button=text=>{const found=[...document.querySelectorAll('button')].find(node=>node.textContent===text&&!node.hidden);assert(found,'missing button '+text);found.click()};
        const field=(text,value)=>{const label=[...document.querySelectorAll('.card-actuals-modal label')].find(node=>node.textContent===text);assert(label,'missing field '+text);const input=label.querySelector('input');input.value=value;input.dispatchEvent(new Event(input.type==='date'?'blur':'input'))};
        const check=text=>{const label=[...document.querySelectorAll('.card-actuals-modal label')].find(node=>node.textContent.startsWith(text));assert(label,'missing checkbox '+text);const input=label.querySelector('input');input.checked=true;input.dispatchEvent(new Event('change'))};
        const submit=async()=>{result=undefined;document.querySelector('.card-actuals-modal form').requestSubmit();for(let i=0;i<300&&!result;i++)await new Promise(resolve=>setTimeout(resolve,10));assert(result,'submit timeout');return result};
        button('Update actuals');
        // Select all original periods through the real frieze.
        for(const tile of [...document.querySelectorAll('.card-actuals-frieze-tile')].slice(1,-1))tile.click();
        button('Next');
        if(scenario==='split-undone'||scenario==='merge-undone') {
          if(scenario==='merge-undone')button('Merge with next');
          button('Split at date');const split=document.querySelector('input[aria-label^="Split "]');split.value='2025-01-02';button('Confirm split');
          if(scenario==='split-undone')button('Merge with next');
        }
        if(scenario==='period-restored'){field('Through','2025-01-01');field('Through','2025-01-02')}
        if(['consumption-restored','equivalent','consumption-real','concurrent-A','concurrent-B','equivalent-raf-proof','numeric-raf-proof'].includes(scenario)){
          field(p.requirements[0].teamId+' consumed','1/3');
          if(scenario==='consumption-restored'||scenario==='equivalent')field(p.requirements[0].teamId+' consumed',scenario==='equivalent'?'0/7':'0/1');
        }
        button('Next');
        const label=model().teams.find(row=>row.teamId===p.requirements[0].teamId).label;
        if(['consumption-real','concurrent-A','concurrent-B'].includes(scenario))check('Confirm '+label+' RAF');
        if(scenario.endsWith('-raf-proof')) {
          field(label+' RAF (exact)',scenario==='equivalent-raf-proof'?'2/6':'2/3');
          const beforeProof=session.getState();assert(!(await submit()).ok,'typing minted RAF confirmation');assert(session.getState()===beforeProof,'proof refusal mutated state');
          check('Confirm '+label+' RAF');
        }
        if(scenario.startsWith('concurrent-')) {
          const index=scenario==='concurrent-A'?0:1,project=session.getState().portfolio.projects[0];
          assert((await dispatcher.dispatch({kind:'update-project-current-raf',projectId:p.id,base:projectCurrentBase(project),patch:[{teamId:p.requirements[index].teamId,remainingWorkload:valid(remainingWorkloadFromSerialized('2/3'))}]})).ok,'concurrent RAF failed');
          store.rebase(model());controller.destroy();host.replaceChildren();mount();
          const beforeReview=session.getState();button('Review new snapshot');assert(!store.get(p.id).stale,'review failed');
          assert(store.get(p.id).modal.periods[0].values.find(row=>row.teamId===p.requirements[0].teamId).text==='1/3','local consumed lost');
          if(index===0){assert(!(await submit()).ok,'stale confirmation published');assert(session.getState()===beforeReview,'refusal mutated state');assert(store.get(p.id).modal,'draft lost');check('Confirm '+label+' RAF')}
        }
        const before=session.getState(),count=projections,writeCount=writes,token=(await repository.readCurrent()).token;
        assert((await submit()).ok,'Apply refused');
        const next=await repository.readCurrent(),changed=['consumption-real','concurrent-A','concurrent-B','equivalent-raf-proof','numeric-raf-proof'].includes(scenario);
        assert(projections-count===(changed?1:0),'projection count');assert(writes-writeCount===(changed?1:0),'write count');assert(next.token.currentRevision-token.currentRevision===(changed?1:0),'transaction count');
        const published=next.state.portfolio.projects[0];assert(published.snapshots.length===(changed?2:1),'snapshot count');
        if(!changed){assert(session.getState()===before,'no-op state changed');assert(published.snapshots[0].coverage.periods.map(row=>row.periodId).join()===periods.map(row=>row.periodId).join(),'IDs changed')}
        else {const latest=encodePlanningInputs(next.state).portfolio.projects[0].snapshots.at(-1);assert(latest.coverage.periods[0].consumed.find(row=>row.teamId===p.requirements[0].teamId).amount==='1/3','published consumed wrong');if(scenario.startsWith('concurrent-'))assert(latest.raf[scenario==='concurrent-A'?0:1].amount==='2/3','published RAF wrong')}
        results.push({scenario,pass:true,projections:projections-count,writes:writes-writeCount});
      } finally {controller?.destroy();host?.remove();repository.close()}
    }
    return results;
  })()`);
  console.log(JSON.stringify({browser,scenarios},null,2));
});
