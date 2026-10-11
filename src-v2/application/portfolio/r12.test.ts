import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionKinds, sameReference } from '../../domain/primitives/exactReference.js';
import { success, invalid, type DomainResult } from '../../domain/primitives/result.js';
import { validateBusinessPayload, createBusinessVersion } from '../../domain/portfolio/payloadValidation.js';
import { createVersionRegistry, lookupExact, lookupExactBatch, withVersions } from '../../domain/versioning/versionRegistry.js';
import { createPortfolioManifest, createCurrentSelection, createPortfolioSnapshot, manifestTables } from '../../domain/portfolio/manifest.js';
import { resolvePortfolioManifest, type PortfolioGraph } from '../../domain/portfolio/graphResolver.js';
import { certifyPortfolioGraph, type ValidatedPortfolioGraph } from '../../domain/portfolio/validatedPortfolioGraph.js';
import type { BusinessPayloadByKind } from '../../domain/portfolio/payloads.js';
import { createQuantity } from '../../domain/primitives/quantity.js';
import { parseRational } from '../../domain/primitives/rational.js';
import { createMemoryPortfolioReadAdapter } from '../../adapters/memory/memoryPortfolioReadAdapter.js';
import { loadCurrentGraph, loadSnapshotGraph } from './loadPortfolioGraph.js';
import type { ExactVersionsReader, SnapshotReader } from '../ports/portfolioReadPort.js';

function ok<T>(result: DomainResult<T>): T { assert.equal(result.ok,true,JSON.stringify(result.ok ? {} : result.errors)); if (!result.ok) throw new Error('invalid'); return result.value; }
function bad(result: DomainResult<unknown>, code: string) { assert.equal(result.ok,false); if (result.ok) throw new Error('unexpected certificate'); assert.equal(result.errors.at(0)?.code,code); assert.ok(result.errors.at(0)?.path); }
const id = (family: string, value: string) => ({family,value});
const ref = (kind: string, entity: string, version = 'v1') => ({kind,entityId:id('EntityId',entity),versionId:id('VersionId',version)});
const identity = (kind: string, entity: string) => ({kind,entityId:id('EntityId',entity)});
const q = (family: string, n = 0n, d = 1n) => ({family,unit:['Consumption','ETC'].includes(family) ? 'work' : family.includes('Ratio') ? 'ratio' : 'work/day',value:{numerator:n,denominator:d}});
// Mutable untrusted test inputs intentionally allow malformed schemas and false brands.
type Raw = Record<string, any>;
const tables: Record<string,string> = {ProjectSettings:'projectSettings',ReservationSettings:'reservationSettings',TeamSettings:'teamSettings',TeamCapacity:'teamCapacities',Program:'programs',Pas:'pas',PT:'pts',RT:'rts',ActualPeriod:'actualPeriods',ActualSubPeriod:'actualSubPeriods',TeamActual:'teamActuals',PTEC:'ptecs'};
const payloads: Record<string,Raw> = {
  ProjectSettings:{name:'Project',lifecycle:'existing',isActive:false,earliestStartDate:null,objectiveEndDate:null,mandatory:false,program:null,pas:null,ownColor:'#AABBCC'},
  ReservationSettings:{name:'Reservation',lifecycle:'existing',isActive:false,startDate:'2026-01-01',endDate:'2026-12-31',program:null,pas:null,ownColor:'#AABBCC'},
  TeamSettings:{name:'Team',lifecycle:'existing',isVisible:false}, TeamCapacity:{periods:[],exceptions:[]},
  Program:{name:'Program',lifecycle:'existing',color:'#AABBCC'},Pas:{name:'Pas',lifecycle:'existing'},
  PT:{lifecycle:'existing',dailyCap:{kind:'present',value:q('DailyCap')}}, RT:{lifecycle:'existing',demand:{mode:'ratio',ratio:q('ReservationRatio')}},
  ActualPeriod:{coverage:'empty',from:null,through:null,subPeriods:[]},ActualSubPeriod:{from:'2026-02-28',through:'2026-03-01'},
  TeamActual:{consumed:q('Consumption')},PTEC:{actualPeriod:identity('ActualPeriod','ap-p'),lastActualsDate:null,etc:q('ETC')},
  PlanningSettings:{horizon:{start:'2026-01-01',end:'2026-12-31'},workingWeekdays:[],maxParallelProjects:1},PortfolioOrder:{projectIds:[id('ProjectId','p')]}
};
function fixture(empty = false) {
  const manifest: Raw = {portfolioId:id('PortfolioId','portfolio'),planningSettings:ref('PlanningSettings','planning'),portfolioOrder:ref('PortfolioOrder','order')};
  for (const table of Object.values(tables)) manifest[table] = [];
  const versions: Raw[] = [];
  const add = (kind: string, entity: string, owner: Raw, payload = structuredClone(payloads[kind]!)) => {
    const v = {ref:ref(kind,entity),owner,payload,provenance:[]} as Raw; versions.push(v);
    const table = tables[kind]; if (table) manifest[table].push(v.ref);
    return v;
  };
  add('PlanningSettings','planning',{type:'Portfolio',portfolioId:manifest.portfolioId});
  add('PortfolioOrder','order',{type:'Portfolio',portfolioId:manifest.portfolioId},empty ? {projectIds:[]} : structuredClone(payloads.PortfolioOrder!));
  if (!empty) {
    add('ProjectSettings','ps',{type:'Project',projectId:id('ProjectId','p')});
    add('ReservationSettings','rs',{type:'Reservation',reservationId:id('ReservationId','r')});
    for (const t of ['t1','t2']) { add('TeamSettings',`ts-${t}`,{type:'Team',teamId:id('TeamId',t)}); add('TeamCapacity',`cap-${t}`,{type:'Team',teamId:id('TeamId',t)}); }
    add('Program','program',{type:'Portfolio',portfolioId:manifest.portfolioId}); add('Pas','pas',{type:'Portfolio',portfolioId:manifest.portfolioId});
    add('ActualPeriod','ap-p',{type:'Project',projectId:id('ProjectId','p')}); add('ActualPeriod','ap-r',{type:'Reservation',reservationId:id('ReservationId','r')});
    for (const t of ['t1','t2']) {
      add('PT',`pt-${t}`,{type:'ProjectTeam',projectId:id('ProjectId','p'),teamId:id('TeamId',t)});
      add('RT',`rt-${t}`,{type:'ReservationTeam',reservationId:id('ReservationId','r'),teamId:id('TeamId',t)});
      add('PTEC',`ptec-${t}`,{type:'PT',pt:identity('PT',`pt-${t}`)});
    }
  }
  const get = (entity: string) => { const v = versions.find(v => v.ref.entityId.value === entity); assert.ok(v); return v; };
  const remove = (entity: string, archive = true) => {
    const v = get(entity), table = tables[v.ref.kind]; assert.ok(table);
    manifest[table] = manifest[table].filter((r: Raw) => r.entityId.value !== entity);
    if (!archive) versions.splice(versions.indexOf(v),1);
  };
  const cover = (owner = 'p') => {
    const ap = get(`ap-${owner}`); ap.payload = {coverage:'covered',from:'2024-02-28',through:'2024-03-01',subPeriods:[]};
    for (const [suffix,from,through] of [['a','2024-02-28','2024-02-29'],['b','2024-03-01','2024-03-01']]) {
      const sub = add('ActualSubPeriod',`sp-${owner}-${suffix}`,{type:'ActualPeriod',actualPeriod:identity('ActualPeriod',`ap-${owner}`)},{from,through}); ap.payload.subPeriods.push(sub.ref);
      for (const t of ['t1','t2']) { const kind = owner === 'p' ? 'PT' : 'RT'; add('TeamActual',`ta-${owner}-${t}-${suffix}`,{type:kind === 'PT' ? 'PTSubPeriod' : 'RTSubPeriod',association:identity(kind,`${kind.toLowerCase()}-${t}`),subPeriod:identity('ActualSubPeriod',`sp-${owner}-${suffix}`)}); }
    }
    if (owner === 'p') for (const t of ['t1','t2']) get(`ptec-${t}`).payload.lastActualsDate = ap.payload.through;
  };
  const snapshot = (date = '2024-03-01', sid = 'snapshot') => ({snapshotId:id('SnapshotId',sid),knowledgeDate:date,createdAt:'2026-10-11T12:00:00.000Z',manifest});
  const certify = () => certifyPortfolioGraph({source:'current',manifest,versions});
  return {manifest,versions,add,get,remove,cover,snapshot,certify};
}

