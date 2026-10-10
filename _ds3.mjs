import { GameSession } from "./packages/core/src/runtime/session.ts";
import { unlockBranchToTier } from "./packages/core/src/tech/tree.ts";

const s = new GameSession({ heroName: "测试" });
// 解锁机器人科技到 T8、防御到 T7
s.tech = unlockBranchToTier(s.tech, "robot", 8);

const t = s.techBonusTable();
console.log("已解锁科技: " + s.tech.unlocked.size);
console.log("加成键数: " + Object.keys(t).length);
console.log("无人机键: " + Object.keys(t).filter(k => k.startsWith("rob_")).join(", "));
console.log("");
console.log("可用无人机: " + s.availableDrones().length + " 台");
for (const d of s.availableDrones().slice(0, 12)) {
  console.log("  " + d.icon + " " + d.name.padEnd(12) + " [" + d.role + "] " + d.desc);
}
console.log("");
console.log("编队上限: " + s.droneSquadCap());
const info = s.droneSquadInfo();
console.log("自动编队: " + info.picked.length + " 台 " + info.picked.map(p => p.def.name).join(" / "));
console.log("概览: " + JSON.stringify(info.summary));
console.log("");
// 指定编队
const want = s.availableDrones().slice(0, 5).map(d => d.id);
s.setDroneSquad(want);
console.log("指定编队: " + s.droneSquadIds().join(", "));
console.log("编队结果: " + s.combatDrones().map(u => u.def.name).join(" / "));
