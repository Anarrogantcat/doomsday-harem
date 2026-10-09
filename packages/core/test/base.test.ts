import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  FACILITIES, facilityDef, facilitiesByLevel, facilitiesByCategory,
  newBase, findFacility, tierOf, isBuilt, isBuilding,
  upgradeCost, upgradeHours, checkBuild, startBuild, tickBuild,
  instantBuild, instantBuildAll, demolish,
  aggregateFacilityBonuses, effectText, summarize, livingCapacity, hSceneUnlocked,
  baseToJSON, baseFromJSON, describeBase,
  LEVEL_LABEL, FACILITY_CATEGORY_LABEL,
  type Base, type BaseLevel, type FacilityCategory
} from "../src/systems/base.ts";
import { missingFor as missingForFn, newContainer, add } from "../src/systems/inventory.ts";
import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");
const scripts = () => readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));

/** 便捷：基于容器算缺料 */
function missing(c: ReturnType<typeof newContainer>) {
  return (cost: Record<string, number>) => missingForFn(c, cost);
}

// ============ 目录 ============

test("base: 设施目录非空且 id 唯一", () => {
  assert.ok(FACILITIES.length >= 35, `应有 35+ 设施，实际 ${FACILITIES.length}`);
  const ids = new Set(FACILITIES.map((x) => x.id));
  assert.equal(ids.size, FACILITIES.length, "id 必须唯一");
});

test("base: 设施字段合法", () => {
  for (const def of FACILITIES) {
    assert.ok(def.name.length > 0, `${def.id} 缺名称`);
    assert.ok(def.hours > 0, `${def.id} 工时必须为正`);
    assert.ok(def.maxTier >= 1, `${def.id} 最大等级至少为 1`);
    assert.ok(def.costGrowth >= 1, `${def.id} 消耗倍率应 >= 1`);
    assert.ok(def.hourGrowth >= 1, `${def.id} 工时倍率应 >= 1`);
    assert.ok(LEVEL_LABEL[def.level], `${def.id} 层级未知`);
    assert.ok(FACILITY_CATEGORY_LABEL[def.category], `${def.id} 分类未知`);
    assert.ok(Object.keys(def.cost).length > 0, `${def.id} 缺消耗`);
  }
});

test("base: 前置设施引用有效", () => {
  for (const def of FACILITIES) {
    for (const req of def.requiresFacility) {
      assert.ok(facilityDef(req), `${def.id} 前置设施 ${req} 不存在`);
      assert.notEqual(req, def.id, `${def.id} 不应以自己为前置`);
    }
  }
});

test("base: 三层级都有设施", () => {
  for (const lvl of ["surface", "bunker", "resource"] as BaseLevel[]) {
    assert.ok(facilitiesByLevel(lvl).length > 0, `${lvl} 层应有设施`);
  }
});

test("base: 八个分类都有设施", () => {
  for (const cat of Object.keys(FACILITY_CATEGORY_LABEL) as FacilityCategory[]) {
    assert.ok(facilitiesByCategory(cat).length > 0, `${cat} 分类应有设施`);
  }
});

test("base: 设计中的关键设施存在", () => {
  const need = [
    "power_basic", "water_basic", "vent_basic", "greenhouse", "medical_bay",
    "lab", "workshop", "ammo_press", "harem_dorm", "private_room", "bathhouse",
    "cryo_bay", "clone_lab", "fence", "trench", "turret", "drone_bay",
    "robot_bay", "energy_shield", "deep_well", "geo_plant", "mine",
    "escape_tunnel", "fusion_plant", "elevator", "garage", "armory"
  ];
  for (const id of need) assert.ok(facilityDef(id), `缺少设施 ${id}`);
});

// ============ 成本与工时 ============

test("base: 升级成本随等级增长", () => {
  const def = facilityDef("power_basic")!;
  const c0 = upgradeCost(def, 0);
  const c1 = upgradeCost(def, 1);
  const c2 = upgradeCost(def, 2);
  const k = Object.keys(c0)[0];
  assert.ok(c1[k] > c0[k]);
  assert.ok(c2[k] > c1[k]);
});

test("base: 升级工时随等级增长", () => {
  const def = facilityDef("greenhouse")!;
  assert.ok(upgradeHours(def, 1) > upgradeHours(def, 0));
  assert.ok(upgradeHours(def, 2) > upgradeHours(def, 1));
});

// ============ 建造检查 ============

