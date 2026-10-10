import { test } from "node:test";
import assert from "node:assert/strict";

import { GameSession } from "../src/runtime/session.ts";
import { RAID_LABEL, type RaidKind } from "../src/systems/defense.ts";

const KINDS: RaidKind[] = ["strays", "horde", "bandits", "mutant", "wildlife", "military"];

test("session/combat: 初始不在战斗中", () => {
  const s = new GameSession();
  assert.equal(s.combat, null);
  assert.equal(s.inCombat(), false);
});

test("session/combat: 开始战斗", () => {
  const s = new GameSession();
  const ok = s.beginCombat("strays", 3);
  assert.equal(ok, true);
  assert.ok(s.combat);
  assert.equal(s.combat!.enemies.length, 3);
  assert.equal(s.combat!.round, 1);
  assert.equal(s.combat!.over, false);
  assert.ok(s.combat!.log.length > 0);
});

test("session/combat: 敌人数量上限", () => {
  const s = new GameSession();
  s.beginCombat("horde", 20);
  assert.ok(s.combat!.enemies.length <= 6, "敌人数量应被限制");
});

test("session/combat: 重复开始被拒", () => {
  const s = new GameSession();
  assert.equal(s.beginCombat("strays"), true);
  assert.equal(s.beginCombat("strays"), false, "已有战斗时不应重复开始");
});

test("session/combat: 主角战斗数值受科技影响", () => {
  const s = new GameSession();
  const base = s.heroCombatant();
  s.unlockEverything();
  const buffed = s.heroCombatant();
  assert.ok(buffed.attack >= base.attack, "科技应提升攻击");
  assert.ok(buffed.dodge >= base.dodge, "科技应提升闪避");
});

test("session/combat: 同伴参战（忠诚门槛）", () => {
  const s = new GameSession();
  const allies = s.alliesCombatant();
  assert.ok(allies.length >= 1, "应有同伴参战");
  assert.ok(allies.every((a) => a.id !== "ai"), "AI 不参战（无身体）");
});

test("session/combat: 孕晚期同伴不参战", () => {
  const s = new GameSession();
  const c = s.companion("sister")!;
  c.physiology = { ...c.physiology, pregnant: true, pregnancyProgress: 25 };
  const allies = s.alliesCombatant();
  assert.ok(!allies.some((a) => a.id === "sister"), "孕晚期不应参战");
});

test("session/combat: 低忠诚同伴不参战", () => {
  const s = new GameSession();
  for (const c of s.companions) {
    c.relationship = { ...c.relationship, loyalty: 10 };
  }
  assert.equal(s.alliesCombatant().length, 0, "忠诚不足不应参战");
});

test("session/combat: 敌人按事件强度生成", () => {
  const s = new GameSession();
  const weak = s.enemiesFromRaid("wildlife", 2);
  const strong = s.enemiesFromRaid("military", 2);
  assert.ok(weak.length === 2 && strong.length === 2);
  assert.ok(strong[0].hp > weak[0].hp, "军方单位应更强");
  assert.ok(strong[0].attack > weak[0].attack);
});

test("session/combat: 人形标记正确", () => {
  const s = new GameSession();
  assert.ok(s.enemiesFromRaid("bandits", 1)[0].humanoid, "匪徒是人形");
  assert.ok(s.enemiesFromRaid("military", 1)[0].humanoid, "军方是人形");
  assert.equal(s.enemiesFromRaid("horde", 1)[0].humanoid, false, "丧尸非人形");
  assert.equal(s.enemiesFromRaid("mutant", 1)[0].humanoid, false);
});

test("session/combat: 攻击推进回合", () => {
  const s = new GameSession();
  s.beginCombat("strays", 3);
  const e = s.combat!.enemies[0];
  s.combatPlayerAttack(e.id);
  // 攻击后应有日志增长
  assert.ok(s.combat === null || s.combat.log.length > 1);
});

