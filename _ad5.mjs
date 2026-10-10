import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6304","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ad5-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6304/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ad5=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

for (const [w,h] of [[1920,1080],[1600,900],[1440,900],[1366,768],[1280,800],[1150,750],[1024,720],[900,650]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(450);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const rect = (s) => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return Math.round(b.left) + '-' + Math.round(b.right) };
      return JSON.stringify({
        vw: window.innerWidth,
        L: rect('.left'), C: rect('.center'), R: rect('.right'), D: rect('.detail-side'),
        rightmost: Math.round(Math.max(...[...document.querySelectorAll('#game > *')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().right))),
        over: document.documentElement.scrollWidth > window.innerWidth + 1
      });
    })()`,
    returnByValue: true
  });
  console.log("  " + String(w).padStart(4) + ": " + r.result?.value);
}
ws.close(); proc.kill(); process.exit(0);
