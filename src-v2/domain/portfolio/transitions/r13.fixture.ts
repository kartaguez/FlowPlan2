import type { DomainResult } from '../../primitives/result.js';
export function ok<T>(r:DomainResult<T>):T { if (!r.ok) throw new Error('Refused'); return r.value; }
export type Raw = Record<string,any>;
export const id = (family:string,value:string) => ({family,value});
export const identity = (kind:string,value:string) => ({kind,entityId:id('EntityId',value)});
export const ref = (kind:string,value:string,version='v1') => ({...identity(kind,value),versionId:id('VersionId',version)});
export const q = (family:string,n=0n,d=1n) => ({family,unit:['Consumption','ETC'].includes(family) ? 'work' : family.includes('Ratio') ? 'ratio' : 'work/day',value:{numerator:n,denominator:d}});
export function fixture() {
  const versions:Raw[] = [], manifest:Raw = {portfolioId:id('PortfolioId','portfolio'),planningSettings:ref('PlanningSettings','planning'),portfolioOrder:ref('PortfolioOrder','order'),projectSettings:[],reservationSettings:[],teamSettings:[],teamCapacities:[],programs:[],pas:[],pts:[],rts:[],actualPeriods:[],actualSubPeriods:[],teamActuals:[],ptecs:[]};
  const tables:Raw = {ProjectSettings:'projectSettings',ReservationSettings:'reservationSettings',TeamSettings:'teamSettings',TeamCapacity:'teamCapacities',Program:'programs',Pas:'pas',PT:'pts',RT:'rts',ActualPeriod:'actualPeriods',ActualSubPeriod:'actualSubPeriods',TeamActual:'teamActuals',PTEC:'ptecs'};
  const add = (kind:string,entity:string,owner:Raw,payload:Raw) => { const v = {ref:ref(kind,entity),owner,payload,provenance:[]}; versions.push(v); const key=Object.entries(tables).find(([k])=>k===kind)?.at(1); const refs=Object.entries(manifest).find(([k])=>k===key)?.at(1); if (Array.isArray(refs)) refs.push(v.ref); return v; };
  const get = (entity:string) => { const v=versions.find(v => v.ref.entityId.value===entity); if(!v) throw new Error('Fixture entity missing'); return v; };
  const portfolio = {type:'Portfolio',portfolioId:manifest.portfolioId};
  add('PlanningSettings','planning',portfolio,{horizon:{start:'2024-01-01',end:'2026-12-31'},workingWeekdays:[1,2,3,4,5],maxParallelProjects:2});
  add('PortfolioOrder','order',portfolio,{projectIds:[id('ProjectId','p'),id('ProjectId','p2')]});
  add('Program','program',portfolio,{name:'Program',lifecycle:'existing',color:'#AABBCC'}); add('Program','unused',portfolio,{name:'Unused',lifecycle:'existing',color:'#AABBCC'}); add('Pas','pas',portfolio,{name:'Pas',lifecycle:'existing'});
  for (const p of ['p','p2']) { add('ProjectSettings',`ps-${p}`,{type:'Project',projectId:id('ProjectId',p)},{name:p,lifecycle:'existing',isActive:p==='p',earliestStartDate:'2024-01-01',objectiveEndDate:null,mandatory:false,program:identity('Program','program'),pas:identity('Pas','pas'),ownColor:null}); }
  add('ReservationSettings','rs-r',{type:'Reservation',reservationId:id('ReservationId','r')},{name:'r',lifecycle:'existing',isActive:true,startDate:'2024-01-01',endDate:'2026-12-31',program:identity('Program','program'),pas:identity('Pas','pas'),ownColor:null});
  for (const t of ['t1','t2']) { const owner = {type:'Team',teamId:id('TeamId',t)}; add('TeamSettings',`ts-${t}`,owner,{name:t,lifecycle:'existing',isVisible:t==='t1'}); add('TeamCapacity',`cap-${t}`,owner,{periods:[],exceptions:[]}); }
  add('ActualPeriod','ap-p2',{type:'Project',projectId:id('ProjectId','p2')},{coverage:'empty',from:null,through:null,subPeriods:[]});
  for (const root of ['p','r']) {
    const owner = root==='p' ? {type:'Project',projectId:id('ProjectId',root)} : {type:'Reservation',reservationId:id('ReservationId',root)};
    const ap = add('ActualPeriod',`ap-${root}`,owner,{coverage:'covered',from:'2024-01-01',through:'2024-01-04',subPeriods:[]});
    for (const [s,from,through] of [['a','2024-01-01','2024-01-02'],['b','2024-01-03','2024-01-04']]) { const sp=add('ActualSubPeriod',`sp-${root}-${s}`,{type:'ActualPeriod',actualPeriod:identity('ActualPeriod',`ap-${root}`)},{from,through}); ap.payload.subPeriods.push(sp.ref); }
    for (const t of ['t1','t2']) {
      const kind=root==='p'?'PT':'RT', entity=`${kind.toLowerCase()}-${t}`;
      add(kind,entity,root==='p'?{type:'ProjectTeam',projectId:id('ProjectId','p'),teamId:id('TeamId',t)}:{type:'ReservationTeam',reservationId:id('ReservationId','r'),teamId:id('TeamId',t)},kind==='PT'?{lifecycle:'existing',dailyCap:{kind:'absent'}}:{lifecycle:'existing',demand:t==='t1'?{mode:'ratio',ratio:q('ReservationRatio')}:{mode:'fixed-daily',daily:q('FixedDailyDemand')}});
      for (const s of ['a','b']) add('TeamActual',`ta-${root}-${t}-${s}`,{type:kind==='PT'?'PTSubPeriod':'RTSubPeriod',association:identity(kind,entity),subPeriod:identity('ActualSubPeriod',`sp-${root}-${s}`)},{consumed:q('Consumption',s==='a'?1n:0n, s==='a'?3n:1n)});
      if (kind==='PT') add('PTEC',`ptec-${t}`,{type:'PT',pt:identity('PT',entity)},{actualPeriod:identity('ActualPeriod','ap-p'),lastActualsDate:ap.payload.through,etc:q('ETC',t==='t1'?2n:0n)});
    }
  }
  return {manifest,versions,get,current:{manifest,revision:'R7'}};
}
export function inventory(versions:readonly Raw[]) { const groups = new Map<string,Raw>(); for (const v of versions) { const k=`${v.ref.kind}/${v.ref.entityId.value}`; const group=groups.get(k); if (group) group.refs.push(v.ref); else groups.set(k,{identity:identity(v.ref.kind,v.ref.entityId.value),owner:v.owner,refs:[v.ref]}); } return [...groups.values()]; }
export const emptyReservations = {entityIds:[],versionIds:[],couples:[]};
