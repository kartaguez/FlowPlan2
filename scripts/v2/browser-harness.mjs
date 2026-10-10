import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export async function eventually(work, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const result = await work(); if (result) return result; await new Promise(r => setTimeout(r, 50)); }
  throw new Error(`Timeout: ${label}`);
}
export async function withBrowser(work) {
  let binary;
  for (const candidate of [process.env.FLOWPLAN_BROWSER, '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean)) {
    try { await access(candidate); binary = candidate; break; } catch {}
  }
  if (!binary) throw new Error('Real Chromium required: install browser or set FLOWPLAN_BROWSER');
  const directory = await mkdtemp(resolve(tmpdir(), 'flowplan-v2-browser-'));
  const child = spawn(binary, ['--headless=new','--disable-gpu','--disable-extensions','--disable-component-extensions-with-background-pages','--no-first-run','--no-default-browser-check',`--user-data-dir=${directory}`,'--remote-debugging-port=0','about:blank'], { stdio: ['ignore','ignore','pipe'] });
  let launchError; child.on('error', e => { launchError = e; }); child.stderr.resume();
  let socket; const pending = new Map(), handlers = new Set(); let counter = 0;
  try {
    const lines = await eventually(async () => {
      if (launchError) throw launchError;
      if (child.exitCode !== null) throw Error('Browser exited before debugging readiness');
      try { return (await readFile(resolve(directory, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); } catch { return false; }
    }, 'browser debugging');
    socket = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
    await new Promise((yes,no) => { socket.onopen = yes; socket.onerror = no; });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) { const item = pending.get(message.id); if (!item) return; clearTimeout(item.timer); pending.delete(message.id); message.error ? item.no(Error(JSON.stringify(message.error))) : item.yes(message.result); }
      else for (const handle of handlers) handle(message);
    };
    socket.onclose = () => { for (const item of pending.values()) { clearTimeout(item.timer); item.no(Error('CDP closed')); } pending.clear(); };
    const call = (method, params = {}, sessionId) => new Promise((yes,no) => {
      const id = ++counter, timer = setTimeout(() => { pending.delete(id); no(Error(`CDP timeout ${method}`)); }, 15000);
      pending.set(id,{yes,no,timer}); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? {sessionId} : {}) }));
    });
    const events = [];
    handlers.add(message => events.push(message));
    await call('Target.setDiscoverTargets',{discover:true});
    async function page() {
      const { targetId } = await call('Target.createTarget',{url:'about:blank'});
      const { sessionId } = await call('Target.attachToTarget',{targetId,flatten:true});
      const send = (method,params={}) => call(method,params,sessionId);
      await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled',{cacheDisabled:true});
      const evaluate = async expression => {
        const result = await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}).catch(error=>{throw Error(error.message+' ['+expression.slice(0,100)+']');});
        if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
      };
      async function navigate(origin, blank = false) {
        let intercept;
        if (blank) {
          intercept = message => { if (message.sessionId === sessionId && message.method === 'Fetch.requestPaused') void send('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from('<!doctype html><title>V2 test context</title>').toString('base64')}); };
          handlers.add(intercept); await send('Fetch.enable',{patterns:[{urlPattern:'*',resourceType:'Document',requestStage:'Request'}]});
        }
        const result = await send('Page.navigate',{url:origin+'/'});
        if (result.errorText) throw Error(result.errorText);
        await eventually(() => evaluate(`location.origin === ${JSON.stringify(origin)} && document.readyState === 'complete'`).catch(()=>false),'page navigation');
        if (blank) { await send('Fetch.disable'); handlers.delete(intercept); }
      }
      return {targetId,sessionId,send,evaluate,navigate,events:()=>events.filter(e=>e.sessionId===sessionId),close:()=>call('Target.closeTarget',{targetId})};
    }
    return await work({ call, page, events, browser: await call('Browser.getVersion') });
  } finally {
    socket?.close(); child.kill('SIGTERM');
    await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2000))]);
    await rm(directory,{recursive:true,force:true});
  }
}

/** Installed before modules; all attempted access is reported even when caught. */
export function installAudit() {
  const hooks = [];
  const denied = (api,detail='') => { globalThis.__flowplanAudit(JSON.stringify({api,detail,origin:location.origin})); throw Error('Forbidden browser capability: '+api); };
  const method = (proto,name,label) => {
    if (!proto || typeof proto[name] !== 'function') throw Error('Missing instrumentation target '+label);
    Object.defineProperty(proto,name,{configurable:false,writable:false,value:function(...args){return denied(label,String(args[0]??''));}}); hooks.push(label);
  };
  for (const name of ['open','deleteDatabase','databases']) method(IDBFactory.prototype,name,'IDBFactory.'+name);
  for (const name of ['getItem','setItem','removeItem','clear','key']) method(Storage.prototype,name,'Storage.'+name);
  for (const name of ['localStorage','sessionStorage']) { Object.defineProperty(window,name,{configurable:false,get(){return denied('window.'+name);}}); hooks.push('window.'+name); }
  for (const name of ['BroadcastChannel','Worker','SharedWorker','WebSocket','EventSource','XMLHttpRequest']) {
    if (typeof window[name] !== 'function') throw Error('Missing constructor '+name);
    Object.defineProperty(window,name,{configurable:false,writable:false,value:function(...args){return denied(name,String(args[0]??''));}}); hooks.push(name);
  }
  Object.defineProperty(window,'fetch',{configurable:false,writable:false,value:(...args)=>denied('fetch',String(args[0]??''))}); hooks.push('fetch');
  method(Navigator.prototype,'sendBeacon','sendBeacon');
  method(ServiceWorkerContainer.prototype,'register','serviceWorker.register');
  for (const name of ['open','match','has','delete','keys']) method(CacheStorage.prototype,name,'CacheStorage.'+name);
  for (const name of ['estimate','persist','persisted']) method(StorageManager.prototype,name,'StorageManager.'+name);
  Object.defineProperty(Document.prototype,'cookie',{configurable:false,get(){return denied('cookie.get');},set(value){denied('cookie.set',value);}}); hooks.push('cookie');
  Object.defineProperty(window,'__flowplanHooks',{value:Object.freeze(hooks),writable:false});
}
