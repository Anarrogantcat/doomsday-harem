import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CLOTHING, itemById, itemsBySlot, itemsByTag,
  newWardrobe, equip, equipAll, unequip, wearFromStorage,
  equippedItems, equippedGarments,
  coverage, zoneCoverage, exposure, insulation, armor, charm, stealth,
  totalWeight, hasTag, uniformOk,
  undressOrder, undressStep, undressTo, undressAll,
  damage, conditionOf, repairAll, pruneBroken,
  suitability, presetWardrobe, presetItems, describe,
  wardrobeToJSON, wardrobeFromJSON,
  SLOT_LABEL, ZONE_LABEL, SENSITIVE_ZONES, UNDRESS_SEQUENCE,
  type ClothingSlot, type BodyZone, type Weather
} from "../src/systems/clothing.ts";

// ============ 目录 ============

test("clothing: 目录非空且 id 唯一", () => {
  assert.ok(CLOTHING.length >= 40, `目录应有 40+ 件，实际 ${CLOTHING.length}`);
  const ids = new Set(CLOTHING.map((x) => x.id));
  assert.equal(ids.size, CLOTHING.length, "id 必须唯一");
});

test("clothing: 每件衣物字段合法", () => {
  for (const item of CLOTHING) {
    assert.ok(item.name.length > 0, `${item.id} 缺名称`);
    assert.ok(item.durability > 0, `${item.id} 耐久必须为正`);
    assert.ok(item.weight >= 0, `${item.id} 重量不可为负`);
    for (const [zone, v] of Object.entries(item.coverage)) {
      assert.ok(ZONE_LABEL[zone as BodyZone], `${item.id} 含未知区域 ${zone}`);
      assert.ok(v! >= 0 && v! <= 1, `${item.id} 区域 ${zone} 覆盖度越界：${v}`);
    }
  }
});

test("clothing: 按槽位与标签查询", () => {
  assert.ok(itemsBySlot("torso").length >= 5);
  assert.ok(itemsByTag("job:lab").some((x) => x.id === "lab_coat"));
  assert.ok(itemsByTag("charm").length >= 3);
  assert.ok(itemsByTag("armor").length >= 2);
  assert.ok(itemsByTag("restraint").length >= 3);
  assert.equal(itemById("nonexistent"), undefined);
});

// ============ 穿脱 ============

test("clothing: 穿上与脱下", () => {
  let w = newWardrobe();
  assert.equal(equippedItems(w).length, 0);

  w = equip(w, "tee_shirt");
  assert.equal(equippedItems(w).length, 1);
  assert.equal(w.equipped.torso?.itemId, "tee_shirt");

  w = unequip(w, "torso");
  assert.equal(equippedItems(w).length, 0);
  assert.equal(w.stored.length, 1, "脱下的衣物进储物");
});

test("clothing: 同槽位替换旧件进储物", () => {
  let w = equip(newWardrobe(), "tee_shirt");
  w = equip(w, "hoodie");
  assert.equal(w.equipped.torso?.itemId, "hoodie");
  assert.equal(w.stored.length, 1);
  assert.equal(w.stored[0].itemId, "tee_shirt");
});

test("clothing: 未知衣物抛错", () => {
  assert.throws(() => equip(newWardrobe(), "nope"), /未知衣物/);
});

test("clothing: equipAll 一次穿多件", () => {
  const w = equipAll(newWardrobe(), ["sport_bra", "boxer_briefs", "work_shirt", "cargo_pants", "combat_boots"]);
  assert.equal(equippedItems(w).length, 5);
});

test("clothing: 从储物中重新穿上", () => {
  let w = equip(newWardrobe(), "tee_shirt");
  w = unequip(w, "torso");
  assert.equal(w.stored.length, 1);
  w = wearFromStorage(w, "tee_shirt");
  assert.equal(w.equipped.torso?.itemId, "tee_shirt");
  assert.equal(w.stored.length, 0);
});

test("clothing: equippedGarments 返回槽位与物品", () => {
  const w = equipAll(newWardrobe(), ["sport_bra", "work_shirt"]);
  const gs = equippedGarments(w);
  assert.equal(gs.length, 2);
  assert.ok(gs.every((x) => SLOT_LABEL[x.slot]));
  assert.ok(gs.every((x) => x.item.id.length > 0));
});

// ============ 派生数值 ============

test("clothing: 覆盖度按区域累加且封顶 1", () => {
  const w = equipAll(newWardrobe(), ["work_shirt", "jacket"]);
  const cov = coverage(w);
  assert.ok(cov.chest <= 1, "覆盖度不可超过 1");
  assert.ok(cov.chest > 0.85, "衬衫 + 外套应覆盖胸部");
});

test("clothing: 暴露度按敏感区域计算", () => {
  const nude = newWardrobe();
  assert.equal(exposure(nude), 100, "无衣物时暴露度 100");

  const full = equipAll(newWardrobe(), [
    "sport_bra", "boxer_briefs", "work_shirt", "cargo_pants"
  ]);
  assert.ok(exposure(full) < 15, `全套应低于 15，实际 ${exposure(full)}`);

  const partial = equipAll(newWardrobe(), ["sport_bra", "boxer_briefs"]);
  assert.ok(exposure(partial) > exposure(full), "只穿内衣应更暴露");
});

