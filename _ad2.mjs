import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6301","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ad2-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6301/json")).json();
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
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ad2=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const sizes = [[2200,1200],[1920,1080],[1600,900],[1440,900],[1280,800],[1150,750],[1024,700],[900,650]];
const out = [];
for (const [w,h] of sizes) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(450);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const g = document.getElementById('mgrid');
      const c = g?.querySelector('.mcell');
      const vis = (s) => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none' && e.offsetWidth > 0; };
      return JSON.stringify({
        vw: window.innerWidth,
        cell: c ? Math.round(c.getBoundingClientRect().width) + 'x' + Math.round(c.getBoundingClientRect().height) : 0,
        gridW: g ? Math.round(g.getBoundingClientRect().width) : 0,
        left: vis('.left'), right: vis('.right'), detail: vis('.detail-side'),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2
      });
    })()`,
    returnByValue: true
  });
  out.push("  " + String(w).padStart(4) + "px: " + r.result?.value);
}
console.log(out.join("\n"));
console.log("异常: " + (errs.length || "无"));

// 截 1920 和 1280
await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await sleep(600);
let shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_ad1920.png", Buffer.from(shot.data, "base64"));
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await sleep(600);
shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_ad1280.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
