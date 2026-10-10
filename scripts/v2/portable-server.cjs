const { createServer } = require('node:http');
const { execFile } = require('node:child_process');
const { getAsset, getAssetKeys, isSea } = require('node:sea');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequestHandler } = require('./request-handler.cjs');
const ORIGIN = 'http://127.0.0.1:4275';
function startPortable(assetKeys, readAsset) {
  const server = createServer(createRequestHandler(assetKeys, readAsset, 4275));
  server.once('error', error => { console.error(`FlowPlan2 V2 portable startup failed at ${ORIGIN}: ${error.message}`); process.exitCode = 1; });
  server.listen(4275, '127.0.0.1', () => {
    console.log(`FlowPlan2 V2 portable ready: ${ORIGIN}/`);
    if (isSea() && !process.argv.includes('--no-browser')) execFile('cmd.exe', ['/d','/s','/c',`start "" "${ORIGIN}/"`], { windowsHide: true }, error => { if (error) console.error(error.message); });
  });
  process.once('SIGINT', () => server.close()); process.once('SIGTERM', () => server.close());
  return server;
}
if (isSea()) startPortable(getAssetKeys(), getAsset);
// Explicit test-only mode, consumes the validated asset list supplied by harness.
else if (require.main === module && process.argv.includes('--test-assets')) {
  const manifest = JSON.parse(process.argv[process.argv.indexOf('--test-assets') + 1]);
  if (manifest.root !== resolve('dist-v2')) throw new Error('Portable test root must be dist-v2');
  const contents = new Map(manifest.assets.map(key => [key, readFileSync(resolve(manifest.root, key))]));
  startPortable(manifest.assets, key => contents.get(key));
}
module.exports = { startPortable };
