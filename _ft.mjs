import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6401","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ft-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6401/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ft=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();openFortress();fsecAll(true);void 0" });
await sleep(1200);

const out = [];
for (const [w,h] of [[1920,1080],[1600,900],[1440,900],[1366,768],[1280,800],[1024,720],[900,650]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const mbox = document.querySelector('#fortress-view .mbox');
      const body = document.querySelector('#fortress-view .dbody');
      const g = document.querySelector('#fortress-view .defgrid, #fortress-view .fgrid');
      const cell = g?.querySelector('.fcell');
      const rect = mbox?.getBoundingClientRect();
      return JSON.stringify({
        vw: window.innerWidth, vh: window.innerHeight,
        mboxW: rect ? Math.round(rect.width) : 0,
        mboxH: rect ? Math.round(rect.height) : 0,
        fitsW: rect ? rect.width <= window.innerWidth : true,
        fitsH: rect ? rect.height <= window.innerHeight : true,
        cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
        cellW: cell ? Math.round(cell.getBoundingClientRect().width) : 0,
        cellH: cell ? Math.round(cell.getBoundingClientRect().height) : 0,
        cellOverflow: cell ? cell.scrollWidth > cell.clientWidth + 2 : false
      });
    })()`,
    returnByValue: true
  });
  out.push("  " + String(w).padStart(4) + "x" + h + ": " + r.result?.value);
}
console.log(out.join("\n"));
console.log("异常: " + (errs.length || "无"));

// 截图 1280 和 1024
for (const [w,h,n] of [[1280,800,"1280"],[1024,720,"1024"]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  if (shot?.data) writeFileSync("_ft" + n + ".png", Buffer.from(shot.data, "base64"));
}
ws.close(); proc.kill(); process.exit(0);
