import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {fixture} from '../r12-perf/fixture.mjs';
import {createNativeRamHistorySource,createCurrentRamAdapter,createDeterministicTransitionAllocator} from '../../../.test-dist-v2/adapters/memory/currentRamAdapter.js';
import {addDays} from '../../../.test-dist-v2/domain/primitives/civilDate.js';
const [size,variant,depthText,scenario,mode='official',historyForm='chain']=process.argv.slice(2), depth=Number(depthText);
const {admitRamHistory,createTransitionSession}=await import(`../../../.test-dist-v2/application/portfolio/transitions/session${mode==='instrumented'?'.instrumented':''}.js`);
const take=r=>{if(!r.ok) throw new Error(JSON.stringify(r.errors));return r.value;};
const identity=r=>({kind:r.kind,entityId:r.entityId});
const q=(family,value)=>({family,unit:'work',value});
const setupStart=performance.now(), f=fixture(size,variant), base=f.versions.find(v=>v.ref.kind==='ProjectSettings'&&v.owner.projectId.value==='p0');
for(let i=0;i<depth;i++) f.versions.push({...structuredClone(base),ref:{...base.ref,versionId:{family:'VersionId',value:`history-${i}`}},predecessor:i && historyForm==='chain'?{...base.ref,versionId:{family:'VersionId',value:`history-${i-1}`}}:base.ref,payload:{...base.payload,name:`historical-${i}`}});
const groups=new Map(); for(const v of f.versions) {const key=JSON.stringify(identity(v.ref));let g=groups.get(key);if(!g){g={identity:identity(v.ref),owner:v.owner,refs:[]};groups.set(key,g);}g.refs.push(v.ref);}
const scope=take(createNativeRamHistorySource(f.current,f.versions,[...groups.values()],{entityIds:[],versionIds:[],couples:[]}));
const admission=take(admitRamHistory(scope));
const sHash=createHash('sha256').update(JSON.stringify(admission.view.graph,(_,v)=>typeof v==='bigint'?`${v}n`:v)).digest('hex');
let command;
if(scenario==='local') command={type:'RenameProject',projectId:{family:'ProjectId',value:'p0'},name:'EDIT-local'};
else if(scenario==='actuals') {
 const ptec=f.versions.find(v=>v.ref.kind==='PTEC'&&v.payload.etc.value.numerator>0n&&v.payload.actualPeriod.entityId.value==='ap-p0');
 const ta=f.versions.find(v=>v.ref.kind==='TeamActual'&&v.owner.association.entityId.value===ptec.owner.pt.entityId.value);
 command={type:'CorrectActuals',actualPeriod:identity(ptec.payload.actualPeriod),cells:[{teamActual:identity(ta.ref),consumed:q('Consumption',{...ta.payload.consumed.value,numerator:ta.payload.consumed.value.numerator+1n})}]};
} else {
 const ap=f.versions.find(v=>v.ref.kind==='ActualPeriod'&&v.ref.entityId.value==='ap-p0');
 command={type:'EditActualPartition',actualPeriod:identity(ap.ref),operation:'extend',periods:ap.payload.subPeriods.map((r,i)=>{const sp=f.versions.find(v=>v.ref.entityId.value===r.entityId.value);return {slot:`s${i}`,identity:identity(sp.ref),from:sp.payload.from,through:i===ap.payload.subPeriods.length-1?take(addDays(sp.payload.through,1)):sp.payload.through};}),cells:[],bases:[]};
}
const setupMs=performance.now()-setupStart;
console.log(JSON.stringify({event:'setup',size,variant,depth,scenario,mode,setupMs,S:admission.view.graph.versions.length,H:admission.view.registry.versions.length,sHash}));
const raw=[];
for(let trial=0;trial<5;trial++) {
 const trialSetupStart=performance.now();
 const store=createCurrentRamAdapter(admission.view),session=createTransitionSession(admission,store,take(createDeterministicTransitionAllocator('bench'))), marks=[];
 const trialSetupMs=performance.now()-trialSetupStart;
 globalThis.__r13mark=name=>marks.push([name,performance.now()]);
 const cpu=process.cpuUsage(), start=performance.now(), p=session.prepare(command), preparedAt=performance.now();
 if(p.type!=='Prepared') throw new Error(`Preparation ${p.type}`);
 console.log(JSON.stringify({event:'prepared',trial,prepare:preparedAt-start}));
 const answer={preparationId:p.prepared.preparationId,preparation:p.prepared,answers:p.prepared.obligations.map(o=>o.kind==='ReviewETC'?{obligationId:o.obligationId,kind:'ReviewETC',accept:true,choice:'keep'}:{obligationId:o.obligationId,kind:'Confirm',accept:true})};
 const executeStart=performance.now(),r=session.execute(p.prepared,answer),end=performance.now();
 if(r.type!=='Applied') throw new Error(JSON.stringify(r));
 const times={prepare:preparedAt-start,execute:end-executeStart,total:preparedAt-start+end-executeStart,harnessAnswers:executeStart-preparedAt};
 if(mode==='instrumented') {
  const interval=(a,b)=>{const x=marks.find(m=>m[0]===a),y=marks.find(m=>m[0]===b);return x&&y?y[1]-x[1]:0;};
  const e2p=interval('E2-PREPARE-BEGIN','E2-PREPARE-END'),e2a=interval('E2-ANSWERS-BEGIN','E2-ANSWERS-END');
  Object.assign(times,{E1:times.prepare-e2p,E2:e2p+e2a,E4:interval('E4-BEGIN','E4-END'),E5:interval('E5-BEGIN','E5-END'),E6:interval('E6-BEGIN','E6-END'),E7:interval('E7-BEGIN','E7-END')});
  for(const phase of ['REGISTRY','MANIFEST','EXTRACTION']) times[`E5-${phase}`]=interval(`E5-${phase}-BEGIN`,`E5-${phase}-END`);
  times.E3=times.execute-e2a-times.E4-times.E5-times.E6-times.E7;
 }
 const byKind={};for(const ref of r.versionsCreated)byKind[ref.kind]=(byKind[ref.kind]??0)+1;
 const row={event:'trial',trial,trialSetupMs,role:trial===0?'cold':trial===1?'warmup':'measured',...times,cpu:process.cpuUsage(cpu),heapEndpoint:process.memoryUsage().heapUsed,rssEndpoint:process.memoryUsage().rss,maxRssLifetime:process.resourceUsage().maxRSS,B:r.versionsCreated.length,byKind,obligations:p.prepared.obligations.length};raw.push(row);console.log(JSON.stringify(row));
}
console.log(JSON.stringify({event:'complete',size,variant,depth,scenario,mode,historyForm,setupMs,S:admission.view.graph.versions.length,H:admission.view.registry.versions.length,sHash,fixtureHash:f.metadata.fixtureSha256,raw}));
