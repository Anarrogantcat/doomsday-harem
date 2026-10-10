import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMBAT_SKILLS, combatSkill, STANCE_LABEL, STANCE_DESC, STANCE_MODS,
  COMBAT_TERRAIN_LABEL, COMBAT_TERRAIN_DESC, COMBAT_TERRAIN_MODS,
  terrainFromRegion, initExtended, newUnitState, setStance, tickCooldowns,
  canUseSkill, useSkill, effectiveStats, settleCombat, combatSummary,
  combatExtStats,
  type Stance, type CombatTerrain
} from "../src/systems/combatExt.ts";
import { newCombatant, startCombat } from "../src/systems/combat.ts";

function makeCombat() {
  const player = newCombatant({
    id: "hero", name: "主角", hp: 100, hpMax: 100,
    stamina: 100, staminaMax: 100, attack: 20, defense: 5
  });
  const allies = [
    newCombatant({ id: "sister", name: "姐姐", hp: 60, hpMax: 60, attack: 12, defense: 3 })
  ];
  const enemies = [
    newCombatant({ id: "e1", name: "匪徒1", hp: 50, hpMax: 50, attack: 10, defense: 2, humanoid: true }),
    newCombatant({ id: "e2", name: "匪徒2", hp: 50, hpMax: 50, attack: 10, defense: 2, humanoid: true })
  ];
  return startCombat(player, enemies, allies);
}

const rng = () => 0.5;

// ============ 技能目录 ============

test("combatext: 技能数量充足", () => {
  assert.ok(COMBAT_SKILLS.length >= 10, `应有 10+ 技能，实际 ${COMBAT_SKILLS.length}`);
});

test("combatext: 技能 id 唯一", () => {
  const ids = new Set(COMBAT_SKILLS.map((s) => s.id));
  assert.equal(ids.size, COMBAT_SKILLS.length);
});

test("combatext: 技能字段完整", () => {
  for (const s of COMBAT_SKILLS) {
    assert.ok(s.name.length > 0, `${s.id} 缺名称`);
    assert.ok(s.description.length > 0, `${s.id} 缺说明`);
    assert.ok(s.cooldown >= 0);
    assert.ok(s.cost > 0, `${s.id} 体力消耗应为正`);
  }
});

test("combatext: 技能覆盖多种类型", () => {
  const kinds = new Set(COMBAT_SKILLS.map((s) => s.kind));
  for (const k of ["damage", "aoe", "heal", "buff", "debuff", "control", "charm"]) {
    assert.ok(kinds.has(k as never), `缺少技能类型 ${k}`);
  }
});

test("combatext: 按 id 查询", () => {
  assert.ok(combatSkill("power_strike"));
  assert.equal(combatSkill("nonexistent"), undefined);
});

// ============ 姿态 ============

test("combatext: 三种姿态齐备", () => {
  for (const s of ["aggressive", "balanced", "defensive"] as Stance[]) {
    assert.ok(STANCE_LABEL[s]);
    assert.ok(STANCE_DESC[s]);
    assert.ok(STANCE_MODS[s]);
  }
});

test("combatext: 进攻姿态加攻", () => {
  assert.ok(STANCE_MODS.aggressive.attackMult > 1);
  assert.equal(STANCE_MODS.balanced.attackMult, 1);
  assert.ok(STANCE_MODS.defensive.defenseMult > 1);
  assert.ok(STANCE_MODS.defensive.attackMult < 1);
});

// ============ 地形 ============

test("combatext: 五种地形齐备", () => {
  for (const t of ["open", "narrow", "rubble", "night", "interior"] as CombatTerrain[]) {
    assert.ok(COMBAT_TERRAIN_LABEL[t]);
    assert.ok(COMBAT_TERRAIN_DESC[t]);
    assert.ok(COMBAT_TERRAIN_MODS[t]);
  }
});

