import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ITEMS, itemDef, itemsByCategory, itemsByTag as itemsByTagInv,
  resolveItemId, isKnownItem, normalizeCost, GENERIC_MATERIAL_ID,
  newContainer, newStorage,
  add, addMany, remove, countOf, totalCount, weightOf, freeWeight, freeSlots, isFull,
  has as hasItem, canAfford, missingFor, spend, transfer, consolidate, prune,
  use as useItem, rollLoot, lootTable, LOOT_TABLES, mulberry32,
  RECIPES, recipeById, canCraft, craft,
  containerToJSON, containerFromJSON, describeContainer, groupByCategory,
  CATEGORY_LABEL, QUALITY_LABEL, QUALITY_MULT
} from "../src/systems/inventory.ts";

// ============ 目录 ============

test("inventory: 目录非空且 id 唯一", () => {
  assert.ok(ITEMS.length >= 80, `应有 80+ 物品，实际 ${ITEMS.length}`);
  const ids = new Set(ITEMS.map((x) => x.id));
  assert.equal(ids.size, ITEMS.length, "id 必须唯一");
});

test("inventory: 物品字段合法", () => {
  for (const it of ITEMS) {
    assert.ok(it.name.length > 0, `${it.id} 缺名称`);
    assert.ok(it.weight >= 0, `${it.id} 重量不可为负`);
    assert.ok(it.stack >= 1, `${it.id} 堆叠至少为 1`);
    assert.ok(CATEGORY_LABEL[it.category], `${it.id} 分类未知`);
    assert.ok(it.description.length > 0, `${it.id} 缺描述`);
  }
});

test("inventory: 按分类与标签查询", () => {
  assert.ok(itemsByCategory("material").length >= 20);
  assert.ok(itemsByCategory("food").length >= 5);
  assert.ok(itemsByCategory("toy").length >= 5);
  assert.ok(itemsByCategory("drug").length >= 4);
  assert.ok(itemsByTagInv("futa").length >= 2, "应有扶她药");
});

test("inventory: 分类覆盖设计所需", () => {
  const cats = new Set(ITEMS.map((x) => x.category));
  for (const c of ["material", "food", "water", "medical", "ammo", "weapon", "tool", "toy", "drug", "luxury", "key", "data"] as const) {
    assert.ok(cats.has(c), `缺少分类 ${c}`);
  }
});

// ============ 别名与兜底 ============

test("inventory: 中文名解析为 id", () => {
  assert.equal(resolveItemId("铜线"), "copper_wire");
  assert.equal(resolveItemId("水泥"), "cement");
  assert.equal(resolveItemId("钢筋"), "steel_bar");
  assert.equal(resolveItemId("PVC管"), "pvc_pipe");
  assert.equal(resolveItemId("copper_wire"), "copper_wire", "英文 id 应原样返回");
});

test("inventory: 未收录的名字走通用材料兜底", () => {
  assert.equal(resolveItemId("某个不存在的资源"), GENERIC_MATERIAL_ID);
  assert.equal(isKnownItem("铜线"), true);
  assert.equal(isKnownItem("随便编的东西"), false);
});

test("inventory: 科技树 190+ 资源名全部可解析", () => {
  // 抽样科技树里实际出现的名字
  const samples = [
    "铜线", "磁铁", "PVC管", "滤网", "风扇", "管道", "水泥", "钢筋",
    "活性炭", "泵", "金属架", "玻璃", "LED灯", "药品", "手术器械",
    "隔音材料", "定制家具", "传感器", "自动灌溉", "光伏板", "蓄电池",
    "控制器", "柴油机", "油箱", "地热井", "热交换器", "汽轮机",
    "稀有植物", "激素前体", "基因样本", "稀有催化剂", "轻机枪",
    "履带底盘", "侦察无人机", "自主AI", "水晶核心", "稀有同位素",
    "自制哑铃", "木人桩", "预知日记", "觉醒仪式", "生物子宫"
  ];
  for (const name of samples) {
    const id = resolveItemId(name);
    assert.ok(itemDef(id), `${name} → ${id} 应可解析到物品`);
  }
});

test("inventory: normalizeCost 归一化成本字典", () => {
  const n = normalizeCost({ "铜线": 10, "磁铁": 5 });
  assert.equal(n["copper_wire"], 10);
  assert.equal(n["magnet"], 5);
});

test("inventory: normalizeCost 合并同名", () => {
  const n = normalizeCost({ "电池": 2, "蓄电池": 3 });
  assert.equal(n["battery"], 5, "两个名字映射到同一 id 应累加");
});

// ============ 容器基础 ============

