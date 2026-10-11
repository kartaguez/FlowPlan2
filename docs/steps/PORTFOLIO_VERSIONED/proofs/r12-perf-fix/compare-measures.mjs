import { readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath,out]=process.argv.slice(2);
const before=JSON.parse(readFileSync(beforePath)),after=JSON.parse(readFileSync(afterPath));
const rows=after.map(a=>{
  const b=before.find(b=>b.size===a.size&&b.variant===a.variant&&b.operation===a.operation);
  assert.ok(b); if(a.fixture&&b.fixture)assert.equal(a.fixture.fixtureSha256,b.fixture.fixtureSha256);
  const comparable=b.status==='COMPLETED'&&a.status==='COMPLETED';
  return {scenario:`${a.size}/${a.variant}`,operation:a.operation,beforeStatus:b.status,afterStatus:a.status,
    beforeColdMs:b.coldMs,afterColdMs:a.coldMs,beforeMedianMs:b.elapsedMs?.median,afterMedianMs:a.elapsedMs?.median,
    afterMinMs:a.elapsedMs?.min,afterMaxMs:a.elapsedMs?.max,afterSDMs:a.elapsedMs?.populationSD,afterIQRMs:a.elapsedMs?.iqr,
    beforeCPUMedianMs:b.cpuMs?.median,afterCPUMedianMs:a.cpuMs?.median,
    beforeLifetimeRSSMiB:b.processLifetimeMaxRSSMiB,afterLifetimeRSSMiB:a.processLifetimeMaxRSSMiB,
    beforeHeapEndpointMiB:b.heapEndpointObservedMaxMiB,afterHeapEndpointMiB:a.heapEndpointObservedMaxMiB,
    ...(comparable?{medianRatio:b.elapsedMs.median/a.elapsedMs.median,medianChangePercent:(a.elapsedMs.median-b.elapsedMs.median)/b.elapsedMs.median*100}:{}),
    beforeInterruptedPhase:b.interruptedPhase,afterInterruptedPhase:a.interruptedPhase};
});
writeFileSync(out+'.json',JSON.stringify(rows,null,2)+'\n');
const n=x=>x==null?'—':x.toFixed(1);
const lines=['| Scénario | API | Cold avant → après ms | Médiane avant → après ms | Après min–max / SD / IQR ms | CPU médiane après ms | Heap / RSS après MiB | État après |',
'|---|---|---:|---:|---:|---:|---:|---|',...rows.map(r=>`| ${r.scenario} | ${r.operation} | ${n(r.beforeColdMs)} → ${n(r.afterColdMs)} | ${r.beforeStatus==='INTERRUPTED_TIMEOUT'?`>30 s (${r.beforeInterruptedPhase})`:n(r.beforeMedianMs)} → ${n(r.afterMedianMs)} | ${n(r.afterMinMs)}–${n(r.afterMaxMs)} / ${n(r.afterSDMs)} / ${n(r.afterIQRMs)} | ${n(r.afterCPUMedianMs)} | ${n(r.afterHeapEndpointMiB)} / ${n(r.afterLifetimeRSSMiB)} | ${r.afterStatus}${r.afterInterruptedPhase?` (${r.afterInterruptedPhase})`:''} |`)];
writeFileSync(out+'.md',lines.join('\n')+'\n');console.log(lines.join('\n'));
