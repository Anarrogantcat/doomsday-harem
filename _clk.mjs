import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6601","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-clk-")),"--window-size=1600,1000","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6601/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?clk=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

// 单击妹妹
await send("Runtime.evaluate", { expression: "document.querySelectorAll('.hitem')[2].click();void 0" });
await sleep(600);
let r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({modal:document.querySelector('#detail').classList.contains('on'),sideName:document.getElementById('dsName')?.textContent,sel:document.querySelectorAll('.hitem.sel').length})",
  returnByValue: true
});
console.log("单击: " + r.result?.value);

// 双击妹妹
await send("Runtime.evaluate", { expression: "const e=document.querySelectorAll('.hitem')[2];e.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));void 0" });
await sleep(600);
r = await send("Runtime.evaluate", {
  expression: "JSON.stringify({modal:document.querySelector('#detail').classList.contains('on'),title:document.querySelector('#detail .mtitle')?.textContent})",
  returnByValue: true
});
console.log("双击: " + r.result?.value);
console.log("异常: " + (errs.length || "无"));
ws.close(); proc.kill(); process.exit(0);
