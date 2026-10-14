import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const appDir = resolve(root, "scripts/v3/.generated/app");

export function buildV3() {
  return (async () => {
    await rm(appDir, { recursive: true, force: true });
    await mkdir(appDir, { recursive: true });
    const compiler = resolve(root, "node_modules/typescript/bin/tsc");
    const result = spawnSync(process.execPath, [compiler, "-p", resolve(root, "tsconfig.v3.app.json")], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`V3 TypeScript build failed (${result.status})`);
    await cp(resolve(root, "public-v3"), appDir, { recursive: true });
  })();
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await buildV3();
  console.log(`V3 built at ${appDir}`);
}
