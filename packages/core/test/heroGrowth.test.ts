import { test } from "node:test";
import assert from "node:assert/strict";

import {
  newHeroGrowth, gainExp, gainSkillExp, spendPoint, effectiveAttributes,
  emptyBonuses, attributeTotal, skillTotal, levelProgress, expForLevel,
  skillExpForLevel, pointsPerLevel, ATTR_KEYS, ATTR_LABEL, ATTR_DESC,
  BASE_ATTRIBUTES, SKILL_DEFS, describeGrowth,
  growthToJSON, growthFromJSON,
  type HeroAttributes
} from "../src/systems/heroGrowth.ts";

// ============ 基础 ============

test("growth: 初始状态", () => {
  const g = newHeroGrowth();
  assert.equal(g.level, 1);
  assert.equal(g.exp, 0);
  assert.equal(g.points, 0);
  for (const k of ATTR_KEYS) assert.equal(g.attributes[k], 10);
  assert.equal(g.skills.length, SKILL_DEFS.length);
  assert.ok(g.skills.every((s) => s.level === 0));
});

test("growth: 六维属性齐备", () => {
  assert.equal(ATTR_KEYS.length, 6);
  for (const k of ATTR_KEYS) {
    assert.ok(ATTR_LABEL[k], `缺少标签 ${k}`);
    assert.ok(ATTR_DESC[k], `缺少说明 ${k}`);
    assert.ok(BASE_ATTRIBUTES[k] > 0);
  }
});

test("growth: 经验曲线递增", () => {
  assert.equal(expForLevel(1), 100);
  for (let l = 2; l <= 20; l++) {
    assert.ok(expForLevel(l) > expForLevel(l - 1), `${l} 级应比前一级难`);
  }
});

test("growth: 技能经验曲线递增", () => {
  for (let l = 1; l <= 9; l++) {
    assert.ok(skillExpForLevel(l) > skillExpForLevel(l - 1));
  }
});

// ============ 升级 ============

test("growth: 经验累积不升级", () => {
  const g = newHeroGrowth();
  const r = gainExp(g, 50);
  assert.equal(r.growth.level, 1);
  assert.equal(r.growth.exp, 50);
  assert.equal(r.levelsGained, 0);
});

test("growth: 达到阈值升级", () => {
  const g = newHeroGrowth();
  const r = gainExp(g, 100);
  assert.equal(r.growth.level, 2);
  assert.equal(r.growth.exp, 0);
  assert.equal(r.levelsGained, 1);
  assert.equal(r.growth.points, pointsPerLevel());
});

test("growth: 一次给大量经验可连升", () => {
  const g = newHeroGrowth();
  const r = gainExp(g, 10000);
  assert.ok(r.growth.level > 5, `应连升多级，实际 ${r.growth.level}`);
  assert.ok(r.levelsGained > 4);
  assert.equal(r.growth.points, r.levelsGained * pointsPerLevel());
});

test("growth: 负数与零经验被忽略", () => {
  const g = newHeroGrowth();
  assert.equal(gainExp(g, 0).growth.exp, 0);
  assert.equal(gainExp(g, -50).growth.exp, 0);
});

test("growth: 等级上限 99", () => {
  const g = newHeroGrowth();
  const r = gainExp(g, 1e12);
  assert.equal(r.growth.level, 99);
});

test("growth: 升级进度", () => {
  const g = newHeroGrowth();
  assert.equal(levelProgress(g), 0);
  const half = gainExp(g, 50).growth;
  assert.ok(Math.abs(levelProgress(half) - 0.5) < 0.01);
  const maxed = gainExp(g, 1e12).growth;
  assert.equal(levelProgress(maxed), 1);
});

// ============ 技能 ============

test("growth: 技能升级", () => {
  const g = newHeroGrowth();
  const g2 = gainSkillExp(g, "melee", skillExpForLevel(0));
  const melee = g2.skills.find((s) => s.id === "melee")!;
  assert.equal(melee.level, 1);
});

test("growth: 技能可连升", () => {
  const g = newHeroGrowth();
  const g2 = gainSkillExp(g, "craft", 100000);
  const craft = g2.skills.find((s) => s.id === "craft")!;
  assert.equal(craft.level, 10, "应升到上限");
});

test("growth: 技能上限 10 级", () => {
  const g = newHeroGrowth();
  const g2 = gainSkillExp(g, "firearm", 1e9);
  const s = g2.skills.find((x) => x.id === "firearm")!;
  assert.equal(s.level, 10);
});

test("growth: 未知技能被忽略", () => {
  const g = newHeroGrowth();
  const g2 = gainSkillExp(g, "nonexistent", 1000);
  assert.deepEqual(g2.skills.map((s) => s.level), g.skills.map((s) => s.level));
});

