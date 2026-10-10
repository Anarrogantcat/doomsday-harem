import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6405","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-all2-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6405/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC");
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?all2=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

for (const [w,h] of [[1920,1080],[1440,900],[1280,800],[1024,720],[900,650],[760,600]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const out = {};
      const open = (id) => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('on'));
        const el = document.getElementById(id);
        el.classList.add('on');
        const m = el.querySelector('.mbox');
        const b = m.getBoundingClientRect();
        const body = el.querySelector('.dbody');
        out[id] = Math.round(b.width) + 'x' + Math.round(b.height) +
          (b.width > window.innerWidth + 1 || b.height > window.innerHeight + 1 ? '!OVER' : '') +
          (body && body.scrollWidth > body.clientWidth + 2 ? '!HOVER' : '');
      };
      open('fortress-view'); open('vehicle-view'); open('bigmap-view');
      document.querySelectorAll('.modal').forEach(m => m.classList.remove('on'));
      return JSON.stringify({ v: window.innerWidth + 'x' + window.innerHeight, ...out });
    })()`,
    returnByValue: true
  });
  console.log("  " + String(w).padStart(4) + ": " + r.result?.value);
}
console.log("异常: " + (errs.length || "无"));
ws.close(); proc.kill(); process.exit(0);
