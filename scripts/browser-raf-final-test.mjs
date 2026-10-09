// Final V1/V2 regressions: production editor, dispatcher and native IndexedDB.
import { withStorageBrowser } from './storageBrowserHarness.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
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
          const beforeReview=session.getState();button('Review current Actuals / RAF');assert(!store.get(p.id).stale,'review failed');
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

// 11D.1 A gate: browser timings, complete exact output and RAM-only draft costs.
await withStorageBrowser(async({evaluate,browser,call})=>{const before=await call('Runtime.getHeapUsage');const result=await evaluate(`(async()=>{
const {parseExactQuantityInput}=await import('/js/application/session/editableQuantity.js');
const {formatActualsQuantity,formatActualsRational}=await import('/js/application/session/formatActualsQuantity.js');
const {remainingWorkloadFromSerialized,quantityToDecimalString,parseSerializedRational,addRationals,rationalFromInteger,rationalToCanonicalString,rationalOf}=await import('/js/domain/index.js');
const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
const {buildProjectSnapshotActualsViewModel}=await import('/js/application/session/snapshotActualsViewModel.js');
const {createSnapshotActualsDraftStore}=await import('/js/ui/actuals/snapshotActualsDraftStore.js');
const createRational=(n,d)=>parseSerializedRational(n+'/'+d);
const median=(fn)=>{fn();let times=[];for(let i=0;i<7;i++){let t=performance.now();fn();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[3]};
const rows=[];for(const n of [16,100,1000,10000]){const text='0,'+'1'.repeat(n),canonical=parseExactQuantityInput(text),q=remainingWorkloadFromSerialized(canonical).value;const finite=createRational(1n,2n**BigInt(n)).value,nonfinite=createRational(1n,(2n**BigInt(n))*3n).value;
if(formatActualsQuantity(q)!==text)throw Error('round-trip');
const state=createDemoPlanningScenario(),base=buildProjectSnapshotActualsViewModel(state,state.portfolio.projects[0].id),model={...base,teams:Array.from({length:40},(_,i)=>({...base.teams[0],teamId:'perf-'+i,label:'Team '+i,participating:true,forecastRaf:q})),currentBase:{...base.currentBase,requirements:Array.from({length:40},(_,i)=>({teamId:'perf-'+i,raf:canonical}))}};
const store=createSnapshotActualsDraftStore();store.initialize(model);const draft=store.get(model.id);store.update(model.id,{...draft,teams:draft.teams.map((row,i)=>i===0?{...row,raf:text+'2'}:row)});
let sum;const distinct=[3n,7n,11n,13n,17n,19n,23n,29n,31n,37n].map(prime=>createRational(1n,(2n**BigInt(n))*prime).value);const inputs=[];for(let i=0;i<40;i++){let input=document.createElement('input');input.type='text';document.body.append(input);inputs.push(input)}
const dirtyMs=median(()=>store.isDirty(model.id)),unchangedRebaseMs=median(()=>store.rebase(model));
let remoteCounter=2;const rebaseMs=median(()=>{const remote=remainingWorkloadFromSerialized((remoteCounter++)+'/1').value;store.rebase({...model,teams:model.teams.map((row,i)=>i===39?{...row,forecastRaf:remote}:row),currentBase:{...model.currentBase,requirements:model.currentBase.requirements.map((row,i)=>i===39?{...row,raf:rationalToCanonicalString({numerator:BigInt(remoteCounter-1),denominator:1n})}:row)}})});
let t=performance.now();inputs[0].value=text+'2';inputs[0].dispatchEvent(new Event('input'));store.isDirty(model.id);const typingMs=performance.now()-t;
const frameStart=performance.now();await new Promise(requestAnimationFrame);const frameDelayMs=performance.now()-frameStart;
rows.push({n,parseMs:median(()=>parseExactQuantityInput(text)),domainRenderMs:median(()=>quantityToDecimalString(q)),exactRenderMs:median(()=>formatActualsRational(rationalOf(q))),warmRenderMs:median(()=>formatActualsQuantity(q)),finiteFractionMs:median(()=>formatActualsRational(finite)),nonfiniteFractionMs:median(()=>formatActualsRational(nonfinite)),multiTeamSumMs:median(()=>{sum=rationalFromInteger(0n);for(let i=0;i<40;i++)sum=addRationals(sum,i%2?finite:nonfinite);formatActualsRational(sum)}),distinctDenominatorSumMs:median(()=>{sum=rationalFromInteger(0n);for(let i=0;i<40;i++)sum=addRationals(sum,distinct[i%distinct.length]);formatActualsRational(sum)}),render40InputsColdMs:median(()=>{for(const input of inputs)input.value=formatActualsRational(rationalOf(q))}),render40InputsMs:median(()=>{for(const input of inputs)input.value=formatActualsQuantity(q)}),dirtyMs,unchangedRebaseMs,rebaseMs,typingMs,frameDelayMs,outputLength:text.length});inputs.forEach(input=>input.remove());}
return rows})()`);const after=await call('Runtime.getHeapUsage');console.log(JSON.stringify({gate:"11D.1 exact numeric performance",browser,iterations:7,median:true,rows:result,heap:{before,after,deltaUsed:after.usedSize-before.usedSize}},null,2))});

