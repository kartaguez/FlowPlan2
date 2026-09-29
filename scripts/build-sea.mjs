import { readdir, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");

async function collectAssets(directory) {
  const assets = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(assets, await collectAssets(path));
    } else if (entry.isFile()) {
      assets[relative(distDirectory, path).split(sep).join("/")] = path;
    }
  }
  return assets;
}

async function buildSea() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("Build FlowPlan2.exe on Windows x64.");
  }
  if (Number(process.versions.node.split(".")[0]) !== 26) {
    throw new Error("Build FlowPlan2.exe with Node.js 26.");
  }

  await build();
  const assets = await collectAssets(distDirectory);
  if (!assets["index.html"] || !assets["js/main/main.js"] || !assets["styles.css"]) {
    throw new Error("The web build is missing required assets.");
  }

  const configDirectory = resolve(distDirectory, ".sea");
  const configPath = resolve(configDirectory, "config.json");
  await mkdir(configDirectory, { recursive: true });
  await writeFile(configPath, JSON.stringify({
    main: resolve(projectRoot, "scripts/portable-server.cjs"),
    mainFormat: "commonjs",
    output: resolve(distDirectory, "FlowPlan2.exe"),
    useCodeCache: false,
    useSnapshot: false,
    assets,
  }, null, 2));

  await new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(process.execPath, ["--build-sea", configPath], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    child.once("error", rejectProcess);
    child.once("exit", (code, signal) => {
      if (code === 0) resolveProcess();
      else rejectProcess(new Error(`SEA build failed (${signal ?? `exit code ${code}`}).`));
    });
  });
  console.log(`Created ${resolve(distDirectory, "FlowPlan2.exe")}`);
}

try {
  await buildSea();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
