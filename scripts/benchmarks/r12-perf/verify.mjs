// Explicitly invoked, outside the existing V2 gate test discovery.
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';
import { certifyPortfolioGraph } from '../../../.test-dist-v2/domain/portfolio/validatedPortfolioGraph.js';
import { createMemoryPortfolioReadAdapter } from '../../../.test-dist-v2/adapters/memory/memoryPortfolioReadAdapter.js';
import { loadSnapshotGraph } from '../../../.test-dist-v2/application/portfolio/loadPortfolioGraph.js';
for(const variant of ['dense','sparse','history']) {
  const f=fixture('small',variant), again=fixture('small',variant);
  assert.equal(f.metadata.fixtureSha256,again.metadata.fixtureSha256);
  assert.notEqual(f.metadata.fixtureSha256,fixture('small',variant,1203).metadata.fixtureSha256);
  assert.equal(f.versions.length,f.metadata.versions);
  assert.equal(f.metadata.selectedReferences,f.metadata.versions);
  assert.equal(f.metadata.projectTA,variant==='dense'?600:240);
  const certified=certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot,versions:f.versions});
  assert.equal(certified.ok,true,JSON.stringify(certified.errors));
  if(variant==='history') {
    assert.equal(f.current,null);
    assert.equal(f.metadata.deletedAssociations,12);
    assert.equal(certified.value.context.status,'not-established');
    assert.equal(certified.value.context.missingPredecessors.length,1);
    const adapter=createMemoryPortfolioReadAdapter(f.versions,null,[f.snapshot]);
    assert.equal(adapter.ok,true);
    let currentReads=0;
    const absentCurrent={async readCurrentSelection(){currentReads++;throw new Error('Current forbidden');}};
    void absentCurrent;
    let requested=0;
    const reader={async readExactVersions(refs){requested+=refs.length;return adapter.value.versions.readExactVersions(refs);}};
    const loaded=await loadSnapshotGraph(adapter.value.snapshots,reader,f.snapshot.snapshotId);
    assert.equal(loaded.ok,true);
    assert.equal(loaded.value.context.status,'not-established');
    assert.equal(currentReads,0);
    assert.equal(requested,f.metadata.selectedReferences);
  }
  // A missing zero-valued or positive cell must be rejected by production.
  const missing=f.manifest.teamActuals.pop();
  const invalid=certifyPortfolioGraph({source:'snapshot',snapshot:f.snapshot,versions:f.versions});
  assert.equal(invalid.ok,false);
  assert.equal(invalid.errors[0].code,'INCOMPLETE_OR_FOREIGN_ACTUAL_GRID');
  assert.ok(missing);
  console.log(`${variant}: deterministic counts, real certification and missing-cell rejection verified`);
}
console.log('Benchmark-tool checks: 3 variants passed; separate from G12 gates');
