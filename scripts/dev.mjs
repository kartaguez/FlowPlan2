import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { build } from "./build.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const tscEntryPoint = resolve(
  projectRoot,
  "node_modules/typescript/bin/tsc",
);
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

await build();

const compiler = spawn(
  process.execPath,
  [tscEntryPoint, "-p", "tsconfig.app.json", "--watch", "--preserveWatchOutput"],
  { cwd: projectRoot, stdio: "inherit" },
);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  try {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
    const relativePath =
      requestUrl.pathname === "/"
        ? "index.html"
        : decodeURIComponent(requestUrl.pathname.slice(1));
    const filePath = resolve(distDirectory, relativePath);
    if (!filePath.startsWith(`${distDirectory}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Content-Length": fileStats.size,
      "Content-Type":
        mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
    } else {
      createReadStream(filePath).pipe(response);
    }
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

let shuttingDown = false;

server.listen(port, host, () => {
  console.log(`FlowPlan development server: http://${host}:${port}`);
});

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  compiler.kill("SIGTERM");
  server.close(() => process.exit(0));
}

server.once("error", (error) => {
  console.error(error);
  shuttingDown = true;
  process.exitCode = 1;
  compiler.kill("SIGTERM");
});
compiler.once("error", (error) => {
  console.error(error);
  shuttingDown = true;
  server.close(() => process.exit(1));
});
compiler.once("exit", (code, signal) => {
  if (!shuttingDown) {
    shuttingDown = true;
    console.error(`TypeScript watch stopped (${signal ?? `code ${code}`}).`);
    server.close(() => process.exit(1));
  }
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
