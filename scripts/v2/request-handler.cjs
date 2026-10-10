const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
function createRequestHandler(assetKeys, readAsset, port) {
  if (port !== 4274 && port !== 4275) throw new Error('V2 port must be 4274 or 4275');
  const allowed = new Set(assetKeys);
  return (request, response) => {
    if (request.headers.host !== `127.0.0.1:${port}`) { response.writeHead(400).end('Invalid host'); return; }
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let key;
    try {
      if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw Error('path');
      const raw = decodeURIComponent(request.url.split('?')[0]);
      if (raw.includes('\\') || raw.includes('\0') || raw.split('/').includes('..') || raw.includes('//')) throw Error('path');
      key = raw === '/' ? 'index.html' : raw.slice(1);
    } catch { response.writeHead(400).end('Invalid path'); return; }
    if (!allowed.has(key)) { response.writeHead(404).end('Not found'); return; }
    try {
      const data = Buffer.from(readAsset(key));
      response.writeHead(200, { 'Content-Length': data.length, 'Content-Type': MIME[key.slice(key.lastIndexOf('.'))], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(500).end('V2 asset unavailable'); }
  };
}
module.exports = { createRequestHandler };
