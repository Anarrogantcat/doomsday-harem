import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7105","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-fin2-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7105/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?fin2=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

const S = async (label) => {
  const r = await send("Runtime.evaluate", {
    expression: "JSON.stringify({地图:curMapId, 格:curCellId, 标题:document.getElementById('miniMapName')?.textContent, 当前位置:document.getElementById('curcell')?.querySelector('.cc-n')?.textContent})",
    returnByValue: true
  });
  console.log("  " + label + ": " + r.result?.value);
};
const clickGo = () => send("Runtime.evaluate", { expression: "void (function(){ var g = document.querySelector('#curcell .cc-go'); if (g) g.click(); })()" });

await S("起始");
// 城南出口 → 按 ↓ 跨图
await send("Runtime.evaluate", { expression: "curCellId='south_gate';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await clickGo();  // 用按钮而不是方向键
await sleep(500);
await S("点「往市中心」");
// 市中心 → 城北出口
await send("Runtime.evaluate", { expression: "curCellId='north_gate';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await clickGo();
await sleep(500);
await S("点「往东部郊野」");
// 东部 → 城北路口 → 回市中心
await send("Runtime.evaluate", { expression: "curCellId='e_gate_n';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await clickGo();
await sleep(500);
await S("点「回市中心」");
// 回城南 → 进北岭山
await send("Runtime.evaluate", { expression: "mapCycle();mapCycle();mapCycle();void 0" });
await sleep(600);
await S("切回城南");
await send("Runtime.evaluate", { expression: "curCellId='mountain_foot';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await clickGo();
await sleep(500);
await S("点「进入北岭山」");
// 北岭山 → 要塞
await send("Runtime.evaluate", { expression: "curCellId='mt_fortress';mapRender();mapUpdateDirs();mapUpdateCellInfo();void 0" });
await sleep(400);
await clickGo();
await sleep(500);
await S("点「进入要塞内部」");
// 出要塞
await clickGo();
await sleep(500);
await S("点「出要塞」");

console.log("异常: " + (errs.length || "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_fin2.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
