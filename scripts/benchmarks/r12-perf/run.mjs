import { fork,execFileSync,execFile } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import os from 'node:os';
const root=resolve(import.meta.dirname,'../../..');
const args=process.argv.slice(2);
const option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')??fallback;
const scenarios=option('scenarios','small:dense,small:sparse,small:history,medium:sparse,medium:dense').split(',');
const operations=option('operations','M1,M2,M3,M4,M5,M6').split(',');
const timeoutMs=Number(option('timeout-ms','30000')), repeats=Number(option('repeats','3'));
const heapMiB=Number(option('heap-mib','1024'));
if(!Number.isSafeInteger(repeats)||repeats<1||!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||!Number.isSafeInteger(heapMiB)||heapMiB<128) throw new Error('Invalid resource limits');
if(scenarios.some(s=>s.startsWith('large:')) && !args.includes('--allow-large')) throw new Error('Large requires explicit --allow-large; never automatically chained after medium');
if(scenarios.some(s=>s.startsWith('large:')) && scenarios.some(s=>!s.startsWith('large:'))) throw new Error('Large must run in a separate campaign');
const output=resolve(root,option('output','docs/steps/PORTFOLIO_VERSIONED/proofs/r12-perf/results.json'));
await mkdir(resolve(output,'..'),{recursive:true});
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
// Recompile the actual production dependency graph before each campaign.
execFileSync(resolve(root,'node_modules/.bin/tsc'),['-p','tsconfig.v2.test.json'],{cwd:root,stdio:'inherit'});
const report={startedAt:new Date().toISOString(),command:[process.execPath,...process.execArgv,...process.argv.slice(1)],codeSHA:git('rev-parse','HEAD'),productionTree:git('rev-parse','HEAD:src-v2'),productionDiff:git('diff','HEAD','--','src-v2'),environment:{node:process.version,platform:os.platform(),arch:os.arch(),release:os.release(),cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,totalRAM:os.totalmem(),freeRAMAtStart:os.freemem(),availableMemoryAtStart:process.availableMemory(),npm:execFileSync('npm',['-v'],{encoding:'utf8'}).trim()},settings:{timeoutMs,repeats,heapMiB,rssPollMs:250},runs:[]};
if(report.productionDiff) throw new Error('Production differs from HEAD');
let active,stopped=false;
process.on('SIGINT',()=>{stopped=true;active?.kill('SIGTERM');});
process.on('SIGTERM',()=>{stopped=true;active?.kill('SIGTERM');});
function run(size,variant,operation) {
  return new Promise(resolveRun=>{
    const profiling=args.includes('--profile');
    const profilePath=profiling?resolve(output,'..',`${size}-${variant}-${operation}.cpuprofile`):'';
    const run={size,variant,operation,profile:profilePath||null,samples:[],rssSamples:[],status:'RUNNING'};
    const child=fork(resolve(import.meta.dirname,'worker.mjs'),[size,variant,operation,String(repeats),profilePath],{cwd:root,execArgv:['--expose-gc',`--max-old-space-size=${heapMiB}`],stdio:['ignore','ignore','pipe','ipc']});
    active=child;
    let deadline,killTimer,phase='fixture',phaseStart=Date.now(),stderr='';
    const reset=()=>{
      clearTimeout(deadline);
      deadline=setTimeout(()=>{
        run.status='INTERRUPTED_TIMEOUT';run.interruptedPhase=phase;run.interruptedElapsedMs=Date.now()-phaseStart;
        child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),1000);
      },timeoutMs);
    };
    reset();
    let polling=false;
    const poll=setInterval(()=>{
      if(polling) return; polling=true;
      try {
        execFile('ps',['-o','rss=','-p',String(child.pid)],(err,stdout)=>{
          polling=false;
          const rssKiB=Number(stdout.trim());
          if(!err && rssKiB>0) run.rssSamples.push({phase,elapsedMs:Date.now()-phaseStart,rssKiB});
          else {run.rssPollingUnavailable=err?.message??'No RSS returned';clearInterval(poll);}
        });
      } catch(error) {polling=false;run.rssPollingUnavailable=error.message;clearInterval(poll);}
    },250);
    child.stderr.on('data',b=>{stderr+=b;});
    child.on('message',m=>{
      if(m.event==='fixture') run.fixture=m.metadata;
      if(m.event==='start') {phase=m.phase;phaseStart=Date.now();run.pendingStart=m;reset();}
      if(m.event==='setup') {run.adapterSetupMs=m.ms;clearTimeout(deadline);}
      if(m.event==='sample') {run.samples.push(m);delete run.pendingStart;clearTimeout(deadline);}
      if(m.event==='done') run.status='COMPLETED';
    });
    child.on('exit',(code,signal)=>{
      clearTimeout(deadline);clearTimeout(killTimer);clearInterval(poll);
      active=null;run.exitCode=code;run.signal=signal;run.stderr=stderr;
      if(stopped) run.status='INTERRUPTED_USER';
      else if(run.status==='RUNNING') run.status='FAILED';
      run.rssObservedPeakMiB=run.rssSamples.length?Math.max(...run.rssSamples.map(s=>s.rssKiB))/1024:null;
      resolveRun(run);
    });
  });
}
for(const scenario of scenarios) {
  const [size,variant]=scenario.split(':');
  for(const operation of operations) {
    if(stopped) break;
    if(variant==='history' && operation==='M6') {report.runs.push({size,variant,operation,status:'NOT_EXECUTED',reason:'Current intentionally absent'});continue;}
    console.log(`${scenario} ${operation} started`);
    const result=await run(size,variant,operation);
    report.runs.push(result);
    await writeFile(output,JSON.stringify(report,null,2)+'\n');
    console.log(`${scenario} ${operation} ${result.status} ${result.samples.map(s=>`${s.phase}:${s.ms.toFixed(1)}ms`).join(' ')}`.trimEnd());
  }
}
report.finishedAt=new Date().toISOString();
report.largePolicy='Not automatic; explicit separate --allow-large invocation required';
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`Evidence: ${output}`);
if(stopped) process.exitCode=130;