test("inventory: 空容器状态", () => {
  const c = newContainer(40, 30);
  assert.equal(c.stacks.length, 0);
  assert.equal(weightOf(c), 0);
  assert.equal(totalCount(c), 0);
  assert.equal(freeWeight(c), 40);
  assert.equal(freeSlots(c), 30);
  assert.equal(isFull(c), false);
});

test("inventory: 仓库无上限", () => {
  const s = newStorage();
  assert.equal(s.maxWeight, Infinity);
  assert.equal(s.maxSlots, Infinity);
  assert.equal(freeWeight(s), Infinity);
  assert.equal(isFull(s), false);
});

test("inventory: 添加与计数", () => {
  let c = newContainer(100, 30);
  c = add(c, "canned_food", 10).container;
  assert.equal(countOf(c, "canned_food"), 10);
  assert.equal(weightOf(c), 4, "10 个罐头 × 0.4");
  assert.equal(hasItem(c, "canned_food", 10), true);
  assert.equal(hasItem(c, "canned_food", 11), false);
});

test("inventory: 堆叠上限拆分", () => {
  let c = newContainer(1000, 30);
  c = add(c, "bandage", 150).container; // stack = 99
  assert.equal(countOf(c, "bandage"), 150);
  assert.ok(c.stacks.length >= 2, "超过堆叠上限应拆成多个堆叠");
});

test("inventory: 不可堆叠物品各占一槽", () => {
  let c = newContainer(100, 30);
  c = add(c, "rifle", 3).container; // stack = 1
  assert.equal(countOf(c, "rifle"), 3);
  assert.equal(c.stacks.length, 3);
});

test("inventory: 重量超限时部分放入", () => {
  let c = newContainer(10, 30);
  const r = add(c, "cement", 5); // 每件 5.0 → 最多 2 件
  assert.ok(r.added >= 1);
  assert.ok(r.added <= 2);
  assert.ok(r.overflow > 0);
  assert.equal(r.reason, "weight");
});

test("inventory: 槽位超限时报告原因", () => {
  let c = newContainer(10000, 2);
  const r = add(c, "rifle", 5); // 不可堆叠，只有 2 槽
  assert.equal(r.added, 2);
  assert.equal(r.overflow, 3);
  assert.equal(r.reason, "slots");
});

test("inventory: addMany 批量添加并报告溢出", () => {
  let c = newContainer(20, 30);
  const r = addMany(c, [
    { id: "canned_food", n: 5 },
    { id: "cement", n: 10 }
  ]);
  assert.ok(countOf(r.container, "canned_food") === 5);
  assert.ok(Object.keys(r.overflow).length > 0, "水泥应溢出");
});

test("inventory: 移除与缺口", () => {
  let c = add(newContainer(100, 30), "canned_food", 10).container;
  const r1 = remove(c, "canned_food", 4);
  assert.equal(r1.removed, 4);
  assert.equal(r1.missing, 0);
  assert.equal(countOf(r1.container, "canned_food"), 6);

  const r2 = remove(r1.container, "canned_food", 100);
  assert.equal(r2.removed, 6);
  assert.equal(r2.missing, 94);
});

test("inventory: prune 清掉零数量", () => {
  let c = add(newContainer(100, 30), "canned_food", 3).container;
  c = remove(c, "canned_food", 3).container;
  assert.equal(prune(c).stacks.length, 0);
});

// ============ 成本与花费 ============

test("inventory: canAfford 与 missingFor", () => {
  const c = add(newContainer(100, 30), "copper_wire", 8).container;
  assert.equal(canAfford(c, { "铜线": 10 }), false);
  assert.equal(canAfford(c, { "铜线": 5 }), true);
  assert.deepEqual(missingFor(c, { "铜线": 10, "磁铁": 5 }), { copper_wire: 2, magnet: 5 });
});

test("inventory: spend 原子性", () => {
  const c = add(newContainer(100, 30), "copper_wire", 10).container;
  // 磁铁不足 → 整体失败，铜线不应被扣
  const bad = spend(c, { "铜线": 10, "磁铁": 5 });
  assert.equal(bad.ok, false);
  assert.equal(countOf(bad.container, "copper_wire"), 10, "失败时不应扣任何资源");

  const good = spend(add(c, "magnet", 5).container, { "铜线": 10, "磁铁": 5 });
  assert.equal(good.ok, true);
  assert.equal(countOf(good.container, "copper_wire"), 0);
});

// ============ 转移 ============

test("inventory: 容器间转移", () => {
  const store = add(newStorage(), "canned_food", 20).container;
  const bag = newContainer(10, 5);
  const r = transfer(store, bag, "canned_food", 8);
  assert.equal(r.moved, 8);
  assert.equal(countOf(r.from, "canned_food"), 12);
  assert.equal(countOf(r.to, "canned_food"), 8);
});

