import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build, run } from './build.mjs';
import { projectRoot } from './boundaries.mjs';

export async function buildSea() {
  if (process.platform !== 'win32' || process.arch !== 'x64' || Number(process.versions.node.split('.')[0]) !== 26) throw new Error('Real SEA build requires Windows x64 with Node 26');
  const { assets } = await build();
  const directory = resolve(projectRoot, 'dist-v2/.sea'); await mkdir(directory, { recursive: true });
  // SEA main cannot require filesystem helpers. Embed the V2 HTTP helper only.
  const helper = await readFile(resolve(projectRoot, 'scripts/v2/request-handler.cjs'), 'utf8');
  const portable = await readFile(resolve(projectRoot, 'scripts/v2/portable-server.cjs'), 'utf8');
  const bundled = portable.replace("require('./request-handler.cjs')", `(() => { const module = { exports: {} };\n${helper}\nreturn module.exports; })()`);
  const main = resolve(directory, 'main.cjs'); await writeFile(main, bundled);
  const config = resolve(directory, 'config.json');
  await writeFile(config, JSON.stringify({ main, mainFormat: 'commonjs', output: resolve(projectRoot, 'dist-v2/FlowPlan2-V2.exe'), useCodeCache: false, useSnapshot: false, assets: Object.fromEntries(assets.map(key => [key, resolve(projectRoot, 'dist-v2', key)])) }, null, 2));
  console.log(await run(process.execPath, ['--build-sea', config]));
}
if (import.meta.main) { try { await buildSea(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
