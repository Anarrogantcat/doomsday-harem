import { GameSession } from "./packages/core/src/runtime/session.ts";

const s = new GameSession({ heroName: "测试" });

// 解锁几台无人机科技
s.addTechBonus?.("rob_exp_scout", 1);
console.log("=== 无人机方法存在性 ===");
for (const m of ["availableDrones","droneSquadCap","droneSquadIds","setDroneSquad","combatDrones","droneSquadInfo","combatDroneTurn","repairDronesAfterCombat"]) {
  console.log("  " + (typeof s[m] === "function" ? "✓" : "✗") + " " + m);
}
console.log("");
console.log("可用无人机: " + s.availableDrones().length + " 台");
console.log("编队上限: " + s.droneSquadCap());
const info = s.droneSquadInfo();
console.log("编队: " + info.picked.length + " 台");
console.log("概览: " + JSON.stringify(info.summary));
