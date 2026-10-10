import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7103","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-clk3-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7103/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description ?? "?").slice(0,200));
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?clk3=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

// 站到北岭山脚，然后点按钮
await send("Runtime.evaluate", { expression: "curCellId='mountain_foot';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(600);
let r = await send("Runtime.evaluate", {
  expression: `(() => {
    const g = document.querySelector('#curcell .cc-go');
    const before = document.getElementById('miniMapName')?.textContent;
    g.click();
    return JSON.stringify({ before, clicked: true });
  })()`,
  returnByValue: true
});
console.log("点击前: " + r.result?.value);
await sleep(700);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({after:document.getElementById('miniMapName')?.textContent, cell:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent, curMapId: curMapId})",
  returnByValue: true
});
console.log("点击后: " + r.result?.value);
console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
ws.close(); proc.kill(); process.exit(0);