test("clothing: 保暖 / 防护 / 魅力 / 隐蔽 累加", () => {
  const light = equipAll(newWardrobe(), ["tee_shirt", "shorts"]);
  const heavy = equipAll(newWardrobe(), ["down_jacket", "cargo_pants", "combat_boots", "tactical_gloves"]);

  assert.ok(insulation(heavy) > insulation(light));
  assert.ok(armor(heavy) > armor(light));

  const sexy = equipAll(newWardrobe(), ["bunny_suit", "heels"]);
  assert.ok(charm(sexy) > charm(light));
  assert.ok(stealth(sexy) < 0, "显眼衣物应降低隐蔽");
});

test("clothing: 重量与标签", () => {
  const w = equipAll(newWardrobe(), ["tactical_vest", "combat_boots"]);
  assert.ok(totalWeight(w) > 3);
  assert.equal(hasTag(w, "armor"), true);
  assert.equal(hasTag(w, "job:lab"), false);
});

test("clothing: 岗位制服判定", () => {
  assert.equal(uniformOk(equip(newWardrobe(), "lab_coat"), "lab"), true);
  assert.equal(uniformOk(equip(newWardrobe(), "apron"), "kitchen"), true);
  assert.equal(uniformOk(equip(newWardrobe(), "scrubs"), "medical"), true);
  assert.equal(uniformOk(equip(newWardrobe(), "tee_shirt"), "lab"), false);
});

// ============ 脱衣顺序 ============

test("clothing: 脱衣顺序由外到内", () => {
  const w = equipAll(newWardrobe(), [
    "sport_bra", "boxer_briefs", "work_shirt", "jacket", "combat_boots", "scarf"
  ]);
  const order = undressOrder(w);
  assert.equal(order[0], "accessory", "配饰最外");
  assert.ok(order.indexOf("outer") < order.indexOf("torso"), "外套先于上身");
  assert.ok(order.indexOf("torso") < order.indexOf("underwear_top"), "上身先于内衣");
});

test("clothing: 单步脱衣返回槽位与物品", () => {
  const w = equipAll(newWardrobe(), ["jacket", "work_shirt"]);
  const step = undressStep(w);
  assert.equal(step.slot, "outer");
  assert.equal(step.item?.id, "jacket");
  assert.ok(step.exposure >= 0);
});

test("clothing: 脱到指定暴露度", () => {
  const w = equipAll(newWardrobe(), [
    "sport_bra", "boxer_briefs", "work_shirt", "jacket", "cargo_pants", "combat_boots"
  ]);
  assert.ok(exposure(w) < 15);

  const half = undressTo(w, 40);
  assert.ok(exposure(half.wardrobe) >= 40, "应达到目标暴露度");
  assert.ok(half.removed.length > 0, "应记录脱掉的衣物");
});

test("clothing: 脱光", () => {
  const w = equipAll(newWardrobe(), ["sport_bra", "boxer_briefs", "work_shirt", "cargo_pants"]);
  const all = undressAll(w);
  assert.equal(exposure(all.wardrobe), 100);
  assert.equal(equippedItems(all.wardrobe).length, 0);
  assert.equal(all.removed.length, 4);
});

test("clothing: 空衣橱脱衣不报错", () => {
  const step = undressStep(newWardrobe());
  assert.equal(step.slot, null);
  assert.equal(step.item, null);
});

// ============ 耐久 ============

test("clothing: 磨损与状况", () => {
  let w = equipAll(newWardrobe(), ["work_shirt", "cargo_pants"]);
  assert.equal(conditionOf(w), 1);

  w = damage(w, 30);
  assert.ok(conditionOf(w) < 1, "磨损后状况应下降");
  assert.ok(w.equipped.torso!.durability < 80);
});

test("clothing: 破损衣物被移除", () => {
  let w = equip(newWardrobe(), "lace_panties"); // 耐久 25
  w = damage(w, 100);
  const pruned = pruneBroken(w);
  assert.equal(pruned.equipped.underwear_bottom, undefined);
  assert.equal(equippedItems(pruned).length, 0);
});

test("clothing: 修补恢复耐久", () => {
  let w = equip(newWardrobe(), "work_shirt");
  w = damage(w, 50);
  const fixed = repairAll(w);
  assert.equal(fixed.equipped.torso!.durability, 80, "应恢复到最大耐久");
});

// ============ 天气 ============

test("clothing: 严寒需要足够保暖", () => {
  const light = equipAll(newWardrobe(), ["tee_shirt", "shorts"]);
  const heavy = equipAll(newWardrobe(), ["down_jacket", "cargo_pants", "combat_boots", "scarf"]);

  const coldLight = suitability(light, "cold");
  const coldHeavy = suitability(heavy, "cold");

  assert.equal(coldLight.ok, false, "薄衣不应通过严寒判定");
  assert.equal(coldHeavy.ok, true, "厚衣应通过严寒判定");
  assert.ok(coldLight.reasons.length > 0);
});