test("growth: 技能总等级", () => {
  const g = newHeroGrowth();
  assert.equal(skillTotal(g), 0);
  const g2 = gainSkillExp(gainSkillExp(g, "melee", 100), "firearm", 100);
  assert.equal(skillTotal(g2), 2);
});

// ============ 属性点 ============

test("growth: 花费属性点", () => {
  let g = gainExp(newHeroGrowth(), 100).growth;
  assert.equal(g.points, 2);

  const r1 = spendPoint(g, "strength");
  assert.equal(r1.ok, true);
  assert.equal(r1.growth.attributes.strength, 11);
  assert.equal(r1.growth.points, 1);

  const r2 = spendPoint(r1.growth, "agility");
  assert.equal(r2.ok, true);
  assert.equal(r2.growth.attributes.agility, 11);
  assert.equal(r2.growth.points, 0);
});

test("growth: 无点数时拒绝", () => {
  const g = newHeroGrowth();
  const r = spendPoint(g, "strength");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /没有可用属性点/);
});

test("growth: 属性上限 50", () => {
  let g = gainExp(newHeroGrowth(), 1e12).growth;
  // 狂加力量直到上限
  for (let i = 0; i < 60; i++) {
    const r = spendPoint(g, "strength");
    if (!r.ok) break;
    g = r.growth;
  }
  assert.equal(g.attributes.strength, 50);
  const r = spendPoint(g, "strength");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /上限/);
});

test("growth: 加点不影响其他属性", () => {
  const g = gainExp(newHeroGrowth(), 100).growth;
  const r = spendPoint(g, "charisma");
  assert.equal(r.growth.attributes.charisma, 11);
  assert.equal(r.growth.attributes.strength, 10);
});

// ============ 加成 ============

test("growth: 空加成", () => {
  const b = emptyBonuses();
  assert.equal(b.staminaMax, 0);
  assert.equal(b.scavengeMult, 1);
  assert.equal(b.researchMult, 1);
  assert.deepEqual(b.attributes, {});
});

test("growth: 最终属性 = 基础 + 加成", () => {
  const g = newHeroGrowth();
  const b = emptyBonuses();
  b.attributes = { strength: 5, agility: 3 };

  const eff = effectiveAttributes(g, b);
  assert.equal(eff.strength, 15);
  assert.equal(eff.agility, 13);
  assert.equal(eff.endurance, 10, "未加成的保持基础值");
});

test("growth: 属性总和", () => {
  const a: HeroAttributes = {
    strength: 10, agility: 10, endurance: 10,
    perception: 10, willpower: 10, charisma: 10
  };
  assert.equal(attributeTotal(a), 60);
});

// ============ 序列化 ============

test("growth: 序列化往返", () => {
  let g = gainExp(newHeroGrowth(), 500).growth;
  g = gainSkillExp(g, "melee", 200);
  g = spendPoint(g, "strength").growth;

  const json = growthToJSON(g);
  const back = growthFromJSON(json);

  assert.equal(back.level, g.level);
  assert.equal(back.exp, g.exp);
  assert.equal(back.points, g.points);
  assert.deepEqual(back.attributes, g.attributes);
  assert.deepEqual(back.skills.map((s) => s.level), g.skills.map((s) => s.level));
});

test("growth: 空数据返回默认值", () => {
  const g = growthFromJSON(null);
  assert.equal(g.level, 1);
  assert.equal(g.points, 0);
  assert.equal(g.skills.length, SKILL_DEFS.length);
});

test("growth: 部分数据被补全", () => {
  const g = growthFromJSON({ level: 5 } as never);
  assert.equal(g.level, 5);
  assert.deepEqual(g.attributes, BASE_ATTRIBUTES);
  assert.equal(g.skills.length, SKILL_DEFS.length);
});

test("growth: 序列化不共享引用", () => {
  const g = newHeroGrowth();
  const json = growthToJSON(g);
  json.attributes.strength = 99;
  assert.equal(g.attributes.strength, 10, "原对象不应被修改");
});

// ============ 描述 ============

test("growth: 描述文本", () => {
  const g = gainExp(newHeroGrowth(), 100).growth;
  const txt = describeGrowth(g, emptyBonuses());
  assert.match(txt, /等级 2/);
  assert.match(txt, /力量/);
  assert.match(txt, /魅力/);
  assert.match(txt, /近战/);
});

test("growth: 描述显示加成来源", () => {
  const g = newHeroGrowth();
  const b = emptyBonuses();
  b.attributes = { strength: 8 };
  const txt = describeGrowth(g, b);
  assert.match(txt, /力量\s+18（10\+8）/, "应显示基础+加成");
});
