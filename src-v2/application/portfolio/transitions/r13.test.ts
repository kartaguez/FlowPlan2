import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, inventory, emptyReservations, ok, identity, id, q, ref, type Raw } from '../../../domain/portfolio/transitions/r13.fixture.js';
import { admitRamHistory, createTransitionSession, assembleCandidateManifest, type PreparedTransition } from './session.js';
import { createCurrentRamAdapter, createDeterministicTransitionAllocator, createNativeRamHistorySource } from '../../../adapters/memory/currentRamAdapter.js';
import { sameReference } from '../../../domain/primitives/exactReference.js';
import { certifyPortfolioGraph } from '../../../domain/portfolio/validatedPortfolioGraph.js';
import type { CandidateAssemblyPort } from '../../ports/candidateAssemblyPort.js';
import type { TransitionAllocationPort } from '../../ports/transitionAllocationPort.js';
function setup(f=fixture(), assembly?:CandidateAssemblyPort, allocator?:TransitionAllocationPort) {
  const source=ok(createNativeRamHistorySource(f.current,f.versions,inventory(f.versions),emptyReservations)), admission=ok(admitRamHistory(source)), store=createCurrentRamAdapter(admission.view);
  const session=createTransitionSession(admission,store,allocator ?? ok(createDeterministicTransitionAllocator('test')),assembly);
  const prepare=(command:unknown) => { const r=session.prepare(command); assert.equal(r.type,'Prepared',JSON.stringify(r,(_,v)=>typeof v==='bigint'?String(v):v)); if (r.type!=='Prepared') throw new Error('not prepared'); return r.prepared; };
  const answers=(p:PreparedTransition) => ({preparationId:p.preparationId,preparation:p,answers:p.obligations.map(o => o.kind==='ReviewETC'?{obligationId:o.obligationId,kind:'ReviewETC',choice:'keep',accept:true}:{obligationId:o.obligationId,kind:'Confirm',accept:true})});
  const apply=(command:unknown) => { const p=prepare(command), r=session.execute(p,answers(p)); assert.equal(r.type,'Applied',r.type==='Applied' ? '' : JSON.stringify(r,(_,v)=>typeof v==='bigint'?String(v):v)); if(r.type!=='Applied') throw new Error('not applied'); return r; };
  const get=(entity:string) => { const v=store.read().graph.versions.find(v=>v.ref.entityId.value===entity); assert.ok(v); return v; };
  return {f,session,store,prepare,answers,apply,get};
}
const rename={type:'RenameProject',projectId:id('ProjectId','p'),name:'renamed'};
const target=(kind:string,value:string) => ({type:'DeleteLifecycle',target:identity(kind,value)});
function partition(operation:string,periods:Raw[],cells:Raw[]=[]) { return {type:'EditActualPartition',actualPeriod:identity('ActualPeriod','ap-p'),operation,periods,cells,bases:[]}; }
const period=(s:string,from:string,through:string,existing=true) => ({slot:s,from,through,...(existing?{identity:identity('ActualSubPeriod',`sp-p-${s}`)}:{})});
test('G13-02/04/05 local selective versions, frozen inputs, no-op and strict stale before invalid answers',()=>{
  const s=setup(), before=s.store.read(), command=structuredClone(rename), p=s.prepare(command), p2=s.prepare({...rename,projectId:id('ProjectId','p2')}); command.name='mutated'; assert.equal(s.store.read(),before);
  assert.throws(()=>((p.obligations as any).push({})));
  const applied=s.session.execute(p,s.answers(p)); assert.equal(applied.type,'Applied'); if(applied.type!=='Applied') return;
  assert.equal(applied.versionsCreated.length,1); assert.equal(applied.versionsCreated[0]?.kind,'ProjectSettings'); assert.equal((s.get('ps-p').payload as Raw).name,'renamed'); assert.deepEqual(s.get('ps-p').predecessor,before.graph.versions.find(v=>v.ref.entityId.value==='ps-p')!.ref);
  assert.equal(s.session.execute(p2,null).type,'Stale'); assert.equal(s.session.execute(p2,s.answers(p2)).type,'Rejected'); assert.equal(s.session.execute(p,s.answers(p)).type,'Rejected');
  assert.equal(s.session.prepare(rename).type,'NoOp'); assert.equal(s.store.read(),applied.current); assert.ok(before.registry.versions.every(v=>applied.current.registry.versions.some(n=>sameReference(n.ref,v.ref))));
});
test('G13-02/03 wrong, duplicated, missing, declined and foreign answers permit retry; handles are session bound',()=>{
  const s=setup(), p=s.prepare(target('TeamSettings','ts-t1')), before=s.store.read(), good=s.answers(p); assert.equal(p.obligations.length,1); assert.equal(p.obligations[0]?.kind,'ConfirmRemoval');
  for(const answers of [null,{...good,preparationId:'other'},{...good,answers:[]},{...good,answers:[...good.answers,...good.answers]},{...good,answers:[{obligationId:'unknown',kind:'Confirm',accept:true}]},{...good,answers:good.answers.map(a=>({...a,accept:false}))}]) { const r=s.session.execute(p,answers); assert.equal(r.type,'Rejected'); assert.equal(s.store.read(),before); }
  assert.equal(setup().session.execute(p,good).type,'Rejected'); assert.equal(s.session.execute({...p} as PreparedTransition,good).type,'Rejected'); assert.equal(s.session.execute(p,good).type,'Applied');
});
for(const [kind,entity,deleted] of [['ProjectSettings','ps-p',['pt-t1','pt-t2']],['ReservationSettings','rs-r',['rt-t1','rt-t2']],['TeamSettings','ts-t1',['pt-t1','rt-t1']],['PT','pt-t1',['pt-t1']],['RT','rt-t1',['rt-t1']]] as const) test(`G13-06 positive historical delete ${kind} exact cascade and untouched AP/Capacity`,()=>{
  const s=setup(), old=s.store.read(), r=s.apply(target(kind,entity));
  for(const a of deleted) assert.equal((s.get(a).payload as Raw).lifecycle,'deleted');
  for(const v of old.graph.versions.filter(v=>['ActualPeriod','ActualSubPeriod','TeamCapacity','Program','Pas','PortfolioOrder'].includes(v.ref.kind))) assert.ok(sameReference(v.ref,s.get(v.ref.entityId.value).ref));
  assert.equal(r.current.registry.versions.length-old.registry.versions.length,deleted.length+(kind==='PT'||kind==='RT'?0:1));
  assert.ok(old.graph.versions.filter(v=>v.ref.kind==='TeamActual').every(v=>r.current.registry.versions.some(n=>sameReference(n.ref,v.ref))));
});
for(const kind of ['PT','RT'] as const) test(`G13-07 B1/B3 restore ${kind}, positive→zero and zero→zero new versions, explicit predecessor`,()=>{
  const s=setup(), old=s.store.read(), entity=kind==='PT'?'pt-t1':'rt-t1', root=kind==='PT'?'p':'r'; s.apply(target(kind,entity));
  const bases=old.graph.versions.filter(v=>(v.ref.kind==='TeamActual'&&(v.owner.type==='PTSubPeriod'||v.owner.type==='RTSubPeriod')&&v.owner.association.entityId.value===entity)||(v.ref.kind==='PTEC'&&v.owner.type==='PT'&&v.owner.pt.entityId.value===entity)).map(v=>v.ref);
  const command={type:'RestoreAssociation',target:identity(kind,entity),payload:s.get(entity).payload,cells:[],bases,...(kind==='PT'?{etc:q('ETC',2n)}:{})}; command.payload={...command.payload,lifecycle:'existing'} as any;
  assert.equal(s.session.prepare({...command,bases:[]}).type,'Rejected'); assert.equal(s.session.prepare({...command,bases:[ref('TeamActual','missing')]}).type,'Rejected');
  const r=s.apply(command); assert.equal(r.versionsCreated.length,kind==='PT'?4:3);
  for(const b of bases) { const v=s.get(b.entityId.value); assert.equal(v.ref.entityId.value,b.entityId.value); assert.ok(!sameReference(v.ref,b)); assert.deepEqual(v.predecessor,b); if(v.ref.kind==='TeamActual') assert.equal((v.payload as Raw).consumed.value.numerator,0n); }
  assert.equal((s.get(`ta-${root}-t1-b`).payload as Raw).consumed.value.numerator,0n);
});
test('G13-07 root restore keeps order, capacity and associations deleted; deleted endpoint restore refused',()=>{
  const s=setup(), old=s.get('ps-p'); s.apply(target('ProjectSettings','ps-p'));
  assert.equal(s.session.prepare({type:'RestoreAssociation',target:identity('PT','pt-t1'),payload:{lifecycle:'existing',dailyCap:{kind:'absent'}},cells:[],bases:[],etc:q('ETC')}).type,'Rejected');
  s.apply({type:'RestoreRoot',target:identity('ProjectSettings','ps-p'),payload:old.payload}); assert.equal((s.get('pt-t1').payload as Raw).lifecycle,'deleted'); assert.deepEqual(s.get('order').ref,ref('PortfolioOrder','order'));
});
test('G13-08/09 correction 1/3→2/3: one TA only, positive ETC keep, unchanged refs retained',()=>{
  const s=setup(), old=s.store.read(), command={type:'CorrectActuals',actualPeriod:identity('ActualPeriod','ap-p'),cells:[{teamActual:identity('TeamActual','ta-p-t1-a'),consumed:q('Consumption',2n,3n)}]}, p=s.prepare(command);
  assert.deepEqual(p.obligations.map(o=>o.kind),['ConfirmCell','ReviewETC']); const r=s.session.execute(p,s.answers(p)); assert.equal(r.type,'Applied'); if(r.type!=='Applied') return;
  assert.deepEqual(r.versionsCreated.map(v=>v.kind),['TeamActual']); assert.equal(s.session.prepare(command).type,'NoOp'); for(const v of old.graph.versions.filter(v=>v.ref.entityId.value!=='ta-p-t1-a')) assert.deepEqual(v.ref,s.get(v.ref.entityId.value).ref);
});
test('G13-04/09 ETC zero→positive confirmation, negative/family refused, reorder selective and execute NoOp',()=>{
  const s=setup(); assert.equal(s.session.prepare({type:'SetPTETC',pt:identity('PT','pt-t2'),etc:q('ETC')}).type,'NoOp');
  for(const etc of [q('ETC',-1n),q('Consumption',1n)]) assert.equal(s.session.prepare({type:'SetPTETC',pt:identity('PT','pt-t2'),etc}).type,'Rejected');
  const r=s.apply({type:'SetPTETC',pt:identity('PT','pt-t2'),etc:q('ETC',1n)}); assert.deepEqual(r.versionsCreated.map(v=>v.kind),['PTEC']);
  const order=s.apply({type:'ReorderProjects',projectIds:[id('ProjectId','p2'),id('ProjectId','p')]}); assert.deepEqual(order.versionsCreated.map(v=>v.kind),['PortfolioOrder']); assert.equal(s.session.prepare({type:'ReorderProjects',projectIds:[id('ProjectId','p')]}).type,'Rejected');
});
for(const [operation,periods,expected] of [
  ['adjust',[period('a','2024-01-01','2024-01-01'),period('b','2024-01-02','2024-01-04')],{ActualSubPeriod:2,ActualPeriod:1}],
  ['extend',[period('a','2024-01-01','2024-01-02'),period('b','2024-01-03','2024-01-04'),period('c','2024-01-05','2024-01-06',false)],{ActualSubPeriod:1,TeamActual:2,PTEC:2,ActualPeriod:1}],
  ['reduce',[period('a','2024-01-01','2024-01-01')],{ActualSubPeriod:1,PTEC:2,ActualPeriod:1}],
  ['split',[period('x','2024-01-01','2024-01-01',false),period('y','2024-01-02','2024-01-02',false),period('z','2024-01-03','2024-01-04',false)],{ActualSubPeriod:3,TeamActual:6,ActualPeriod:1}],
  ['merge',[period('m','2024-01-01','2024-01-04',false)],{ActualSubPeriod:1,TeamActual:2,ActualPeriod:1}]
] as const) test(`G13-08 ${operation} exact partition/version counts, all zeros confirmed, no redistribution`,()=>{
  const s=setup(), before=s.store.read(), r=s.apply(partition(operation,[...periods])); const counts:Raw={}; for(const v of r.versionsCreated) counts[v.kind]=(counts[v.kind]??0)+1; assert.deepEqual(counts,expected);
  if(operation==='adjust') assert.deepEqual(s.get('ta-p-t1-a').ref,ref('TeamActual','ta-p-t1-a'));
  if(operation==='split'||operation==='merge') { const newTA=s.store.read().graph.versions.filter(v=>v.ref.kind==='TeamActual'&&(v.owner.type==='PTSubPeriod')&&v.owner.association.entityId.value==='pt-t1'); assert.ok(newTA.every(v=>(v.payload as Raw).consumed.value.numerator===0n)); assert.ok(r.versionsCreated.filter(v=>v.kind==='ActualSubPeriod').every(r=>!s.store.read().registry.versions.find(v=>sameReference(v.ref,r))?.predecessor)); }
  assert.ok(before.registry.versions.every(v=>s.store.read().registry.versions.some(n=>sameReference(n.ref,v.ref))));
});
test('G13-08/09 empty↔covered, lastActualsDate aligned, historic cells not replayed',()=>{
  const s=setup(); s.apply({type:'EmptyActualPeriod',actualPeriod:identity('ActualPeriod','ap-p')}); assert.equal((s.get('ptec-t1').payload as Raw).lastActualsDate,null);
  const r=s.apply({...partition('cover',[period('n','2024-02-01','2024-02-02',false)]),type:'CoverActualPeriod'}); assert.equal(r.versionsCreated.length,6); assert.equal((s.get('ptec-t1').payload as Raw).lastActualsDate,'2024-02-02');
  const before=s.store.read(); for(const cmd of [partition('extend',[period('a','2023-01-01','2023-01-04',false)]),partition('adjust',[period('a','2024-01-01','2024-01-01'),period('b','2024-01-03','2024-01-04')]),partition('split',[period('a','2024-02-01','2024-02-02')])]) { assert.equal(s.session.prepare(cmd).type,'Rejected'); assert.equal(s.store.read(),before); }
});
for(const kind of ['Program','Pas']) test(`G13-10 ${kind} used delete requires complete explicit owners; single coherent publication`,()=>{
  const s=setup(), assignments=['ps-p','ps-p2','rs-r'].map(e=>({owner:identity(e==='rs-r'?'ReservationSettings':'ProjectSettings',e),replacement:null,...(kind==='Program'?{ownColor:'#AABBCC'}:{})}));
  assert.equal(s.session.prepare({type:'DeleteUsedCatalog',target:identity(kind,kind==='Program'?'program':'pas'),assignments:assignments.slice(1)}).type,'Rejected');
  const r=s.apply({type:'DeleteUsedCatalog',target:identity(kind,kind==='Program'?'program':'pas'),assignments}); assert.equal(r.versionsCreated.length,4); assert.equal((s.get('unused').payload as Raw).lifecycle,'existing');
});
test('G13-12 real certification rejects intentionally incoherent assembled candidate without swap or published versions',()=>{
  const s=setup(fixture(),{assemble(base,selected){return {...assembleCandidateManifest(base,selected) as Raw,ptecs:[]};}}), old=s.store.read(), p=s.prepare(rename), r=s.session.execute(p,s.answers(p));
  assert.equal(r.type,'CandidateCertificationFailure'); if(r.type==='CandidateCertificationFailure') {assert.equal(r.stage,'certification'); assert.equal(r.errors[0]?.code,'PTEC_SELECTION_MISMATCH');}
  assert.equal(s.store.read(),old); assert.equal(s.session.execute(p,s.answers(p)).type,'Rejected'); assert.ok((s.session.reservations() as Raw).versionIds.some((id:Raw)=>id.value==='test/v/1'));
});
test('G13-05 B2 missing inventory/ref, partial source and collisions refuse admission',()=>{
  const f=fixture(); assert.equal(admitRamHistory(null).ok,false);
  for(const inv of [inventory(f.versions).slice(1),inventory(f.versions).map((v,i)=>i===0?{...v,refs:[ref('PlanningSettings','planning','missing')]}:v)]) { const r=admitRamHistory(ok(createNativeRamHistorySource(f.current,f.versions,inv,emptyReservations))); assert.equal(r.ok,false); if(!r.ok) assert.equal(r.errors[0]?.code,'SessionHistoryIncomplete'); }
  const duplicate={...structuredClone(f.get('pt-t1')),ref:ref('PT','second-identity')}; const r=admitRamHistory(ok(createNativeRamHistorySource(f.current,[...f.versions,duplicate],inventory([...f.versions,duplicate]),emptyReservations))); assert.equal(r.ok,false); if(!r.ok) assert.equal(r.errors[0]?.code,'OWNER_IDENTITY_CONFLICT');
});
test('G13-05 reserved identities burn on abandon/stale, VersionId collision leaves Current intact',()=>{
  const s=setup(), cmd=partition('merge',[period('m','2024-01-01','2024-01-04',false)]), p=s.prepare(cmd), old=s.store.read(); assert.equal(s.session.abandon(p),true); assert.equal(s.store.read(),old); assert.equal(s.session.execute(p,s.answers(p)).type,'Rejected'); assert.ok((s.session.reservations() as Raw).couples.every((c:Raw)=>c.state==='burned'));
  const p2=s.prepare(cmd); s.apply(rename); assert.equal(s.session.execute(p2,null).type,'Stale'); assert.ok((s.session.reservations() as Raw).couples.every((c:Raw)=>c.state==='burned'));
  const alloc=ok(createDeterministicTransitionAllocator('collision')), bad=setup(fixture(),undefined,{...alloc,reserveVersion:()=>({ok:true,value:id('VersionId','v1')})}); const before=bad.store.read(), handle=bad.prepare(rename); assert.equal(bad.session.execute(handle,bad.answers(handle)).type,'InternalTransitionFailure'); assert.equal(bad.store.read(),before);
});
test('G13-11 snapshots stay autonomous immutable through correction/delete/restore',()=>{
  const s=setup(), old=s.store.read(), snapshot={snapshotId:id('SnapshotId','snapshot'),knowledgeDate:'2024-01-04',createdAt:'2026-10-12T12:00:00.000Z',manifest:old.selection.manifest}; const certified=ok(certifyPortfolioGraph({source:'snapshot',snapshot,versions:old.registry.versions})); s.apply(rename); s.apply(target('TeamSettings','ts-t1'));
  assert.deepEqual(ok(certifyPortfolioGraph({source:'snapshot',snapshot,versions:s.store.read().registry.versions})),certified); assert.throws(()=>((certified.manifest.projectSettings as any).pop()));
});
// Public opacity and discriminated answer guarantees compile in test:v2.
if (false) {
  // @ts-expect-error private brand prevents structural handle construction
  const forged:PreparedTransition={preparationId:'x',baseRevision:'R7',obligations:[]}; void forged;
}
test('G13-04 execute NoOp after explicit keep creates no version, revision or publication',()=>{
 const s=setup(), before=s.store.read(), p=s.prepare({type:'SetPTETC',pt:identity('PT','pt-t1'),etc:q('ETC',5n)}), counts=s.session.reservations(); assert.equal(p.obligations[0]?.kind,'ReviewETC');
 assert.equal(s.session.execute(p,s.answers(p)).type,'NoOp'); assert.equal(s.store.read(),before); assert.deepEqual(s.session.reservations(),counts); assert.equal(s.session.execute(p,s.answers(p)).type,'Rejected');
});
test('G13-05 B2 same fresh TA couple refuses second preparation and remains reserved after abandon',()=>{
 const f=fixture(); f.get('pt-t1').payload.lifecycle='deleted'; const removed=f.versions.filter(v=>(v.ref.kind==='TeamActual'&&v.owner.association.entityId.value==='pt-t1')||(v.ref.kind==='PTEC'&&v.owner.pt.entityId.value==='pt-t1'));
 f.versions.splice(0,f.versions.length,...f.versions.filter(v=>!removed.includes(v))); f.manifest.teamActuals=f.manifest.teamActuals.filter((r:Raw)=>!removed.some(v=>v.ref.entityId.value===r.entityId.value)); f.manifest.ptecs=f.manifest.ptecs.filter((r:Raw)=>!removed.some(v=>v.ref.entityId.value===r.entityId.value));
 const s=setup(f), cmd={type:'RestoreAssociation',target:identity('PT','pt-t1'),payload:{lifecycle:'existing',dailyCap:{kind:'absent'}},cells:[],bases:[],etc:q('ETC')}, p=s.prepare(cmd), before=s.store.read();
 const r=s.session.prepare(cmd); assert.equal(r.type,'Rejected'); if(r.type==='Rejected') assert.equal(r.errors[0]?.code,'IdentityReservationConflict'); s.session.abandon(p); assert.equal(s.session.prepare(cmd).type,'Rejected'); assert.equal(s.store.read(),before);
});
test('G13-05/07 B3 explicit branch chosen, sole historical ref never implicit, wrong identity refused',()=>{
 const f=fixture(), original=f.get('ta-p-t1-a'), branch={...structuredClone(original),ref:ref('TeamActual','ta-p-t1-a','branch'),predecessor:original.ref,payload:{consumed:q('Consumption',4n)}}; f.versions.push(branch);
 const s=setup(f), old=s.store.read(); s.apply(target('PT','pt-t1')); const bases=old.graph.versions.filter(v=>(v.ref.kind==='TeamActual'&&v.owner.type==='PTSubPeriod'&&v.owner.association.entityId.value==='pt-t1')||(v.ref.kind==='PTEC'&&v.owner.type==='PT'&&v.owner.pt.entityId.value==='pt-t1')).map(v=>v.ref.entityId.value==='ta-p-t1-a'?branch.ref:v.ref);
 const cmd={type:'RestoreAssociation',target:identity('PT','pt-t1'),payload:{lifecycle:'existing',dailyCap:{kind:'absent'}},cells:[],bases,etc:q('ETC')};
 const missing=s.session.prepare({...cmd,bases:bases.slice(1)}); assert.equal(missing.type,'Rejected'); if(missing.type==='Rejected') assert.equal(missing.errors[0]?.code,'HistoricalBaseRequired');
 const wrong=s.session.prepare({...cmd,bases:[ref('TeamActual','ta-p-t2-a'),...bases.slice(1)]}); assert.equal(wrong.type,'Rejected'); if(wrong.type==='Rejected') assert.equal(wrong.errors[0]?.code,'HistoricalBaseIdentityMismatch');
 s.apply(cmd); assert.deepEqual(s.get('ta-p-t1-a').predecessor,branch.ref);
});
test('G13-02/11 reentrant execution through allocation cannot interpose; RAM publishes one whole view',()=>{
 const alloc=ok(createDeterministicTransitionAllocator('exclusive')); let reenter=()=>{}; let versionCalls=0; const s=setup(fixture(),undefined,{...alloc,reserveVersion(){versionCalls++; reenter(); return alloc.reserveVersion();}});
 const p=s.prepare(rename), p2=s.prepare({...rename,projectId:id('ProjectId','p2')}), before=s.store.read(), observations:unknown[]=[];
 reenter=()=>{observations.push(s.store.read()); assert.equal(s.session.execute(p2,s.answers(p2)).type,'Rejected');};
 assert.equal(s.session.execute(p,s.answers(p)).type,'Applied'); assert.equal(versionCalls,1); assert.ok(observations.every(v=>v===before)); assert.equal(s.session.execute(p2,null).type,'Stale');
 assert.throws(()=>s.store.publish(before)); assert.throws(()=>s.store.exclusive(()=>s.store.exclusive(()=>null))); assert.throws(()=>((s.store.read().selection.manifest.projectSettings as any).pop()));
});
test('G13-03 answers copied without accessors, declined ETC corrected by replacement, old snapshot remains unchanged',()=>{
 const s=setup(), p=s.prepare({type:'CorrectActuals',actualPeriod:identity('ActualPeriod','ap-p'),cells:[{teamActual:identity('TeamActual','ta-p-t1-a'),consumed:q('Consumption',2n,3n)}]}), answer=s.answers(p), old=s.store.read();
 const exotic={preparationId:p.preparationId}; Object.defineProperty(exotic,'answers',{enumerable:true,get(){throw new Error('Getter executed');}}); assert.equal(s.session.execute(p,exotic).type,'Rejected'); assert.equal(s.store.read(),old);
 const review=p.obligations.find(o=>o.kind==='ReviewETC')!; const r=s.session.execute(p,{...answer,answers:answer.answers.map(a=>a.obligationId===review.obligationId?{obligationId:a.obligationId,kind:'ReviewETC',accept:true,choice:'replace',etc:q('ETC',7n)}:a)}); assert.equal(r.type,'Applied'); if(r.type==='Applied') assert.deepEqual(r.versionsCreated.map(r=>r.kind),['TeamActual','PTEC']); assert.equal((s.get('ptec-t1').payload as Raw).etc.value.numerator,7n);
});
test('G13-06 Team without associations always confirms; unused catalog and zero-association AP are valid',()=>{
 const s=setup(); s.apply(target('ProjectSettings','ps-p')); s.apply(target('ReservationSettings','rs-r')); const p=s.prepare(target('TeamSettings','ts-t1')); assert.equal(p.obligations[0]?.kind,'ConfirmTeamDeletion'); assert.equal(s.session.execute(p,s.answers(p)).type,'Applied');
 const r=s.apply({type:'CoverActualPeriod',actualPeriod:identity('ActualPeriod','ap-p2'),operation:'cover',periods:[{slot:'new',from:'2024-01-01',through:'2024-01-01'}],cells:[],bases:[]}); assert.equal(r.versionsCreated.length,2);
});
test('G13-07 explicit positive restore is confirmed with complete grid and exact historical bases',()=>{
 const s=setup(), old=s.store.read(); s.apply(target('PT','pt-t1')); const bases=old.graph.versions.filter(v=>(v.ref.kind==='TeamActual'&&v.owner.type==='PTSubPeriod'&&v.owner.association.entityId.value==='pt-t1')||(v.ref.kind==='PTEC'&&v.owner.type==='PT'&&v.owner.pt.entityId.value==='pt-t1')).map(v=>v.ref);
 const p=s.prepare({type:'RestoreAssociation',target:identity('PT','pt-t1'),payload:{lifecycle:'existing',dailyCap:{kind:'present',value:q('DailyCap',0n)}},cells:[{subPeriod:identity('ActualSubPeriod','sp-p-a'),consumed:q('Consumption',7n)}],bases,etc:q('ETC',4n)}); assert.equal(p.obligations.length,1); assert.equal(p.obligations[0]?.preparationId,p.preparationId); assert.equal(p.obligations[0]?.reason,'ConfirmRestoreGrid');
 assert.equal(s.session.execute(p,{preparationId:p.preparationId,preparation:p,answers:[]}).type,'Rejected'); assert.equal(s.session.execute(p,s.answers(p)).type,'Applied'); assert.equal((s.get('ta-p-t1-a').payload as Raw).consumed.value.numerator,7n); assert.equal((s.get('ta-p-t1-b').payload as Raw).consumed.value.numerator,0n);
});
test('G13-05 complete native session transfer preserves published and burned reservation ledger',()=>{
 const s=setup(); const pending=s.prepare(partition('merge',[period('new','2024-01-01','2024-01-04',false)])); s.session.abandon(pending); s.apply(partition('merge',[period('other','2024-01-01','2024-01-04',false)]));
 const view=s.store.read(), transferred=admitRamHistory(ok(createNativeRamHistorySource(view.selection,view.registry.versions,inventory(view.registry.versions),s.session.reservations()))); assert.equal(transferred.ok,true,transferred.ok?'':JSON.stringify(transferred.errors));
});
test('G13-05 opaque initial IDs do not collide with private template labels; split provenance stays separate from predecessor',()=>{
 const f=fixture(); f.get('unused').ref=ref('Program','r13-template-1','r13-template-version'); f.manifest.programs=f.manifest.programs.map((r:Raw)=>r.entityId.value==='unused'?f.get('r13-template-1').ref:r);
 const s=setup(f), old=s.store.read(); const periods=[period('x','2024-01-01','2024-01-01',false),period('y','2024-01-02','2024-01-02',false),period('z','2024-01-03','2024-01-04',false)].map(p=>({...p,provenance:[ref('ActualSubPeriod','sp-p-a'),ref('ActualSubPeriod','sp-p-b')]}));
 const r=s.apply(partition('split',periods)); for(const ref of r.versionsCreated.filter(r=>r.kind==='ActualSubPeriod')) {const v=r.current.registry.versions.find(v=>sameReference(v.ref,ref))!;assert.equal(v.predecessor,undefined);assert.equal(v.provenance.length,2);}
 assert.ok(old.registry.versions.every(v=>r.current.registry.versions.some(n=>sameReference(n.ref,v.ref))));
});
test('G13-02/05 one command session per RAM cell prevents competing ledgers and revision ABA',()=>{
 const f=fixture(), admission=ok(admitRamHistory(ok(createNativeRamHistorySource(f.current,f.versions,inventory(f.versions),emptyReservations)))), store=createCurrentRamAdapter(admission.view), session=createTransitionSession(admission,store,ok(createDeterministicTransitionAllocator('single')));
 assert.throws(()=>createTransitionSession(admission,store,ok(createDeterministicTransitionAllocator('other'))),/RamSessionAlreadyBound/);
 const prepare=(name:string)=>{const r=session.prepare({...rename,name});assert.equal(r.type,'Prepared');if(r.type!=='Prepared')throw new Error('No handle');return r.prepared;}, first=prepare('one'), second=prepare('two');
 assert.equal(session.execute(first,{preparationId:first.preparationId,preparation:first,answers:[]}).type,'Applied'); assert.equal(session.execute(second,null).type,'Stale'); const third=prepare('three'), previous=store.read().selection.revision; assert.equal(session.execute(third,{preparationId:third.preparationId,preparation:third,answers:[]}).type,'Applied'); assert.notEqual(store.read().selection.revision,previous);
});
test('G13-03 answers from another session cannot replay even with identical textual preparationId and revision',()=>{
 const a=setup(), b=setup(), command={type:'SetPTETC',pt:identity('PT','pt-t2'),etc:q('ETC',5n)}, old=a.prepare(command), fresh=b.prepare(command); assert.equal(old.preparationId,fresh.preparationId); assert.equal(old.baseRevision,fresh.baseRevision);
 const before=b.store.read(), r=b.session.execute(fresh,a.answers(old)); assert.equal(r.type,'Rejected'); if(r.type==='Rejected') assert.equal(r.errors[0]?.code,'AnswerPreparationMismatch'); assert.equal(b.store.read(),before); assert.equal(b.session.execute(fresh,b.answers(fresh)).type,'Applied');
});