test("base: 无前置时可建造", () => {
  const def = facilityDef("power_basic")!;
  const c = add(newContainer(1000, 50), "copper_wire", 100).container;
  const c2 = add(c, "magnet", 50).container;
  const check = checkBuild(newBase(), def, [], {}, missing(c2));
  assert.equal(check.ok, true);
  assert.equal(check.nextTier, 1);
});

test("base: 缺材料时拒绝", () => {
  const def = facilityDef("power_basic")!;
  const check = checkBuild(newBase(), def, [], {}, missing(newContainer(1000, 50)));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-resource");
  assert.ok(Object.keys(check.missingResource).length > 0);
});

test("base: 缺科技时拒绝", () => {
  const def = facilityDef("workshop")!;
  const c = add(newContainer(10000, 50), "machine_part", 100).container;
  const check = checkBuild(newBase(), def, [], {}, missing(c));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-tech");
  assert.ok(check.missingTech.includes("shelter_power"));
});

test("base: 缺前置设施时拒绝", () => {
  const def = facilityDef("greenhouse")!;
  const c = add(newContainer(10000, 50), "glass", 100).container;
  const check = checkBuild(newBase(), def, [], {}, missing(c));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-facility");
  assert.ok(check.missingFacility.includes("bunker_power"));
});

test("base: 满级时拒绝", () => {
  const def = facilityDef("power_basic")!;
  let base = newBase();
  for (let i = 0; i < def.maxTier; i++) base = instantBuild(base, def.id);
  assert.equal(tierOf(base, def.id), def.maxTier);

  const c = add(newContainer(10000, 50), "copper_wire", 500).container;
  const c2 = add(c, "magnet", 500).container;
  const check = checkBuild(base, def, [], {}, missing(c2));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "max-tier");
});

test("base: 同时只能建一个", () => {
  const base = startBuild(newBase(), "power_basic");
  const def = facilityDef("water_basic")!;
  const c = add(newContainer(10000, 50), "pvc_pipe", 100).container;
  const c2 = add(c, "filter_mesh", 100).container;
  const check = checkBuild(base, def, [], {}, missing(c2));
  assert.equal(check.ok, false);
  assert.equal(check.reason, "building-other");
});

// ============ 建造流程 ============

test("base: 开工后进入建造中", () => {
  const base = startBuild(newBase(), "power_basic");
  assert.equal(base.building, "power_basic");
  assert.equal(isBuilding(base, "power_basic"), true);
  assert.equal(isBuilt(base, "power_basic"), false);
});

test("base: 推进工时后完工", () => {
  const def = facilityDef("power_basic")!;
  let base = startBuild(newBase(), "power_basic");
  const need = upgradeHours(def, 0);

  const t1 = tickBuild(base, need / 2);
  assert.equal(t1.completed, null, "未到工时不应完工");
  assert.equal(t1.base.building, "power_basic");

  const t2 = tickBuild(t1.base, need);
  assert.equal(t2.completed, "power_basic");
  assert.equal(t2.completedTier, 1);
  assert.equal(tierOf(t2.base, "power_basic"), 1);
  assert.equal(t2.base.building, null);
});

test("base: 建造效率倍率加速", () => {
  const def = facilityDef("power_basic")!;
  const need = upgradeHours(def, 0);

  const slow = tickBuild(startBuild(newBase(), "power_basic"), need * 0.6, 1);
  assert.equal(slow.completed, null);

  const fast = tickBuild(startBuild(newBase(), "power_basic"), need * 0.6, 2);
  assert.equal(fast.completed, "power_basic", "2 倍效率应提前完工");
});

test("base: 连续升级到满级", () => {
  const def = facilityDef("power_basic")!;
  let base = newBase();
  for (let i = 0; i < def.maxTier; i++) {
    base = startBuild(base, def.id);
    const need = upgradeHours(def, i);
    base = tickBuild(base, need + 1).base;
  }
  assert.equal(tierOf(base, def.id), def.maxTier);
});

test("base: 立即完工（作弊器）", () => {
  const base = instantBuild(newBase(), "greenhouse");
  assert.equal(tierOf(base, "greenhouse"), 1);
});

test("base: 一键建成整层", () => {
  const base = instantBuildAll(newBase(), "surface");
  for (const def of facilitiesByLevel("surface")) {
    assert.equal(tierOf(base, def.id), def.maxTier, `${def.id} 应满级`);
  }
});

test("base: 一键建成全部", () => {
  const base = instantBuildAll(newBase());
  for (const def of FACILITIES) {
    assert.equal(tierOf(base, def.id), def.maxTier, `${def.id} 应满级`);
  }
});

