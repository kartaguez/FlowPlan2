import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { projectRoot, checkSources, checkAssets } from './boundaries.mjs';

export function run(command, args, cwd = projectRoot) {
  return new Promise((yes, no) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', no);
    child.once('exit', (code, signal) => code === 0 ? yes(output) : no(new Error(`${command} failed (${signal ?? code})\n${output}`)));
  });
}
export const tsc = (...args) => run(process.execPath, [resolve(projectRoot, 'node_modules/typescript/bin/tsc'), ...args]);
export async function build() {
  const sources = await checkSources();
  if (!sources.compilerSources.app.length) throw new Error('No V2 app source');
  const publicRoot = resolve(projectRoot, 'public-v2');
  if (JSON.stringify((await readdir(publicRoot)).sort()) !== '["index.html","styles.css"]') throw new Error('Unexpected public-v2 asset');
  await rm(resolve(projectRoot, 'dist-v2'), { recursive: true, force: true });
  await mkdir(resolve(projectRoot, 'dist-v2'), { recursive: true });
  await tsc('-p', 'tsconfig.v2.app.json');
  await cp(publicRoot, resolve(projectRoot, 'dist-v2'), { recursive: true });
  return await checkAssets();
}
if (import.meta.main) {
  try { console.log(JSON.stringify(await build(), null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
