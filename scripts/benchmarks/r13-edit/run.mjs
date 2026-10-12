import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
const dir='docs/steps/PORTFOLIO_VERSIONED/proofs/r13/perf'; await mkdir(dir,{recursive:true});
const path='.test-dist-v2/application/portfolio/transitions/session.js',code=await readFile(path,'utf8');
const instrumented=code.replace(/\/\/ R13-(E[1-7](?:-[A-Z]+)?)-(BEGIN|END)[^\n]*/g,(_,phase,edge)=>`globalThis.__r13mark('${phase}-${edge}');`);
await writeFile(path.replace('.js','.instrumented.js'),instrumented);
const runs=[];
async function run(args){
 const name=args.join('-');const log=[];let timer;
 const result=await new Promise(resolve=>{const child=spawn(process.execPath,['--max-old-space-size=1024','scripts/benchmarks/r13-edit/worker.mjs',...args],{stdio:['ignore','pipe','pipe']});let buffer='';
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{log.push('LAB_DEADLINE_30S');child.kill('SIGTERM');},30000);};arm();
 child.stdout.on('data',c=>{buffer+=c;const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){log.push(line);try{const event=JSON.parse(line);if(event.event==='setup'||event.event==='prepared'||event.event==='trial')arm();if(event.event==='complete')runs.push(event);}catch{}}});child.stderr.on('data',c=>log.push(String(c)));child.on('close',(exit,signal)=>{clearTimeout(timer);resolve({exit,signal});});});
 await writeFile(`${dir}/${name}.jsonl`,log.join('\n')+'\n'); console.log(JSON.stringify({name,...result}));if(result.exit!==0)runs.push({event:'failure',args,...result});
}
// Sequential isolated processes, three measured trials after cold/warmup. Instrumentation is separate.
for(const [size,variant,depths] of [['small','dense',[0,10,100,1000]],['medium','dense',[0,1000]],['medium','sparse',[0,1000]]])for(const depth of depths)for(const scenario of ['local','actuals','boundary'])await run([size,variant,String(depth),scenario,'official']);
for(const [size,variant,depths] of [['small','dense',[0,1000]],['medium','dense',[0,1000]],['medium','sparse',[0,1000]]])for(const depth of depths)for(const scenario of ['local','actuals','boundary'])await run([size,variant,String(depth),scenario,'instrumented']);
await writeFile(`${dir}/results.json`,JSON.stringify({environment:{node:process.version,platform:process.platform,arch:process.arch,cpus:os.cpus().map(c=>c.model),memory:os.totalmem()},sessionJsSha256:createHash('sha256').update(code).digest('hex'),runs},null,2));
