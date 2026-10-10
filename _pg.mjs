import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7501","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-pg-")),"--window-size=1500,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7501/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?pg=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1000);

for (const [idx, name] of [[0, "姐姐"], [1, "母亲"], [2, "妹妹"]]) {
  await send("Runtime.evaluate", { expression: "document.querySelectorAll('.hitem')[" + idx + "].click();document.getElementById('detail').classList.add('on');void 0" });
  await sleep(600);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const cells = [...document.querySelectorAll('#detail #d-status .dcell')].map(c => c.textContent.trim());
      const preg = cells.filter(x => /怀孕|生产|已育|产后|孕程/.test(x));
      const hint = document.querySelector('#detail #d-status .hint-line')?.textContent.trim();
      return JSON.stringify({ 抬头: document.querySelector('#detail .dname')?.textContent.trim(), 生育: preg, 提示: hint });
    })()`,
    returnByValue: true
  });
  console.log(name + ": " + r.result?.value);
}
console.log("异常: " + (errs.length ? errs.slice(0,2).join(" | ") : "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_pg.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
