import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { appDir, buildV3 } from "./build.mjs";

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

export async function startV3Server(port = 0) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(appDir, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!file.startsWith(appDir + sep)) {
        response.writeHead(403).end();
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error("Not a file");
      response.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", accept);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected server address");
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await buildV3();
  const port = process.env.V3_PORT ? Number(process.env.V3_PORT) : 4173;
  const { url } = await startV3Server(port);
  console.log(`FlowPlan3 ready at ${url}`);
}
