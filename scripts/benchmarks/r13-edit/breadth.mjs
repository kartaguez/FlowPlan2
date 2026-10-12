import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const dir='docs/steps/PORTFOLIO_VERSIONED/proofs/r13/perf',data=JSON.parse(await readFile(`${dir}/results.json`,'utf8')),rows=[];
for(const mode of ['official','instrumented'])for(const scenario of ['local','actuals','boundary']){
 const lines=[];const code=await new Promise(resolve=>{const child=spawn(process.execPath,['--max-old-space-size=1024','scripts/benchmarks/r13-edit/worker.mjs','small','dense','1000',scenario,mode,'breadth'],{stdio:['ignore','pipe','pipe']});let buffer='';child.stdout.on('data',c=>{buffer+=c;const parts=buffer.split('\n');buffer=parts.pop();lines.push(...parts);});child.stderr.on('data',c=>lines.push(String(c)));child.on('close',resolve);});
 await writeFile(`${dir}/small-dense-1000-${scenario}-${mode}-breadth.jsonl`,lines.join('\n')+'\n');if(code!==0)throw new Error(`Breadth failure ${code}`);
 const b=lines.map(l=>JSON.parse(l)).find(r=>r.event==='complete'),c=data.runs.find(r=>r.event==='complete'&&r.size==='small'&&r.variant==='dense'&&r.depth===1000&&r.scenario===scenario&&r.mode===mode);
 if(b.S!==c.S||b.H!==c.H||b.sHash!==c.sHash||b.raw[0].B!==c.raw[0].B)throw new Error('Uncontrolled breadth comparison');
 const median=a=>a.sort((a,b)=>a-b).at(1),keys=mode==='official'?['prepare','execute','total']:['total','E2','E5','E5-REGISTRY','E5-EXTRACTION','E6'];
 rows.push({scenario,mode,S:b.S,H:b.H,sHash:b.sHash,B:b.raw[0].B,chainDepth:1000,breadthDepth:1,medians:Object.fromEntries(keys.map(k=>[k,{chain:median(c.raw.filter(r=>r.role==='measured').map(r=>r[k])),breadth:median(b.raw.filter(r=>r.role==='measured').map(r=>r[k]))}]))});
}
await writeFile(`${dir}/breadth-summary.json`,JSON.stringify({note:'Fixed S, |H| and B; 1000 extra Settings versions form either a chain or 1000 sibling branches. Distinguishes lineage depth from unselected volume on Small only. Separate from the main campaign.',rows},null,2));
