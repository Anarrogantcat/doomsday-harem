import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=6901","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-ppl-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:6901/json")).json();
const page = tg.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errs = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description ?? "?").slice(0,160));
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise(r => ws.addEventListener("open", r));
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?ppl=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

// 看小地图上主角家（有主角）
let r = await send("Runtime.evaluate", {
  expression: `(() => {
    const cells = [...document.querySelectorAll('#mgrid .mcell')];
    const withPeople = cells.filter(c => c.querySelector('.mc-ppl'));
    const first = withPeople[0];
    return JSON.stringify({
      cells: cells.length,
      withPeople: withPeople.length,
      sample: first ? { name: first.querySelector('.mc-n')?.textContent, dots: first.querySelectorAll('.mc-ppl i').length, title: first.title } : null,
      badges: { it: document.querySelectorAll('#mgrid .mc-bg.it').length, ev: document.querySelectorAll('#mgrid .mc-bg.ev').length }
    });
  })()`,
  returnByValue: true
});
console.log("小地图: " + r.result?.value);

// 当前格信息（主角家）
r = await send("Runtime.evaluate", {
  expression: `(() => {
    const cc = document.getElementById('curcell');
    return JSON.stringify({
      name: cc.querySelector('.cc-n')?.textContent,
      people: [...cc.querySelectorAll('.cc-person')].map(p => p.textContent.trim()),
      items: [...cc.querySelectorAll('.cc-chip.it')].map(x => x.textContent),
      events: [...cc.querySelectorAll('.cc-chip.ev')].map(x => x.textContent)
    });
  })()`,
  returnByValue: true
});
console.log("当前格（主角家）: " + r.result?.value);

// 切到要塞内部，看房间
await send("Runtime.evaluate", { expression: "curMapId='fortress_inside';curMap={name:'要塞内部',cols:6,rows:6,cells:MAPS.fortress_inside.cells};curCellId='ft_room_a';mapRender();mapSyncName();mapUpdateDirs();void 0" });
await sleep(700);
r = await send("Runtime.evaluate", {
  expression: `(() => {
    const cc = document.getElementById('curcell');
    return JSON.stringify({
      name: cc.querySelector('.cc-n')?.textContent,
      people: [...cc.querySelectorAll('.cc-person')].map(p => p.textContent.trim()),
      items: [...cc.querySelectorAll('.cc-chip.it')].map(x => x.textContent),
      events: [...cc.querySelectorAll('.cc-chip.ev')].map(x => x.textContent),
      cellsWithPeople: [...document.querySelectorAll('#mgrid .mcell')].filter(c=>c.querySelector('.mc-ppl')).length
    });
  })()`,
  returnByValue: true
});
console.log("姐姐房间: " + r.result?.value);
console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_ppl.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
