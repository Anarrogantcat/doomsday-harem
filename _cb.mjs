import * as C from "./packages/core/src/systems/combat.ts";
import * as X from "./packages/core/src/systems/combatExt.ts";
console.log("=== combat.ts 导出 ===");
console.log(Object.keys(C).join(", "));
console.log("");
console.log("=== combatExt.ts 导出 ===");
console.log(Object.keys(X).join(", "));
console.log("");
if (X.SKILLS) {
  console.log("=== 技能 " + X.SKILLS.length + " ===");
  for (const s of X.SKILLS.slice(0, 12)) console.log("  " + String(s.id).padEnd(18) + String(s.name).padEnd(12) + " " + (s.desc||"").slice(0,40));
}