test("inventory: 转移受容量限制时退回", () => {
  const store = add(newStorage(), "cement", 20).container;
  const bag = newContainer(5, 30); // 只能装 1 件水泥
  const r = transfer(store, bag, "cement", 10);
  assert.ok(r.moved <= 1);
  assert.equal(countOf(r.from, "cement"), 20 - r.moved, "未装入的应留在原容器");
});

// ============ 合并 ============

test("inventory: consolidate 合并同类堆叠", () => {
  let c = newContainer(1000, 30);
  c = add(c, "bandage", 50).container;
  c = add(c, "bandage", 30).container;
  const before = c.stacks.length;
  const after = consolidate(c);
  assert.ok(after.stacks.length <= before);
  assert.equal(countOf(after, "bandage"), 80, "合并不应丢件");
});

// ============ 使用 ============

test("inventory: 消耗品使用后减少", () => {
  const c = add(newContainer(100, 30), "canned_food", 3).container;
  const r = useItem(c, "canned_food");
  assert.ok(r);
  assert.equal(r!.consumed, true);
  assert.equal(r!.effects["hunger"], 45);
  assert.equal(countOf(r!.container, "canned_food"), 2);
});

test("inventory: 耐久物品使用后不消耗数量", () => {
  const c = add(newContainer(100, 30), "dildo_double", 1).container;
  const r = useItem(c, "dildo_double");
  assert.ok(r);
  assert.equal(r!.consumed, false);
  assert.equal(countOf(r!.container, "dildo_double"), 1, "数量不变");
  assert.ok(r!.container.stacks[0].durability < 60, "耐久应下降");
});

test("inventory: 使用不存在的物品返回 null", () => {
  assert.equal(useItem(newContainer(10, 5), "canned_food"), null);
});

test("inventory: 扶她药效果", () => {
  const c = add(newContainer(100, 30), "futa_recreational", 2).container;
  const r = useItem(c, "futa_recreational");
  assert.equal(r!.effects["lust"], 40);
  assert.ok(itemDef("futa_recreational")!.tags!.includes("temporary"), "必须是临时效果（INV-3）");
  assert.ok(itemDef("futa_pregnant")!.tags!.includes("fertility"));
});

// ============ 采集 ============

test("inventory: mulberry32 确定性", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) assert.equal(a(), b(), "同种子应产出同序列");

  const c = mulberry32(43);
  assert.notEqual(mulberry32(42)(), c(), "不同种子应不同");
});

test("inventory: rollLoot 可复现", () => {
  const table = lootTable("ruins")!;
  const a = rollLoot(table, 1234);
  const b = rollLoot(table, 1234);
  assert.deepEqual(a, b, "同种子掉落应一致");

  const c = rollLoot(table, 9999);
  assert.ok(Array.isArray(c));
});

test("inventory: 掉落表全部合法", () => {
  for (const t of LOOT_TABLES) {
    assert.ok(t.name.length > 0);
    for (const e of t.entries) {
      if (e.chance <= 0) continue;
      assert.ok(itemDef(e.itemId), `掉落表 ${t.id} 含未知物品 ${e.itemId}`);
      assert.ok(e.chance > 0 && e.chance <= 1, `${t.id} 概率越界`);
      assert.ok(e.max >= e.min);
    }
  }
});

test("inventory: 多次采集能产出物品", () => {
  const table = lootTable("ruins")!;
  let total = 0;
  for (let seed = 0; seed < 30; seed++) {
    total += rollLoot(table, seed).reduce((s, x) => s + x.n, 0);
  }
  assert.ok(total > 0, "30 次采集应有产出");
});

// ============ 合成 ============

test("inventory: 配方目录合法", () => {
  for (const r of RECIPES) {
    assert.ok(itemDef(r.output.itemId), `配方 ${r.id} 产出未知物品`);
    assert.ok(r.output.n > 0);
    assert.ok(r.hours > 0);
    for (const k of Object.keys(r.cost)) {
      assert.ok(itemDef(resolveItemId(k)), `配方 ${r.id} 成本 ${k} 无法解析`);
    }
  }
});

test("inventory: 合成扣料产出", () => {
  let c = add(newContainer(500, 30), "activated_carbon", 4).container;
  c = add(c, "pvc_pipe", 2).container;
  const recipe = recipeById("craft_water_filter")!;
  const r = craft(c, recipe, []);
  assert.equal(r.ok, true);
  assert.equal(countOf(r.container, "water_purifier"), 1);
  assert.equal(countOf(r.container, "activated_carbon"), 2, "应扣 2 个活性炭");
});

