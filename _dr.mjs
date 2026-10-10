import { DRONE_DEFS, availableDrones, droneSquadCap, squadDrones, squadSummary, droneTurn, tickDrones, damageDrones, repairDrones } from "./packages/core/src/systems/droneCombat.ts";

console.log("=== 无人机定义 " + DRONE_DEFS.length + " 台 ===");
const byRole = {};
for (const d of DRONE_DEFS) (byRole[d.role] = byRole[d.role] || []).push(d.name);
for (const [r, l] of Object.entries(byRole)) console.log("  " + r.padEnd(8) + " " + l.length + " 台  " + l.join(" / "));

// 模拟：解锁了部分科技
const bonuses = {
  rob_exp_scout: 1, rob_exp_escort: 6, rob_exp_medic: 8, rob_exp_light: 1,
  rob_exp_escort_heavy: 0.2, rob_exp_flock: 3, rob_uav_scout: 1,
  rob_carrier_attack: 3, rob_carrier_bomber: 1, rob_carrier_ew: 1,
  rob_kamikaze: 1, rob_swarm_micro: 8, squadCap: 2
};
console.log("");
const avail = availableDrones(bonuses);
const cap = droneSquadCap(bonuses);
console.log("可用 " + avail.length + " 台，编队上限 " + cap);
const squad = squadDrones(bonuses);
console.log("编队 " + squad.length + " 台: " + squad.map(s => s.def.icon + s.def.name).join(" "));
console.log("");
const sum = squadSummary(squad);
console.log("编队概览: 每回合约 " + sum.dps + " 伤害 / " + sum.hps + " 治疗");

// 模拟 3 回合
console.log("");
console.log("=== 模拟战斗 ===");
let units = squad.map(u => ({ ...u }));
for (let round = 1; round <= 3; round++) {
  const res = droneTurn({
    units,
    allies: [{ id: "hero", name: "主角", hp: 80, maxHp: 120 }, { id: "sis", name: "姐姐", hp: 30, maxHp: 100 }],
    enemies: [{ id: "z1", name: "丧尸 A", hp: 60, maxHp: 60 }, { id: "z2", name: "丧尸 B", hp: 90, maxHp: 90 }],
    round, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  console.log("  第 " + round + " 回合:");
  for (const a of res.actions) console.log("    " + a.icon + " " + a.text);
  const acted = res.actions.map(a => a.droneId);
  units = tickDrones(units, acted);
  if (round === 2) { units = damageDrones(units, 15); console.log("    ⚠ 有无人机被击中"); }
}
console.log("");
console.log("战后修复: " + repairDrones(units).filter(u => !u.down).length + " 台全部恢复");
