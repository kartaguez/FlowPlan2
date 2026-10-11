import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';
import { filesUnder, checkModule, projectRoot } from './boundaries.mjs';

async function audit(file, root) {
  const path = relative(root,file).replaceAll('\\','/');
  const code = await readFile(file,'utf8');
  const ast = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true);
  if (path.startsWith('domain/')) {
    const forbidden = new Set('Date window document navigator globalThis performance setTimeout setInterval fetch'.split(' '));
    function visit(node) {
      if (ts.isIdentifier(node) && forbidden.has(node.text)) throw new Error(`Domain impurity: ${node.text}`);
      if (ts.isPropertyAccessExpression(node) && ['random','now'].includes(node.name.text)) throw new Error('Domain clock/random');
      ts.forEachChild(node,visit);
    }
    visit(ast);
  }
  const edges = await checkModule(file,root,{module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext});
  for (const edge of edges) {
    const target = relative(root,edge).replaceAll('\\','/');
    const allowed = path.startsWith('domain/') ? ['domain/'] : path.startsWith('application/ports/') ? ['domain/','application/ports/'] : path.startsWith('application/') ? ['domain/','application/'] : ['domain/','application/ports/','adapters/memory/'];
    if (!allowed.some(prefix => target.startsWith(prefix))) throw new Error(`Hexagonal dependency: ${path} -> ${target}`);
  }
}
test('G12-13 all Domain, Application, ports and memory adapter dependencies respect hexagonal layers',async () => {
  const root=resolve(projectRoot,'src-v2');
  const modules=(await filesUnder(root)).filter(f => /\/(domain|application|adapters)\//.test(f) && f.endsWith('.ts') && !/\.(test|fixture)\.ts$/.test(f));
  assert.ok(modules.some(f => f.includes('/adapters/memory/')));
  for (const file of modules) await audit(file,root);
});
for (const [label,path,code] of [
  ['Domain to Application','domain/canary.ts',"import type { X } from '../application/x.js'; export type Y = X;"],
  ['Domain to adapter','domain/canary.ts',"import { x } from '../adapters/memory/x.js'; export { x };"],
  ['Domain to UI','domain/canary.ts',"export { x } from '../ui/x.js';"],
  ['Domain to engine','domain/canary.ts',"export { x } from '../engine/x.js';"],
  ['Application to adapter','application/canary.ts',"export { x } from '../adapters/memory/x.js';"],
  ['ports to orchestration','application/ports/canary.ts',"export { x } from '../x.js';"],
  ['Domain clock','domain/canary.ts','export const x = Date.now();'],
  ['Domain storage','domain/canary.ts','export const x = indexedDB;'],
  ['Domain fixture','domain/canary.ts',"export { x } from './x.fixture.js';"],
  ['Domain legacy type','domain/canary.ts',"import type { X } from '../../src/legacy.js'; export type Y = X;"],
]) test(`G12-13 canary rejects ${label}`,async () => {
  const root=await mkdtemp(resolve(tmpdir(),'flowplan-r12-boundary-'));
  try {
    for (const target of ['application/x.ts','adapters/memory/x.ts','ui/x.ts','engine/x.ts','domain/x.fixture.ts']) {
      await mkdir(dirname(resolve(root,target)),{recursive:true}); await writeFile(resolve(root,target),'export interface X {} export const x = 1;');
    }
    const file=resolve(root,path); await mkdir(dirname(file),{recursive:true}); await writeFile(file,code);
    await assert.rejects(audit(file,root));
  } finally {await rm(root,{recursive:true,force:true});}
});
