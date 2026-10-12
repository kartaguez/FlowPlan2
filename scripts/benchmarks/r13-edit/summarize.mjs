import {readFile,writeFile} from 'node:fs/promises';
const dir='docs/steps/PORTFOLIO_VERSIONED/proofs/r13/perf',data=JSON.parse(await readFile(`${dir}/results.json`,'utf8'));
const median=a=>[...a].sort((a,b)=>a-b).at(Math.floor(a.length/2));
const summarize=rows=>{const keys=['prepare','execute','total','E1','E2','E3','E4','E5','E6','E7','E5-REGISTRY','E5-MANIFEST','E5-EXTRACTION'];return Object.fromEntries(keys.filter(k=>rows.every(r=>typeof r[k]==='number')).map(k=>{const a=rows.map(r=>r[k]),m=median(a),mean=a.reduce((s,x)=>s+x,0)/a.length;return [k,{median:m,min:Math.min(...a),max:Math.max(...a),range:Math.max(...a)-Math.min(...a),sd:Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/a.length),mad:median(a.map(x=>Math.abs(x-m)))}];}));};
const summaries=data.runs.filter(r=>r.event==='complete').map(r=>({...Object.fromEntries(['size','variant','depth','scenario','mode','setupMs','S','H','sHash','fixtureHash'].map(k=>[k,r[k]])),statistics:summarize(r.raw.filter(r=>r.role==='measured')),B:r.raw[0].B,byKind:r.raw[0].byKind,obligations:r.raw[0].obligations}));
const slopes=[];
for(const mode of ['official','instrumented'])for(const size of ['small','medium'])for(const variant of ['dense','sparse'])for(const scenario of ['local','actuals','boundary']){
 const points=summaries.filter(r=>r.mode===mode&&r.size===size&&r.variant===variant&&r.scenario===scenario).sort((a,b)=>a.depth-b.depth);
 if(points.length<2)continue;
 if(new Set(points.map(p=>p.sHash)).size!==1||new Set(points.map(p=>p.S)).size!==1||new Set(points.map(p=>JSON.stringify(p.byKind))).size!==1)throw new Error('Invalid S-fixed/B-fixed experiment');
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];slopes.push({mode,size,variant,scenario,from:a.depth,to:b.depth,additionalH:b.H-a.H,msPerHistoricalVersion:Object.fromEntries(Object.keys(a.statistics).filter(k=>b.statistics[k]).map(k=>[k,(b.statistics[k].median-a.statistics[k].median)/(b.H-a.H)]))});}
}
await writeFile(`${dir}/summary.json`,JSON.stringify({summaries,slopes,failures:data.runs.filter(r=>r.event==='failure')},null,2));
const f=n=>n.toFixed(2),lines=['# R1.3 PERF-EDIT — IN REVIEW','', '## Mesures officielles','', '| Profil | H ajouté | Scénario | S / H | Préparation médiane ms | Exécution médiane ms | Total médian ms (min–max) | B |','| --- | ---: | --- | --- | ---: | ---: | --- | ---: |'];
for(const r of summaries.filter(r=>r.mode==='official'))lines.push(`| ${r.size} ${r.variant} | ${r.depth} | ${r.scenario} | ${r.S} / ${r.H} | ${f(r.statistics.prepare.median)} | ${f(r.statistics.execute.median)} | ${f(r.statistics.total.median)} (${f(r.statistics.total.min)}–${f(r.statistics.total.max)}) | ${r.B} |`);
lines.push('','## Instrumentation séparée','', '| Profil / H ajouté / scénario | E1 | E2 | E3 | E4 versions | E5 candidat | E6 certification | E7 publication |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for(const r of summaries.filter(r=>r.mode==='instrumented'))lines.push(`| ${r.size} ${r.variant} / ${r.depth} / ${r.scenario} | ${['E1','E2','E3','E4','E5','E6','E7'].map(k=>f(r.statistics[k].median)).join(' | ')} |`);
lines.push('','## Pentes locales observées — ms par version historique supplémentaire','', '| Profil / scénario / mode | Intervalle H ajouté | Total | E5 registre | E5 extraction | E6 certification |','| --- | --- | ---: | ---: | ---: | ---: |');
for(const r of slopes)lines.push(`| ${r.size} ${r.variant} / ${r.scenario} / ${r.mode} | ${r.from}–${r.to} | ${f(r.msPerHistoricalVersion.total)} | ${r.msPerHistoricalVersion['E5-REGISTRY']?.toFixed(4)??'—'} | ${r.msPerHistoricalVersion['E5-EXTRACTION']?.toFixed(4)??'—'} | ${r.msPerHistoricalVersion.E6?.toFixed(4)??'—'} |`);
lines.push('','Données complètes, min/max/SD/MAD, sous-phases E5, CPU, endpoints mémoire, setup et hashes : [summary.json](./summary.json), [results.json](./results.json) et JSONL par processus. Médianes de trois essais mesurés après cold/warmup ; les médianes de segments ne sont pas additives. Pentes = différence des médianes divisée par ΔH, observations locales et non taux universels.');
await writeFile(`${dir}/tables.md`,lines.join('\n')+'\n');
