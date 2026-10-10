import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { checkSources, checkModule, projectRoot, filesUnder } from './boundaries.mjs';

test('A01 actual V2 source/type/transitive graph is autonomous', async () => {
  const report = await checkSources();
  assert.ok(report.modules.some(f => f.startsWith('src-v2/domain/')));
  for (const list of Object.values(report.compilerSources)) {
    assert.ok(list.length > 0);
    assert.ok(list.every(f => f.startsWith('src-v2/')));
  }
});
test('A02 Domain has only internal dependencies and pure primitive APIs', async () => {
  const root = resolve(projectRoot, 'src-v2/domain');
  const prohibited = new Set(['Date', 'window', 'document', 'navigator', 'globalThis', 'performance', 'setTimeout', 'setInterval', 'fetch', 'Current', 'PortfolioSnapshot', 'GraphResolver', 'GraphValidator']);
  const modules = (await filesUnder(root)).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  for (const file of modules) {
    const code = await readFile(file, 'utf8');
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isIdentifier(node)) assert.equal(prohibited.has(node.text), false, `${file}: ${node.text}`);
      if (ts.isPropertyAccessExpression(node)) assert.ok(!['random','now'].includes(node.name.text), file);
      if (relative(root,file) === 'primitives/rational.ts' || relative(root,file) === 'primitives/quantity.ts') {
        if (ts.isIdentifier(node)) assert.ok(!['Number','parseFloat','parseInt'].includes(node.text),file);
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
    // Resolver/realpath establishes every direct Domain edge stays inside Domain.
    await checkModule(file, root, {module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});
  }
});
test('A03 isolated compiler/test scope and exact required V2 commands', async () => {
  const app = JSON.parse(await readFile(resolve(projectRoot,'tsconfig.v2.app.json'),'utf8'));
  const tests = JSON.parse(await readFile(resolve(projectRoot,'tsconfig.v2.test.json'),'utf8'));
  const pkg = JSON.parse(await readFile(resolve(projectRoot,'package.json'),'utf8'));
  assert.deepEqual(app.include,['src-v2/**/*.ts']); assert.deepEqual(tests.include,['src-v2/**/*.ts']);
  assert.equal(app.compilerOptions.rootDir,'src-v2'); assert.equal(tests.compilerOptions.rootDir,'src-v2');
  assert.equal(pkg.scripts['check:boundaries:v2'],'node scripts/v2/boundaries.mjs');
  assert.equal(pkg.scripts['typecheck:v2'],'node scripts/v2/boundaries.mjs && tsc -p tsconfig.v2.app.json --noEmit');
  assert.equal(pkg.scripts['test:v2'],'node scripts/v2/test.mjs'); assert.equal(pkg.scripts['build:v2'],'node scripts/v2/build.mjs');
});