test("combatext: 地形由区域推断", () => {
  assert.equal(terrainFromRegion("urban"), "rubble");
  assert.equal(terrainFromRegion("mountain"), "narrow");
  assert.equal(terrainFromRegion("coast"), "open");
  assert.equal(terrainFromRegion("base"), "interior");
});

test("combatext: 狭窄地形削弱范围技能", () => {
  assert.equal(COMBAT_TERRAIN_MODS.narrow.aoeHalved, true);
  assert.equal(COMBAT_TERRAIN_MODS.open.aoeHalved, false);
});

// ============ 扩展状态 ============

test("combatext: 初始化扩展战斗", () => {
  const c = makeCombat();
  const ext = initExtended(c, "open");
  assert.equal(ext.terrain, "open");
  assert.equal(ext.turnCount, 1);
  assert.ok(ext.units["hero"]);
  assert.ok(ext.units["e1"]);
  assert.equal(ext.units["hero"].stance, "balanced");
});

test("combatext: 切换姿态", () => {
  const ext = initExtended(makeCombat(), "open");
  const next = setStance(ext, "hero", "aggressive");
  assert.equal(next.units["hero"].stance, "aggressive");
});

test("combatext: 冷却递减", () => {
  let ext = initExtended(makeCombat(), "open");
  ext = { ...ext, units: { ...ext.units, hero: { ...ext.units["hero"], cooldowns: { a: 3, b: 1 } } } };
  const next = tickCooldowns(ext);
  assert.equal(next.units["hero"].cooldowns["a"], 2);
  assert.equal(next.units["hero"].cooldowns["b"], undefined, "1 回合冷却应消失");
  assert.equal(next.turnCount, 2);
});

// ============ 技能使用 ============

test("combatext: 技能可用性检查", () => {
  const ext = initExtended(makeCombat(), "open");
  const ok = canUseSkill(ext, "hero", "power_strike");
  assert.equal(ok.ok, true);

  const bad = canUseSkill(ext, "hero", "nonexistent");
  assert.equal(bad.ok, false);
});

test("combatext: 体力不足时不可用", () => {
  const c = makeCombat();
  c.player = { ...c.player, stamina: 1 };
  const ext = initExtended(c, "open");
  const r = canUseSkill(ext, "hero", "power_strike");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /体力不足/);
});

test("combatext: 伤害技能造成伤害", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "power_strike", "e1", rng);
  const e1 = r.combat.base.enemies.find((e) => e.id === "e1")!;
  assert.ok(e1.hp < 50, "目标应受伤");
  assert.ok(r.log.length > 0);
});

test("combatext: 范围技能命中全部敌人", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "sweep", null, rng);
  for (const e of r.combat.base.enemies) {
    assert.ok(e.hp < 50, `${e.name} 应受伤`);
  }
});

test("combatext: 治疗技能恢复生命", () => {
  const c = makeCombat();
  c.player = { ...c.player, hp: 40 };
  const ext = initExtended(c, "open");
  const r = useSkill(ext, "hero", "first_aid", null, rng);
  assert.ok(r.combat.base.player.hp > 40);
});

test("combatext: 魅惑仅对人形", () => {
  const c = makeCombat();
  c.enemies[0] = { ...c.enemies[0], humanoid: false };
  const ext = initExtended(c, "open");
  const r = useSkill(ext, "hero", "seduce", "e1", rng);
  assert.ok(r.log.some((l) => l.includes("不是人形")));
});

test("combatext: 魅惑对人形生效", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "seduce", "e1", rng);
  const e1 = r.combat.base.enemies.find((e) => e.id === "e1")!;
  assert.ok(e1.status.some((s) => s.kind === "charm"));
});

test("combatext: 控制技能眩晕全部敌人", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "flashbang", null, rng);
  for (const e of r.combat.base.enemies) {
    assert.ok(e.status.some((s) => s.kind === "stun"), `${e.name} 应被眩晕`);
  }
});

test("combatext: 使用后进入冷却", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "power_strike", "e1", rng);
  assert.ok((r.combat.units["hero"].cooldowns["power_strike"] ?? 0) > 0);
});

