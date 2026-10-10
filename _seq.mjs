import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7104","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-seq-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7104/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?seq=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

const state = async (label) => {
  const r = await send("Runtime.evaluate", {
    expression: "JSON.stringify({mapId:curMapId, cell:curCellId, map:'curMap' in window || typeof curMap!=='undefined' ? curMap?.name : '?'})",
    returnByValue: true
  });
  console.log("  " + label + ": " + r.result?.value);
};

await state("初始");

// 1) 去城南出口
await send("Runtime.evaluate", { expression: "curCellId='south_gate';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await state("到城南出口");

// 2) 按 S 跨图
await send("Runtime.evaluate", { expression: "mapMove('S');void 0" });
await sleep(500);
await state("按S后");

// 3) 点返回
await send("Runtime.evaluate", { expression: "const g=document.querySelector('#curcell .cc-go'); g && g.click();void 0" });
await sleep(500);
await state("点返回后");

// 4) 到北岭山脚
await send("Runtime.evaluate", { expression: "curCellId='mountain_foot';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(500);
await state("到北岭山脚");

// 5) 点进山
const r = await send("Runtime.evaluate", {
  expression: `(() => {
    const g = document.querySelector('#curcell .cc-go');
    const oc = g ? g.getAttribute('onclick') : null;
    try { g.click(); return JSON.stringify({oc, clickOk:true}); }
    catch(e) { return JSON.stringify({oc, clickErr:String(e)}); }
  })()`,
  returnByValue: true
});
console.log("  点击: " + r.result?.value);
await sleep(600);
await state("点进山后");
console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
ws.close(); proc.kill(); process.exit(0);