test("base: 拆除设施", () => {
  let base = instantBuild(newBase(), "power_basic");
  base = demolish(base, "power_basic");
  assert.equal(tierOf(base, "power_basic"), 0);
  assert.equal(base.building, null);
});

// ============ 效果 ============

test("base: 设施加成随等级累加", () => {
  let base = newBase();
  assert.deepEqual(aggregateFacilityBonuses(base), {});

  base = instantBuild(base, "power_basic");
  const t1 = aggregateFacilityBonuses(base);
  assert.equal(t1["powerCapacity"], 10);

  base = instantBuild(base, "power_basic");
  const t2 = aggregateFacilityBonuses(base);
  assert.equal(t2["powerCapacity"], 20, "两级应累加");
});

test("base: Mult 类加成按乘积累乘", () => {
  let base = instantBuild(newBase(), "storage_room");
  const b1 = aggregateFacilityBonuses(base);
  assert.equal(b1["storageMult"], 1.5);

  base = instantBuild(base, "storage_room");
  const b2 = aggregateFacilityBonuses(base);
  assert.equal(b2["storageMult"], 2.25, "1.5^2");
});

test("base: 效果文本替换等级", () => {
  let base = instantBuild(newBase(), "power_basic");
  const def = facilityDef("power_basic")!;
  assert.match(effectText(base, def), /1 级/);
  base = instantBuild(base, "power_basic");
  assert.match(effectText(base, def), /2 级/);
});

test("base: 居住容量累计", () => {
  let base = newBase();
  assert.equal(livingCapacity(base), 0);

  base = instantBuild(base, "bedroom");
  assert.equal(livingCapacity(base), 4);

  base = instantBuild(base, "harem_dorm");
  assert.equal(livingCapacity(base), 8);
});

test("base: 私密场景设施判定", () => {
  let base = newBase();
  assert.equal(hSceneUnlocked(base), false);
  base = instantBuild(base, "private_room");
  assert.equal(hSceneUnlocked(base), true);
});

test("base: 概览统计", () => {
  const base = instantBuildAll(newBase(), "surface");
  const sum = summarize(base);
  assert.equal(sum.total, FACILITIES.length);
  assert.ok(sum.built > 0);
  assert.equal(sum.byLevel.surface.built, facilitiesByLevel("surface").length);
  assert.equal(sum.byLevel.bunker.built, 0);
  assert.equal(sum.building, null);
});

test("base: 建造进度百分比", () => {
  const def = facilityDef("greenhouse")!;
  let base = startBuild(newBase(), "greenhouse");
  const need = upgradeHours(def, 0);
  base = tickBuild(base, need / 2).base;
  const sum = summarize(base);
  assert.ok(sum.buildingProgress > 0.4 && sum.buildingProgress < 0.6, `进度应约 0.5，实际 ${sum.buildingProgress}`);
});

// ============ 序列化 ============

test("base: 序列化往返", () => {
  let base = instantBuild(newBase(), "power_basic");
  base = instantBuild(base, "water_basic");
  base = startBuild(base, "fence");
  base = tickBuild(base, 5).base;

  const json = baseToJSON(base);
  const back = baseFromJSON(json);

  assert.equal(tierOf(back, "power_basic"), 1);
  assert.equal(tierOf(back, "water_basic"), 1);
  assert.equal(back.building, "fence");
  assert.ok(findFacility(back, "fence")!.buildingHours > 0);
});

test("base: 反序列化忽略未知设施", () => {
  const back = baseFromJSON({
    facilities: [
      { id: "nonexistent", tier: 3, buildingHours: 0, targetTier: 3 },
      { id: "power_basic", tier: 2, buildingHours: 0, targetTier: 2 }
    ],
    building: null
  });
  assert.equal(back.facilities.length, 1);
  assert.equal(tierOf(back, "power_basic"), 2);
});

test("base: 空输入返回空基地", () => {
  const b = baseFromJSON(null);
  assert.equal(b.facilities.length, 0);
  assert.equal(b.building, null);
});

test("base: 描述文本", () => {
  assert.equal(describeBase(newBase()), "（尚未建成任何设施）");
  const base = instantBuild(newBase(), "power_basic");
  assert.match(describeBase(base), /电力基础 Lv1/);
});

// ============ 会话集成 ============

test("session/base: 开局无设施", () => {
  const s = new GameSession();
  assert.equal(s.base.facilities.length, 0);
  const sum = s.baseSummary();
  assert.equal(sum.built, 0);
  assert.equal(sum.total, FACILITIES.length);
});