test("clothing: 酷热需要轻薄", () => {
  const light = equipAll(newWardrobe(), ["tee_shirt", "shorts"]);
  const heavy = equipAll(newWardrobe(), ["down_jacket", "cargo_pants"]);

  assert.equal(suitability(light, "heat").ok, true);
  assert.equal(suitability(heavy, "heat").ok, false);
});

test("clothing: 雨天需要防水外层", () => {
  const bare = equipAll(newWardrobe(), ["tee_shirt"]);
  const rain = equipAll(newWardrobe(), ["tee_shirt", "jacket"]);
  assert.equal(suitability(bare, "rain").ok, false);
  assert.equal(suitability(rain, "rain").ok, true);
});

test("clothing: 晴天无要求", () => {
  assert.equal(suitability(newWardrobe(), "clear").ok, true);
});

// ============ 预设 ============

test("clothing: 预设着装齐备", () => {
  for (const p of ["hero", "mother", "sister", "sister2"] as const) {
    const w = presetWardrobe(p);
    assert.ok(equippedItems(w).length >= 4, `${p} 预设应有 4+ 件`);
    assert.ok(exposure(w) < 40, `${p} 预设不应过度暴露`);
  }
  assert.equal(equippedItems(presetWardrobe("nude")).length, 0);
  assert.equal(equippedItems(presetWardrobe("ai")).length, 0, "AI 无身体，无衣物");
});

test("clothing: 预设清单可查询", () => {
  const items = presetItems("sister");
  assert.ok(items.includes("lace_bra"));
  assert.ok(items.includes("heels"));
});

test("clothing: 描述文本", () => {
  assert.equal(describe(newWardrobe()), "（未着衣物）");
  const w = equipAll(newWardrobe(), ["work_shirt", "cargo_pants"]);
  const d = describe(w);
  assert.match(d, /工装衬衫/);
  assert.match(d, /工装裤/);
});

// ============ 序列化 ============

test("clothing: 序列化往返", () => {
  let w = equipAll(newWardrobe(), ["sport_bra", "work_shirt", "jacket"]);
  w = equip(w, "combat_boots");
  w = damage(w, 20);
  w = unequip(w, "torso"); // 造一条储物记录

  const json = wardrobeToJSON(w);
  const back = wardrobeFromJSON(json);

  assert.equal(equippedItems(back).length, equippedItems(w).length);
  assert.equal(back.stored.length, w.stored.length);
  assert.equal(exposure(back), exposure(w));
  assert.equal(insulation(back), insulation(w));
});

test("clothing: 反序列化忽略未知衣物", () => {
  const back = wardrobeFromJSON({
    equipped: { torso: { itemId: "nonexistent", durability: 10 } },
    stored: [{ itemId: "also_nope", durability: 5 }]
  });
  assert.equal(equippedItems(back).length, 0);
  assert.equal(back.stored.length, 0);
});

test("clothing: 空输入返回空衣橱", () => {
  assert.equal(equippedItems(wardrobeFromJSON(null)).length, 0);
  assert.equal(equippedItems(wardrobeFromJSON(undefined)).length, 0);
  assert.equal(equippedItems(wardrobeFromJSON({ equipped: {}, stored: [] })).length, 0);
});

// ============ 常量完整性 ============

test("clothing: 槽位与区域标签完整", () => {
  const slots: ClothingSlot[] = ["head","face","torso","outer","legs","feet","hands","underwear_top","underwear_bottom","accessory","harness"];
  for (const s of slots) assert.ok(SLOT_LABEL[s], `缺少槽位标签 ${s}`);

  const zones: BodyZone[] = ["head","face","neck","chest","belly","back","genital","buttock","thigh","calf","foot","hand","arm","shoulder"];
  for (const z of zones) assert.ok(ZONE_LABEL[z], `缺少区域标签 ${z}`);
});

test("clothing: 脱衣顺序覆盖全部槽位", () => {
  const slots: ClothingSlot[] = ["head","face","torso","outer","legs","feet","hands","underwear_top","underwear_bottom","accessory","harness"];
  for (const s of slots) {
    assert.ok(UNDRESS_SEQUENCE.includes(s), `脱衣顺序缺少 ${s}`);
  }
  assert.equal(UNDRESS_SEQUENCE.length, slots.length);
});

test("clothing: 敏感区域列表非空", () => {
  assert.ok(SENSITIVE_ZONES.length >= 4);
  assert.ok(SENSITIVE_ZONES.includes("genital"));
  assert.ok(SENSITIVE_ZONES.includes("chest"));
});

test("clothing: 扶她适配标签", () => {
  const ok = itemsByTag("futanari-ok");
  assert.ok(ok.length >= 3, "应有标记为扶她适配的内衣");
  assert.ok(ok.some((x) => x.slot === "underwear_bottom"));
});
