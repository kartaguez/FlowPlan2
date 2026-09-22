import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");
const publicDirectory = resolve(projectRoot, "public");
const tscEntryPoint = resolve(
  projectRoot,
  "node_modules/typescript/bin/tsc",
);

export function runTypeScript(arguments_) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(process.execPath, [tscEntryPoint, ...arguments_], {
      cwd: projectRoot,
      stdio: "inherit",
    });
    child.once("error", rejectProcess);
    child.once("exit", (code, signal) => {
      if (signal) {
        rejectProcess(new Error(`TypeScript was terminated by ${signal}.`));
      } else if (code === 0) {
        resolveProcess();
      } else {
        rejectProcess(new Error(`TypeScript exited with code ${code}.`));
      }
    });
  });
}

export async function build() {
  await rm(distDirectory, { recursive: true, force: true });
  await mkdir(distDirectory, { recursive: true });
  await runTypeScript(["-p", "tsconfig.app.json"]);
  await cp(publicDirectory, distDirectory, { recursive: true });
  await Promise.all(
    [
      "domain",
      "application",
      "adapters",
      "infrastructure",
      "ui",
      "main",
    ].map((layer) =>
      mkdir(resolve(distDirectory, "js", layer), { recursive: true }),
    ),
  );
}

if (import.meta.main) {
  try {
    await build();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
