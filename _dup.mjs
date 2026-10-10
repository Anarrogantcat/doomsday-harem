import { NAME_POOLS, SURNAMES_SINGLE, SURNAMES_MAIDEN, SURNAMES_COMPOUND } from "./packages/core/src/systems/names.ts";
const dup = (arr) => { const s = new Set(); const d = new Set(); for (const x of arr) { if (s.has(x)) d.add(x); s.add(x); } return [...d]; };
for (const p of NAME_POOLS) {
  const ds = dup(p.single), dd = dup(p.double);
  if (ds.length) console.log(p.style + " single 重复: " + ds.join(","));
  if (dd.length) console.log(p.style + " double 重复: " + dd.join(","));
}
const a = dup(SURNAMES_SINGLE), b = dup(SURNAMES_COMPOUND), c = dup(SURNAMES_MAIDEN);
if (a.length) console.log("单姓重复: " + a.join(","));
if (b.length) console.log("复姓重复: " + b.join(","));
if (c.length) console.log("娘家姓重复: " + c.join(","));