for (const kind of versionKinds) test(`G12-01 ${kind}: schema valid, extra/missing keys refused`,() => {
  const input = structuredClone(payloads[kind]!); ok(validateBusinessPayload(kind,input));
  bad(validateBusinessPayload(kind,{...input,unexpected:true}),'INVALID_PAYLOAD_KEYS');
  delete input[Object.keys(input)[0]!]; bad(validateBusinessPayload(kind,input),'INVALID_PAYLOAD_KEYS');
});
test('G12-01 mandatory, typed refs, colors and eliminated statuses',() => {
  const f = fixture(), p = f.get('ps').payload;
  p.objectiveEndDate = '2020-01-01'; ok(f.certify()); p.mandatory = true; ok(f.certify());
  p.objectiveEndDate = null; bad(f.certify(),'MANDATORY_OBJECTIVE_REQUIRED');
  p.mandatory = 'true'; bad(f.certify(),'INVALID_BOOLEAN');
  bad(validateBusinessPayload('ActualPeriod',{...payloads.ActualPeriod,knowledgeDate:'2026-01-01'}),'INVALID_PAYLOAD_KEYS');
  bad(validateBusinessPayload('PTEC',{...payloads.PTEC,status:'open'}),'INVALID_PAYLOAD_KEYS');
  for (const lifecycle of ['confirmed','suspended']) bad(validateBusinessPayload('PT',{...payloads.PT,lifecycle}),'INVALID_LIFECYCLE');
  bad(validateBusinessPayload('ProjectSettings',{...payloads.ProjectSettings,program:identity('Pas','pas')}),'IDENTITY_KIND_MISMATCH');
  bad(validateBusinessPayload('ProjectSettings',{...payloads.ProjectSettings,ownColor:'#aabbcc'}),'INVALID_CANONICAL_COLOR');
});
test('G12-01 runtime unknown accessors, cycles, sparse arrays and forged quantities',() => {
  bad(validateBusinessPayload('PT',{...payloads.PT,dailyCap:{kind:'present',value:q('Capacity')}}),'QUANTITY_FAMILY_MISMATCH');
  const accessor = {...payloads.TeamSettings}; Object.defineProperty(accessor,'name',{get(){throw new Error('must not execute');},enumerable:true});
  assert.equal(validateBusinessPayload('TeamSettings',accessor).ok,false);
  const cycle: Raw = {}; cycle.self = cycle; assert.equal(validateBusinessPayload('Pas',cycle).ok,false);
  const sparse = Array(2); assert.equal(validateBusinessPayload('PortfolioOrder',{projectIds:sparse}).ok,false);
  bad(validateBusinessPayload('TeamActual',{consumed:q('Consumption',-1n)}),'NEGATIVE_QUANTITY');
});
test('G12-02 immutable registry, repetitions, branches, append and exact lookup',() => {
  const f = fixture(), original = f.get('ps');
  const branch = {...structuredClone(original),ref:ref('ProjectSettings','ps','v2'),predecessor:original.ref};
  const other = {...structuredClone(branch),ref:ref('ProjectSettings','ps','v3')};
  const registry = ok(createVersionRegistry([...f.versions,branch,other,original]));
  assert.equal(registry.context.identicalRepetitions.length,1);
  const next = ok(withVersions(registry,[{...structuredClone(original),ref:ref('ProjectSettings','ps','v4')} ]));
  assert.equal(next.versions.length,registry.versions.length+1);
  original.payload.name = 'changed'; assert.equal((ok(lookupExact(registry,original.ref)).payload as Raw).name,'Project');
  assert.throws(() => ((registry.versions.at(0)!.payload as Raw).x = true));
  bad(lookupExact(registry,ref('ProjectSettings','ps','absent')),'MISSING_EXACT_VERSION');
});
test('G12-02 collisions, owner changes and contextual cycles refused',() => {
  const f = fixture(), p = f.get('ps');
  bad(createVersionRegistry([...f.versions,{...structuredClone(p),payload:{...p.payload,name:'Other'}}]),'DIVERGENT_VERSION_COLLISION');
  bad(createVersionRegistry([...f.versions,{...structuredClone(p),ref:ref('ProjectSettings','ps','v2'),owner:{type:'Project',projectId:id('ProjectId','other')}}]),'IMMUTABLE_OWNER_MISMATCH');
  p.predecessor = ref('ProjectSettings','ps','v2');
  bad(createVersionRegistry([...f.versions,{...structuredClone(p),ref:ref('ProjectSettings','ps','v2'),predecessor:p.ref}]),'LINEAGE_CYCLE');
});
test('G12-03 empty explicit manifest and inventories derived from opaque Settings owners',() => {
  ok(fixture(true).certify()); const f = fixture(), graph = ok(f.certify());
  assert.throws(() => ((manifestTables as any)[0][0] = 'rootIds'));
  assert.deepEqual(graph.inventories.projects,[id('ProjectId','p')]);
  assert.deepEqual(graph.inventories.teams,[id('TeamId','t1'),id('TeamId','t2')]);
  assert.notEqual(f.get('ps').ref.entityId.value,f.get('ps').owner.projectId.value);
  bad(createPortfolioManifest({...f.manifest,rootIds:[]}),'INVALID_MANIFEST_KEYS');
  bad(createCurrentSelection({manifest:f.manifest,revision:'r',history:[]}),'INVALID_CURRENT_KEYS');
});
test('G12-03 duplicate selection and wrong table kind refused',() => {
  const f = fixture(); f.manifest.projectSettings.push(ref('ProjectSettings','ps','v2'));
  bad(f.certify(),'MULTIPLE_IDENTITY_SELECTION'); f.manifest.projectSettings.pop();
  f.manifest.teamCapacities[0] = f.get('ts-t1').ref; bad(f.certify(),'REFERENCE_KIND_MISMATCH');
});
test('G12-04 exact resolver invariant under registry permutation; no predecessor/provenance substitution',() => {
  const f = fixture(); assert.deepEqual(ok(resolvePortfolioManifest(f.manifest,f.versions)),ok(resolvePortfolioManifest(f.manifest,[...f.versions].reverse())));
  const p = f.get('ps'); p.ref = ref('ProjectSettings','ps','v2');
  p.provenance = [ref('ProjectSettings','ps','v1')];
  bad(f.certify(),'MISSING_EXACT_VERSION');
});
test('G12-04/B1 Snapshot v10000: ten thousand historical versions available only to witness; zero historical/Current reads',async () => {
  const f = fixture(); const ps = f.get('ps');
  const witness = Array.from({length:10000},(_,i) => ({...structuredClone(ps),ref:ref('ProjectSettings','ps',`v${i+1}`),...(i ? {predecessor:ref('ProjectSettings','ps',`v${i}`)} : {})}));
  ps.ref = witness.at(-1)!.ref; ps.predecessor = ref('ProjectSettings','ps','v9999'); ps.provenance = [ref('Program','historic','v77')];
  f.manifest.projectSettings = [ps.ref];
  let historicalReads = 0, currentReads = 0;
  const current = {async readCurrentSelection() { currentReads++; throw new Error('Current unavailable'); }}; void current;
  const snapshots: SnapshotReader = {async readSnapshot() { return success(f.snapshot()); }};
  const versions: ExactVersionsReader = {async readExactVersions(refs) {
    const found = refs.map(r => { const v = f.versions.find(v => sameReference(v.ref,r)); if (!v) {historicalReads++; throw new Error('historical forbidden');} return v; }); return success(found);
  }};
  const graph = ok(await loadSnapshotGraph(snapshots,versions,id('SnapshotId','snapshot')));
  assert.equal(graph.context.status,'not-established'); assert.deepEqual(graph.context.missingPredecessors,[ps.predecessor]);
  const selected = graph.versions.find(v => v.ref.entityId.value === 'ps')!; assert.deepEqual(selected.predecessor,ps.predecessor); assert.deepEqual(selected.provenance,ps.provenance);
  assert.equal(historicalReads,0); assert.equal(currentReads,0); assert.equal(witness.length,10000);
  // History remains available in the witness, never requested to repair business closure.
  f.remove('cap-t1'); bad(certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot(),versions:f.versions}),'TEAM_CAPACITY_REQUIRED');
  const g = fixture(); g.get('ps').payload.program = identity('Program','program'); g.get('ps').payload.ownColor = null; g.remove('program');
  bad(g.certify(),'MISSING_CATALOG_REFERENCE');
});
test('G12-04 read ports reject wrong versions, Snapshot IDs and propagate read diagnostics',async () => {
  const f = fixture(), adapter = ok(createMemoryPortfolioReadAdapter(f.versions,{manifest:f.manifest,revision:'r1'},[f.snapshot()]));
  const wrong: ExactVersionsReader = {async readExactVersions() { return success(f.versions.map(v => ({...v,ref:{...v.ref,versionId:id('VersionId','wrong')}}))); }};
  bad(await loadCurrentGraph(adapter.current,wrong),'READ_REFERENCE_MISMATCH');
  bad(await loadSnapshotGraph({async readSnapshot(){return success(f.snapshot('2026-01-01','other'));}},adapter.versions,id('SnapshotId','snapshot')),'READ_SNAPSHOT_ID_MISMATCH');
  bad(await loadSnapshotGraph(adapter.snapshots,{async readExactVersions(){return invalid('READ_FAILED','reader');}},id('SnapshotId','snapshot')),'READ_FAILED');
});
function tombstones(f: ReturnType<typeof fixture>) {
  for (const v of f.versions) if (['ProjectSettings','ReservationSettings','TeamSettings','PT','RT'].includes(v.ref.kind)) v.payload.lifecycle = 'deleted';
  for (const t of ['t1','t2']) f.remove(`ptec-${t}`);
  for (const v of [...f.versions]) if (v.ref.kind === 'TeamActual') f.remove(v.ref.entityId.value);
}
test('G12-05 tombstones keep covered AP, archived positive actuals, capacities and references',() => {
  const f = fixture(); f.cover(); f.cover('r'); f.get('ta-p-t1-a').payload.consumed = q('Consumption',99n);
  tombstones(f); const graph = ok(f.certify()); assert.equal(graph.versions.filter(v => v.ref.kind === 'TeamCapacity').length,2);
  f.remove('cap-t1'); bad(f.certify(),'TEAM_CAPACITY_REQUIRED');
});
test('G12-05 deleted endpoints forbid existing PT/RT; deleted associations forbid selected TA/PTEC',() => {
  for (const kind of ['PT','RT']) {
    const f = fixture(); f.get('ts-t1').payload.lifecycle = 'deleted';
    if (kind === 'RT') {f.get('pt-t1').payload.lifecycle = 'deleted'; f.remove('ptec-t1');}
    bad(f.certify(),'DELETED_ASSOCIATION_ENDPOINT');
  }
  const f = fixture(); f.get('pt-t1').payload.lifecycle = 'deleted'; bad(f.certify(),'PTEC_SELECTION_MISMATCH');
  f.remove('ptec-t1'); f.cover(); bad(f.certify(),'INCOMPLETE_OR_FOREIGN_ACTUAL_GRID');
});
test('G12-05 restored owner with only deleted associations; hidden/inactive owners retain complete grid',() => {
  const f = fixture(); f.cover(); ok(f.certify()); tombstones(f); f.get('ps').payload.lifecycle = 'existing'; ok(f.certify());
});
test('G12-06 empty/covered partitions, leap day, singleton and date extremes',() => {
  const f = fixture(); f.cover(); f.cover('r'); ok(f.certify());
  const g = fixture();
  for (const t of ['t1','t2']) {g.get(`pt-${t}`).payload.lifecycle='deleted';g.remove(`ptec-${t}`);}
  const ap = g.get('ap-p'); const sub = g.add('ActualSubPeriod','single',{type:'ActualPeriod',actualPeriod:identity('ActualPeriod','ap-p')},{from:'9999-12-31',through:'9999-12-31'});
  ap.payload = {coverage:'covered',from:'9999-12-31',through:'9999-12-31',subPeriods:[sub.ref]}; ok(g.certify());
  sub.payload = {from:'0000-01-01',through:'9999-12-31'}; ap.payload.from = '0000-01-01'; ok(g.certify());
});
test('G12-06 partition gaps, overlaps, ordering, bounds, wrong AP and extra SubPeriods refused',() => {
  for (const from of ['2024-03-02','2024-02-29']) { const f = fixture(); f.cover(); f.get('sp-p-b').payload = {from,through:'2024-03-03'}; f.get('ap-p').payload.through = '2024-03-03'; for(const t of ['t1','t2']) f.get(`ptec-${t}`).payload.lastActualsDate='2024-03-03'; bad(f.certify(),'NON_CONTIGUOUS_PARTITION'); }
  const f = fixture(); f.cover(); f.get('ap-p').payload.subPeriods.reverse(); bad(f.certify(),'PARTITION_BOUNDARY_MISMATCH');
  f.get('ap-p').payload.subPeriods.reverse(); f.get('sp-p-a').owner.actualPeriod = identity('ActualPeriod','ap-r'); bad(f.certify(),'SUBPERIOD_AP_OWNER_MISMATCH');
  const g = fixture(); g.remove('ap-p'); bad(g.certify(),'ACTUAL_PERIOD_REQUIRED');
  const h = fixture(); h.add('ActualSubPeriod','extra',{type:'ActualPeriod',actualPeriod:identity('ActualPeriod','ap-p')}); bad(h.certify(),'EXTRA_SUBPERIOD');
  bad(validateBusinessPayload('ActualPeriod',{...payloads.ActualPeriod,from:'2026-01-01'}),'EMPTY_BOUND');
});
test('G12-06 earliest constraint is independent of activity and lifecycle',() => {
  const f = fixture(); f.cover(); f.get('ps').payload.earliestStartDate='2024-02-29'; bad(f.certify(),'AP_BEFORE_EARLIEST');
  tombstones(f); bad(f.certify(),'AP_BEFORE_EARLIEST');
});
test('G12-07 exact 2x2 grids include zeros, RT demand zero and inactive/hidden roots',() => {
  const f = fixture(); f.cover(); f.cover('r'); const g = ok(f.certify());
  assert.equal(g.versions.filter(v => v.ref.kind === 'TeamActual').length,8);
  f.remove('ta-p-t1-a'); bad(f.certify(),'INCOMPLETE_OR_FOREIGN_ACTUAL_GRID');
});
test('G12-07 foreign association/subperiod and forged Consumption family refused',() => {
  const f = fixture(); f.cover(); f.get('ta-p-t1-a').owner.association = identity('PT','missing'); bad(f.certify(),'INCOMPLETE_OR_FOREIGN_ACTUAL_GRID');
  const g = fixture(); g.cover(); g.get('ta-p-t1-a').payload.consumed = q('ETC'); bad(g.certify(),'QUANTITY_FAMILY_MISMATCH');
  const h = fixture(); h.cover(); h.cover('r'); h.get('ta-p-t1-a').owner.subPeriod = identity('ActualSubPeriod','sp-r-a'); bad(h.certify(),'INCOMPLETE_OR_FOREIGN_ACTUAL_GRID');
});
test('G12-08 PTEC AP identity stable across through-equivalent AP versions',() => {
  const f = fixture(); f.cover(); const ap = f.get('ap-p'), old = structuredClone(ap); ap.ref = ref('ActualPeriod','ap-p','v2'); ap.predecessor=old.ref; f.versions.push(old); f.manifest.actualPeriods = [ap.ref,f.get('ap-r').ref];
  ok(f.certify()); assert.equal(f.get('ptec-t1').ref.versionId.value,'v1');
  f.get('ptec-t1').payload.lastActualsDate='2024-03-02'; bad(f.certify(),'PTEC_ACTUALS_BOUNDARY_MISMATCH');
});
test('G12-08 missing/foreign PTEC and version AP references refused',() => {
  const f = fixture(); f.remove('ptec-t1'); bad(f.certify(),'PTEC_SELECTION_MISMATCH');
  const g = fixture(); g.get('ptec-t1').payload.actualPeriod = identity('ActualPeriod','ap-r'); bad(g.certify(),'PTEC_AP_OWNER_MISMATCH');
  g.get('ptec-t1').payload.actualPeriod = ref('ActualPeriod','ap-p'); bad(g.certify(),'IDENTITY_KIND_MISMATCH');
});
test('G12-09 calendar gaps and exceptions outside horizon; RT zero modes',() => {
  const f = fixture(); f.get('cap-t1').payload = {periods:[{start:'0000-01-01',end:'0000-01-01',dailyCapacity:q('Capacity'),unavailabilityRatio:q('UnavailabilityRatio',1n)},{start:'9999-12-31',end:'9999-12-31',dailyCapacity:q('Capacity',1n),unavailabilityRatio:q('UnavailabilityRatio')}],exceptions:[{date:'2020-01-01',capacity:q('Capacity')}]};
  f.get('rt-t1').payload.demand={mode:'fixed-daily',daily:q('FixedDailyDemand')}; ok(f.certify());
  f.get('rt-t1').payload.demand={mode:'ratio',ratio:q('ReservationRatio',2n)}; bad(f.certify(),'RATIO_OUT_OF_RANGE');
  bad(validateBusinessPayload('RT',{lifecycle:'existing',demand:{mode:'ratio',ratio:q('ReservationRatio'),daily:q('FixedDailyDemand')}}),'INVALID_PAYLOAD_KEYS');
});
test('G12-09 overlaps, duplicate exceptions, weekday/limit/horizon invalidity',() => {
  const period = {start:'2026-01-01',end:'2026-02-01',dailyCapacity:q('Capacity'),unavailabilityRatio:q('UnavailabilityRatio')};
  bad(validateBusinessPayload('TeamCapacity',{periods:[period,period],exceptions:[]}),'UNORDERED_OR_OVERLAPPING_CALENDAR');
  const exception = {date:'2026-01-01',capacity:q('Capacity')}; bad(validateBusinessPayload('TeamCapacity',{periods:[],exceptions:[exception,exception]}),'UNORDERED_OR_OVERLAPPING_CALENDAR');
  bad(validateBusinessPayload('PlanningSettings',{...payloads.PlanningSettings,workingWeekdays:[1,1]}),'DUPLICATE_WEEKDAY');
  bad(validateBusinessPayload('PlanningSettings',{...payloads.PlanningSettings,maxParallelProjects:0}),'INVALID_PARALLEL_LIMIT');
  bad(validateBusinessPayload('PlanningSettings',{...payloads.PlanningSettings,horizon:{start:'2026-02-01',end:'2026-01-01'}}),'INVERTED_INTERVAL');
});
for (const root of ['ps','rs']) for (const catalog of ['Program','Pas']) for (const ownerLifecycle of ['existing','deleted']) for (const catalogLifecycle of ['existing','deleted']) test(`G12-09/B3 ${root} ${ownerLifecycle} -> ${catalog} ${catalogLifecycle}`,() => {
  const f = fixture(); tombstones(f); f.get(root).payload.lifecycle=ownerLifecycle;
  const key = catalog.toLowerCase(); f.get(root).payload[key] = identity(catalog,key); if (catalog === 'Program') f.get(root).payload.ownColor=null;
  f.get(key).payload.lifecycle = catalogLifecycle;
  if (ownerLifecycle === 'existing' && catalogLifecycle === 'deleted') bad(f.certify(),'DELETED_CATALOG_REFERENCE'); else ok(f.certify());
  f.remove(key); bad(f.certify(),'MISSING_CATALOG_REFERENCE');
});
test('G12-09 catalogues autonomous, normalized existing names unique; deleted releases name',() => {
  const f = fixture(); ok(f.certify()); const program=f.get('program'); f.add('Program','other-program',program.owner,{...program.payload,name:'PROGRAM'}); bad(f.certify(),'DUPLICATE_CATALOG_NAME');
  f.get('other-program').payload.lifecycle='deleted'; ok(f.certify());
  bad(validateBusinessPayload('Pas',{name:'  a   b ',lifecycle:'existing'}),'NON_CANONICAL_CATALOG_NAME');
});
test('G12-09 order complete for inactive and deleted projects',() => {
  const f = fixture(); tombstones(f); ok(f.certify()); f.get('order').payload.projectIds=[]; bad(f.certify(),'INCOMPLETE_PORTFOLIO_ORDER');
  bad(validateBusinessPayload('PortfolioOrder',{projectIds:[id('ProjectId','p'),id('ProjectId','p')]}),'DUPLICATE_PROJECT_ORDER');
});
test('G12-10 Snapshot bound includes inactive/deleted AP, empty ignores bound, dates equal/backwards allowed',() => {
  const f = fixture(); f.cover(); tombstones(f); ok(certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot(),versions:f.versions}));
  bad(certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot('2024-02-29'),versions:f.versions}),'SNAPSHOT_BEFORE_ACTUALS');
  const g = fixture(); ok(certifyPortfolioGraph({source:'snapshot',snapshot:g.snapshot('0000-01-01'),versions:g.versions}));
  for (const s of [g.snapshot('2026-01-01','a'),g.snapshot('2026-01-01','b'),g.snapshot('2025-01-01','c')]) ok(createPortfolioSnapshot(s));
  const s: Raw = g.snapshot(); delete s.knowledgeDate; bad(createPortfolioSnapshot(s),'INVALID_SNAPSHOT_KEYS');
  bad(createPortfolioSnapshot({...g.snapshot(),result:{}}),'INVALID_SNAPSHOT_KEYS');
  bad(createPortfolioSnapshot({...g.snapshot(),createdAt:'2026-02-30T24:00:00.000Z'}),'INVALID_CREATED_AT');
});
test('G12-10 historical Snapshot independent after explicit divergent Current; adapter copies input',async () => {
  const f = fixture(), snapshot = structuredClone(f.snapshot()), old = f.get('ps');
  const next = {...structuredClone(old),ref:ref('ProjectSettings','ps','v2'),predecessor:old.ref,payload:{...old.payload,name:'Changed'}};
  f.versions.push(next); f.manifest.projectSettings=[next.ref];
  const adapter = ok(createMemoryPortfolioReadAdapter(f.versions,{manifest:f.manifest,revision:'r2'},[snapshot]));
  next.payload.name='mutated';
  const current = ok(await loadCurrentGraph(adapter.current,adapter.versions)), historical = ok(await loadSnapshotGraph(adapter.snapshots,adapter.versions,snapshot.snapshotId));
  assert.equal((current.versions.find(v => v.ref.entityId.value === 'ps')!.payload as Raw).name,'Changed');
  assert.equal((historical.versions.find(v => v.ref.entityId.value === 'ps')!.payload as Raw).name,'Project');
  bad(await loadSnapshotGraph(adapter.snapshots,adapter.versions,id('SnapshotId','absent')),'READ_SNAPSHOT_MISSING');
  const partial = ok(createMemoryPortfolioReadAdapter(f.versions.filter(v => v !== old),{manifest:f.manifest,revision:'r2'},[snapshot]));
  bad(await loadSnapshotGraph(partial.snapshots,partial.versions,snapshot.snapshotId),'MISSING_EXACT_VERSION');
});
for (const entity of ['ps','rs','ts-t1','cap-t1','ap-p','ptec-t1','pt-t1','rt-t1','planning','order']) test(`G12-11/B2 owner mapping ${entity}: same identity versions accepted; different identity never selected refused`,() => {
  const f=fixture(), v=f.get(entity), next={...structuredClone(v),ref:{...v.ref,versionId:id('VersionId','v2')}};
  ok(createVersionRegistry([...f.versions,next]));
  bad(createVersionRegistry([...f.versions,{...next,ref:{...next.ref,entityId:id('EntityId','another-identity')}}]),'OWNER_IDENTITY_CONFLICT');
});
test('G12-11 TA identity per cell; lifecycle changes under same PT identity accepted',() => {
  const f=fixture(); f.cover(); const ta=f.get('ta-p-t1-a'), next={...structuredClone(ta),ref:{...ta.ref,versionId:id('VersionId','v2')}};
  ok(createVersionRegistry([...f.versions,next])); bad(createVersionRegistry([...f.versions,{...next,ref:{...next.ref,entityId:id('EntityId','other')}}]),'OWNER_IDENTITY_CONFLICT');
  const pt=f.get('pt-t1'); ok(createVersionRegistry([...f.versions,{...structuredClone(pt),ref:ref('PT','pt-t1','v2'),payload:{...pt.payload,lifecycle:'deleted'}}]));
});
test('G12-12/B4 unknown/deserialized data revalidated; forged validated flag has no authority',() => {
  const f=fixture(); const value=ok(f.certify());
  const serialized = JSON.stringify({source:'current',manifest:value.manifest,versions:value.versions},(_,v) => typeof v === 'bigint' ? {bigint:String(v)} : v);
  const unknown: unknown = JSON.parse(serialized,(_,v) => v && typeof v === 'object' && Object.keys(v).length === 1 && typeof v.bigint === 'string' ? BigInt(v.bigint) : v);
  ok(certifyPortfolioGraph(unknown));
  const malformed=JSON.parse(serialized,(_,v) => v && typeof v === 'object' && Object.keys(v).length === 1 && typeof v.bigint === 'string' ? BigInt(v.bigint) : v); malformed.manifest.ptecs=[];
  bad(certifyPortfolioGraph(malformed),'PTEC_SELECTION_MISMATCH');
  bad(certifyPortfolioGraph({...malformed,validated:true}),'INVALID_CERTIFICATION_KEYS');
  f.manifest.ptecs=[]; bad(f.certify(),'PTEC_SELECTION_MISMATCH');
  assert.equal(value.manifest.ptecs.length,2); assert.throws(() => ((value.manifest.ptecs as any[]).pop()));
});
test('G12-12 structure independent of transition history and static opacity/quantity families',() => {
  const f=fixture(), g=fixture(); g.get('ps').predecessor=ref('ProjectSettings','ps','old');
  const a=ok(f.certify()), b=ok(g.certify()); assert.deepEqual(a.inventories,b.inventories); assert.equal(b.context.status,'not-established');
  const raw: PortfolioGraph=a;
  // @ts-expect-error private brand prevents ordinary construction
  const forged: ValidatedPortfolioGraph=raw; void forged;
  // @ts-expect-error readonly manifest
  if (false) a.manifest.ptecs=[];
  const etc=ok(createQuantity('ETC',ok(parseRational('0'))));
  // @ts-expect-error ETC cannot replace consumption
  const ta: BusinessPayloadByKind['TeamActual']={consumed:etc}; void ta;
  ok(createBusinessVersion(f.get('ps')));
});
test('G12-04 Snapshot-only adapter has no Current data; wrong extra response is diagnosed',async () => {
  const f=fixture(), adapter=ok(createMemoryPortfolioReadAdapter(f.versions,null,[f.snapshot()]));
  ok(await loadSnapshotGraph(adapter.snapshots,adapter.versions,id('SnapshotId','snapshot')));
  bad(await loadCurrentGraph(adapter.current,adapter.versions),'READ_CURRENT_MISSING');
  const extra={...structuredClone(f.get('program')),ref:ref('Program','unrequested')};
  bad(await loadSnapshotGraph(adapter.snapshots,{async readExactVersions(){return success([...f.versions,extra]);}},id('SnapshotId','snapshot')),'READ_REFERENCE_MISMATCH');
});
test('G12-05/B3 Team deleted rejects two Capacity identities, even only one selected',() => {
  const f=fixture(); tombstones(f); const cap=f.get('cap-t1');
  f.versions.push({...structuredClone(cap),ref:ref('TeamCapacity','other-capacity')}); bad(f.certify(),'OWNER_IDENTITY_CONFLICT');
});
test('G12-06 foreign AP owner and AP/SubPeriod selection version disagreement',() => {
  const f=fixture(); f.get('ap-p').owner={type:'Project',projectId:id('ProjectId','absent')}; bad(f.certify(),'ACTUAL_PERIOD_REQUIRED');
  const g=fixture(); g.cover(); const sub=g.get('sp-p-a'), newer={...structuredClone(sub),ref:ref('ActualSubPeriod','sp-p-a','v2')};
  g.versions.push(newer); g.manifest.actualSubPeriods[0]=newer.ref; bad(g.certify(),'MISSING_PARTITION_REFERENCE');
});
test('G12-06/08 bound adjustments and split with empty provenance preserve unaffected TA/PTEC versions',() => {
  const f=fixture(); f.cover();
  // Same identities; the boundary moves and every cell remains explicitly supplied.
  f.get('sp-p-a').payload.through='2024-02-28'; f.get('sp-p-b').payload.from='2024-02-29'; ok(f.certify());
  // Explicit split into new identities, with no required provenance sources.
  f.remove('sp-p-b'); for (const t of ['t1','t2']) f.remove(`ta-p-${t}-b`);
  f.get('ap-p').payload.subPeriods=[f.get('sp-p-a').ref];
  for (const [suffix,date] of [['c','2024-02-29'],['d','2024-03-01']]) {
    const sub=f.add('ActualSubPeriod',`sp-p-${suffix}`,{type:'ActualPeriod',actualPeriod:identity('ActualPeriod','ap-p')},{from:date,through:date});
    f.get('ap-p').payload.subPeriods.push(sub.ref);
    for(const t of ['t1','t2']) f.add('TeamActual',`ta-p-${t}-${suffix}`,{type:'PTSubPeriod',association:identity('PT',`pt-${t}`),subPeriod:identity('ActualSubPeriod',`sp-p-${suffix}`)});
  }
  ok(f.certify()); assert.equal(f.get('ptec-t1').ref.versionId.value,'v1'); assert.equal(f.get('ta-p-t1-a').ref.versionId.value,'v1');
});
test('G12-08 empty AP requires null PTEC date and orphan PTEC cannot certify',() => {
  const f=fixture(); f.get('ptec-t1').payload.lastActualsDate='2026-01-01'; bad(f.certify(),'PTEC_ACTUALS_BOUNDARY_MISMATCH');
  const g=fixture(); g.add('PTEC','orphan',{type:'PT',pt:identity('PT','absent')}); bad(g.certify(),'FOREIGN_PTEC_OWNER');
});
test('G12-09 foreign Portfolio catalogue and unknown order Project refused',() => {
  const f=fixture(); f.get('program').owner.portfolioId=id('PortfolioId','other'); bad(f.certify(),'FOREIGN_PORTFOLIO');
  const g=fixture(); g.get('order').payload.projectIds=[id('ProjectId','absent')]; bad(g.certify(),'INCOMPLETE_PORTFOLIO_ORDER');
});
test('G12-12 certification wrapper accessors/source and JS-cast incomplete graph cannot bypass validation',() => {
  const f=fixture(); bad(certifyPortfolioGraph({source:'forged',manifest:f.manifest,versions:f.versions}),'INVALID_GRAPH_SOURCE');
  const accessor = {source:'current',versions:f.versions}; Object.defineProperty(accessor,'manifest',{get(){throw new Error('must not execute');},enumerable:true});
  bad(certifyPortfolioGraph(accessor),'INVALID_DATA_PROPERTY');
  const forged = {manifest:f.manifest,versions:[]} as unknown as ValidatedPortfolioGraph;
  bad(certifyPortfolioGraph({source:'current',manifest:forged.manifest,versions:forged.versions}),'MISSING_EXACT_VERSION');
});

