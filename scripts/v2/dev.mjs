import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from './build.mjs';
import { projectRoot } from './boundaries.mjs';
import handler from './request-handler.cjs';

export async function startDev() {
  if (process.env.PORT !== undefined && process.env.PORT !== '4274') throw new Error('V2 dev PORT is fixed at 4274');
  let current;
  async function rebuild() {
    const { assets } = await build();
    const contents = new Map(await Promise.all(assets.map(async key => [key, await readFile(resolve(projectRoot, 'dist-v2', key))])));
    current = handler.createRequestHandler(assets, key => contents.get(key), 4274);
  }
  await rebuild();
  const server = createServer((req, res) => current(req, res));
  await new Promise((yes, no) => { server.once('error', no); server.listen(4274, '127.0.0.1', yes); });
  const watchers = [];
  let timer, chain = Promise.resolve(), closing = false;
  async function close() {
    if (closing) return; closing = true;
    clearTimeout(timer); for (const watcher of watchers) watcher.close();
    await new Promise(yes => server.close(yes));
  }
  const failure = error => { console.error(error.message); process.exitCode = 1; void close(); };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { chain = chain.then(rebuild).then(() => console.log('V2 rebuild validated')).catch(failure); }, 100);
  };
  for (const name of ['src-v2','public-v2']) watchers.push(watch(resolve(projectRoot, name), { recursive: true }, schedule));
  for (const name of ['tsconfig.v2.app.json','tsconfig.v2.test.json','tsconfig.json','package.json']) watchers.push(watch(resolve(projectRoot, name), schedule));
  for (const watcher of watchers) watcher.once('error', failure);
  server.on('error', failure);
  process.once('SIGINT', () => void close()); process.once('SIGTERM', () => void close());
  console.log('FlowPlan2 V2 dev ready: http://127.0.0.1:4274/');
  return { server, close };
}
if (import.meta.main) { try { await startDev(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
