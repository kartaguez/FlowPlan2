import { readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testOutput = resolve(projectRoot, ".test-dist");
const tscEntryPoint = resolve(
  projectRoot,
  "node_modules/typescript/bin/tsc",
);

function run(command, arguments_) {
  return new Promise((resolveProcess, rejectProcess) => {
    const child = spawn(command, arguments_, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    child.once("error", rejectProcess);
    child.once("exit", (code, signal) => {
      if (signal) {
        rejectProcess(new Error(`Test process was terminated by ${signal}.`));
      } else if (code === 0) {
        resolveProcess();
      } else {
        rejectProcess(new Error(`Test process exited with code ${code}.`));
      }
    });
  });
}

async function collectTests(directory) {
  const tests = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(path)));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      tests.push(path);
    }
  }
  return tests;
}

try {
  await rm(testOutput, { recursive: true, force: true });
  await run(process.execPath, [tscEntryPoint, "-p", "tsconfig.test.json"]);
  const tests = (await collectTests(testOutput)).sort();
  if (tests.length === 0) {
    throw new Error("No compiled test files were found.");
  }
  await run(process.execPath, ["--test", ...tests]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