// 11D.1 UX: real mounted card forms, sequencing, owner cancellation, new Team,
// exact long input publication and keyboard scope in an isolated native depot.
await withStorageBrowser(async ({evaluate,browser,call}) => {
  const scenarios=await evaluate(`(async()=>{
    const {openIndexedDbPlanningRepository}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
    const {createPersistentPlanningApplication}=await import('/js/main/createPersistentPlanningApplication.js');
    const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
    const {serializeQuantity}=await import('/js/domain/index.js');
    const {parseExactQuantityInput}=await import('/js/application/session/editableQuantity.js');
    const assert=(value,message)=>{if(!value)throw Error(message)}, results=[];
    const style=document.createElement('link');style.rel='stylesheet';style.href='/styles.css';document.head.append(style);await new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject});
    for(const order of ['RAF-Forecast','Forecast-RAF','new-Team','long-decimal']){
      const repository=await openIndexedDbPlanningRepository({factory:indexedDB,name:'ux-'+order});
      const seed=createDemoPlanningScenario(),stage=await repository.stageImport(seed,'seed');await repository.activateImport(stage,null,'activate');
      const root=document.createElement('div');document.body.append(root);const app=await createPersistentPlanningApplication(root,{databaseName:'ux-'+order});assert(app,'mount failed');
      try {
        const wait=async test=>{for(let i=0;i<500;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,10))}throw Error('UX timeout '+order)};
        const projectButtons=[...root.querySelectorAll('button[aria-label^="Toggle project "]')];projectButtons[0].click();projectButtons[1].click();
        const cards=()=>[...root.querySelectorAll('.portfolio-card-content')].filter(node=>node.querySelector('[data-raf-team]'));
        const card=()=>cards()[0],other=()=>cards()[1],field=()=>card().querySelector('[data-raf-team]'),name=()=>card().querySelector('[name="project.name"]');
        const input=(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}))};
        const button=(host,text)=>{const node=[...host.querySelectorAll('button')].find(node=>node.textContent===text&&!node.hidden);assert(node,'missing '+text);node.click()};
        const before=await repository.readCurrent(),initial=before.state.portfolio.projects[0];
        assert(card().querySelectorAll('.card-actuals table tr:first-child th').length===3,'summary columns');
        assert(!card().querySelector('[name="requirements.'+initial.requirements[0].teamId+'.remainingWorkload"]'),'duplicate published RAF input');
        assert(card().querySelector('.card-actuals-host').closest('form')===card().querySelector('form'),'stable host outside fields');
        assert(!card().querySelector('form form'),'nested forms');
        input(other().querySelector('[data-raf-team]'),'1/');
        if(order==='new-Team') {
          const toggle=card().querySelector('input[aria-label="Project enabled for Team Gamma"]');toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));
          const initialRaf=card().querySelector('[name="requirements.team-gamma.remainingWorkload"]');assert(initialRaf,'initial RAF absent');input(initialRaf,'0,00001');
          card().querySelector('form').requestSubmit();await wait(()=>!root.inert&&card().querySelector('[data-raf-team="team-gamma"]'));
          const after=await repository.readCurrent();assert(serializeQuantity(after.state.portfolio.projects[0].requirements.find(row=>row.teamId==='team-gamma').remainingWorkload)==='1/100000','initial RAF lost');
          assert(!card().querySelector('[name="requirements.team-gamma.remainingWorkload"]'),'new member retains duplicate');assert(!after.state.portfolio.projects[0].snapshots?.length,'new Team invented Actuals');
          assert(after.token.currentRevision===before.token.currentRevision+1,'new Team counts');
          results.push({scenario:order,pass:true,commits:1});continue;
        }
        if(order==='long-decimal') {
          const raw='0,'+'1'.repeat(10000),canonical=parseExactQuantityInput(raw);const t=performance.now();input(field(),raw);const inputMs=performance.now()-t;
          field().focus();field().dispatchEvent(new Event('blur'));assert(field().value===raw,'raw changed at focus/blur');
          const frameStart=performance.now();await new Promise(requestAnimationFrame);const frameDelayMs=performance.now()-frameStart;
          const start=performance.now();card().querySelector('form').requestSubmit();await wait(()=>!root.inert&&field().value===raw);
          await wait(()=>!card().querySelector('.portfolio-card--dirty'));
          const after=await repository.readCurrent(),applyMs=performance.now()-start;
          assert(after.token.currentRevision===before.token.currentRevision+1,'long RAF not committed');assert(serializeQuantity(after.state.portfolio.projects[0].requirements[0].remainingWorkload)===canonical,'long value changed');
          assert(!after.state.portfolio.projects[0].snapshots?.length,'long RAF invented snapshot');assert(field().value.length===10002,'long rendering truncated');
          results.push({scenario:order,pass:true,inputMs,frameDelayMs,applyMs,length:raw.length,commits:1});continue;
        }
        const changeRaf=()=>input(field(),'0,00001'),changeForecast=()=>input(name(),'Local Forecast');
        if(order==='RAF-Forecast'){changeRaf();changeForecast()}else{changeForecast();changeRaf()}
        card().querySelector('form').requestSubmit();await new Promise(resolve=>setTimeout(resolve,30));
        assert((await repository.readCurrent()).token.currentRevision===before.token.currentRevision,'sequencing published');
        assert(field().value==='0,00001'&&name().value==='Local Forecast','refusal lost draft');
        const tabs=[...root.querySelectorAll('[role="tab"]')];if(tabs.length>=2){tabs[1].click();tabs[0].click()}
        button(card(),'Update actuals');const modal=document.querySelector('.card-actuals-modal:not([hidden])');assert(modal,'modal missing');
        assert(field().disabled,'card RAF editable while modal owns branch');
        const first=modal.querySelector('input:not([disabled])'),cancel=[...modal.querySelectorAll('button')].find(node=>node.textContent==='Cancel modal');
        cancel.focus();modal.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert(modal.contains(document.activeElement),'focus escaped modal');
        modal.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert(modal.hidden,'Escape failed');
        assert(field().value==='0,00001'&&name().value==='Local Forecast','Cancel modal lost card');
        assert((await repository.readCurrent()).token.currentRevision===before.token.currentRevision,'modal navigation wrote');
        // Card Cancel abandons this card only. Another card remains dirty/raw.
        button(card(),'Cancel card');assert(name().value===initial.name,'card Cancel lost scope');
        assert(field().value==='55','card Cancel did not restore published RAF');assert(other().querySelector('[data-raf-team]').value==='1/','other draft lost');
        // Forecast publication cannot implicitly apply or confirm RAF. Sequence
        // two explicit transactions, then ensure a repeated RAF Apply is a no-op.
        input(name(),'Published Forecast');card().querySelector('form').requestSubmit();await wait(()=>!root.inert&&name().value==='Published Forecast');
        input(field(),'0,00001');card().querySelector('form').requestSubmit();await wait(()=>!root.inert&&field().value==='0,00001');
        const after=await repository.readCurrent();assert(after.token.currentRevision===before.token.currentRevision+2,'sequenced commit count');assert(!after.state.portfolio.projects[0].snapshots?.length,'sequencing invented Actuals');
        assert(serializeQuantity(after.state.portfolio.projects[0].requirements[0].remainingWorkload)==='1/100000','RAF lost');
        card().querySelector('form').requestSubmit();await new Promise(resolve=>setTimeout(resolve,30));assert((await repository.readCurrent()).token.currentRevision===after.token.currentRevision,'RAF applied twice');
        assert(other().querySelector('[data-raf-team]').value==='1/'&&app.hasUnappliedChanges(),'other owner cleaned');
        results.push({scenario:order,pass:true,commits:2,modalCancelPreservesCard:true,cardCancelScoped:true,repeatNoOp:true,focusContained:true});
      } finally {if(order==='long-decimal'){window.uxReviewApp=app;window.uxReviewRoot=root}else{app.destroy();root.remove()}repository.close()}
    }
    return results;
  })()`);
  const layouts=[];
  await mkdir('/private/tmp/flowplan11d1-ux-review',{recursive:true});
  for(const width of [1440,390]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>{window.uxReviewRoot.querySelector('[data-raf-team]').scrollIntoView({block:'center'});window.uxReviewRoot.querySelector('.card-actuals-matrix-scroll').scrollLeft=0;resolve()}))`);
    layouts.push(await evaluate(`({surface:'long-card',width:innerWidth,scrollWidth:document.documentElement.scrollWidth,valueLength:window.uxReviewRoot.querySelector('[data-raf-team]').value.length})`));
    let shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/flowplan11d1-ux-review/long-card-'+width+'.png',Buffer.from(shot.data,'base64'));
    await evaluate(`[...window.uxReviewRoot.querySelectorAll('button')].find(node=>node.textContent==='Update actuals').click()`);
    layouts.push(await evaluate(`({surface:'modal',width:innerWidth,scrollWidth:document.documentElement.scrollWidth,formsInCard:window.uxReviewRoot.querySelector('form form')!==null})`));
    shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/flowplan11d1-ux-review/modal-'+width+'.png',Buffer.from(shot.data,'base64'));
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    const trapped=await evaluate(`document.querySelector('.card-actuals-modal:not([hidden])').contains(document.activeElement)`);if(!trapped)throw Error('Native Tab escaped');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    const restored=await evaluate(`document.activeElement.textContent==='Update actuals'&&!document.querySelector('.card-actuals-modal:not([hidden])')&&window.uxReviewRoot.querySelector('[data-raf-team]').value.length===10002`);if(!restored)throw Error('Native Escape did not restore focus/raw');
  }
  if(layouts.some(row=>row.width!==row.scrollWidth||row.formsInCard))throw Error('UX overflow or nested forms');
  await evaluate(`window.uxReviewApp.destroy();window.uxReviewRoot.remove()`);
  console.log(JSON.stringify({gate:'11D.1 mounted UX',browser,scenarios,layouts,nativeKeyboard:{tabContained:true,escapeRestoresFocusAndRaw:true}},null,2));
});
