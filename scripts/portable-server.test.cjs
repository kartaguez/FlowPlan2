const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createRequestHandler } = require("./portable-server.cjs");

const assets = new Map([
  ["index.html", Buffer.from("<h1>FlowPlan2</h1>")],
  ["js/main/main.js", Buffer.from("export const ready = true;")],
  ["styles.css", Buffer.from("body {}")],
]);
const handle = createRequestHandler(assets.keys(), (key) => assets.get(key));

function request(path, method = "GET", host = "127.0.0.1:4175") {
  const result = { status: undefined, headers: {}, body: undefined };
  handle({ url: path, method, headers: { host } }, {
    writeHead(status, headers = {}) {
      result.status = status;
      result.headers = headers;
      return this;
    },
    end(body) {
      result.body = body;
    },
  });
  return result;
}

test("serves embedded web assets with correct headers", () => {
  for (const [path, type] of [
    ["/", "text/html; charset=utf-8"],
    ["/js/main/main.js", "text/javascript; charset=utf-8"],
    ["/styles.css", "text/css; charset=utf-8"],
  ]) {
    const response = request(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], type);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.equal(response.body.toString(), assets.get(path === "/" ? "index.html" : path.slice(1)).toString());
  }
});

test("HEAD omits the body and keeps the asset length", () => {
  const response = request("/styles.css", "HEAD");
  assert.equal(response.status, 200);
  assert.equal(response.headers["Content-Length"], assets.get("styles.css").length);
  assert.equal(response.body, undefined);
});

test("rejects other hosts, methods, and unknown assets", () => {
  assert.equal(request("/", "GET", "localhost:4175").status, 400);
  assert.equal(request("/", "POST").status, 405);
  assert.equal(request("/secret.txt").status, 404);
  assert.equal(request("/not-present/../secret.txt").status, 404);
});
