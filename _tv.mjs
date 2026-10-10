import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7101","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-tv-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7101/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description ?? "?").slice(0,150));
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?tv=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

// 站到城南出口
await send("Runtime.evaluate", { expression: "curCellId='south_gate';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(600);
let r = await send("Runtime.evaluate", {
  expression: `(() => {
    const cc = document.getElementById('curcell');
    const go = cc.querySelector('.cc-go');
    return JSON.stringify({
      cell: cc.querySelector('.cc-n')?.textContent,
      goBtn: go ? go.textContent.trim().replace(/\s+/g,' ') : null,
      goClass: go ? go.className : null,
      dirS: (() => { const e=document.getElementById('dS'); return e ? {dis:e.disabled, title:e.title, cls:e.className} : null })()
    });
  })()`,
  returnByValue: true
});
console.log("城南出口: " + r.result?.value);

// 按 ↓（南）跨图
await send("Runtime.evaluate", { expression: "mapMove('S');void 0" });
await sleep(700);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({title:document.getElementById('miniMapName')?.textContent, cell:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent})",
  returnByValue: true
});
console.log("按 ↓ 后: " + r.result?.value);

// 点按钮回去
await send("Runtime.evaluate", { expression: "const g=document.querySelector('#curcell .cc-go'); if(g) g.click();void 0" });
await sleep(700);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({title:document.getElementById('miniMapName')?.textContent, cell:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent})",
  returnByValue: true
});
console.log("点返回按钮: " + r.result?.value);

// 测子图：北岭山脚
await send("Runtime.evaluate", { expression: "curCellId='mountain_foot';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(600);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({cell:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent, go:document.querySelector('#curcell .cc-go')?.textContent.trim().replace(/\s+/g,' ')})",
  returnByValue: true
});
console.log("北岭山脚: " + r.result?.value);

await send("Runtime.evaluate", { expression: "const g=document.querySelector('#curcell .cc-go'); if(g) g.click();void 0" });
await sleep(700);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({title:document.getElementById('miniMapName')?.textContent, cell:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent})",
  returnByValue: true
});
console.log("进山后: " + r.result?.value);

console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_tv.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
