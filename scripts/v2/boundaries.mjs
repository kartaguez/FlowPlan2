import ts from 'typescript';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const inside = (root, path) => path === root || path.startsWith(root + sep);
const forbidden = new Set('indexedDB localStorage sessionStorage Storage IDBFactory BroadcastChannel Worker SharedWorker importScripts eval Function fetch XMLHttpRequest WebSocket EventSource serviceWorker caches cookie innerHTML outerHTML insertAdjacentHTML write writeln require constructor __proto__ Reflect'.split(' '));
const domProperties = new Set('getElementById createElement ownerDocument defaultView location origin textContent className setAttribute append replaceChildren remove dataset'.split(' '));
const tags = new Set('main section div h1 h2 p dl dt dd span'.split(' '));
export async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Boundary: symlink forbidden: ${path}`);
    if (entry.isDirectory()) files.push(...await filesUnder(path)); else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}
function fail(file, message) { throw new Error(`Boundary: ${file}: ${message}`); }
export async function checkModule(file, root, options = {}, runtime = true, tooling = false) {
  root = await realpath(root);
  file = await realpath(file);
  const code = await readFile(file, 'utf8');
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) fail(file, 'invalid syntax');
  const imports = [];
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) imports.push(node.moduleSpecifier);
    }
    if (ts.isImportEqualsDeclaration(node)) fail(file, 'import-equals is forbidden');
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) fail(file, 'computed dynamic import');
      imports.push(node.arguments[0]);
    }
    if (tooling && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) fail(file, 'computed require');
      imports.push(node.arguments[0]);
    }
    if (runtime) {
      if (ts.isIdentifier(node) && forbidden.has(node.text)) fail(file, `forbidden capability ${node.text}`);
      if (ts.isElementAccessExpression(node)) fail(file, 'computed property access in R0.1 runtime');
      if (ts.isPropertyAccessExpression(node) && forbidden.has(node.name.text)) fail(file, 'forbidden property');
      if (ts.isIdentifier(node) && ['window', 'globalThis', 'document', 'navigator'].includes(node.text)) {
        if (!ts.isPropertyAccessExpression(node.parent) || node.parent.expression !== node || !domProperties.has(node.parent.name.text)) fail(file, 'unapproved browser-global access');
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'createElement' && (!ts.isCallExpression(node.parent) || node.parent.expression !== node)) fail(file, 'DOM factory alias');
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createElement') {
        if (!ts.isStringLiteral(node.arguments[0]) || !tags.has(node.arguments[0].text)) fail(file, 'unapproved DOM element');
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'setAttribute') {
        const attr = node.arguments[0];
        if (!attr || !ts.isStringLiteral(attr) || !/^(data-[a-z-]+|aria-[a-z-]+|role)$/.test(attr.text)) fail(file, 'unapproved DOM attribute');
      }
      // Module/worker URLs are unnecessary for the closed R0.1 shell.
      if (ts.isIdentifier(node) && node.text === 'URL') fail(file, 'module URL capability');
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (ast.referencedFiles.length || ast.typeReferenceDirectives.length || ast.libReferenceDirectives.length) fail(file, 'triple-slash references');
  const edges = [];
  for (const spec of imports) {
    if (!ts.isStringLiteral(spec)) fail(file, 'nonliteral module');
    const name = spec.text;
    if (tooling && (name.startsWith('node:') || name === 'typescript')) continue;
    if (!runtime && !tooling && ['node:test', 'node:assert/strict'].includes(name)) continue;
    if (!name.startsWith('.') || !name.endsWith(tooling ? (name.endsWith('.cjs') ? '.cjs' : '.mjs') : '.js')) fail(file, `unapproved module ${name}`);
    const target = tooling || file.endsWith('.js') ? resolve(dirname(file), name) : ts.resolveModuleName(name, file, options, ts.sys).resolvedModule?.resolvedFileName;
    if (!target || !inside(root, resolve(target))) fail(file, `module escapes root: ${name}`);
    const actual = await realpath(target);
    if (!inside(root, actual)) fail(file, `realpath escapes root: ${name}`);
    if (runtime && /\.(test|fixture)\./.test(actual)) fail(file, 'runtime importing tests/fixtures');
    edges.push(actual);
  }
  return edges;
}
export async function readConfig(root, mode) {
  const name = `tsconfig.v2.${mode}.json`;
  const source = JSON.parse(await readFile(resolve(root, name), 'utf8'));
  if (mode === 'app' && source.extends) fail(name, 'app config must be autonomous');
  if (mode === 'test' && source.extends !== './tsconfig.v2.app.json') fail(name, 'test must extend V2 app');
  if (JSON.stringify(source.include) !== '["src-v2/**/*.ts"]' || source.compilerOptions.rootDir !== 'src-v2' || source.compilerOptions.outDir !== (mode === 'app' ? 'dist-v2/js' : '.test-dist-v2')) fail(name, 'source/output scope');
  if (source.references || source.compilerOptions.paths || source.compilerOptions.baseUrl || source.compilerOptions.allowJs) fail(name, 'aliases/references/JS sources');
  const expectedExclude = mode === 'app' ? ['src-v2/**/*.test.ts', 'src-v2/**/*.fixture.ts'] : [];
  if (JSON.stringify(source.exclude) !== JSON.stringify(expectedExclude) || JSON.stringify(source.compilerOptions.types) !== JSON.stringify(mode === 'app' ? [] : ['node'])) fail(name, 'test/type scope');
  const config = ts.readConfigFile(resolve(root, name), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const errors = parsed.errors.filter(e => e.code !== 18003); // P1 has no source yet.
  if (errors.length) fail(name, ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: x => x, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  return parsed;
}
export async function checkSources(root = projectRoot) {
  root = await realpath(root);
  const sourceRoot = resolve(root, 'src-v2');
  const app = await readConfig(root, 'app'), tests = await readConfig(root, 'test');
  const defaultConfig = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), 'utf8'));
  if (JSON.stringify(defaultConfig) !== '{"extends":"./tsconfig.v2.app.json"}') fail('tsconfig.json', 'default points outside V2');
  const modules = (await filesUnder(sourceRoot)).filter(f => f.endsWith('.ts'));
  for (const file of modules) await checkModule(file, sourceRoot, app.options, !/\.(test|fixture)\.ts$/.test(file));
  const lists = {};
  for (const [mode, config] of [['app', app], ['test', tests]]) {
    const program = ts.createProgram(config.fileNames, config.options);
    const list = program.getSourceFiles().filter(f => !f.isDeclarationFile).map(f => resolve(f.fileName));
    if (list.some(f => !inside(sourceRoot, f))) fail(mode, 'compiler includes non-V2 source');
    for (const f of program.getSourceFiles().filter(f => f.isDeclarationFile)) {
      const path = await realpath(f.fileName);
      const approved = [resolve(root, 'node_modules/typescript/lib'), ...(mode === 'test' ? [resolve(root, 'node_modules/@types/node'), resolve(root, 'node_modules/undici-types')] : [])];
      const canonicalApproved = await Promise.all(approved.map(p => realpath(p).catch(() => p)));
      if (!canonicalApproved.some(p => inside(p, path))) fail(mode, `unapproved declaration ${path}`);
    }
    lists[mode] = list.map(f => relative(root, f)).sort();
  }
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  for (const [name, command] of Object.entries(pkg.scripts)) {
    if (/scripts\/(?!v2\/)|tsconfig\.(app|test)\.json|benchmark/.test(command + ' ' + name)) fail(name, 'legacy package command');
  }
  for (const name of ['dev','build','typecheck','test','build:sea','test:portable','test:sea']) {
    if (pkg.scripts[name] !== `npm run ${name}:v2`) fail(name, 'default must alias V2');
  }
  for (const file of (await filesUnder(resolve(root, 'scripts/v2'))).filter(f => /\.(mjs|cjs)$/.test(f))) await checkModule(file, resolve(root, 'scripts/v2'), {}, false, true);
  return { modules: modules.map(f => relative(root, f)), compilerSources: lists };
}
export async function checkAssets(root = projectRoot) {
  const config = await readConfig(root, 'app');
  const expected = ['index.html', 'styles.css', ...config.fileNames.map(f => 'js/' + relative(resolve(root, 'src-v2'), f).replace(/\.ts$/, '.js'))].sort();
  const dist = resolve(root, 'dist-v2');
  const actual = (await filesUnder(dist)).filter(f => !['.sea/config.json', '.sea/main.cjs', 'FlowPlan2-V2.exe'].includes(relative(dist, f).split(sep).join('/'))).map(f => relative(dist, f).split(sep).join('/'));
  if (JSON.stringify(actual.sort()) !== JSON.stringify(expected)) fail('dist-v2', 'artifact allowlist mismatch');
  const html = await readFile(resolve(dist, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (scripts.length !== 1 || scripts[0][2].trim() || !/^\s+type="module"\s+src="\.\/js\/main\/main\.js"\s*$/.test(scripts[0][1])) fail('index.html', 'entrypoint must be a single V2 module');
  if (/\bon\w+\s*=|<iframe|<object|<embed|<base|http[s]?:|data:/i.test(html)) fail('index.html', 'external/inline runtime');
  const links = [...html.matchAll(/<link\b([^>]*)>/gi)];
  if (links.length !== 1 || !/^\s+rel="stylesheet"\s+href="\.\/styles\.css"\s*\/?$/.test(links[0][1])) fail('index.html', 'stylesheet allowlist');
  if (/\b(?:src|href)\s*=\s*(?!"\.\/(?:js\/main\/main\.js|styles\.css)")[^\s>]+/i.test(html)) fail('index.html', 'unexpected asset URL');
  if (/@import|url\s*\(/i.test(await readFile(resolve(dist, 'styles.css'), 'utf8'))) fail('styles.css', 'external CSS asset');
  for (const name of actual.filter(f => f.endsWith('.js'))) await checkModule(resolve(dist, name), resolve(dist, 'js'));
  return { assets: actual, entrypoint: 'js/main/main.js' };
}
if (import.meta.main) {
  try { console.log(JSON.stringify({ sources: await checkSources(), ...(process.argv.includes('--assets') ? { artifacts: await checkAssets() } : {}) }, null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
