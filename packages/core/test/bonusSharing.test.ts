import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BONUS_DEFS, bonusDef, bonusesByCategory, newShareState, toggleShare,
  setCategoryShare, isShared, sharedKeys, companionBonuses, heroBonuses,
  companionAttributeBonus, shareStats, SHARE_RATIO, HERO_RATIO,
  CATEGORY_LABEL, CATEGORY_DESC, shareToJSON, shareFromJSON,
  type BonusCategory
} from "../src/systems/bonusSharing.ts";

const CATS: BonusCategory[] = ["survival", "combat", "facility", "comfort", "special"];

// ============ 定义 ============

test("share: 加成定义充足", () => {
  assert.ok(BONUS_DEFS.length >= 30, `应有 30+ 加成，实际 ${BONUS_DEFS.length}`);
});

test("share: key 唯一", () => {
  const keys = new Set(BONUS_DEFS.map((b) => b.key));
  assert.equal(keys.size, BONUS_DEFS.length);
});

test("share: 字段完整", () => {
  for (const b of BONUS_DEFS) {
    assert.ok(b.label.length > 0, `${b.key} 缺标签`);
    assert.ok(b.description.length > 0, `${b.key} 缺说明`);
    assert.ok(CATS.includes(b.category), `${b.key} 分类无效`);
    assert.ok(["numeric", "unlock", "none"].includes(b.appliesTo));
  }
});

test("share: 五个分类都有加成", () => {
  for (const c of CATS) {
    assert.ok(bonusesByCategory(c).length >= 3, `${c} 分类加成不足`);
    assert.ok(CATEGORY_LABEL[c]);
    assert.ok(CATEGORY_DESC[c]);
  }
});

test("share: 后宫比例低于主角", () => {
  assert.ok(SHARE_RATIO < HERO_RATIO, "后宫享受比例必须低于主角");
  assert.equal(HERO_RATIO, 1);
  assert.ok(SHARE_RATIO > 0);
});

// ============ 授权 ============

test("share: 默认授权", () => {
  const s = newShareState();
  // 默认授权的键应有值
  const shared = sharedKeys(s);
  assert.ok(shared.length > 0);
  // 研究/制作效率现为可授权项（默认开启）
  assert.equal(isShared(s, "researchRate"), true, "研究效率应可授权给后宫科研人员");
  assert.equal(isShared(s, "craftRate"), true, "制作效率应可授权");
});

test("share: 全部加成均可授权（无主角专属项）", () => {
  const s = newShareState();
  const none = BONUS_DEFS.filter((b) => b.appliesTo === "none");
  assert.equal(none.length, 0, "不应存在不可授权的加成");
});

test("share: 切换授权", () => {
  let s = newShareState();
  const before = isShared(s, "shield");
  s = toggleShare(s, "shield");
  assert.equal(isShared(s, "shield"), !before);
});

test("share: 未知键被忽略", () => {
  const s = newShareState();
  const s2 = toggleShare(s, "nonexistent_key");
  assert.deepEqual(s2.shared, s.shared);
});

test("share: 主角专属项无法授权", () => {
  let s = newShareState();
  s = toggleShare(s, "researchRate"); // appliesTo: none
  assert.equal(isShared(s, "researchRate"), false, "none 类不应被共享");
});

test("share: 批量设置分类", () => {
  let s = newShareState();
  s = setCategoryShare(s, "combat", false);
  for (const b of bonusesByCategory("combat")) {
    assert.equal(isShared(s, b.key), false, `${b.key} 应已取消`);
  }

  s = setCategoryShare(s, "combat", true);
  for (const b of bonusesByCategory("combat")) {
    if (b.appliesTo === "none") continue;
    assert.equal(isShared(s, b.key), true, `${b.key} 应已授权`);
  }
});

test("share: 统计", () => {
  const s = newShareState();
  const st = shareStats(s);
  assert.equal(st.total, BONUS_DEFS.length);
  assert.ok(st.shared > 0);
  for (const c of CATS) {
    assert.ok(st.byCategory[c].total >= 3);
    assert.ok(st.byCategory[c].shared <= st.byCategory[c].total);
  }
});

// ============ 计算 ============

test("share: 后宫获得折算后的加成", () => {
  const s = newShareState();
  const raw = { defense: 100, foodPerDay: 50 };
  const out = companionBonuses(raw, s);

  if (isShared(s, "defense")) {
    assert.equal(out.defense, 100 * SHARE_RATIO, "应按比例折算");
  }
  if (isShared(s, "foodPerDay")) {
    assert.equal(out.foodPerDay, 50 * SHARE_RATIO);
  }
});

test("share: 未授权的加成不共享", () => {
  let s = newShareState();
  s = setCategoryShare(s, "combat", false);
  const out = companionBonuses({ defense: 100 }, s);
  assert.equal(out.defense, undefined);
});

test("share: unlock 类全额共享", () => {
  const s = newShareState();
  const def = BONUS_DEFS.find((b) => b.appliesTo === "unlock")!;
  const out = companionBonuses({ [def.key]: 1 }, s);
  assert.equal(out[def.key], 1, "unlock 类不应折算");
});

test("share: 主角全额享受", () => {
  const raw = { defense: 100, researchRate: 20 };
  const out = heroBonuses(raw);
  assert.equal(out.defense, 100);
  assert.equal(out.researchRate, 20, "主角专属项应全额");
});

test("share: 后宫加成始终低于主角", () => {
  const s = newShareState();
  const raw = { defense: 100, shield: 80, foodPerDay: 60 };
  const harem = companionBonuses(raw, s);
  const hero = heroBonuses(raw);

  for (const k of Object.keys(harem)) {
    const def = bonusDef(k)!;
    if (def.appliesTo === "unlock") continue;
    assert.ok(
      harem[k] <= hero[k],
      `${k}: 后宫 ${harem[k]} 不应超过主角 ${hero[k]}`
    );
  }
});

test("share: 未登记键不共享", () => {
  const s = newShareState();
  const out = companionBonuses({ unknown_bonus: 999 }, s);
  assert.equal(out.unknown_bonus, undefined, "未登记的键应保守不共享");
});

test("share: 后宫属性加成", () => {
  const shared = { meleeDmg: 40, trainingRate: 30, moodBonus: 30 };
  const attrs = companionAttributeBonus(shared);
  // 应该有部分属性被提升
  const total = Object.values(attrs).reduce((s, v) => s + (v ?? 0), 0);
  assert.ok(total > 0, "应产生属性提升");
  for (const v of Object.values(attrs)) {
    assert.ok((v ?? 0) >= 0, "属性提升不应为负");
  }
});

// ============ 序列化 ============

test("share: 序列化往返", () => {
  let s = newShareState();
  s = toggleShare(s, "shield");
  s = setCategoryShare(s, "comfort", false);

  const json = shareToJSON(s);
  const back = shareFromJSON(json);
  assert.deepEqual(back.shared, s.shared);
});

test("share: 空数据返回默认", () => {
  const s = shareFromJSON(null);
  assert.deepEqual(s.shared, newShareState().shared);
});

test("share: 部分数据被补全", () => {
  const s = shareFromJSON({ shared: { shield: true } });
  assert.equal(s.shared.shield, true);
  // 其他键应有默认值
  assert.ok(Object.keys(s.shared).length >= BONUS_DEFS.length);
});

test("share: 序列化不共享引用", () => {
  const s = newShareState();
  const json = shareToJSON(s);
  json.shared["defense"] = false;
  assert.equal(s.shared["defense"], newShareState().shared["defense"]);
});
