import { createReadStream, watch } from "node:fs";
import { cp, readdir, rename, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { build } from "./build.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const publicDirectory = resolve(projectRoot, "public");
const publicSyncStaging = resolve(distDirectory, ".public-sync");
const tscEntryPoint = resolve(
  projectRoot,
  "node_modules/typescript/bin/tsc",
);
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4174", 10);
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
let publicSyncTimer;
let publicSyncRunning = false;
let publicSyncRequested = false;

async function mirrorPublicToDist() {
  await rm(publicSyncStaging, { recursive: true, force: true });
  await cp(publicDirectory, publicSyncStaging, { recursive: true });

  const stagedEntries = await readdir(publicSyncStaging, {
    withFileTypes: true,
  });
  if (stagedEntries.some((entry) => entry.name === "js")) {
    throw new Error(
      "public/js is reserved because dist/js contains TypeScript output.",
    );
  }

  const stagedNames = new Set(stagedEntries.map((entry) => entry.name));
  for (const entry of stagedEntries) {
    const destination = resolve(distDirectory, entry.name);
    await rm(destination, { recursive: true, force: true });
    await rename(resolve(publicSyncStaging, entry.name), destination);
  }

  const distEntries = await readdir(distDirectory, { withFileTypes: true });
  await Promise.all(
    distEntries
      .filter(
        (entry) =>
          entry.name !== "js" &&
          entry.name !== ".public-sync" &&
          !stagedNames.has(entry.name),
      )
      .map((entry) =>
        rm(resolve(distDirectory, entry.name), {
          recursive: true,
          force: true,
        }),
      ),
  );
  await rm(publicSyncStaging, { recursive: true, force: true });
  console.log("Synchronized public/ to dist/.");
}

async function synchronizePublic() {
  if (publicSyncRunning) {
    publicSyncRequested = true;
    return;
  }

  publicSyncRunning = true;
  try {
    do {
      publicSyncRequested = false;
      await mirrorPublicToDist();
    } while (publicSyncRequested);
  } catch (error) {
    console.error("Public asset synchronization failed:", error);
    shutdown(1);
  } finally {
    publicSyncRunning = false;
  }
}

function schedulePublicSync() {
  if (shuttingDown) return;
  if (publicSyncTimer) clearTimeout(publicSyncTimer);
  publicSyncTimer = setTimeout(() => {
    publicSyncTimer = undefined;
    void synchronizePublic();
  }, 75);
}

const publicWatcher = watch(
  publicDirectory,
  { recursive: true },
  schedulePublicSync,
);

server.listen(port, host, () => {
  console.log(`FlowPlan development server: http://${host}:${port}`);
});

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (publicSyncTimer) clearTimeout(publicSyncTimer);
  publicWatcher.close();
  compiler.kill("SIGTERM");
  if (server.listening) {
    server.close(() => process.exit(exitCode));
  } else {
    process.exitCode = exitCode;
  }
}

server.once("error", (error) => {
  console.error(error);
  shutdown(1);
});
compiler.once("error", (error) => {
  console.error(error);
  shutdown(1);
});
compiler.once("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`TypeScript watch stopped (${signal ?? `code ${code}`}).`);
    shutdown(1);
  }
});
publicWatcher.once("error", (error) => {
  console.error("Public directory watcher failed:", error);
  shutdown(1);
});

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
