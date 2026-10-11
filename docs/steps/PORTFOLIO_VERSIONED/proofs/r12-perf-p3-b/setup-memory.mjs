// Additional setup-only endpoints; official historical tools remain unchanged.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [root,out,size,variant]=process.argv.slice(2);
if(size){
 const load=p=>import(pathToFileURL(resolve(root,p)));
 const {fixture}=await load('scripts/benchmarks/r12-perf/fixture.mjs');
 const {createMemoryPortfolioReadAdapter}=await load('.test-dist-v2/adapters/memory/memoryPortfolioReadAdapter.js');
 const input=fixture(size,variant);global.gc();const before=process.memoryUsage();const cpu=process.cpuUsage(),start=performance.now();
 let result=createMemoryPortfolioReadAdapter(input.versions,input.current,[input.snapshot]);if(!result.ok)throw Error('setup rejected');
 const elapsedMs=performance.now()-start,cpuUsed=process.cpuUsage(cpu),after=process.memoryUsage();global.gc();const retained=process.memoryUsage();result=null;global.gc();const released=process.memoryUsage();
 console.log(JSON.stringify({size,variant,fixture:input.metadata,elapsedMs,cpuUsed,before,after,retained,released,lifetimeMaxRSSKiB:process.resourceUsage().maxRSS}));
}else{
 const rows=[];for(const [s,v] of [['small','sparse'],['small','dense'],['small','history'],['medium','sparse'],['medium','dense']])rows.push(JSON.parse(execFileSync(process.execPath,['--expose-gc','--max-old-space-size=1024',process.argv[1],root,out,s,v],{encoding:'utf8',timeout:30000})));
 writeFileSync(out,JSON.stringify({scope:'Single cold adapter setup per fresh child; fixture/imports excluded from timing; additional setup-only evidence, not official API medians. GC endpoint measurements do not establish exact peak or retained ownership.',root,rows},null,2)+'\n');
}
