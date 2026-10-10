import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6303","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ad4-")),"--window-size=1366,768","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6303/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ad4=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const r = await send("Runtime.evaluate", {
  expression: `(() => {
    const g = document.getElementById('game');
    const gb = document.querySelector('.game-body');
    const kids = [...g.children].map(c => c.className || c.id);
    const bodies = [...(gb ? gb.children : [])].map(c => c.className || c.id);
    const w = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : 0 };
    return JSON.stringify({
      gameChildren: kids,
      bodyChildren: bodies,
      gameCols: getComputedStyle(g).gridTemplateColumns,
      gameDisplay: getComputedStyle(g).display,
      bodyDisplay: gb ? getComputedStyle(gb).display : 'n/a',
      bodyCols: gb ? getComputedStyle(gb).gridTemplateColumns : 'n/a',
      widths: { left: w('.left'), center: w('.center'), right: w('.right'), detail: w('.detail-side') },
      vw: window.innerWidth,
      scrollW: document.documentElement.scrollWidth
    }, null, 1);
  })()`,
  returnByValue: true
});
console.log(r.result?.value);
ws.close(); proc.kill(); process.exit(0);
