import { NAME_POOLS, SURNAMES_SINGLE, SURNAMES_COMPOUND, SURNAMES_MAIDEN, namePoolStats, splitName, familyNames, offspringName, generateName, randomName } from "./packages/core/src/systems/names.ts";

const st = namePoolStats();
console.log("=== 名字池规模 ===");
console.log("  风格: " + st.styles + " 类");
console.log("  单字名(去重): " + st.single);
console.log("  双字名(去重): " + st.double);
console.log("  名字合计: " + st.total);
console.log("  姓氏: " + st.surnames + " 个（单姓 " + SURNAMES_SINGLE.length + " + 复姓 " + SURNAMES_COMPOUND.length + "）");
console.log("  娘家姓池: " + SURNAMES_MAIDEN.length);
console.log("");
console.log("=== 各风格示例 ===");
for (const p of NAME_POOLS) {
  console.log("  " + p.style.padEnd(10) + p.label.padEnd(14) + "单 " + p.single.length + " / 双 " + p.double.length);
}
console.log("");
console.log("=== 拆名测试 ===");
for (const n of ["林晓", "欧阳娜娜", "John Smith", "", "苏"]) {
  const s = splitName(n);
  console.log("  " + JSON.stringify(n).padEnd(14) + " → 姓「" + s.surname + "」名「" + s.given + "」" + (s.compound ? " 复姓" : ""));
}
console.log("");
console.log("=== 家人命名（主角「林晓」）===");
const f = familyNames("林晓");
for (const [k, v] of Object.entries(f)) console.log("  " + k.padEnd(14) + v);
console.log("");
console.log("=== 同一输入结果一致 ===");
const f2 = familyNames("林晓");
console.log("  两次相同: " + (JSON.stringify(f) === JSON.stringify(f2)));
console.log("");
console.log("=== 不同主角名 ===");
for (const h of ["欧阳雪", "苏沐", "陈默"]) {
  const g = familyNames(h);
  console.log("  " + h + " → 姐姐 " + g.sister + " / 妹妹 " + g.sister2 + " / 母亲 " + g.mother + " / AI " + g.ai);
}
console.log("");
console.log("=== 后代 ===");
for (let i = 0; i < 3; i++) console.log("  第" + (i+1) + "个: " + offspringName("林晓", i));
