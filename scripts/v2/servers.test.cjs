const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequestHandler } = require('./request-handler.cjs');
const assets = new Map([['index.html',Buffer.from('<h1>V2</h1>')],['styles.css',Buffer.from('body{}')],['js/main/main.js',Buffer.from('export {};')]]);
function request(port, path='/', method='GET', host=`127.0.0.1:${port}`) {
  const result = {};
  createRequestHandler(assets.keys(), key => assets.get(key), port)({url:path,method,headers:{host}}, {
    writeHead(status, headers) { result.status=status;result.headers=headers;return this; }, end(body) { result.body=body; },
  }); return result;
}
for (const port of [4274,4275]) {
  test(`${port} serves only V2 allowlist with no-store`, () => {
    for (const path of ['/','/styles.css','/js/main/main.js']) {
      const result = request(port,path); assert.equal(result.status,200); assert.equal(result.headers['Cache-Control'],'no-store'); assert.equal(result.headers['X-Content-Type-Options'],'nosniff');
    }
    assert.equal(request(port,'/js/domain/index.js').status,404);
    assert.equal(request(port,'/src/main/main.ts').status,404);
    assert.equal(request(port,'/.sea/config.json').status,404);
  });
  test(`${port} rejects other hosts and methods`, () => {
    for (const host of [`localhost:${port}`,'127.0.0.1:4174','127.0.0.1:4175']) assert.equal(request(port,'/','GET',host).status,400);
    assert.equal(request(port,'/','POST').status,405);
  });
  test(`${port} rejects encoded traversal and malformed paths`, () => {
    for (const path of ['/%2e%2e/index.html','/x/../index.html','/%zz','/foo%00','//index.html','/x%5cindex.html']) assert.equal(request(port,path).status,400);
  });
  test(`${port} HEAD has length but no body`, () => {
    const result=request(port,'/','HEAD'); assert.equal(result.status,200); assert.equal(result.body,undefined); assert.equal(result.headers['Content-Length'],assets.get('index.html').length);
  });
}
test('refuses a configurable or legacy application port', () => {
  for (const port of [0,4174,4175,4276]) assert.throws(() => createRequestHandler([],()=>'',port), /V2 port/);
});
