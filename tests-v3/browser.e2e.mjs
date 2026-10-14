import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildV3 } from "../scripts/v3/build.mjs";
import { startV3Server } from "../scripts/v3/dev.mjs";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connectBrowser(binary) {
  const profile = await mkdtemp(join(tmpdir(), "flowplan3-e2e-"));
  const browser = spawn(binary, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (browser.exitCode !== null) break;
    try {
      port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
      if (port) break;
    } catch { /* Browser is still starting. */ }
    await pause(100);
  }
  if (!port) {
    browser.kill();
    await rm(profile, { recursive: true, force: true });
    throw new Error("Chromium did not expose a debugging port");
  }
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(target => target.type === "page");
  if (!page) throw new Error("Chromium did not create a page");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  const close = async () => {
    socket.close();
    if (browser.exitCode === null) {
      browser.kill();
      await new Promise(resolve => browser.once("exit", resolve));
    }
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await rm(profile, { recursive: true, force: true });
        return;
      } catch (error) {
        if (error?.code !== "ENOTEMPTY" || attempt === 9) throw error;
        await pause(100);
      }
    }
  };
  return { call, evaluate, close };
}

async function waitForPage(evaluate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('#planning-form')")) return;
    await pause(100);
  }
  throw new Error("V3 page did not load");
}

test("parcours navigateur V0-A et affichage d'un horizon long", { timeout: 60_000 }, async t => {
  assert.ok(process.env.V3_BROWSER_BIN, "Set V3_BROWSER_BIN to a Chromium-family browser executable");
  await buildV3();
  const { server, url } = await startV3Server();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await connectBrowser(process.env.V3_BROWSER_BIN);
  t.after(browser.close);
  await browser.call("Page.enable");
  await browser.call("Runtime.enable");
  await browser.call("Page.navigate", { url });
  await waitForPage(browser.evaluate);

  const values = {
    name: "Planning A/B", startDate: "2026-10-12", endDate: "2026-10-14",
    "team.id": "team", "team.name": "Équipe", "team.dailyCapacity": "3",
    "projects.0.id": "a", "projects.0.name": "Projet A", "projects.0.earliestStart": "2026-10-12", "projects.0.etc": "4", "projects.0.priority": "1",
    "projects.1.id": "b", "projects.1.name": "Projet B", "projects.1.earliestStart": "2026-10-12", "projects.1.etc": "5", "projects.1.priority": "2",
  };
  const output = await browser.evaluate(`(() => {
    const values = ${JSON.stringify(values)};
    for (const [field, value] of Object.entries(values)) document.querySelector('[data-field="' + field + '"]').value = value;
    document.querySelector('#planning-form').requestSubmit();
    return {
      status: document.querySelector('#form-status').textContent,
      hidden: document.querySelector('#result').hidden,
      days: [...document.querySelectorAll('#day-rows tr')].map(row => [...row.cells].map(cell => cell.textContent)),
      projects: [...document.querySelectorAll('#project-rows tr')].map(row => [...row.cells].map(cell => cell.textContent)),
    };
  })()`);
  assert.equal(output.status, "Planning calculé.");
  assert.equal(output.hidden, false);
  assert.deepEqual(output.days, [
    ["2026-10-12", "3", "3", "0", "Projet A (a) : 3"],
    ["2026-10-13", "3", "3", "0", "Projet A (a) : 1 ; Projet B (b) : 2"],
    ["2026-10-14", "3", "3", "0", "Projet B (b) : 3"],
  ]);
  assert.deepEqual(output.projects, [
    ["Projet A (a)", "4", "4", "0", "2026-10-12", "2026-10-13", "100 % planifié"],
    ["Projet B (b)", "5", "5", "0", "2026-10-13", "2026-10-14", "100 % planifié"],
  ]);

  const invalid = await browser.evaluate(`(() => {
    document.querySelector('[data-field="team.dailyCapacity"]').value = '-1';
    document.querySelector('#planning-form').requestSubmit();
    return { status: document.querySelector('#form-status').textContent,
      error: document.querySelector('[data-error-for="team.dailyCapacity"]').textContent,
      first: document.querySelector('#day-rows tr').textContent };
  })()`);
  assert.match(invalid.status, /dernier résultat valide/);
  assert.match(invalid.error, /Décimal/);
  assert.equal(invalid.first, output.days[0].join(""));

  const changed = await browser.evaluate(`(() => {
    document.querySelector('[data-field="team.dailyCapacity"]').value = '3';
    document.querySelector('[data-field="projects.0.priority"]').value = '2';
    document.querySelector('[data-field="projects.1.priority"]').value = '1';
    document.querySelector('#planning-form').requestSubmit();
    return [...document.querySelectorAll('#day-rows tr')].map(row => row.cells[4].textContent);
  })()`);
  assert.deepEqual(changed, ["Projet B (b) : 3", "Projet B (b) : 2 ; Projet A (a) : 1", "Projet A (a) : 3"]);

  const longHorizon = await browser.evaluate(`(async () => {
    document.querySelector('[data-field="startDate"]').value = '2025-01-01';
    document.querySelector('[data-field="endDate"]').value = '2034-12-31';
    document.querySelector('[data-field="projects.0.earliestStart"]').value = '2025-01-01';
    document.querySelector('[data-field="projects.1.earliestStart"]').value = '2025-01-01';
    const start = performance.now();
    document.querySelector('#planning-form').requestSubmit();
    const renderMs = performance.now() - start;
    await new Promise(resolve => requestAnimationFrame(resolve));
    return { rows: document.querySelectorAll('#day-rows tr').length,
      renderMs, frameMs: performance.now() - start, status: document.querySelector('#form-status').textContent };
  })()`);
  assert.equal(longHorizon.rows, 3652);
  assert.equal(longHorizon.status, "Planning calculé.");
  t.diagnostic(`V3 browser: ${longHorizon.rows} rows, submit/render ${longHorizon.renderMs.toFixed(1)} ms, next frame ${longHorizon.frameMs.toFixed(1)} ms`);
});
