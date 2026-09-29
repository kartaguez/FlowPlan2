const { execFile } = require("node:child_process");
const { createServer } = require("node:http");
const { getAsset, getAssetKeys, isSea } = require("node:sea");

const HOST = "127.0.0.1";
const PORT = 4175;
const ORIGIN = `http://${HOST}:${PORT}`;
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
});

function createRequestHandler(assetKeys, readAsset) {
  const allowedAssets = new Set(assetKeys);
  const cachedAssets = new Map();

  return (request, response) => {
    if (request.headers.host !== `${HOST}:${PORT}`) {
      response.writeHead(400).end("Invalid host");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let assetKey;
    try {
      if (!request.url?.startsWith("/")) throw new Error("Invalid URL");
      const pathname = new URL(request.url, ORIGIN).pathname;
      assetKey = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
      if (assetKey.includes("\\") || assetKey.includes("\0")) throw new Error("Invalid path");
    } catch {
      response.writeHead(400).end("Invalid path");
      return;
    }

    if (!allowedAssets.has(assetKey)) {
      response.writeHead(404).end("Not found");
      return;
    }

    let contents = cachedAssets.get(assetKey);
    if (!contents) {
      contents = Buffer.from(readAsset(assetKey));
      cachedAssets.set(assetKey, contents);
    }
    const extension = assetKey.slice(assetKey.lastIndexOf("."));
    response.writeHead(200, {
      "Content-Length": contents.length,
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  };
}

function runPortableServer() {
  const server = createServer(createRequestHandler(getAssetKeys(), getAsset));
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`FlowPlan2 cannot start: ${ORIGIN} is already in use.`);
    } else {
      console.error("FlowPlan2 server error:", error);
    }
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(`FlowPlan2 is available at ${ORIGIN}/`);
    console.log("Close this console window to stop FlowPlan2.");
    if (process.argv.includes("--no-browser")) return;
    execFile("cmd.exe", ["/d", "/s", "/c", `start "" "${ORIGIN}/"`], { windowsHide: true }, (error) => {
      if (error) console.error(`Could not open the browser. Open ${ORIGIN}/ manually.`, error);
    });
  });
  process.on("SIGINT", () => server.close());
  process.on("SIGTERM", () => server.close());
}

if (isSea()) runPortableServer();

module.exports = { createRequestHandler };
