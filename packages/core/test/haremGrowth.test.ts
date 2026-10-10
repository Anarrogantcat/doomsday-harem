import { test } from "node:test";
import assert from "node:assert/strict";

import {
  newCompanionGrowth, recordIntimacy, recordJobDay, recordBirth,
  hasPerk, perkMultipliers, growthLevel, growthSummary,
  PERK_DEFS, growthStats,
  companionGrowthToJSON, companionGrowthFromJSON,
  type PerkContext
} from "../src/systems/haremGrowth.ts";

function ctx(over: Partial<PerkContext> = {}): PerkContext {
  return { bond: 1, affection: 50, loyalty: 50, ...over };
}

test("hgrowth: 初始状态", () => {
  const g = newCompanionGrowth();
  assert.equal(g.totalActs, 0);
  assert.equal(g.births, 0);
  assert.equal(g.perks.length, 0);
  assert.deepEqual(g.jobExp, {});
});

test("hgrowth: 增益定义完整", () => {
  assert.ok(PERK_DEFS.length >= 8, `应有 8+ 增益，实际 ${PERK_DEFS.length}`);
  for (const p of PERK_DEFS) {
    assert.ok(p.id.length > 0);
    assert.ok(p.name.length > 0);
    assert.ok(p.description.length > 0);
    assert.ok(p.condition.length > 0);
    assert.equal(typeof p.check, "function");
  }
});

test("hgrowth: 记录亲密累计次数", () => {
  let g = newCompanionGrowth();
  const r = recordIntimacy(g, "oral_give", ctx());
  assert.equal(r.growth.totalActs, 1);
  const r2 = recordIntimacy(r.growth, "oral_give", ctx());
  assert.equal(r2.growth.totalActs, 2);
});

test("hgrowth: 累计 10 次解锁「主动」", () => {
  let g = newCompanionGrowth();
  let got: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = recordIntimacy(g, "oral_give", ctx());
    g = r.growth;
    got.push(...r.newPerks.map((p) => p.id));
  }
  assert.ok(got.includes("eager"), "第 10 次应解锁「主动」");
  assert.ok(hasPerk(g, "eager"));
});

test("hgrowth: 口部熟练度 5 级解锁「口技娴熟」", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 300; i++) {
    g = recordIntimacy(g, "oral_give", ctx()).growth;
  }
  assert.ok(hasPerk(g, "skilled_mouth"), `口部熟练度应达标，增益：${g.perks.map((p) => p.id)}`);
});

test("hgrowth: 后庭熟练度 5 级解锁「后庭适应」", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 300; i++) {
    g = recordIntimacy(g, "anal_prep", ctx()).growth;
  }
  assert.ok(hasPerk(g, "skilled_anal"));
});

test("hgrowth: 岗位累计解锁「熟练工」", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 30; i++) g = recordJobDay(g, "cook");
  assert.equal(g.jobExp["cook"], 30);
  // 手动触发检查
  const r = recordIntimacy(g, "oral_give", ctx());
  assert.ok(hasPerk(r.growth, "veteran_worker"));
});

test("hgrowth: 生育解锁「易孕」", () => {
  let g = newCompanionGrowth();
  const r = recordBirth(g, ctx());
  assert.equal(r.growth.births, 1);
  assert.ok(r.newPerks.some((p) => p.id === "fertile"));
});

test("hgrowth: 羁绊 5 级 + 30 次亲密解锁「死心塌地」", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 30; i++) {
    g = recordIntimacy(g, "oral_give", ctx({ bond: 5 })).growth;
  }
  assert.ok(hasPerk(g, "devoted"), `增益：${g.perks.map((p) => p.id)}`);
});

test("hgrowth: 增益不重复获得", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 20; i++) {
    g = recordIntimacy(g, "oral_give", ctx()).growth;
  }
  const eager = g.perks.filter((p) => p.id === "eager");
  assert.equal(eager.length, 1, "增益不应重复");
});

test("hgrowth: 增益倍率", () => {
  const g = newCompanionGrowth();
  const m0 = perkMultipliers(g);
  assert.equal(m0.lustRate, 1);
  assert.equal(m0.jobOutput, 1);

  let g2 = newCompanionGrowth();
  for (let i = 0; i < 10; i++) g2 = recordIntimacy(g2, "oral_give", ctx()).growth;
  const m1 = perkMultipliers(g2);
  assert.ok(m1.lustRate > 1, "「主动」应提升欲情增速");
});

test("hgrowth: 成长等级随熟练度提升", () => {
  const g0 = newCompanionGrowth();
  let g = newCompanionGrowth();
  for (let i = 0; i < 50; i++) g = recordIntimacy(g, "oral_give", ctx()).growth;
  assert.ok(growthLevel(g) > growthLevel(g0));
});

test("hgrowth: 成长总览", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 15; i++) g = recordIntimacy(g, "anal_give", ctx()).growth;
  g = recordBirth(g, ctx()).growth;

  const s = growthSummary(g);
  assert.equal(s.totalActs, 15);
  assert.equal(s.births, 1);
  assert.ok(s.level > 0);
  assert.ok(s.topParts.length > 0);
});

test("hgrowth: 序列化往返", () => {
  let g = newCompanionGrowth();
  for (let i = 0; i < 20; i++) g = recordIntimacy(g, "oral_give", ctx()).growth;
  g = recordJobDay(g, "cook");
  g = recordBirth(g, ctx()).growth;

  const json = companionGrowthToJSON(g);
  const back = companionGrowthFromJSON(json);

  assert.equal(back.totalActs, g.totalActs);
  assert.equal(back.births, g.births);
  assert.deepEqual(back.jobExp, g.jobExp);
  assert.deepEqual(back.perks.map((p) => p.id), g.perks.map((p) => p.id));
});

test("hgrowth: 空数据返回默认", () => {
  const g = companionGrowthFromJSON(null);
  assert.equal(g.totalActs, 0);
  assert.equal(g.perks.length, 0);
});

test("hgrowth: 序列化不共享引用", () => {
  const g = newCompanionGrowth();
  const json = companionGrowthToJSON(g);
  json.jobExp["x"] = 99;
  assert.equal(g.jobExp["x"], undefined);
});

test("hgrowth: 统计", () => {
  const s = growthStats();
  assert.equal(s.perkCount, PERK_DEFS.length);
});
