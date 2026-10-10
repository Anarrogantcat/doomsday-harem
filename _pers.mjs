import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ud = mkdtempSync(join(tmpdir(), "dh-pers-"));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--user-data-dir="+ud,"--window-size=1920,1080","--remote-debugging-port=6703","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6703/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?p1=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(800);
await send("Runtime.evaluate", { expression: "localStorage.removeItem('dh-col-widths');resetColWidths();void 0" });
await sleep(400);

const width = async () => {
  const r = await send("Runtime.evaluate", {
    expression: "JSON.stringify([Math.round(document.querySelector('.left').getBoundingClientRect().width), Math.round(document.querySelector('.right').getBoundingClientRect().width), Math.round(document.querySelector('.detail-side').getBoundingClientRect().width)])",
    returnByValue: true
  });
  return r.result?.value;
};

console.log("默认: " + await width());

// 拖左栏
await send("Runtime.evaluate", {
  expression: `(() => {
    const sp = document.querySelector('#game > .splitter[data-col="left"]');
    const r = sp.getBoundingClientRect(); const x = r.left + 2, y = 300;
    sp.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, clientX:x, clientY:y, pointerId:9}));
    sp.dispatchEvent(new PointerEvent('pointermove', {bubbles:true, clientX:x-90, clientY:y, pointerId:9}));
    sp.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, clientX:x-90, clientY:y, pointerId:9}));
  })()`
});
await sleep(500);
console.log("拖动后: " + await width());
const saved = await send("Runtime.evaluate", { expression: "localStorage.getItem('dh-col-widths')", returnByValue: true });
console.log("存档: " + saved.result?.value);

// 重新加载
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?p2=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(800);
console.log("重载后: " + await width());

// 恢复默认
await send("Runtime.evaluate", { expression: "resetColWidths();void 0" });
await sleep(400);
console.log("恢复默认: " + await width());
console.log("异常: " + (errs.length || "无"));
ws.close(); proc.kill(); process.exit(0);
