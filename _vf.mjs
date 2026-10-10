import { readFileSync } from "node:fs";
import { parseBeats, classifyLines } from "./packages/llm/src/prompt.ts";

const s = JSON.parse(readFileSync("packages/core/data/generated/h_scenes.json", "utf8"));

let doubleQ = 0, brokenSpk = 0, markerLeft = 0, noSpeaker = 0, shortText = 0;
const issues = [];
let totalSpeech = 0, okSpeech = 0;

for (const e of s.entries) {
  const t = e.text;
  const found = [];

  if (/「「|」」/.test(t)) { doubleQ++; found.push("双引号"); }
  if (/\n[?？]\s*「/.test(t)) { brokenSpk++; found.push("说话人断裂"); }
  if (/节拍\s*\d/.test(t)) { markerLeft++; found.push("标记残留"); }
  if (e.chars < 200) { shortText++; found.push("过短"); }

  // 逐行验证说话人
  const rawSpeech = t.split("\n").filter(l => l.includes("「"));
  const bad = rawSpeech.filter(l => !/^[^「]{1,8}「.+」$/.test(l));
  if (bad.length > 0) { noSpeaker++; found.push("无主台词" + bad.length); }

  totalSpeech += rawSpeech.length;
  okSpeech += rawSpeech.length - bad.length;

  if (found.length > 0) issues.push(e.key + ": " + found.join("、"));
}

console.log("=== 格式验证（" + s.entries.length + " 条）===");
console.log("双引号嵌套:", doubleQ);
console.log("说话人断裂:", brokenSpk);
console.log("标记残留:", markerLeft);
console.log("无主台词:", noSpeaker);
console.log("过短条目:", shortText);
console.log("");
console.log("台词总数:", totalSpeech, " 说话人正确:", okSpeech, "(" + Math.round(okSpeech/Math.max(1,totalSpeech)*100) + "%)");
console.log("");
if (issues.length) {
  console.log("问题条目 (" + issues.length + "):");
  issues.slice(0, 10).forEach(x => console.log("  ✗ " + x));
} else {
  console.log("✓ 全部条目格式正确");
}
