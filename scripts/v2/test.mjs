import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { projectRoot, filesUnder, checkSources } from './boundaries.mjs';
import { tsc, run } from './build.mjs';

export async function testV2() {
  await checkSources();
  await rm(resolve(projectRoot, '.test-dist-v2'), { recursive: true, force: true });
  await tsc('-p', 'tsconfig.v2.test.json');
  const compiled = (await filesUnder(resolve(projectRoot, '.test-dist-v2'))).filter(f => f.endsWith('.test.js'));
  const technical = (await filesUnder(resolve(projectRoot, 'scripts/v2'))).filter(f => /\.test\.(mjs|cjs)$/.test(f));
  if (!compiled.length || !technical.length) throw new Error('No V2 tests in one of the required scopes');
  const output = await run(process.execPath, ['--test', '--test-reporter=tap', ...compiled, ...technical]);
  const count = Number(output.match(/^# tests (\d+)$/m)?.[1]);
  if (!count || !/^# fail 0$/m.test(output) || !/^# skipped 0$/m.test(output) || !/^# todo 0$/m.test(output) || !/^# cancelled 0$/m.test(output)) throw new Error(`Incomplete V2 test run\n${output}`);
  console.log(output);
  return { tests: count, compiled, technical };
}
if (import.meta.main) {
  try { console.log(JSON.stringify(await testV2(), null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
