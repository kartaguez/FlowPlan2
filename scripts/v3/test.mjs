import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "scripts/v3/.generated/test");

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([resolve(root, "scripts/v3/boundaries.mjs")]);
await rm(output, { recursive: true, force: true });
run([resolve(root, "node_modules/typescript/bin/tsc"), "-p", resolve(root, "tsconfig.v3.test.json")]);
run(["--test", resolve(output, "tests-v3/domain.test.js"), resolve(output, "tests-v3/application.test.js")]);
if (process.env.V3_BROWSER_BIN) run(["--test", resolve(root, "tests-v3/browser.e2e.mjs")]);
