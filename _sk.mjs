import { COMBAT_SKILLS } from "./packages/core/src/systems/combatExt.ts";
console.log("=== 战斗技能 " + COMBAT_SKILLS.length + " ===");
for (const s of COMBAT_SKILLS) {
  console.log("  T" + (s.tier||1) + " " + String(s.id).padEnd(20) + String(s.name).padEnd(12) + " CD" + (s.cooldown||0) + "  " + (s.desc||"").slice(0,36));
}
console.log("");
console.log("=== 一个技能的完整结构 ===");
console.log(JSON.stringify(COMBAT_SKILLS[0], null, 1));