for (const kind of versionKinds) test(`PERF-P0 ${kind}: indexed exact refs, mappings and complete collisions`,() => {
  const f = fixture(); f.cover(); f.cover('r');
  const v = structuredClone(f.versions.find(v => v.ref.kind === kind)!);
  const next = {...structuredClone(v),ref:{...structuredClone(v.ref),versionId:id('VersionId','other/version: é')}};
  const registry = ok(createVersionRegistry([v,next,v,next,v]));
  assert.deepEqual(registry.versions.map(v=>v.ref),[v.ref,next.ref]);
  assert.deepEqual(registry.context.identicalRepetitions,[v.ref,next.ref,v.ref]);
  const reordered = Object.fromEntries(Object.entries(v).reverse());
  ok(createVersionRegistry([v,reordered]));
  const differentId = {...structuredClone(v),ref:{...structuredClone(v.ref),entityId:id('EntityId','__proto__')}};
  if (['Program','Pas','ActualSubPeriod'].includes(kind)) ok(createVersionRegistry([v,differentId]));
  else bad(createVersionRegistry([v,differentId]),'OWNER_IDENTITY_CONFLICT');
  const changed = {...structuredClone(v),provenance:[ref(kind,'absent/source','v:2')]};
  bad(createVersionRegistry([v,changed]),'DIVERGENT_VERSION_COLLISION');
});
test('PERF-P0 composite owners preserve component boundaries, family and kind',() => {
  const f=fixture(); f.cover(); f.cover('r');
  const pt=structuredClone(f.get('pt-t1')), other=structuredClone(f.get('pt-t2'));
  pt.owner.projectId.value='a/b'; pt.owner.teamId.value='c';
  other.owner.projectId.value='a'; other.owner.teamId.value='b/c';
  ok(createVersionRegistry([pt,other]));
  other.owner=structuredClone(pt.owner); bad(createVersionRegistry([pt,other]),'OWNER_IDENTITY_CONFLICT');
  const rt=structuredClone(f.get('rt-t1')); rt.ref.entityId.value=pt.ref.entityId.value;
  rt.owner.reservationId.value=pt.owner.projectId.value;rt.owner.teamId.value=pt.owner.teamId.value;
  ok(createVersionRegistry([pt,rt]));
  const rt2=structuredClone(f.get('rt-t2'));
  rt.owner.reservationId.value='a/b';rt.owner.teamId.value='c';
  rt2.owner.reservationId.value='a';rt2.owner.teamId.value='b/c';
  ok(createVersionRegistry([rt,rt2]));
  rt2.owner=structuredClone(rt.owner);bad(createVersionRegistry([rt,rt2]),'OWNER_IDENTITY_CONFLICT');
  const apProject=structuredClone(f.get('ap-p')),apReservation=structuredClone(f.get('ap-r'));
  apProject.owner.projectId.value='same';apReservation.owner.reservationId.value='same';
  ok(createVersionRegistry([apProject,apReservation]));
  const ta=structuredClone(f.get('ta-p-t1-a')),ta2=structuredClone(f.get('ta-r-t1-a'));
  ta2.owner.association.entityId.value=ta.owner.association.entityId.value;
  ta2.owner.subPeriod=structuredClone(ta.owner.subPeriod);
  ok(createVersionRegistry([ta,ta2]));
  ta2.owner=structuredClone(ta.owner);bad(createVersionRegistry([ta,ta2]),'OWNER_IDENTITY_CONFLICT');
  const ta3=structuredClone(ta);ta3.ref.entityId.value='different';
  ta.owner.association.entityId.value='a/b';ta.owner.subPeriod.entityId.value='c';
  ta3.owner.association.entityId.value='a';ta3.owner.subPeriod.entityId.value='b/c';
  ok(createVersionRegistry([ta,ta3]));
});
test('PERF-P0 exact reference components, tombstone and unselected mappings',() => {
  const f=fixture(),p=structuredClone(f.get('ps')),q=structuredClone(p);
  p.ref=ref('ProjectSettings','a/b','c');q.ref=ref('ProjectSettings','a','b/c');
  q.owner.projectId.value='distinct';ok(createVersionRegistry([p,q]));
  q.owner=structuredClone(p.owner);q.payload.lifecycle='deleted';
  bad(createVersionRegistry([p,q]),'OWNER_IDENTITY_CONFLICT');
  const original=ok(createVersionRegistry(f.versions));
  bad(withVersions(original,[{...structuredClone(f.get('ps')),ref:ref('ProjectSettings','unselected') }]),'OWNER_IDENTITY_CONFLICT');
});
test('PERF-P0 withVersions remains atomic, detached and deeply frozen',() => {
  const f=fixture(),original=ok(createVersionRegistry(f.versions)),before=structuredClone(original);
  const batch: Raw[]=[{...structuredClone(f.get('ps')),ref:ref('ProjectSettings','ps','v2')}];
  const appended=ok(withVersions(original,batch));
  bad(withVersions(original,[...batch,{invalid:true}]),'INVALID_RECORD');
  assert.deepEqual(original,before);
  batch[0]!.payload.name='mutated';batch[0]!.owner.projectId.value='changed';
  assert.equal((appended.versions.at(-1)!.payload as Raw).name,'Project');
  function frozen(x: unknown): void {if(x!==null&&typeof x==='object'){assert.ok(Object.isFrozen(x));for(const child of Object.values(x))frozen(child);}}
  frozen(appended);frozen(original);
  assert.deepEqual(Object.keys(appended),['versions','context']);
});


