// Shared isolated browser harness. No dependency, user profile or user-origin access.
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, extname, join } from "node:path";
import assert from "node:assert/strict";
export async function withStorageBrowser(work) {
const candidates = [process.env.FLOWPLAN_BROWSER, "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
let binary;
for (const candidate of candidates) { try { await access(candidate); binary = candidate; break; } catch {} }
if (!binary) throw new Error("Install a Chromium browser or set FLOWPLAN_BROWSER; real IndexedDB tests cannot be replaced by mocks.");
const directory = await mkdtemp(join(tmpdir(), "flowplan-storage-test-"));
const server = createServer(async (req, res) => {
  if (req.url === "/storage-test") { res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Storage test</title>'); return; }
  const path = resolve("dist", "." + new URL(req.url, "http://localhost").pathname);
  if (!path.startsWith(resolve("dist") + "/")) { res.writeHead(403).end(); return; }
  try { const data = await readFile(path); res.writeHead(200, { "Content-Type": extname(path) === ".js" ? "text/javascript" : extname(path) === ".css" ? "text/css" : "text/html" }).end(data); }
  catch { res.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const child = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${directory}`, "--remote-debugging-port=0", `${origin}/storage-test`], { stdio: ["ignore", "ignore", "pipe"] });
child.stderr.resume();
let socket, counter = 0; const workers = new Set(); const pending = new Map();
try {
  let debug;
  for (let i = 0; i < 100; i++) { try { const lines = (await readFile(join(directory, "DevToolsActivePort"), "utf8")).trim().split("\n"); debug = `http://127.0.0.1:${lines[0]}`; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  assert.ok(debug, "Chromium debugging did not start.");
  const tabs = await (await fetch(`${debug}/json/list`)).json(), target = tabs.find(tab => tab.type === "page");
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => { const response = JSON.parse(event.data);
    if (response.method === "Target.attachedToTarget" && response.params.targetInfo.type === "worker") workers.add(response.params.sessionId);
    if (response.method === "Target.detachedFromTarget") { workers.delete(response.params.sessionId); for (const [id, task] of pending) if (task.sessionId === response.params.sessionId) { pending.delete(id); task.reject(new Error("Worker closed.")); } }
    const task = pending.get(response.id); if (!task) return; pending.delete(response.id); response.error ? task.reject(new Error(JSON.stringify(response.error))) : task.resolve(response.result); };
  socket.onclose = () => { for (const task of pending.values()) task.reject(new Error("Browser target closed.")); pending.clear(); };
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject, sessionId }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const evaluate = async expression => { const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const startMemorySampling = async () => {
    await call("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
    let running = false; const samples = [];
    const collect = async () => { if (running) return; running = true;
      try { const replies = await Promise.allSettled([call("Runtime.getHeapUsage"), ...[...workers].map(id => call("Runtime.getHeapUsage", {}, id))]);
        const heaps = replies.filter(reply => reply.status === "fulfilled").map(reply => reply.value);
        samples.push({ atMs: Date.now(), contexts: heaps.length, usedPlusBackingBytes: heaps.reduce((sum, heap) => sum + heap.usedSize + heap.backingStorageSize, 0) });
      } finally { running = false; }
    };
    const timer = setInterval(() => { void collect(); }, 500); await collect();
    return async () => { clearInterval(timer); await collect(); return { intervalMs: 500, samples, observedPeakBytes: Math.max(0, ...samples.map(sample => sample.usedPlusBackingBytes)), includesWorkerContexts: samples.some(sample => sample.contexts > 1) }; };
  };
  return await work({ call, evaluate, startMemorySampling, browser: await call("Browser.getVersion"), origin });
} finally {
  socket?.close(); child.kill("SIGTERM"); await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true }).catch(() => {});
}

}
