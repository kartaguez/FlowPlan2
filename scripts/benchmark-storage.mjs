// Run after npm run build: node scripts/benchmark-storage.mjs [--output=report.json]
// Validated synthetic historical artifacts; actual Current engine parity is checked separately.
import { writeFile } from "node:fs/promises";
import { withStorageBrowser } from "./storageBrowserHarness.mjs";
const output = process.argv.find(argument => argument.startsWith("--output="))?.slice(9);
await withStorageBrowser(async ({ call, evaluate, browser, startMemorySampling }) => {
  await call("HeapProfiler.enable");
  const reports = [];
  for (const [S, P, D, T, R] of [[5,20,365,3,8],[25,100,730,5,30],[100,200,1095,8,80]]) {
    console.log(`Benchmark ${S} snapshots / ${P} Projects / ${D} days / ${T} Teams / ${R} Reservations…`);
    const stopMemorySampling = await startMemorySampling();
    const report = await evaluate(`(async()=>{
      const {openIndexedDbPlanningRepository}=await import('/js/infrastructure/persistence/indexedDbRepositoryStorage.js');
      const {createIndexedDbHistoryScratch}=await import('/js/infrastructure/persistence/indexedDbHistoryScratch.js');
      const {createDemoPlanningScenario}=await import('/js/main/demo/createDemoPlanningScenario.js');
      const {encodePlanningInputs,decodePlanningInputs}=await import('/js/application/backup/planningInputCodec.js');
      const {capturePortfolioSnapshot}=await import('/js/application/portfolioSnapshots/capturePortfolioSnapshot.js');
      const {createCivilDate,addDays,civilDatesInclusive}=await import('/js/domain/model/date.js');
      const {capacityFromSerialized,serializeQuantity}=await import('/js/domain/model/scalars.js');
      const {createRational,rationalToCanonicalString}=await import('/js/domain/model/rational.js');
      const {createRepositoryHistoryReader}=await import('/js/application/history/repositoryHistoryReader.js');
      const {computeLazyHistoryVisualCap}=await import('/js/adapters/history/geometry/computeLazyHistoryVisualCap.js');
      const {buildPlanningSessionProjection}=await import('/js/main/planning/buildPlanningSessionProjection.js');
      const {exportRepositoryBackup}=await import('/js/application/persistence/repositoryTransfer.js');
      const {sha256}=await import('/js/infrastructure/persistence/fingerprint.js');
      const counts={snapshots:${S},projects:${P},days:${D},teams:${T},reservations:${R}};
      const dto=encodePlanningInputs(createDemoPlanningScenario()), prototype=dto.portfolio.projects[0];
      dto.planning.startDate='2025-01-01';dto.planning.endDate=addDays(createCivilDate(dto.planning.startDate).value,counts.days-1).value;
      dto.planning.workingWeekdays=[1,2,3,4,5,6,7];dto.planning.maxParallelProjects=counts.projects;
      dto.portfolio.teams=Array.from({length:counts.teams},(_,i)=>({id:'volume-team-'+i,name:'Volume Team '+i,capacitySchedule:{periods:[{start:dto.planning.startDate,end:dto.planning.endDate,dailyCapacity:'250/1'}],exceptions:[]}}));
      const dates=civilDatesInclusive(dto.planning.startDate,dto.planning.endDate).filter((_,i)=>i%5===0);
      const workload=rationalToCanonicalString(createRational(BigInt(dates.length),2n).value);
      dto.portfolio.projects=Array.from({length:counts.projects},(_,i)=>({id:'volume-project-'+i,name:'Volume Project '+i,isActive:true,migrationStatus:'none',ownColor:'#4466AA',requirements:dto.portfolio.teams.map(t=>({teamId:t.id,remainingWorkload:workload,dailyCap:'1/2'}))}));
      dto.portfolio.priorityOrder=dto.portfolio.projects.map(p=>p.id);dto.portfolio.programs=[];dto.portfolio.priorityFamilies=[];
      dto.portfolio.reservations=Array.from({length:counts.reservations},(_,i)=>({id:'volume-reservation-'+i,name:'Volume Reservation '+i,isActive:true,migrationStatus:'none',ownColor:'#557799',startDate:addDays(createCivilDate(dto.planning.startDate).value,(i*17)%(counts.days-30)).value,endDate:addDays(createCivilDate(dto.planning.startDate).value,(i*17)%(counts.days-30)+29).value,teamAllocations:dto.portfolio.teams.map(t=>({teamId:t.id,amount:i%2?{kind:'ratio',ratio:'1/1000'}:{kind:'fixed-daily',dailyCapacity:'1/3'}}))}));
      const historical=decodePlanningInputs(dto,5,undefined,true), allocations=dates.map(date=>({date,workload:capacityFromSerialized('1/2').value}));
      const published={diagnostics:[],teamPlans:historical.portfolio.teams.map(t=>({teamId:t.id,dayCapacities:[],dayAdmissions:[],projectPlans:historical.portfolio.projects.map(p=>({projectId:p.id,teamId:t.id,allocations,complete:true,projectedEndDate:dates.at(-1)}))}))};
      const template=capturePortfolioSnapshot(historical,published,{contributions:[],teamDayTotals:[]},'template','2026-10-08T10:00:00.000Z');
      const liveDto=structuredClone(dto);liveDto.portfolio.projects.forEach(p=>p.requirements.forEach(r=>r.remainingWorkload='1/1'));
      const current=decodePlanningInputs(liveDto,5,undefined,true);
      const head=JSON.stringify({format:'flowplan',version:7,exportedAt:'2026-10-08T10:00:00.000Z',data:encodePlanningInputs(current)});
      let parts=[head.slice(0,-2),',"portfolioSnapshots":['];
      for(let i=0;i<counts.snapshots;i++)parts.push((i?',':'')+JSON.stringify({...template,snapshotId:'volume-'+String(i).padStart(3,'0')}));parts.push(']}}');
      let text=parts.join('');parts=null;const logicalBytes=new TextEncoder().encode(text).length;
      const repository=await openIndexedDbPlanningRepository({factory:indexedDB,name:'benchmark-'+counts.snapshots});
      const beforeEngine=await sha256(JSON.stringify(buildPlanningSessionProjection({state:current,geometryViewport:{width:2160,teamLaneHeight:100,timeAxisHeight:76}}).planningResult,(_,v)=>{if(typeof v==='bigint')return v.toString();if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===0){try{return serializeQuantity(v)}catch{}}return v}));
      let start=performance.now();const file=new Blob([text],{type:'application/json'});text=null;const stage=await repository.stagePortableFile(file,'benchmark');const importStageMs=performance.now()-start;
      start=performance.now();let token=await repository.activateImport(stage,null,'init',{fingerprint:'absent',document:null});const activationMs=performance.now()-start;text=null;
      const timings={startup:[],save:[],open:[],metadata:[]};
      for(let i=0;i<12;i++){
        start=performance.now();const loaded=await repository.readCurrent();buildPlanningSessionProjection({state:loaded.state,geometryViewport:{width:2160,teamLaneHeight:100,timeAxisHeight:76}});if(i>=2)timings.startup.push(performance.now()-start);
        start=performance.now();await repository.listSnapshotMetadata(token);if(i>=2)timings.metadata.push(performance.now()-start);
        start=performance.now();await repository.readSnapshot('volume-000',token);if(i>=2)timings.open.push(performance.now()-start);
        start=performance.now();token=await repository.writeCurrent(encodePlanningInputs(loaded.state),token,'write-'+i);if(i>=2)timings.save.push(performance.now()-start);
      }
      const afterEngine=await sha256(JSON.stringify(buildPlanningSessionProjection({state:(await repository.readCurrent()).state,geometryViewport:{width:2160,teamLaneHeight:100,timeAxisHeight:76}}).planningResult,(_,v)=>{if(typeof v==='bigint')return v.toString();if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===0){try{return serializeQuantity(v)}catch{}}return v}));
      if(beforeEngine!==afterEngine)throw Error('Current engine changed across storage');
      const reader=createRepositoryHistoryReader(repository,()=>token,32*1024*1024,repository.readHistoryProjection);
      start=performance.now();await reader.refresh();const historyMetadataMs=performance.now()-start;
      start=performance.now();await reader.ensureRows([{projectIndex:0,snapshotIndex:0}]);const rowOpenMs=performance.now()-start;
      start=performance.now();async function* samples(){for await(const day of reader.dailyTotals(current.planning.startDate,current.planning.endDate))yield{value:day.total,count:day.count}}
      const cap=await computeLazyHistoryVisualCap(samples(),await createIndexedDbHistoryScratch(indexedDB));const exactGlobalCapMs=performance.now()-start;
      const cacheBeforeClose=reader.getCacheStats();reader.releaseAll();const cacheAfterClose=reader.getCacheStats();
      start=performance.now();let exported=await exportRepositoryBackup(repository);const exportMs=performance.now()-start;const exportBytes=new Blob([...exported]).size;exported=null;
      const metadata=(await repository.listSnapshotMetadata(token)).items;
      const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return{medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],samples:values}};
      const estimate=await navigator.storage.estimate();repository.close();
      const {createPersistentPlanningApplication}=await import('/js/main/createPersistentPlanningApplication.js');
      const root=document.createElement('div');root.id='app';document.body.append(root);
      const css=document.createElement('link');css.rel='stylesheet';css.href='/styles.css';document.head.append(css);
      start=performance.now();const mounted=await createPersistentPlanningApplication(root,{databaseName:'benchmark-'+counts.snapshots});const fullUiStartupMs=performance.now()-start;
      if(!mounted)throw Error('Planning application did not initialize');mounted.destroy();root.remove();css.remove();
      return {...counts,storedDailyRows:counts.snapshots*counts.projects*dates.length,logicalBytes,snapshotBytes:metadata[0].bytes,importStageMs,activationMs,exportMs,exportBytes,
        fullUiStartupMs,startup:stats(timings.startup),writeCurrent:stats(timings.save),snapshotOpen:stats(timings.open),metadataFirstPage:stats(timings.metadata),historyMetadataMs,rowOpenMs,exactGlobalCapMs,exactCap:rationalToCanonicalString(cap),cacheBeforeClose,cacheAfterClose,engineDigest:afterEngine,engineParity:true,storageEstimate:estimate};
    })()`);
    report.memorySampling = await stopMemorySampling();
    report.mainHeapBeforeGc = await call("Runtime.getHeapUsage");
    await call("HeapProfiler.collectGarbage");
    report.mainHeapAfterGc = await call("Runtime.getHeapUsage");
    reports.push(report); console.log(JSON.stringify(report));
  }
  const result = { date: "2026-10-09", browser: browser.product, method: "30-day staggered Reservations, sparse every fifth civil day. Isolated real IndexedDB browser, deterministic sparse synthetic captures, actual Current engine parity. Two warmups + ten timed runs; stage/export/cap single runs. 500ms sampling observes used heap + backing buffers across attached main/worker contexts, not whole-process RSS or a guaranteed absolute peak. Final GC samples cover the main context only.", reports };
  if (output) await writeFile(output, JSON.stringify(result, null, 2) + "\n");
});