test('PERF-P1 batch preserves sequential diagnostics, order, repeats and immutable copies',async () => {
  const f = fixture();
  const registry = ok(createVersionRegistry(f.versions));
  const refs = registry.versions.map(v => v.ref);
  const missing = ref('PlanningSettings','planning','absent');
  const malformed = {kind:'PT'};
  for (const requests of [[],refs,[...refs].reverse(),[...refs,...refs],[missing,malformed],[refs[0],malformed,missing]]) {
    const values: unknown[] = [];
    let expected: DomainResult<readonly unknown[]> = success(values), index: number | null = null;
    for (const [i,r] of requests.entries()) {
      const found = lookupExact(registry,r);
      if (!found.ok) { expected = found; index = i; break; }
      values.push(found.value);
    }
    const actual = lookupExactBatch(registry,requests);
    assert.deepEqual(actual,{result:expected,failedIndex:index});
    assert.ok(Object.isFrozen(actual));
    if (actual.result.ok) assert.ok(Object.isFrozen(actual.result.value));
  }
  const adapter = ok(createMemoryPortfolioReadAdapter(f.versions,null,[]));
  f.versions[0]!.payload.maxParallelProjects = 999;
  const first = ok(await adapter.versions.readExactVersions([refs[0]!,refs[0]!]));
  assert.deepEqual(first,[registry.versions[0],registry.versions[0]]);
  const frozen = (v: unknown): void => { if (v && typeof v === 'object') { assert.ok(Object.isFrozen(v)); for (const child of Object.values(v)) frozen(child); } };
  frozen(first);
  assert.throws(() => { (first[0]!.payload as Raw).maxParallelProjects = 44; });
  assert.deepEqual(ok(await adapter.versions.readExactVersions([refs[0]!])),[registry.versions[0]]);
});
for (const [table,kind] of manifestTables) test(`PERF-P1 ${table}: validated identity table keeps index, kind priority and adversarial bytes`,() => {
  const f = fixture();
  const refs = Array.from({length:150},(_,i) => ref(kind,` /:é __proto__ ${i}`));
  f.manifest[table] = refs;
  const manifest = ok(createPortfolioManifest(f.manifest,'custom'));
  refs[149] = ref(kind,refs[0]!.entityId.value,'branch');
  const duplicate = createPortfolioManifest(f.manifest,'custom');
  assert.deepEqual(duplicate,invalid('MULTIPLE_IDENTITY_SELECTION',`custom.${table}.149`));
  refs[149] = ref('PlanningSettings',refs[0]!.entityId.value);
  bad(createPortfolioManifest(f.manifest,'custom'),'REFERENCE_KIND_MISMATCH');
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest[table]));
  assert.equal(manifest[table].at(149)?.entityId.value,' /:é __proto__ 149');
});
test('PERF-P1 port duplicate response accepted; registry refusal precedes missing and extras',async () => {
  const f = fixture();
  const adapter = ok(createMemoryPortfolioReadAdapter(f.versions,{manifest:f.manifest,revision:'r1'},[f.snapshot()]));
  const reader = (value: unknown): ExactVersionsReader => ({async readExactVersions() { return success(value); }});
  const repeated = [...f.versions,f.versions[0]];
  assert.deepEqual(await loadCurrentGraph(adapter.current,reader(repeated)),certifyPortfolioGraph({source:'current',manifest:f.manifest,versions:repeated}));
  assert.deepEqual(await loadCurrentGraph(adapter.current,reader([...f.versions.slice(1),{...f.versions[0],ref:ref('PlanningSettings','planning','extra')}])),invalid('READ_REFERENCE_MISMATCH','readExactVersions.0','Expected PlanningSettings/planning/v1'));
  const invalidResponse = [...f.versions.slice(1),null];
  assert.deepEqual(await loadCurrentGraph(adapter.current,reader(invalidResponse)),createVersionRegistry(invalidResponse));
});

