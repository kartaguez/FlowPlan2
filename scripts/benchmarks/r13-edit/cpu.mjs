import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const dir='docs/steps/PORTFOLIO_VERSIONED/proofs/r13/perf/cpu';await mkdir(dir,{recursive:true});
const summaries=[];
for(const scenario of ['local','actuals']){
 const name=`medium-dense-${scenario}`,file=`${name}.cpuprofile`,log=[];let timer;
 const result=await new Promise(resolve=>{const child=spawn(process.execPath,['--max-old-space-size=1024','--cpu-prof',`--cpu-prof-dir=${dir}`,`--cpu-prof-name=${file}`,'scripts/benchmarks/r13-edit/worker.mjs','medium','dense','0',scenario,'official'],{stdio:['ignore','pipe','pipe']});let buffer='';
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>child.kill('SIGTERM'),30000);};arm();child.stdout.on('data',c=>{buffer+=c;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){log.push(line);try{const e=JSON.parse(line);if(['setup','prepared','trial'].includes(e.event))arm();}catch{}}});child.stderr.on('data',c=>log.push(String(c)));child.on('close',(exit,signal)=>{clearTimeout(timer);resolve({exit,signal});});});
 await writeFile(`${dir}/${name}.jsonl`,log.join('\n')+'\n');if(result.exit!==0){summaries.push({name,...result});continue;}
 const raw=await readFile(`${dir}/${file}`),profile=JSON.parse(raw),nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of profile.nodes)for(const id of n.children??[])parents.set(id,n.id);
 const self=new Map(),phases=new Map();let total=0;
 for(let i=0;i<profile.samples.length;i++){let n=nodes.get(profile.samples[i]);const time=profile.timeDeltas[i]??0;total+=time;const label=`${n.callFrame.functionName||'(anonymous)'} ${n.callFrame.url.split('/').at(-1)}:${n.callFrame.lineNumber+1}`;self.set(label,(self.get(label)??0)+time);const chain=[];while(n){chain.push(n.callFrame.functionName);n=nodes.get(parents.get(n.id));}let phase='setup/other';if(chain.includes('execute'))phase=chain.includes('withVersions')?'execute/registry':chain.includes('certifyPortfolioGraph')?'execute/certification':chain.includes('resolveObligations')?'execute/answers':'execute/other';else if(chain.includes('analyseTransition'))phase='prepare/business';phases.set(phase,(phases.get(phase)??0)+time);}
 summaries.push({name,...result,sampledMicroseconds:total,phasesMicroseconds:Object.fromEntries(phases),topSelf:[...self].sort((a,b)=>b[1]-a[1]).slice(0,25)});
 await writeFile(`${dir}/${file}.gz`,gzipSync(raw));await rm(`${dir}/${file}`);console.log(JSON.stringify({name,...result,sampledMicroseconds:total}));
}
await writeFile(`${dir}/summary.json`,JSON.stringify({note:'Sampling includes setup and all five commands; classified execute descendants separately. Self vs inclusive classifications are not additive. CPU campaign excluded from official timings.',summaries},null,2));
