import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const proc = spawn(EDGE, ["--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check","--disable-extensions","--disable-sync","--incognito","--remote-debugging-port=7702","--user-data-dir="+mkdtempSync(join(tmpdir(),"dh-later2-")),"--window-size=1500,1050","about:blank"], { stdio: "ignore" });
await sleep(4000);
const tg = await (await fetch("http://127.0.0.1:7702/json")).json();
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
await send("Page.navigate", { url: "http://127.0.0.1:4999/ui-prototype.html?later2=" + Date.now() });
await sleep(4000);
await send("Runtime.evaluate", { expression: "document.querySelector('.mbtn').click();void 0" });
await sleep(1200);

const list = await send("Runtime.evaluate", {
  expression: "JSON.stringify([...document.querySelectorAll('.hitem')].map(h => h.dataset.id))",
  returnByValue: true
});
console.log("名册 id: " + list.result?.value);

// 按 data-id 点，不靠索引
for (const id of ["doctor", "soldier", "sister", "mother", "sister2"]) {
  await send("Runtime.evaluate", { expression: "document.getElementById('hero-detail').classList.remove('on');document.querySelector('.hitem[data-id=\"" + id + "\"]').click();document.getElementById('detail').classList.add('on');void 0" });
  await sleep(550);
  const r = await send("Runtime.evaluate", {
    expression: `(() => {
      const cells = [...document.querySelectorAll('#detail #d-status .dcell')].map(c => c.textContent.trim());
      return JSON.stringify({
        标题: document.querySelector('#detail .mtitle')?.textContent,
        抬头: document.querySelector('#detail .dname')?.textContent.trim(),
        生理: cells.filter(x => /^(生理性别|性取向|身高|三围|体型)/.test(x)).join(' ')
      });
    })()`,
    returnByValue: true
  });
  console.log("  " + r.result?.value);
}
console.log("异常: " + (errs.length || "无"));
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot?.data) writeFileSync("_later2.png", Buffer.from(shot.data, "base64"));
ws.close(); proc.kill(); process.exit(0);
