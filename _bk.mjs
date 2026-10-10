import { GameSession } from "./packages/core/src/runtime/session.ts";
import { unlockBranchToTier } from "./packages/core/src/tech/tree.ts";

const s = new GameSession({ heroName: "测试" });
s.tech = unlockBranchToTier(s.tech, "robot", 8);
const t = s.techBonusTable();
console.log("=== 全部加成键 ===");
console.log(Object.keys(t).sort().join(", "));
