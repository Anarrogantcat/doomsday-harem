/**
 * 无人机战斗系统测试。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRONE_DEFS, availableDrones, droneSquadCap, squadDrones, squadSummary,
  droneTurn, tickDrones, damageDrones, repairDrones
} from "../src/systems/droneCombat.ts";

test("drone: 定义表完整且 id 唯一", () => {
  assert.ok(DRONE_DEFS.length >= 15, "至少 15 种无人机");
  const ids = new Set(DRONE_DEFS.map((d) => d.id));
  assert.equal(ids.size, DRONE_DEFS.length, "id 不应重复");
  for (const d of DRONE_DEFS) {
    assert.ok(d.name && d.tech && d.icon, d.id + " 字段完整");
    assert.ok(d.power > 0, d.id + " 数值为正");
    assert.ok(d.hp > 0, d.id + " 有耐久");
    assert.ok(d.cooldown >= 0, d.id + " 冷却非负");
  }
});

test("drone: 未解锁科技时无可用无人机", () => {
  assert.equal(availableDrones({}).length, 0);
  assert.equal(squadDrones({}).length, 0);
  assert.equal(droneSquadCap({}), 3, "基础编队上限 3");
});

test("drone: 按加成键解锁", () => {
  const b = { expScout: 1, expEscort: 6, expMedic: 8, carrierAttack: 3, squadCap: 2 };
  const avail = availableDrones(b);
  assert.equal(avail.length, 4);
  assert.equal(droneSquadCap(b), 5, "上限 3+2");
  const squad = squadDrones(b);
  assert.equal(squad.length, 4, "不足上限则全带");
  assert.ok(squad.every((u) => !u.down && u.hp === u.maxHp));
});

test("drone: 超出上限会截断", () => {
  const b: Record<string, number> = {};
  for (const d of DRONE_DEFS) b[d.tech] = 1;
  assert.equal(squadDrones(b).length, 3, "默认上限 3");
  b["squadCap"] = 10;
  const capped = squadDrones(b);
  assert.equal(capped.length, Math.min(DRONE_DEFS.length, 13), "上限 13");
  // 显式只挑 2 台
  const picked = squadDrones(b, [DRONE_DEFS[0].id, DRONE_DEFS[1].id]);
  assert.equal(picked.length, 2);
  assert.deepEqual(picked.map((u) => u.def.id), [DRONE_DEFS[0].id, DRONE_DEFS[1].id]);
});

test("drone: attack 类造成伤害，打血最少的敌人", () => {
  const units = squadDrones({ expEscort: 6 });
  const res = droneTurn({
    units,
    allies: [{ id: "hero", name: "主角", hp: 50, maxHp: 100 }],
    enemies: [
      { id: "a", name: "壮汉", hp: 80, maxHp: 80 },
      { id: "b", name: "残血", hp: 5, maxHp: 80 }
    ],
    round: 1, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  assert.equal(res.actions.length, 1);
  assert.equal(res.enemyDamage["b"], 6, "应补刀残血敌人");
  assert.equal(res.enemyDamage["a"], undefined);
});

test("drone: heal 类治疗血比例最低的队友", () => {
  const units = squadDrones({ expMedic: 8 });
  const res = droneTurn({
    units,
    allies: [
      { id: "hero", name: "主角", hp: 90, maxHp: 100 },
      { id: "sis", name: "姐姐", hp: 10, maxHp: 100 }
    ],
    enemies: [{ id: "z", name: "丧尸", hp: 50, maxHp: 50 }],
    round: 1, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  assert.equal(res.allyHeal["sis"], 8, "治疗比例最低的");
  assert.equal(res.allyHeal["hero"], undefined);
});

test("drone: shield / scout 累加到效果汇总", () => {
  const units = squadDrones({ expEscortDr: 20, expScout: 8, expLight: 5 });
  const res = droneTurn({
    units,
    allies: [{ id: "hero", name: "主角", hp: 100, maxHp: 100 }],
    enemies: [{ id: "z", name: "丧尸", hp: 50, maxHp: 50 }],
    round: 1, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  assert.equal(res.effects.damageReduction, 20);
  assert.equal(res.effects.accuracyBonus, 13, "8+5");
});

test("drone: 冷却生效，未到回合不行动", () => {
  const units = squadDrones({ expMedic: 8 });
  assert.equal(units[0].cd, 0);
  const r1 = droneTurn({
    units,
    allies: [{ id: "hero", name: "主角", hp: 50, maxHp: 100 }],
    enemies: [{ id: "z", name: "丧尸", hp: 50, maxHp: 50 }],
    round: 1, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  assert.equal(r1.actions.length, 1, "首次行动");
  const acted = r1.actions.map((a) => a.droneId);
  let next = tickDrones(units, acted);
  assert.equal(next[0].cd, 3, "进入 3 回合冷却");

  const r2 = droneTurn({
    units: next,
    allies: [{ id: "hero", name: "主角", hp: 50, maxHp: 100 }],
    enemies: [{ id: "z", name: "丧尸", hp: 50, maxHp: 50 }],
    round: 2, accuracy: { value: 0 }, damageReduction: { value: 0 }, skipEnemy: { value: 0 }
  });
  assert.equal(r2.actions.length, 0, "冷却中不行动");
});

test("drone: 击中与战后修复", () => {
  const units = squadDrones({ expMedic: 8 });
  const hurt = damageDrones(units, 999);
  assert.ok(hurt[0].down, "耐久归零后失效");
  assert.equal(hurt[0].hp, 0);
  const fixed = repairDrones(hurt);
  assert.ok(!fixed[0].down && fixed[0].hp === fixed[0].maxHp, "战后全部修复");
});

test("drone: 编队概览统计正确", () => {
  const units = squadDrones({ expEscort: 6, expMedic: 8, expScout: 1 });
  const s = squadSummary(units);
  assert.equal(s.total, 3);
  assert.equal(s.alive, 3);
  assert.equal(s.down, 0);
  assert.ok(s.dps >= 6, "至少有护航无人机的 6 点");
  assert.ok(s.hps >= 2, "医疗无人机折算治疗");
});
