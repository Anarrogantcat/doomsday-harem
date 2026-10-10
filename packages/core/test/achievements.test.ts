import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACHIEVEMENTS, ACH_CATEGORIES, ACH_CATEGORY_LABEL, ACH_CATEGORY_ICON,
  RARITY_LABEL, RARITY_COLOR, achievementDef, achievementsByCategory,
  newAchievementState, emptyStats, evaluateAchievements, unlockedCount,
  rarityStats, completion, achStats, achToJSON, achFromJSON,
  type AchievementCategory, type Rarity
} from "../src/systems/achievements.ts";

// ============ 目录 ============

test("ach: 成就数量充足", () => {
  assert.ok(ACHIEVEMENTS.length >= 60, `应有 60+ 成就，实际 ${ACHIEVEMENTS.length}`);
});

test("ach: id 唯一", () => {
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
  assert.equal(ids.size, ACHIEVEMENTS.length);
});

test("ach: 字段完整", () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.name.length > 0, `${a.id} 缺名称`);
    assert.ok(a.description.length > 0, `${a.id} 缺说明`);
    assert.ok(ACH_CATEGORIES.includes(a.category), `${a.id} 分类无效`);
    assert.ok(RARITY_LABEL[a.rarity], `${a.id} 稀有度无效`);
    if (a.target !== undefined) assert.ok(a.target > 1, `${a.id} 目标值应大于 1`);
  }
});

test("ach: 九个分类都有成就", () => {
  for (const c of ACH_CATEGORIES) {
    assert.ok(achievementsByCategory(c).length >= 3, `${c} 成就不足`);
    assert.ok(ACH_CATEGORY_LABEL[c]);
    assert.ok(ACH_CATEGORY_ICON[c]);
  }
});

test("ach: 五种稀有度都有", () => {
  for (const r of ["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]) {
    assert.ok(ACHIEVEMENTS.some((a) => a.rarity === r), `缺少 ${r}`);
    assert.ok(RARITY_LABEL[r]);
    assert.ok(RARITY_COLOR[r]);
  }
});

test("ach: 按 id 查询", () => {
  assert.ok(achievementDef("survive_1"));
  assert.equal(achievementDef("nonexistent"), undefined);
});

test("ach: 统计", () => {
  const s = achStats();
  assert.equal(s.total, ACHIEVEMENTS.length);
  assert.equal(Object.keys(s.byCategory).length, ACH_CATEGORIES.length);
  assert.equal(Object.keys(s.byRarity).length, 5);
});

// ============ 状态 ============

test("ach: 初始全部未解锁", () => {
  const st = newAchievementState();
  assert.equal(unlockedCount(st), 0);
  assert.equal(completion(st), 0);
  assert.equal(Object.keys(st.progress).length, ACHIEVEMENTS.length);
});

test("ach: 生存成就按天数解锁", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 7 };
  const r = evaluateAchievements(st, stats, 7, false);
  assert.ok(r.state.progress["survive_1"].unlocked);
  assert.ok(r.state.progress["survive_7"].unlocked);
  assert.equal(r.state.progress["survive_30"].unlocked, false);
  assert.equal(r.state.progress["survive_1"].unlockedAtDay, 7);
});

test("ach: 后宫数量成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), haremCount: 10 };
  const r = evaluateAchievements(st, stats, 30, false);
  assert.ok(r.state.progress["harem_1"].unlocked);
  assert.ok(r.state.progress["harem_5"].unlocked);
  assert.ok(r.state.progress["harem_10"].unlocked);
  assert.equal(r.state.progress["harem_15"].unlocked, false);
});

test("ach: 进度类记录当前值", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), haremCount: 7 };
  const r = evaluateAchievements(st, stats, 10, false);
  assert.equal(r.state.progress["harem_10"].current, 7);
  assert.equal(r.state.progress["harem_10"].unlocked, false);
});

test("ach: 科技成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), techUnlocked: 127 };
  const r = evaluateAchievements(st, stats, 100, false);
  assert.ok(r.state.progress["tech_all"].unlocked);
});

test("ach: 基地成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), baseBuilt: 41 };
  const r = evaluateAchievements(st, stats, 100, false);
  assert.ok(r.state.progress["base_all"].unlocked);
});

test("ach: 亲密成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), totalActs: 100 };
  const r = evaluateAchievements(st, stats, 50, false);
  assert.ok(r.state.progress["act_1"].unlocked);
  assert.ok(r.state.progress["act_100"].unlocked);
  assert.equal(r.state.progress["act_500"].unlocked, false);
});

test("ach: 后代成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), births: 10, femaleBirths: 10 };
  const r = evaluateAchievements(st, stats, 200, false);
  assert.ok(r.state.progress["birth_1"].unlocked);
  assert.ok(r.state.progress["birth_10"].unlocked);
});

test("ach: 全是女儿成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), births: 20, femaleBirths: 20 };
  const r = evaluateAchievements(st, stats, 200, false);
  assert.ok(r.state.progress["all_female"].unlocked);
});

test("ach: 作弊标注", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 1, usedCheat: true };
  const r = evaluateAchievements(st, stats, 1, true);
  assert.ok(r.state.progress["cheat_used"].unlocked);
  assert.equal(r.state.progress["survive_1"].cheated, true);
  assert.equal(r.state.progress["no_cheat"].unlocked, false, "作弊时不应解锁纯净成就");
});

test("ach: 未作弊时解锁纯净成就", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 100 };
  const r = evaluateAchievements(st, stats, 100, false);
  assert.ok(r.state.progress["no_cheat"].unlocked);
});

test("ach: 返回新解锁列表", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 1 };
  const r = evaluateAchievements(st, stats, 1, false);
  assert.ok(r.newlyUnlocked.length > 0);
  assert.ok(r.newlyUnlocked.every((a) => a.id));
});

test("ach: 重复评估不重复解锁", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 1 };
  const r1 = evaluateAchievements(st, stats, 1, false);
  const r2 = evaluateAchievements(r1.state, stats, 2, false);
  assert.equal(r2.newlyUnlocked.length, 0, "第二次不应有新解锁");
});

test("ach: 完成度与统计", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 365, haremCount: 21, techUnlocked: 127 };
  const r = evaluateAchievements(st, stats, 365, false);
  const n = unlockedCount(r.state);
  assert.ok(n > 5);
  assert.ok(completion(r.state) > 0);
  assert.ok(completion(r.state) <= 1);

  const rs = rarityStats(r.state);
  assert.ok(rs.common.unlocked > 0);
});

// ============ 序列化 ============

test("ach: 序列化往返", () => {
  const st = newAchievementState();
  const stats = { ...emptyStats(), daysSurvived: 30, haremCount: 5 };
  const r = evaluateAchievements(st, stats, 30, false);

  const json = achToJSON(r.state);
  const back = achFromJSON(json);

  assert.equal(unlockedCount(back), unlockedCount(r.state));
  assert.equal(back.stats.daysSurvived, 30);
});

test("ach: 空数据返回默认", () => {
  const st = achFromJSON(null);
  assert.equal(unlockedCount(st), 0);
  assert.equal(Object.keys(st.progress).length, ACHIEVEMENTS.length);
});

test("ach: 旧存档缺字段被补全", () => {
  const st = achFromJSON({ progress: { survive_1: { id: "survive_1", unlocked: true, unlockedAtDay: 1, current: 0, cheated: false } } } as never);
  assert.ok(st.progress["survive_1"].unlocked);
  assert.ok(st.progress["survive_7"], "缺失的成就应补默认值");
  assert.equal(st.progress["survive_7"].unlocked, false);
});
