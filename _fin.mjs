import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6704","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-fin-")),"--window-size=1600,1000","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6704/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?fin=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();resetColWidths();void 0" });
await sleep(600);
// 拖动地图栏变宽
await send("Runtime.evaluate", {
  expression: `(() => {
    const sp = document.querySelector('#game > .splitter[data-col="right"]');
    const r = sp.getBoundingClientRect(); const x = r.left + 2, y = 300;
    sp.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX:x, clientY:y, pointerId:11}));
    sp.dispatchEvent(new PointerEvent('pointermove', {bubbles:true, clientX:x-160, clientY:y, pointerId:11}));
    sp.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, clientX:x-160, clientY:y, pointerId:11}));
  })()`
});
await sleep(700);
const r = await send("Runtime.evaluate", {
  expression: "JSON.stringify([Math.round(document.querySelector('.left').getBoundingClientRect().width), Math.round(document.querySelector('.right').getBoundingClientRect().width), Math.round(document.querySelector('.detail-side').getBoundingClientRect().width)])",
  returnByValue: true
});
console.log("拖动后宽度: " + r.result?.value);
console.log("异常: " + (errs.length || "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_sp2.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
