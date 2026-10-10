import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import ts from 'typescript';
import { checkModule, checkAssets, readConfig, projectRoot } from './boundaries.mjs';

async function fixture(work) {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), 'flowplan-v2-boundary-')));
  try {
    await mkdir(resolve(root, 'src-v2'));
    await mkdir(resolve(root, 'src'));
    await writeFile(resolve(root, 'src/old.ts'), 'export const old = 1;');
    await writeFile(resolve(root, 'src-v2/local.ts'), 'export const local = 1;');
    return await work(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
const options = { moduleResolution: ts.ModuleResolutionKind.NodeNext, module: ts.ModuleKind.NodeNext };
for (const [label, source] of [
  ['direct legacy', 'import {old} from "../src/old.js";'],
  ['type legacy', 'import type {Old} from "../src/old.js";'],
  ['barrel re-export', 'export * from "../src/old.js";'],
  ['literal dynamic legacy', 'void import("../src/old.js");'],
  ['computed dynamic', 'const path="./local.js"; void import(path);'],
  ['worker', 'new Worker("../src/old.js");'],
  ['module URL', 'new URL("../src/old.js", import.meta.url);'],
  ['triple slash', '/// <reference path="../src/old.ts" />\nexport {};'],
  ['indirect storage alias', 'const {localStorage:store}=window; store.getItem("x");'],
  ['computed capability', 'window["local"+"Storage"].getItem("x");'],
  ['script injection', 'document.createElement("script");'],
  ['network loader', 'void fetch("../src/old.js");'],
  ['runtime test import', 'import "./bad.test.js";'],
]) test(`rejects ${label}`, () => fixture(async root => {
  const file = resolve(root, 'src-v2/main.ts');
  await writeFile(file, source);
  await writeFile(resolve(root, 'src-v2/bad.test.ts'), 'export {};');
  await assert.rejects(checkModule(file, resolve(root, 'src-v2'), options), /Boundary/);
}));
test('rejects a symlink escaping the physical root', () => fixture(async root => {
  await symlink(resolve(root, 'src/old.ts'), resolve(root, 'src-v2/link.ts'));
  const file = resolve(root, 'src-v2/main.ts'); await writeFile(file, 'import "./link.js";');
  await assert.rejects(checkModule(file, resolve(root, 'src-v2'), options), /realpath/);
}));
test('accepts a closed relative V2 import', () => fixture(async root => {
  const file = resolve(root, 'src-v2/main.ts'); await writeFile(file, 'import {local} from "./local.js"; export {local};');
  assert.deepEqual(await checkModule(file, resolve(root, 'src-v2'), options), [resolve(root, 'src-v2/local.ts')]);
}));
for (const [label, mutate] of [
  ['legacy include', config => { config.include = ['src/**/*.ts']; }],
  ['alias escape', config => { config.compilerOptions.paths = { old: ['src/*'] }; }],
  ['legacy test root', config => { config.compilerOptions.rootDir = 'src'; }],
]) test(`rejects config ${label}`, () => fixture(async root => {
  const config = JSON.parse(await readFile(resolve(projectRoot, 'tsconfig.v2.app.json'), 'utf8'));
  mutate(config); await writeFile(resolve(root, 'tsconfig.v2.app.json'), JSON.stringify(config));
  await assert.rejects(readConfig(root, 'app'), /Boundary/);
}));
test('rejects assets outside compiler/HTML allowlist', () => fixture(async root => {
  const config = JSON.parse(await readFile(resolve(projectRoot, 'tsconfig.v2.app.json'), 'utf8'));
  await writeFile(resolve(root, 'tsconfig.v2.app.json'), JSON.stringify(config));
  await mkdir(resolve(root, 'dist-v2'));
  await writeFile(resolve(root, 'dist-v2/old.js'), 'export const legacy = true;');
  await assert.rejects(checkAssets(root), /allowlist/);
}));
