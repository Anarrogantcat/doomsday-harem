import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6404","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-all-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6404/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?all=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

for (const [w,h] of [[1920,1080],[1440,900],[1280,800],[1024,720],[900,650]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const check = (id) => {
        const m = document.querySelector('#' + id + ' .mbox');
        if (!m) return null;
        const b = m.getBoundingClientRect();
        return Math.round(b.width) + 'x' + Math.round(b.height) + (b.width <= window.innerWidth && b.height <= window.innerHeight ? '' : '!OVER');
      };
      // 打开所有弹窗测
      return JSON.stringify({ vw: window.innerWidth, vh: window.innerHeight, fort: check('fortress-view'), veh: check('vehicle-view'), big: check('bigmap-view') });
    })()`,
    returnByValue: true
  });
  console.log("  " + String(w).padStart(4) + ": " + r.result?.value);
}
console.log("异常: " + (errs.length || "无"));
ws.close(); proc.kill(); process.exit(0);