test("combatext: 冷却中不可重复使用", () => {
  const ext = initExtended(makeCombat(), "open");
  const r = useSkill(ext, "hero", "power_strike", "e1", rng);
  const again = canUseSkill(r.combat, "hero", "power_strike");
  assert.equal(again.ok, false);
  assert.match(again.reason ?? "", /冷却/);
});

// ============ 有效数值 ============

test("combatext: 姿态影响有效数值", () => {
  const base = initExtended(makeCombat(), "open");
  const agg = setStance(base, "hero", "aggressive");
  const def = setStance(base, "hero", "defensive");

  const a = effectiveStats(agg, "hero", "player");
  const d = effectiveStats(def, "hero", "player");
  assert.ok(a.attack > d.attack, "进攻姿态攻击应更高");
  assert.ok(d.defense > a.defense, "防御姿态防御应更高");
});

test("combatext: 地形影响有效数值", () => {
  const open = initExtended(makeCombat(), "open");
  const interior = initExtended(makeCombat(), "interior");
  assert.ok(
    effectiveStats(interior, "hero", "player").defense >
    effectiveStats(open, "hero", "player").defense,
    "室内防御应更高"
  );
});

// ============ 结算 ============

test("combatext: 胜利结算给经验与战利品", () => {
  const c = makeCombat();
  c.enemies = c.enemies.map((e) => ({ ...e, hp: 0 }));
  c.over = true;
  c.victory = true;
  const ext = initExtended(c, "open");
  const s = settleCombat(ext, rng);
  assert.ok(s.exp > 0);
  assert.ok(s.loot.length > 0);
});

test("combatext: 未胜利无结算", () => {
  const c = makeCombat();
  const ext = initExtended(c, "open");
  const s = settleCombat(ext, rng);
  assert.equal(s.exp, 0);
  assert.equal(s.loot.length, 0);
});

test("combatext: 战斗摘要", () => {
  const ext = initExtended(makeCombat(), "open");
  const s = combatSummary(ext);
  assert.equal(s.enemiesAlive, 2);
  assert.equal(s.enemiesTotal, 2);
  assert.equal(s.playerHpPct, 100);
  assert.ok(s.terrain.length > 0);
});

test("combatext: 统计", () => {
  const s = combatExtStats();
  assert.ok(s.skills >= 10);
  assert.equal(s.terrains, 5);
  assert.equal(s.stances, 3);
});

// ============ 会话集成 ============

test("session: 战斗地形由区域推断", async () => {
  const { GameSession } = await import("../src/runtime/session.ts");
  const s = new GameSession();
  const t = s.combatTerrain();
  assert.ok(["open", "narrow", "rubble", "night", "interior"].includes(t));
});

test("session: 无战斗时战斗详情为 null", async () => {
  const { GameSession } = await import("../src/runtime/session.ts");
  const s = new GameSession();
  assert.equal(s.combatDetail(), null);
});

test("session: 有战斗时可取详情", async () => {
  const { GameSession } = await import("../src/runtime/session.ts");
  const s = new GameSession();
  s.beginCombat("strays", 3);
  const d = s.combatDetail();
  assert.ok(d);
  assert.ok(d!.player.attack > 0);
  assert.ok(d!.terrainLabel.length > 0);
});

test("session: 技能状态列表", async () => {
  const { GameSession } = await import("../src/runtime/session.ts");
  const s = new GameSession();
  s.beginCombat("strays", 3);
  const list = s.combatSkillStatus();
  assert.equal(list.length, COMBAT_SKILLS.length);
  assert.ok(list.some((x) => x.ok), "应有可用技能");
});

test("session: 敌方回合推进", async () => {
  const { GameSession } = await import("../src/runtime/session.ts");
  const s = new GameSession();
  s.beginCombat("strays", 3);
  const before = s.combat!.round;
  s.combatEnemyTurn();
  if (s.combat) assert.ok(s.combat.round >= before);
});
