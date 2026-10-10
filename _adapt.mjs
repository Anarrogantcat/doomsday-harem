import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6201","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ad-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6201/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ad=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const sizes = [[1920,1080],[1440,900],[1280,720],[1024,700]];
const out = [];
for (const [w,h] of sizes) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const g = document.getElementById('mgrid');
      const c = g?.querySelector('.mcell');
      const right = document.querySelector('.right');
      const body = document.querySelector('.game-body');
      const cols = body ? getComputedStyle(body).gridTemplateColumns : '?';
      return JSON.stringify({
        vw: window.innerWidth,
        cellW: c ? Math.round(c.getBoundingClientRect().width) : 0,
        cellH: c ? Math.round(c.getBoundingClientRect().height) : 0,
        gridW: g ? Math.round(g.getBoundingClientRect().width) : 0,
        rightW: right ? Math.round(right.getBoundingClientRect().width) : 0,
        cols,
        overflowX: document.documentElement.scrollWidth > window.innerWidth
      });
    })()`,
    returnByValue: true
  });
  out.push("  " + w + "x" + h + ": " + r.result?.value);
}
console.log(out.join("\n"));
ws.close(); proc.kill(); process.exit(0);