test("inventory: 合成缺料时失败", () => {
  const c = add(newContainer(500, 30), "activated_carbon", 1).container;
  const r = craft(c, recipeById("craft_water_filter")!, []);
  assert.equal(r.ok, false);
  assert.ok(Object.keys(r.missing).length > 0);
});

test("inventory: 合成需科技前置", () => {
  const c = add(newContainer(500, 30), "rare_plant", 5).container;
  const c2 = add(c, "alcohol", 5).container;
  const recipe = recipeById("craft_painkiller")!;

  const noTech = craft(c2, recipe, []);
  assert.equal(noTech.ok, false);
  assert.ok(noTech.missingTech.includes("shelter_medical"));

  const withTech = craft(c2, recipe, ["shelter_medical"]);
  assert.equal(withTech.ok, true);
  assert.equal(countOf(withTech.container, "painkiller"), 5);
});

test("inventory: canCraft 预检", () => {
  const c = add(newContainer(500, 30), "rare_plant", 2).container;
  const check = canCraft(c, recipeById("craft_painkiller")!, ["shelter_medical"]);
  assert.equal(check.ok, false);
  assert.ok(check.missing["alcohol"]);
});

test("inventory: 扶她药配方存在", () => {
  assert.ok(recipeById("craft_futa_rec"));
  assert.ok(recipeById("craft_futa_preg"));
  const preg = recipeById("craft_futa_preg")!;
  assert.ok(preg.cost["rare_catalyst"], "怀孕型需稀有催化剂");
  assert.ok(preg.cost["gene_sample"], "怀孕型需基因样本");
});

// ============ 序列化 ============

test("inventory: 容器序列化往返", () => {
  let c = add(newContainer(50, 20), "canned_food", 6).container;
  c = add(c, "rifle", 1, "good").container;
  c = add(c, "dildo_double", 2).container;

  const json = containerToJSON(c);
  const back = containerFromJSON(json, 50, 20);

  assert.equal(countOf(back, "canned_food"), 6);
  assert.equal(countOf(back, "rifle"), 1);
  assert.equal(back.maxWeight, 50);
  assert.equal(back.maxSlots, 20);
  assert.equal(weightOf(back), weightOf(c));
});

test("inventory: 仓库序列化保留 Infinity", () => {
  const s = add(newStorage(), "wood", 100).container;
  const back = containerFromJSON(containerToJSON(s));
  assert.equal(back.maxWeight, Infinity);
  assert.equal(back.maxSlots, Infinity);
  assert.equal(countOf(back, "wood"), 100);
});

test("inventory: 反序列化忽略未知物品", () => {
  const back = containerFromJSON({
    stacks: [
      { itemId: "nonexistent", count: 5, durability: 0, quality: "common" },
      { itemId: "canned_food", count: 3, durability: 0, quality: "good" }
    ],
    maxWeight: 50,
    maxSlots: 20
  });
  assert.equal(back.stacks.length, 1);
  assert.equal(back.stacks[0].itemId, "canned_food");
});

test("inventory: 空输入返回默认容器", () => {
  const c = containerFromJSON(null, 30, 10);
  assert.equal(c.maxWeight, 30);
  assert.equal(c.maxSlots, 10);
  assert.equal(c.stacks.length, 0);
});

// ============ 描述与分组 ============

test("inventory: 描述文本", () => {
  assert.equal(describeContainer(newContainer(10, 5)), "（空）");
  const c = add(newContainer(100, 30), "canned_food", 3).container;
  assert.match(describeContainer(c), /罐头×3/);
});

test("inventory: 品质显示在描述里", () => {
  const c = add(newContainer(100, 30), "rifle", 1, "rare").container;
  assert.match(describeContainer(c), /稀有/);
});

test("inventory: 按分类分组", () => {
  let c = add(newContainer(200, 30), "canned_food", 2).container;
  c = add(c, "cement", 3).container;
  c = add(c, "bandage", 1).container;
  const g = groupByCategory(c);
  assert.equal(g.food.length, 1);
  assert.equal(g.material.length, 1);
  assert.equal(g.medical.length, 1);
});

test("inventory: 品质倍率递增", () => {
  assert.ok(QUALITY_MULT.poor < QUALITY_MULT.common);
  assert.ok(QUALITY_MULT.common < QUALITY_MULT.good);
  assert.ok(QUALITY_MULT.good < QUALITY_MULT.rare);
  assert.ok(QUALITY_MULT.rare < QUALITY_MULT.pristine);
});
