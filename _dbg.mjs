import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6702","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-dbg-")),"--window-size=1920,1080","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6702/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?dbg=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

const r = await send("Runtime.evaluate", {
  expression: `(() => {
    const g = document.getElementById('game');
    const kids = [...g.children].map((c, i) => {
      const cs = getComputedStyle(c);
      const b = c.getBoundingClientRect();
      return i + ':' + (c.className || c.id) + ' x=' + Math.round(b.left) + ' w=' + Math.round(b.width) + ' col=' + cs.gridColumnStart + '/' + cs.gridColumnEnd + ' row=' + cs.gridRowStart + ' disp=' + cs.display;
    });
    return JSON.stringify({
      cols: getComputedStyle(g).gridTemplateColumns,
      kids
    }, null, 1);
  })()`,
  returnByValue: true
});
console.log(r.result?.value);
ws.close(); proc.kill(); process.exit(0);
