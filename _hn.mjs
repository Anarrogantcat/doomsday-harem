import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7201","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-hn-")),"--window-size=1700,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7201/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?hn=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const probe = async (label) => {
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const names = [...document.querySelectorAll('[data-hero-name]')].map(e => e.textContent);
      const home = MAPS.jc_south.cells.find(c => c.id === 'hero_home')?.n;
      const room = MAPS.fortress_inside.cells.find(c => c.id === 'ft_room_hero')?.n;
      return JSON.stringify({ 显示名: names, 家: home, 房间: room, 注册表: PEOPLE.hero.n });
    })()`,
    returnByValue: true
  });
  console.log("  " + label + ": " + r.result?.value);
};

await probe("默认「林晓」");
await send("Runtime.evaluate", { expression: "renameHero('欧阳雪');void 0" });
await sleep(600);
await probe("改名「欧阳雪」");
console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_hn.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
