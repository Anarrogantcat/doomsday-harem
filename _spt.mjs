import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6701","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-sp-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6701/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description ?? "?").slice(0,140));
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?sp=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const probe = async (label) => {
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const w = (s) => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none' ? Math.round(e.getBoundingClientRect().width) : 0 };
      const g = document.getElementById('game');
      const sp = document.querySelectorAll('#game > .splitter');
      return JSON.stringify({
        L: w('.left'), C: w('.center'), R: w('.right'), D: w('.detail-side'),
        splitters: sp.length,
        spVisible: [...sp].filter(x => getComputedStyle(x).display !== 'none').length,
        leftVar: getComputedStyle(g).getPropertyValue('--c-left').trim(),
        total: Math.round([...document.querySelectorAll('#game > *')].filter(e=>getComputedStyle(e).display!=='none' && !e.classList.contains('splitter')).reduce((s,e)=>s+e.getBoundingClientRect().width,0))
      });
    })()`,
    returnByValue: true
  });
  console.log("  " + label + ": " + r.result?.value);
};

await probe("初始");

// 模拟拖动左侧分隔条 +150px
await send("Runtime.evaluate", {
  expression: `(() => {
    const sp = document.querySelector('#game > .splitter[data-col="left"]');
    const r = sp.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + 300;
    sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:x, clientY:y, pointerId:1 }));
    sp.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientX:x+150, clientY:y, pointerId:1 }));
    sp.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, clientX:x+150, clientY:y, pointerId:1 }));
    return 'dragged';
  })()`,
  returnByValue: true
});
await sleep(500);
await probe("左栏 +150px");

// 拖动地图分隔条
await send("Runtime.evaluate", {
  expression: `(() => {
    const sp = document.querySelector('#game > .splitter[data-col="right"]');
    const r = sp.getBoundingClientRect();
    const x = r.left + r.width/2, y = r.top + 300;
    sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, clientX:x, clientY:y, pointerId:2 }));
    sp.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, clientX:x-120, clientY:y, pointerId:2 }));
    sp.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, clientX:x-120, clientY:y, pointerId:2 }));
    return 'dragged';
  })()`,
  returnByValue: true
});
await sleep(500);
await probe("地图 +120px（左拖）");

console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_sp.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