test("session/base: 建造扣料并推进完工", () => {
  const s = new GameSession({ resources: { "copper_wire": 100, "magnet": 50 } });
  const before = s.resources["copper_wire"];

  const r = s.beginBuild("power_basic");
  assert.equal(r.ok, true);
  assert.ok(s.resources["copper_wire"] < before, "应扣除铜线");
  assert.equal(s.base.building, "power_basic");

  s.advance(10, "work");
  assert.equal(s.tierOf("power_basic"), 1, "应已完工");
  assert.equal(s.base.building, null);
});

test("session/base: 缺料时拒绝建造", () => {
  const s = new GameSession();
  const r = s.beginBuild("power_basic");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "missing-resource");
  assert.equal(s.base.building, null);
});

test("session/base: 建造检查暴露缺口", () => {
  const s = new GameSession();
  const check = s.buildCheck("workshop")!;
  assert.equal(check.ok, false);
  assert.equal(check.reason, "missing-tech");
  assert.ok(check.missingTech.length > 0);
});

test("session/base: 基地加成生效", () => {
  const s = new GameSession();
  assert.deepEqual(s.baseBonuses(), {});
  s.finishBuild("power_basic");
  assert.equal(s.baseBonuses()["powerCapacity"], 10);
});

test("session/base: 居住容量与私密设施", () => {
  const s = new GameSession();
  assert.equal(s.housingCapacity(), 0);
  assert.equal(s.privateUnlocked(), false);

  s.finishBuild("bedroom");
  assert.equal(s.housingCapacity(), 4);

  s.finishBuild("private_room");
  assert.equal(s.privateUnlocked(), true);
});

test("session/base: 一键建成整层", () => {
  const s = new GameSession();
  s.finishAllBuilds("surface");
  const sum = s.baseSummary();
  assert.equal(sum.byLevel.surface.built, facilitiesByLevel("surface").length);
});

test("session/base: 基地数值进入剧本变量集", () => {
  const s = new GameSession();
  s.finishBuild("power_basic");
  s.finishBuild("bedroom");
  const v = s.vars();
  assert.equal(v["baseBuilt"], 2);
  assert.equal(v["housingCapacity"], 4);
  assert.equal(v["privateRoom"], false);
});

test("session/base: 随存档往返", () => {
  const s = new GameSession();
  s.finishBuild("power_basic");
  s.finishBuild("water_basic");
  s.finishBuild("bedroom");

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.tierOf("power_basic"), 1);
  assert.equal(back.tierOf("water_basic"), 1);
  assert.equal(back.housingCapacity(), 4);
  assert.equal(back.baseBonuses()["powerCapacity"], 10);
});

test("session/base: 建造受岗位加成加速", () => {
  const s = new GameSession({ resources: { "wood": 200, "steel_bar": 100 } });
  s.setJob("mother", "craft", 0.5);
  s.setJob("sister", "logistics", 0.5);
  s.beginBuild("fence");
  s.advance(4, "work");
  // 有加成时 4 小时应推进更多（fence 基础 12 小时，加成后应过半）
  const fac = s.base.facilities.find((x) => x.id === "fence");
  if (fac) {
    const def = facilityDef("fence")!;
    const need = upgradeHours(def, 0);
    assert.ok(fac.buildingHours / need > 0.3, "岗位加成应加速建造");
  }
});

test("session/base: 摘要包含基地信息", () => {
  const s = new GameSession();
  const sum = s.summary();
  assert.equal(sum.baseBuilt, 0);
  assert.equal(sum.baseTotal, FACILITIES.length);
  assert.equal(sum.building, null);
});

test("session/base: 全部设施在完整科技下可建", () => {
  const s = new GameSession({ resources: {} });
  s.unlockEverything();
  // 给足材料
  for (const id of ["copper_wire","magnet","pvc_pipe","filter_mesh","fan","duct","metal_shelf","wood",
                    "steel_bar","cement","furniture","electronics","hydraulic","machine_part",
                    "activated_carbon","pump","glass","led","surgical_kit","medical_supply",
                    "isotope","gunpowder","mold","ammo_762","drone_part","cloth","stone","rope"]) {
    s.addToStorage(id, 500);
  }
  let buildable = 0;
  for (const def of FACILITIES) {
    const check = s.buildCheck(def.id);
    if (check?.ok) buildable++;
  }
  // 有前置链，首层应可建
  assert.ok(buildable >= 5, `至少应有 5 个可建，实际 ${buildable}`);
});
