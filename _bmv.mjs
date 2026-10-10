import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6406","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-bm-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6406/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?bm=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();openBigMap();void 0" });
await sleep(1200);

for (const [w,h,n] of [[1920,1080,"1920"],[1280,800,"1280"],[1024,720,"1024"]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const m = document.querySelector('#bigmap-view .mbox');
      const b = m.getBoundingClientRect();
      const grid = document.getElementById('biggrid');
      return JSON.stringify({
        mbox: Math.round(b.width)+'x'+Math.round(b.height),
        fits: b.width <= window.innerWidth && b.height <= window.innerHeight,
        cells: grid?.children.length,
        gridOver: grid ? grid.scrollWidth > grid.clientWidth + 2 : false,
        cell: grid?.querySelector('.bgc') ? Math.round(grid.querySelector('.bgc').getBoundingClientRect().width)+'x'+Math.round(grid.querySelector('.bgc').getBoundingClientRect().height) : 0
      });
    })()`,
    returnByValue: true
  });
  console.log("  " + w + ": " + r.result?.value);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  if (shot?.data) writeFileSync("_bm" + n + ".png", Buffer.from(shot.data, "base64"));
}
console.log("异常: " + (errs.length || "无"));
ws.close(); proc.kill(); process.exit(0);
