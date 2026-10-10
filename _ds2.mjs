import { GameSession } from "./packages/core/src/runtime/session.ts";
const s = new GameSession({ heroName: "测试" });
s.tech = { ...s.tech };
// 用作弊解锁全部科技
const all = s.tech.unlocked;
console.log("已解锁科技: " + all.size);
const t = s.techBonusTable();
console.log("加成键数: " + Object.keys(t).length);
console.log("无人机相关键: " + Object.keys(t).filter(k => k.startsWith("rob_") || k === "squadCap").slice(0, 12).join(", "));
console.log("");
console.log("可用无人机: " + s.availableDrones().length + " 台");
console.log("编队上限: " + s.droneSquadCap());