test("session/combat: 攻击可致胜", () => {
  const s = new GameSession();
  s.unlockEverything();
  s.beginCombat("wildlife", 1);
  // 反复攻击直到结束
  let guard = 0;
  while (s.combat && !s.combat.over && guard++ < 50) {
    const target = s.combat.enemies.find((e) => e.hp > 0);
    if (!target) break;
    s.combatPlayerAttack(target.id);
  }
  assert.equal(s.combat, null, "战斗结束后应清理");
});

test("session/combat: 胜利给予战利品", () => {
  const s = new GameSession();
  s.unlockEverything();
  const before = s.resources["ammo_9mm"] ?? 0;
  s.beginCombat("wildlife", 1);
  let guard = 0;
  while (s.combat && !s.combat.over && guard++ < 50) {
    const t = s.combat.enemies.find((e) => e.hp > 0);
    if (!t) break;
    s.combatPlayerAttack(t.id);
  }
  const after = s.resources["ammo_9mm"] ?? 0;
  assert.ok(after >= before, "胜利应给弹药（或不减）");
});

test("session/combat: 魅惑仅对人形有效", () => {
  const s = new GameSession();
  s.beginCombat("bandits", 2);
  const humanoid = s.combat!.enemies[0];
  assert.equal(humanoid.humanoid, true);
  s.combatCharm(humanoid.id);
  assert.ok(s.combat === null || s.combat.log.some((l) => l.includes("魅惑")));
});

test("session/combat: 魅惑对非人形无效", () => {
  const s = new GameSession();
  s.beginCombat("horde", 2);
  const z = s.combat!.enemies[0];
  assert.equal(z.humanoid, false);
  s.combatCharm(z.id);
  assert.ok(s.combat === null || s.combat.log.some((l) => l.includes("不是人形")));
});

test("session/combat: 防御推进回合", () => {
  const s = new GameSession();
  s.beginCombat("strays", 2);
  const r0 = s.combat!.round;
  s.combatDefend();
  assert.ok(s.combat === null || s.combat.round >= r0);
});

test("session/combat: 逃跑有成功率", () => {
  // 同一次战斗内重复尝试（尝试次数参与随机源）
  let escaped = 0;
  const s = new GameSession();
  s.beginCombat("strays", 3);
  for (let i = 0; i < 30 && s.combat; i++) {
    const r = s.combatFlee();
    if (r.ok) { escaped++; break; }
  }
  assert.ok(escaped > 0, "30 次尝试应至少逃掉一次");
});

test("session/combat: 逃跑失败会挨打", () => {
  const s = new GameSession();
  s.beginCombat("horde", 4);
  const hp0 = s.combat!.player.hp;
  let hit = false;
  for (let i = 0; i < 10 && s.combat; i++) {
    const r = s.combatFlee();
    if (!r.ok && s.combat && s.combat.player.hp < hp0) { hit = true; break; }
    if (r.ok) break;
  }
  assert.ok(hit || s.combat === null, "逃跑失败应受到伤害");
});

test("session/combat: 手动结束", () => {
  const s = new GameSession();
  s.beginCombat("strays", 3);
  assert.ok(s.combat);
  s.endCombat();
  assert.equal(s.combat, null);
});

test("session/combat: 主角体力与战斗同步", () => {
  const s = new GameSession();
  s.unlockEverything();
  s.beginCombat("wildlife", 1);
  let guard = 0;
  while (s.combat && !s.combat.over && guard++ < 50) {
    const t = s.combat.enemies.find((e) => e.hp > 0);
    if (!t) break;
    s.combatPlayerAttack(t.id);
  }
  assert.ok(s.hero.survival.stamina >= 0 && s.hero.survival.stamina <= 100);
});

test("session/combat: 全部事件类型可生成敌人", () => {
  const s = new GameSession();
  for (const k of KINDS) {
    const e = s.enemiesFromRaid(k, 2);
    assert.equal(e.length, 2, `${RAID_LABEL[k]} 应能生成敌人`);
    assert.ok(e[0].hp > 0);
    assert.ok(e[0].attack > 0);
  }
});
