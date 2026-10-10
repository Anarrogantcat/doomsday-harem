import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6801","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-opt-")),"--window-size=1600,1000","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6801/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description ?? "?").slice(0,130));
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?opt=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

let r = await send("Runtime.evaluate", {
  expression: `(() => {
    const obar = document.getElementById('obar');
    const opts = document.querySelectorAll('#olist .opt');
    return JSON.stringify({
      exists: !!obar,
      count: opts.length,
      lock: document.querySelectorAll('#olist .opt.lock').length,
      go: document.querySelectorAll('#olist .opt.go').length,
      texts: [...opts].map(o => o.querySelector('.ot').textContent.slice(0, 14)),
      ibVisible: getComputedStyle(document.getElementById('ibody')).display
    });
  })()`,
  returnByValue: true
});
console.log("选项区: " + r.result?.value);

// 测数字键选择
await send("Runtime.evaluate", { expression: "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'2',bubbles:true}));void 0" });
await sleep(400);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({picked:[...document.querySelectorAll('#olist .opt.picked')].map(o=>o.querySelector('.ot').textContent.slice(0,16))})",
  returnByValue: true
});
console.log("按数字 2: " + r.result?.value);

// 测空格继续
await send("Runtime.evaluate", { expression: "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));void 0" });
await sleep(400);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({picked:[...document.querySelectorAll('#olist .opt.picked')].map(o=>o.querySelector('.ot').textContent.slice(0,16))})",
  returnByValue: true
});
console.log("按空格: " + r.result?.value);

// 测输入栏开关
await send("Runtime.evaluate", { expression: "toggleInputbar();void 0" });
await sleep(400);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({display:getComputedStyle(document.getElementById('ibody')).display,icon:document.getElementById('ibToggle').textContent})",
  returnByValue: true
});
console.log("隐藏输入栏: " + r.result?.value);

console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
await send("Runtime.evaluate", { expression: "toggleInputbar();void 0" });
await sleep(400);
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_opt.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