test('PERF-P1 exact branches and adversarial components remain distinct across large batches',() => {
  const f = fixture(true);
  const source = f.versions[0]!;
  const versions: Raw[] = [];
  for (const bytes of ['/',':','é💡',' a ','__proto__','a/b:c']) {
    for (let i = 0; i < 75; i++) {
      const v = structuredClone(source);
      v.ref.entityId.value = `${bytes}${i}`;
      v.ref.versionId.value = bytes;
      versions.push(v,{...structuredClone(v),ref:{...structuredClone(v.ref),versionId:id('VersionId','branch')}});
    }
  }
  // PlanningSettings has a unique portfolio owner: one identity, many exact branches.
  for (const [i,v] of versions.entries()) { v.ref.entityId.value = 'planning'; v.ref.versionId.value += `:${i}`; }
  const registry = ok(createVersionRegistry(versions));
  const requests: Raw[] = registry.versions.map(v => structuredClone(v.ref)).reverse();
  const batch = lookupExactBatch(registry,[...requests,...requests]);
  assert.equal(batch.failedIndex,null);
  assert.deepEqual(ok(batch.result),[...registry.versions].reverse().concat([...registry.versions].reverse()));
  assert.deepEqual(Object.keys(batch),['result','failedIndex']);
  requests[0]!.versionId.value = 'unknown';
  assert.deepEqual(lookupExactBatch(registry,requests).result,lookupExact(registry,requests[0]));
  assert.equal(lookupExactBatch(registry,requests).failedIndex,0);
  assert.equal(ok(batch.result)[0]!.ref.versionId.value,registry.versions.at(-1)!.ref.versionId.value);
});
