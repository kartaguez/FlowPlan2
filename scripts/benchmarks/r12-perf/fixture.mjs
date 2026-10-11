// Untrusted synthetic inputs; only production APIs can certify these fixtures.
import { createHash } from 'node:crypto';
export const sizes = { small: [10,5,12], medium: [100,20,24], large: [300,40,36] };
const id = (family,value) => ({family,value});
const identity = (kind,value) => ({kind,entityId:id('EntityId',value)});
const ref = (kind,value,version='v1') => ({...identity(kind,value),versionId:id('VersionId',version)});
const quantity = (family,n=0) => ({family,unit: family === 'Consumption' || family === 'ETC' ? 'work' : family.includes('Ratio') ? 'ratio' : 'work/day',value:{numerator:BigInt(n),denominator:1n}});
export function fixture(size,variant,seed=1202) {
  if (!sizes[size] || !['dense','sparse','history'].includes(variant)) throw new Error('Unknown scenario');
  const [projects,teams,subPeriods] = sizes[size];
  if (variant === 'history' && size !== 'small') throw new Error('History witness limited to small');
  let state=seed>>>0;
  const next = () => (state=(Math.imul(state,1664525)+1013904223)>>>0);
  const table = {ProjectSettings:'projectSettings',ReservationSettings:'reservationSettings',TeamSettings:'teamSettings',TeamCapacity:'teamCapacities',Program:'programs',Pas:'pas',PT:'pts',RT:'rts',ActualPeriod:'actualPeriods',ActualSubPeriod:'actualSubPeriods',TeamActual:'teamActuals',PTEC:'ptecs'};
  const portfolioId=id('PortfolioId','portfolio');
  const manifest={portfolioId,planningSettings:ref('PlanningSettings','planning'),portfolioOrder:ref('PortfolioOrder','order')};
  for (const key of Object.values(table)) manifest[key]=[];
  const versions=[];
  function add(kind,entity,owner,payload) {
    const v={ref:ref(kind,entity),owner,payload,provenance:[]}; versions.push(v);
    if (table[kind]) manifest[table[kind]].push(v.ref);
    return v;
  }
  const portfolio={type:'Portfolio',portfolioId};
  add('PlanningSettings','planning',portfolio,{horizon:{start:'2024-01-01',end:'2026-12-31'},workingWeekdays:[1,2,3,4,5],maxParallelProjects:10});
  add('PortfolioOrder','order',portfolio,{projectIds:Array.from({length:projects},(_,p)=>id('ProjectId',`p${p}`))});
  add('Program','program',portfolio,{name:'Program',lifecycle:'existing',color:'#AABBCC'});
  add('Pas','pas',portfolio,{name:'Pas',lifecycle:'existing'});
  for(let t=0;t<teams;t++) {
    const owner={type:'Team',teamId:id('TeamId',`t${t}`)};
    add('TeamSettings',`ts${t}`,owner,{name:`Team ${t}`,lifecycle:'existing',isVisible:t%2===0});
    add('TeamCapacity',`cap${t}`,owner,{periods:[{start:'2024-01-01',end:'2026-12-31',dailyCapacity:quantity('Capacity',8),unavailabilityRatio:quantity('UnavailabilityRatio')}],exceptions:[]});
  }
  // Consecutive single days, with pure fixed origin independent of execution date.
  const days=Array.from({length:subPeriods},(_,s)=>new Date(Date.UTC(2024,0,1+s)).toISOString().slice(0,10));
  function cover(entity,owner,associations) {
    const ap=add('ActualPeriod',`ap-${entity}`,owner,{coverage:'covered',from:days[0],through:days.at(-1),subPeriods:[]});
    for(let s=0;s<subPeriods;s++) {
      const sub=add('ActualSubPeriod',`sp-${entity}-${s}`,{type:'ActualPeriod',actualPeriod:identity('ActualPeriod',ap.ref.entityId.value)},{from:days[s],through:days[s]});
      ap.payload.subPeriods.push(sub.ref);
      for(const association of associations) {
        add('TeamActual',`ta-${association.ref.entityId.value}-${s}`,{type:association.ref.kind==='PT'?'PTSubPeriod':'RTSubPeriod',association:identity(association.ref.kind,association.ref.entityId.value),subPeriod:identity('ActualSubPeriod',sub.ref.entityId.value)},{consumed:quantity('Consumption',next()%5)});
      }
    }
    return ap;
  }
  for(let p=0;p<projects;p++) {
    const owner={type:'Project',projectId:id('ProjectId',`p${p}`)};
    const ps=add('ProjectSettings',`ps${p}`,owner,{name:`Project ${p}`,lifecycle:'existing',isActive:p%2===0,earliestStartDate:'2024-01-01',objectiveEndDate:null,mandatory:false,program:identity('Program','program'),pas:identity('Pas','pas'),ownColor:null});
    if(variant==='history' && p===0) {
      ps.ref.versionId=id('VersionId','v10000');
      ps.predecessor=ref('ProjectSettings','ps0','v9999');
      ps.provenance=[ref('Program','historic-program','v77')];
    }
    const associations=[];
    const count=variant==='dense'?teams:2;
    for(let j=0;j<count;j++) {
      const t=(p+seed+j)%teams;
      const pt=add('PT',`pt-${p}-${t}`,{type:'ProjectTeam',projectId:owner.projectId,teamId:id('TeamId',`t${t}`)},{lifecycle:'existing',dailyCap:{kind:'absent'}});
      associations.push(pt);
      add('PTEC',`ptec-${p}-${t}`,{type:'PT',pt:identity('PT',pt.ref.entityId.value)},{actualPeriod:identity('ActualPeriod',`ap-p${p}`),lastActualsDate:days.at(-1),etc:quantity('ETC',next()%10)});
    }
    if(variant==='history') add('PT',`deleted-pt-${p}`,{type:'ProjectTeam',projectId:owner.projectId,teamId:id('TeamId',`t${(p+seed+2)%teams}`)},{lifecycle:'deleted',dailyCap:{kind:'absent'}});
    cover(`p${p}`,owner,associations);
  }
  const reservations=Math.max(1,projects/10);
  for(let r=0;r<reservations;r++) {
    const owner={type:'Reservation',reservationId:id('ReservationId',`r${r}`)};
    const deleted=variant==='history' && r===0;
    add('ReservationSettings',`rs${r}`,owner,{name:`Reservation ${r}`,lifecycle:deleted?'deleted':'existing',isActive:true,startDate:'2024-01-01',endDate:'2026-12-31',program:identity('Program','program'),pas:null,ownColor:null});
    const associations=[];
    for(let t=0;t<2;t++) {
      const rt=add('RT',`rt-${r}-${t}`,{type:'ReservationTeam',reservationId:owner.reservationId,teamId:id('TeamId',`t${t}`)},{lifecycle:deleted?'deleted':'existing',demand:t===0?{mode:'ratio',ratio:quantity('ReservationRatio')}:{mode:'fixed-daily',daily:quantity('FixedDailyDemand',2)}});
      if(!deleted) associations.push(rt);
    }
    cover(`r${r}`,owner,associations);
  }
  const snapshot={snapshotId:id('SnapshotId','historic-snapshot'),knowledgeDate:days.at(-1),createdAt:'2026-10-11T12:00:00.000Z',manifest};
  const current=variant==='history'?null:{manifest,revision:'benchmark-revision'};
  const byKind=Object.fromEntries([...Object.keys(table),'PlanningSettings','PortfolioOrder'].map(kind=>[kind,versions.filter(v=>v.ref.kind===kind).length]));
  let exactReferenceOccurrences=0,identityOccurrences=0;
  function countRefs(value) {
    if(value===null || typeof value!=='object') return;
    if(value.kind && value.entityId) { if(value.versionId) exactReferenceOccurrences++; else identityOccurrences++; }
    for(const child of Object.values(value)) countRefs(child);
  }
  // Count one manifest plus version input, excluding duplicate Snapshot/Current wrappers.
  countRefs({manifest,versions});
  const metadata={size,variant,seed,projects,teams,reservations,subPeriodsPerOwner:subPeriods,versions:versions.length,selectedReferences:2+Object.values(table).reduce((n,key)=>n+manifest[key].length,0),byKind,exactReferenceOccurrences,identityOccurrences,existingPT:versions.filter(v=>v.ref.kind==='PT'&&v.payload.lifecycle==='existing').length,deletedAssociations:versions.filter(v=>['PT','RT'].includes(v.ref.kind)&&v.payload.lifecycle==='deleted').length,projectTA:manifest.teamActuals.filter(v=>v.entityId.value.startsWith('ta-pt-')).length,reservationTA:manifest.teamActuals.filter(v=>v.entityId.value.startsWith('ta-rt-')).length,fixtureSha256:createHash('sha256').update(JSON.stringify({manifest,versions,snapshot,current},(_,v)=>typeof v==='bigint'?`${v}n`:v)).digest('hex')};
  return {manifest,versions,snapshot,current,metadata};
}
